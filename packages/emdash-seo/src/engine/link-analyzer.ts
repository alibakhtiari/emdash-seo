import type { LinkGraphEntry } from '../types.js';

export interface ExtractedLink {
  targetUrl: string;
  anchorText: string;
  isExternal: boolean;
}

/**
 * Extracts links and anchor text from HTML/content strings
 */
export function extractLinksFromContent(content: string, siteOrigin: string): ExtractedLink[] {
  const links: ExtractedLink[] = [];
  const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(content)) !== null) {
    const rawHref = match[1].trim();
    const anchorHtml = match[2].trim();
    const anchorText = anchorHtml.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();

    if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) {
      continue;
    }

    let isExternal = false;
    if (rawHref.startsWith('http://') || rawHref.startsWith('https://')) {
      try {
        const u = new URL(rawHref);
        const origin = new URL(siteOrigin).origin;
        isExternal = u.origin !== origin;
      } catch {
        isExternal = true;
      }
    }

    links.push({
      targetUrl: rawHref,
      anchorText,
      isExternal,
    });
  }

  return links;
}

export interface SuggestLinkTarget {
  id: string;
  collection: string;
  title: string;
  slug: string;
  focusKeywords: string[];
}

export interface LinkOpportunity {
  targetId: string;
  targetTitle: string;
  targetSlug: string;
  matchedKeyword: string;
  snippet: string;
}

/**
 * Identifies high-relevance internal linking opportunities by matching draft text
 * against target entries' focus keywords and titles.
 */
export function findInternalLinkOpportunities(
  content: string,
  currentEntryId: string,
  candidates: SuggestLinkTarget[]
): LinkOpportunity[] {
  const opportunities: LinkOpportunity[] = [];
  const cleanContent = content.replace(/<[^>]*>?/gm, ' ');

  for (const candidate of candidates) {
    if (candidate.id === currentEntryId) continue;

    // Check title and focus keywords
    const searchTerms = [candidate.title, ...(candidate.focusKeywords || [])].filter(Boolean);

    for (const term of searchTerms) {
      const trimmed = term.trim();
      if (trimmed.length < 3) continue;

      const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`([^.!?\\n]*?\\b${escaped}\\b[^.!?\\n]*)`, 'i');
      const match = cleanContent.match(regex);

      if (match && match[1]) {
        opportunities.push({
          targetId: candidate.id,
          targetTitle: candidate.title,
          targetSlug: candidate.slug,
          matchedKeyword: trimmed,
          snippet: match[1].trim(),
        });
        break; // One opportunity per candidate is sufficient
      }
    }
  }

  return opportunities;
}

/**
 * Detects orphan pages (published entries with zero inbound links)
 */
export function detectOrphanPages(
  allEntries: { id: string; slug: string; title: string }[],
  linkGraph: LinkGraphEntry[]
): { id: string; slug: string; title: string }[] {
  const inboundCount = new Map<string, number>();

  for (const link of linkGraph) {
    if (link.targetId) {
      inboundCount.set(link.targetId, (inboundCount.get(link.targetId) || 0) + 1);
    }
  }

  return allEntries.filter((entry) => (inboundCount.get(entry.id) || 0) === 0);
}
