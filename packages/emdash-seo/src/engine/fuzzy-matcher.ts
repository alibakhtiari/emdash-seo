/**
 * Fuzzy URL-path matching for 404 redirect suggestions.
 * Combines Levenshtein distance, Jaccard token overlap, and last-segment slug matching.
 * Zero external dependencies — sub-millisecond execution for Cloudflare Workers.
 */

const SPLIT_RE = /[/\-_]+/g;
const SEG_SPLIT_RE = /[-_]+/g;
const MULTI_SLASH_RE = /\/+/g;

export function normalizePath(path: string): string {
  let p = path.toLowerCase().trim();
  p = p.replace(MULTI_SLASH_RE, '/');
  if (p.endsWith('/') && p.length > 1) p = p.slice(0, -1);
  if (!p.startsWith('/')) p = '/' + p;
  return p;
}

export function tokenizePath(path: string): string[] {
  return path.split(SPLIT_RE).filter(Boolean);
}

/**
 * Normalized key for the final URL segment.
 * Tokens are lowercased, split on -/_, sorted, and joined.
 * Ensures hello_world, hello-world, and world-hello produce the same key.
 */
export function lastSegmentKey(path: string): string {
  const segs = path.split('/').filter(Boolean);
  const last = segs[segs.length - 1] ?? '';
  return last
    .split(SEG_SPLIT_RE)
    .filter(Boolean)
    .sort()
    .join('|');
}

/**
 * Classic dynamic programming Levenshtein distance with O(min(|a|, |b|)) space.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const lenA = a.length;
  const lenB = b.length;
  let prev = new Array<number>(lenB + 1);
  let curr = new Array<number>(lenB + 1);

  for (let j = 0; j <= lenB; j++) prev[j] = j;

  for (let i = 1; i <= lenA; i++) {
    curr[0] = i;
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,       // insertion
        prev[j] + 1,           // deletion
        prev[j - 1] + cost     // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[lenB];
}

/**
 * Score the similarity of two URL paths on a scale of [0, 1].
 * Combines:
 * - Levenshtein distance (50%): catches single-character typos
 * - Token overlap / Jaccard index (20%): catches token reordering / separator differences
 * - Last-segment slug match (30%): strong indicator when path prefix has changed
 */
export function scoreSlugMatch(target: string, candidate: string): number {
  const t = normalizePath(target);
  const c = normalizePath(candidate);
  if (t === c) return 1;

  // 1. Levenshtein similarity on full path
  const dist = levenshtein(t, c);
  const maxLen = Math.max(t.length, c.length);
  const levSim = maxLen === 0 ? 0 : Math.max(0, 1 - dist / maxLen);

  // 2. Token overlap (Jaccard index)
  const tTokens = new Set(tokenizePath(t));
  const cTokens = new Set(tokenizePath(c));
  const intersection = new Set([...tTokens].filter((x) => cTokens.has(x)));
  const union = new Set([...tTokens, ...cTokens]);
  const jaccard = union.size === 0 ? 0 : intersection.size / union.size;

  // 3. Last-segment match bonus
  const tKey = lastSegmentKey(t);
  const cKey = lastSegmentKey(c);
  const slugMatch = tKey && tKey === cKey ? 1 : 0;

  return levSim * 0.5 + jaccard * 0.2 + slugMatch * 0.3;
}

export interface RankedMatch {
  candidate: string;
  score: number;
}

export interface FuzzyMatchOptions {
  limit?: number;
  minScore?: number;
}

/**
 * Rank candidate paths against a target 404 path by fuzzy similarity.
 * Returns up to limit matches with score >= minScore, sorted descending.
 */
export function rankCandidates(
  target: string,
  candidates: string[],
  opts: FuzzyMatchOptions = {}
): RankedMatch[] {
  const limit = opts.limit ?? 3;
  const minScore = opts.minScore ?? 0.5;

  const scored: RankedMatch[] = candidates
    .map((candidate) => ({
      candidate,
      score: Math.round(scoreSlugMatch(target, candidate) * 100) / 100,
    }))
    .filter((m) => m.score >= minScore)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit);
}
