import type { AuditSnapshot } from '../types.js';

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
  for (const entry of entries) {
    if (entry.noIndex) continue;

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
      issues.push(`Notice: Page title is short (${effectiveTitle.length} characters). Target: 40-60 characters.`);
      pageScore -= 5;
      totalNotice++;
    } else if (effectiveTitle.length > 70) {
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
    } else if (effectiveDesc.length < 70) {
      issues.push(`Notice: Meta description is short (${effectiveDesc.length} characters).`);
      pageScore -= 5;
      totalNotice++;
    } else if (effectiveDesc.length > 165) {
      issues.push(`Notice: Meta description exceeds 160 characters (${effectiveDesc.length} characters).`);
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

    // 5. Thin Content Check (< 300 words)
    if (words.length < 300) {
      issues.push(`Critical: Thin content detected (${words.length} words). Minimum recommended is 300 words.`);
      pageScore -= 25;
      totalCritical++;
    }

    // 6. Focus Keyword Missing
    if (!entry.focusKeywords || entry.focusKeywords.length === 0) {
      issues.push('Notice: No focus keyword assigned to entry.');
      pageScore -= 5;
      totalNotice++;
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
