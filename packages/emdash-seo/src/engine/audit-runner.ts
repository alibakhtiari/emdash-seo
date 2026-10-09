import type { AuditSnapshot, LinkGraphEntry } from '../types.js';
import { detectOrphanPages } from './link-analyzer.js';

export interface AuditEntryInput {
  id: string;
  slug: string;
  title: string;
  content: string;
  metaTitle?: string;
  metaDescription?: string;
  focusKeywords?: string[];
  canonicalUrl?: string;
  noIndex?: boolean;
  schemaType?: string;
  cornerstone?: boolean;
}

export function runSitewideAudit(entries: AuditEntryInput[]): AuditSnapshot {
  const seenTitles = new Map<string, string[]>();
  const seenDescriptions = new Map<string, string[]>();

  let totalCritical = 0;
  let totalWarning = 0;
  let totalNotice = 0;

  const pageReports: AuditSnapshot['report'] = [];

  // Pass 1: Index titles and descriptions for duplicate detection
  for (const entry of entries) {
    if (entry.noIndex) continue;

    const effectiveTitle = (entry.metaTitle || entry.title || '').trim().toLowerCase();
    if (effectiveTitle) {
      const list = seenTitles.get(effectiveTitle) || [];
      list.push(entry.slug);
      seenTitles.set(effectiveTitle, list);
    }

    const effectiveDesc = (entry.metaDescription || '').trim().toLowerCase();
    if (effectiveDesc) {
      const list = seenDescriptions.get(effectiveDesc) || [];
      list.push(entry.slug);
      seenDescriptions.set(effectiveDesc, list);
    }
  }

  // Pass 2: Evaluate each entry
  const evaluated = entries.filter((entry) => !entry.noIndex);

  // Build an internal link graph from entry content to detect orphan pages
  const slugToId = new Map<string, string>();
  for (const entry of evaluated) {
    slugToId.set(entry.slug.replace(/^\/+|\/+$/g, ''), entry.id);
  }
  const linkGraph: LinkGraphEntry[] = [];
  for (const entry of evaluated) {
    const baseParts = entry.slug.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
    baseParts.pop();
    const hrefRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;
    let hrefMatch: RegExpExecArray | null;
    while ((hrefMatch = hrefRegex.exec(entry.content)) !== null) {
      const rawHref = hrefMatch[1].trim();
      if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) {
        continue;
      }
      let path: string | null;
      const href = rawHref.split('#')[0].split('?')[0].trim();
      if (!href) continue;
      if (href.startsWith('/')) {
        path = href;
      } else if (href.includes('://')) {
        try {
          path = new URL(href).pathname;
        } catch {
          path = null;
        }
      } else {
        // Relative href: resolve against the entry's parent directory
        const parts = [...baseParts];
        for (const seg of href.split('/')) {
          if (!seg || seg === '.') continue;
          if (seg === '..') parts.pop();
          else parts.push(seg);
        }
        path = `/${parts.join('/')}`;
      }
      if (!path) {
        continue;
      }
      const normSlug = path.replace(/^\/+|\/+$/g, '');
      const targetId = slugToId.get(normSlug);
      if (targetId && targetId !== entry.id) {
        linkGraph.push({
          id: `${entry.id}->${targetId}`,
          sourceCollection: '',
          sourceId: entry.id,
          targetUrl: href,
          targetId,
          isExternal: false,
        });
      }
    }
  }
  const orphanIds = new Set(
    detectOrphanPages(
      evaluated.map((e) => ({ id: e.id, slug: e.slug, title: e.title })),
      linkGraph
    ).map((o) => o.id)
  );

  for (const entry of evaluated) {

    const issues: string[] = [];
    let pageScore = 100;

    const effectiveTitle = (entry.metaTitle || entry.title || '').trim();
    const effectiveDesc = (entry.metaDescription || '').trim();
    const cleanContent = entry.content.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    const words = cleanContent.split(/\s+/).filter(Boolean);

    // 1. Missing or Short Title
    if (!effectiveTitle) {
      issues.push('Critical: Missing page title.');
      pageScore -= 25;
      totalCritical++;
    } else if (effectiveTitle.length < 30) {
      issues.push(`Notice: Page title is short (${effectiveTitle.length} characters). Target: 30-60 characters.`);
      pageScore -= 5;
      totalNotice++;
    } else if (effectiveTitle.length > 60) {
      issues.push(`Warning: Page title is long (${effectiveTitle.length} characters) and may truncate in SERP.`);
      pageScore -= 10;
      totalWarning++;
    }

    // 2. Duplicate Title
    const titleDupes = seenTitles.get(effectiveTitle.toLowerCase()) || [];
    if (titleDupes.length > 1) {
      issues.push(`Critical: Duplicate title shared with: ${titleDupes.filter((s) => s !== entry.slug).join(', ')}.`);
      pageScore -= 20;
      totalCritical++;
    }

    // 3. Meta Description Checks
    if (!effectiveDesc) {
      issues.push('Warning: Missing meta description.');
      pageScore -= 15;
      totalWarning++;
    } else if (effectiveDesc.length < 120) {
      issues.push(`Notice: Meta description is short (${effectiveDesc.length} characters).`);
      pageScore -= 5;
      totalNotice++;
    } else if (effectiveDesc.length > 156) {
      issues.push(`Notice: Meta description exceeds 156 characters (${effectiveDesc.length} characters).`);
      pageScore -= 5;
      totalNotice++;
    }

    // 4. Duplicate Meta Description
    if (effectiveDesc) {
      const descDupes = seenDescriptions.get(effectiveDesc.toLowerCase()) || [];
      if (descDupes.length > 1) {
        issues.push(`Warning: Duplicate meta description shared with: ${descDupes.filter((s) => s !== entry.slug).join(', ')}.`);
        pageScore -= 15;
        totalWarning++;
      }
    }

    // 5. Thin Content Check (cornerstone content: 900 words, standard: 300 words)
    const thinThreshold = entry.cornerstone ? 900 : 300;
    if (words.length < thinThreshold) {
      issues.push(`Critical: Thin content detected (${words.length} words). Minimum recommended is ${thinThreshold} words${entry.cornerstone ? ' for cornerstone content' : ''}.`);
      pageScore -= 25;
      totalCritical++;
    }

    // 6. Focus Keyword Missing
    if (!entry.focusKeywords || entry.focusKeywords.length === 0) {
      issues.push('Notice: No focus keyword assigned to entry.');
      pageScore -= 5;
      totalNotice++;
    }

    // 7. Missing Schema Type
    if (!entry.schemaType) {
      issues.push('Warning: No schema type assigned (missing structured data entity).');
      pageScore -= 10;
      totalWarning++;
    }

    // 8. Orphan Page (no inbound internal links)
    if (orphanIds.has(entry.id)) {
      issues.push('Warning: Orphan page detected (no inbound internal links).');
      pageScore -= 10;
      totalWarning++;
    }

    pageScore = Math.max(0, pageScore);

    pageReports.push({
      url: `/${entry.slug}`,
      title: effectiveTitle || entry.slug,
      score: pageScore,
      issues,
    });
  }

  // Calculate sitewide health score
  const totalEvaluated = pageReports.length;
  const avgScore = totalEvaluated > 0
    ? Math.round(pageReports.reduce((acc, p) => acc + p.score, 0) / totalEvaluated)
    : 100;

  return {
    id: `audit-${Date.now()}`,
    healthScore: avgScore,
    totalPages: totalEvaluated,
    issuesCritical: totalCritical,
    issuesWarning: totalWarning,
    issuesNotice: totalNotice,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    report: pageReports,
  };
}
