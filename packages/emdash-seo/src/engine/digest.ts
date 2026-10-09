import type { SeoPluginOptions } from '../types.js';
import { runSitewideAudit, type AuditEntryInput } from './audit-runner.js';
import { setLatestV1AuditSnapshot, appendAuditHistory } from '../routes/api-v1/state.js';

export const DIGEST_TASK_WEEKLY = 'seo-weekly-digest';
export const FANOUT_TASK_DAILY = 'seo-indexnow-fanout';

async function getSetting(ctx: any, key: string): Promise<string | undefined> {
  try {
    if (ctx?.settings?.get) {
      const v = await ctx.settings.get(key);
      if (v != null) return String(v);
    }
    if (ctx?.kv?.get) {
      const v = await ctx.kv.get(`settings:${key}`);
      if (v != null) return String(v);
    }
  } catch {
    // Fall through undefined
  }
  return undefined;
}

async function collectDigestEntries(ctx: any): Promise<AuditEntryInput[]> {
  const entries: AuditEntryInput[] = [];
  if (!ctx?.content?.list) return entries;
  for (const col of ['posts', 'services', 'pages']) {
    if (entries.length >= 300) break;
    try {
      let cursor: string | undefined;
      do {
        const page = await ctx.content.list(col, { limit: 100, cursor, where: { status: 'published' } });
        if (!page?.items) break;
        for (const item of page.items) {
          entries.push({
            id: item.id,
            slug: item.slug || item.data?.slug || '',
            title: item.title || item.data?.title || '',
            content: item.content || item.data?.content || '',
            metaTitle: item.data?.seo?.metaTitle || item.metaTitle,
            metaDescription: item.data?.seo?.metaDescription || item.metaDescription,
            focusKeywords: item.data?.seo?.focusKeywords || item.focusKeywords || [],
            noIndex: item.data?.seo?.noIndex || item.noIndex,
            schemaType: item.data?.seo?.schemaType,
            cornerstone: item.data?.seo?.cornerstone,
          });
          if (entries.length >= 300) break;
        }
        cursor = page.cursor;
      } while (cursor && entries.length < 300);
    } catch {
      // Skip failing collections
    }
  }
  return entries;
}

export interface DigestResult {
  ran: boolean;
  emailed: boolean;
  healthScore?: number;
  delta?: number;
  reason: string;
}

/**
 * Weekly audit digest: runs the sitewide audit, appends history, and emails
 * score deltas when digest_enabled + digest_email are set and ctx.email
 * exists (requires email:send capability and a configured provider).
 * Never throws; reports honest skip reasons instead.
 */
export async function runSeoDigest(ctx: any, _options: SeoPluginOptions): Promise<DigestResult> {
  const enabled = await getSetting(ctx, 'digest_enabled');
  if (enabled !== '1' && enabled !== 'true') {
    return { ran: false, emailed: false, reason: 'digest disabled (digest_enabled not set)' };
  }
  const entries = await collectDigestEntries(ctx);
  if (entries.length === 0) {
    return { ran: false, emailed: false, reason: 'no published entries to audit' };
  }
  const snapshot = runSitewideAudit(entries);
  setLatestV1AuditSnapshot(snapshot);
  await appendAuditHistory(ctx, snapshot);
  try {
    await ctx?.kv?.set?.('seo:audit:latest', JSON.stringify(snapshot));
  } catch {
    // Ignore KV error
  }

  const to = await getSetting(ctx, 'digest_email');
  if (!to || !to.includes('@')) {
    return { ran: true, emailed: false, healthScore: snapshot.healthScore, reason: 'digest_email not set' };
  }
  if (!ctx?.email?.send) {
    return { ran: true, emailed: false, healthScore: snapshot.healthScore, reason: 'email provider not configured' };
  }
  const prevRaw = await getSetting(ctx, 'seo_digest_prev_score');
  const prev = prevRaw != null && prevRaw !== '' ? Number(prevRaw) : NaN;
  const delta = Number.isFinite(prev) ? snapshot.healthScore - prev : 0;
  const arrow = delta > 0 ? `up ${delta}` : delta < 0 ? `down ${-delta}` : 'unchanged';
  const topIssues = snapshot.report
    .flatMap((r: any) => (r.issues || []).slice(0, 2).map((i: string) => `- ${r.url}: ${i}`))
    .slice(0, 10);
  try {
    await ctx.email.send({
      to,
      subject: `WebABC SEO weekly digest: health ${snapshot.healthScore} (${arrow})`,
      text: [
        `Site health: ${snapshot.healthScore}/100 (${arrow} vs last week)`,
        `Pages: ${snapshot.totalPages}, critical: ${snapshot.issuesCritical}, warnings: ${snapshot.issuesWarning}`,
        '',
        'Top issues:',
        ...topIssues,
      ].join('\n'),
    });
  } catch {
    return { ran: true, emailed: false, healthScore: snapshot.healthScore, delta, reason: 'email send failed' };
  }
  try {
    if (ctx?.settings?.set) await ctx.settings.set('seo_digest_prev_score', String(snapshot.healthScore));
    else await ctx?.kv?.set?.('settings:seo_digest_prev_score', String(snapshot.healthScore));
  } catch {
    // Score persistence is best-effort
  }
  return { ran: true, emailed: true, healthScore: snapshot.healthScore, delta, reason: 'sent' };
}

/** Idempotently schedule plugin cron tasks (weekly digest, daily fan-out). */
export async function ensureSeoSchedules(ctx: any): Promise<void> {
  if (!ctx?.cron?.schedule || !ctx?.cron?.list) return;
  try {
    const existing = new Set((await ctx.cron.list()).map((t: any) => t?.name));
    if (!existing.has(DIGEST_TASK_WEEKLY)) {
      await ctx.cron.schedule(DIGEST_TASK_WEEKLY, { schedule: '0 8 * * 1' });
    }
    if (!existing.has(FANOUT_TASK_DAILY)) {
      await ctx.cron.schedule(FANOUT_TASK_DAILY, { schedule: '0 6 * * *' });
    }
  } catch {
    // Scheduling is best-effort
  }
}
