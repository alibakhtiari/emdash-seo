import type { RedirectRule } from '../types.js';

export interface MatchRedirectOptions {
  ignoreQuery?: boolean;
  ignoreTrailingSlash?: boolean;
  caseInsensitive?: boolean;
  visited?: string[];
}

export const MAX_REDIRECT_HOPS = 5;

function stripQuery(path: string): string {
  const q = path.indexOf('?');
  return q >= 0 ? path.slice(0, q) : path;
}

function stripTrailingSlash(path: string): string {
  return path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path;
}

function normalizeForMatch(path: string, opts: Required<Omit<MatchRedirectOptions, 'visited'>>): string {
  let p = opts.ignoreQuery ? stripQuery(path) : path;
  if (!p.startsWith('/')) p = `/${p}`;
  if (opts.ignoreTrailingSlash) p = stripTrailingSlash(p);
  if (opts.caseInsensitive) p = p.toLowerCase();
  return p;
}

function resolveOpts(opts: MatchRedirectOptions = {}): Required<Omit<MatchRedirectOptions, 'visited'>> {
  return {
    ignoreQuery: opts.ignoreQuery ?? true,
    ignoreTrailingSlash: opts.ignoreTrailingSlash ?? true,
    caseInsensitive: opts.caseInsensitive ?? false,
  };
}

function samePath(a: string, b: string, opts: Required<Omit<MatchRedirectOptions, 'visited'>>): boolean {
  return normalizeForMatch(a, opts) === normalizeForMatch(b, opts);
}

function applyRegex(pattern: string, destination: string, pathname: string): string | null {
  try {
    const regex = new RegExp(pattern);
    if (!regex.test(pathname)) return null;
    return pathname.replace(regex, destination);
  } catch {
    return null;
  }
}

export function matchRedirect(
  pathname: string,
  rules: RedirectRule[],
  opts: MatchRedirectOptions = {}
): { destination: string; statusCode: number; to: string } | null {
  const resolved = resolveOpts(opts);
  const normalizedPath = normalizeForMatch(pathname, resolved);
  const visited = (opts.visited || []).map((v) => normalizeForMatch(v, resolved));

  for (const rule of rules) {
    if (rule.status && rule.status !== 'active') continue;

    const pattern = (rule.pattern || rule.from || '').trim();
    const destination = rule.destination || rule.to || '';
    const comparison = rule.comparison || rule.matchType || 'exact';
    const statusCode = rule.statusCode || 301;

    if (!pattern || !destination) continue;

    let target: string | null = null;

    if (comparison === 'exact') {
      if (normalizedPath === normalizeForMatch(pattern, resolved)) {
        target = destination;
      }
    } else if (comparison === 'prefix') {
      const cleanPrefix = pattern.endsWith('/*') ? pattern.slice(0, -2) : pattern;
      const rawHaystack = opts.ignoreQuery ? stripQuery(pathname) : pathname;
      const check = resolved.caseInsensitive ? rawHaystack.toLowerCase() : rawHaystack;
      const checkNeedle = resolved.caseInsensitive ? cleanPrefix.toLowerCase() : cleanPrefix;
      if (check.startsWith(checkNeedle)) {
        const remaining = rawHaystack.slice(cleanPrefix.length);
        target = destination.endsWith('/')
          ? `${destination}${remaining.replace(/^\//, '')}`
          : `${destination}${remaining}`;
      }
    } else if (comparison === 'regex') {
      const rawHaystack = opts.ignoreQuery ? stripQuery(pathname) : pathname;
      target = applyRegex(pattern, destination, rawHaystack);
    }

    if (target === null) continue;

    // Self-loop guard: rule points back at the request path.
    if (samePath(target, pathname, resolved)) continue;
    // Chain-loop guard: destination already visited in this chain.
    if (visited.includes(normalizeForMatch(target, resolved))) continue;

    return { destination: target, statusCode, to: target };
  }

  return null;
}

/**
 * Follow a redirect chain up to maxHops, stopping on loops or dead ends.
 * Returns the final destination plus hop count, or null when no rule matches.
 */
export function resolveRedirectChain(
  startPath: string,
  rules: RedirectRule[],
  opts: MatchRedirectOptions = {},
  maxHops = MAX_REDIRECT_HOPS
): { destination: string; statusCode: number; hops: number; loop: boolean } | null {
  const visited: string[] = [startPath];
  let current = startPath;
  let last: { destination: string; statusCode: number; to: string } | null = null;

  for (let hop = 0; hop < maxHops; hop++) {
    const match = matchRedirect(current, rules, { ...opts, visited });
    if (!match) {
      // No progress: check whether a rule matches but points into the visited chain (cycle).
      const raw = matchRedirect(current, rules, opts);
      const resolved = resolveOpts(opts);
      if (raw && visited.some((v) => samePath(v, stripQuery(raw.destination), resolved))) {
        return { ...raw, hops: hop, loop: true };
      }
      return last ? { ...last, hops: hop, loop: false } : null;
    }
    last = match;
    visited.push(match.destination);
    // Detect a cycle: destination path already seen in this chain.
    const seen = visited.slice(0, -1);
    const resolved = resolveOpts(opts);
    if (seen.some((v) => samePath(v, stripQuery(match.destination), resolved))) {
      return { ...match, hops: hop + 1, loop: true };
    }
    current = stripQuery(match.destination);
    // Only follow relative-path chains; absolute URLs terminate the chain.
    if (/^https?:\/\//i.test(current)) return { ...match, hops: hop + 1, loop: false };
  }

  return last ? { ...last, hops: maxHops, loop: true } : null;
}

export function createRedirectResponse(destination: string, statusCode = 301): Response {
  if (statusCode === 410) {
    return new Response('Gone', {
      status: 410,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  }
  if (statusCode === 451) {
    return new Response('Unavailable For Legal Reasons', {
      status: 451,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  }
  return new Response(null, {
    status: statusCode,
    headers: {
      Location: destination,
      'Cache-Control': statusCode === 301 ? 'public, max-age=86400, s-maxage=604800' : 'no-cache',
    },
  });
}
