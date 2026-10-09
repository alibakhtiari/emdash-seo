import { runSitewideAudit, type AuditEntryInput } from '../engine/audit-runner.js';
import type { AuditSnapshot } from '../types.js';

let latestAudit: AuditSnapshot | null = null;

const AUDIT_COLLECTIONS = ['posts', 'services', 'pages'];
const MAX_AUDIT_ENTRIES = 2000;

async function collectEntries(ctx: any): Promise<AuditEntryInput[] | null> {
  if (Array.isArray(ctx?.entries) && ctx.entries.length > 0) {
    return ctx.entries as AuditEntryInput[];
  }
  if (!ctx?.content?.list) return null;
  const entries: AuditEntryInput[] = [];
  for (const col of AUDIT_COLLECTIONS) {
    let cursor: string | undefined;
    try {
      do {
        const page = await ctx.content.list(col, {
          limit: 100,
          cursor,
          where: { status: 'published' },
        });
        if (!page?.items) break;
        for (const item of page.items) {
          if (entries.length >= MAX_AUDIT_ENTRIES) break;
          entries.push({
            id: item.id,
            slug: item.slug || item.data?.slug || '',
            title: item.title || item.data?.title || '',
            content: item.content || item.data?.content || '',
            metaTitle: item.data?.seo?.metaTitle || item.metaTitle,
            metaDescription: item.data?.seo?.metaDescription || item.metaDescription,
            focusKeywords: item.data?.seo?.focusKeywords || item.focusKeywords || [],
            noIndex: item.data?.seo?.noIndex || item.noIndex,
            schemaType: item.data?.seo?.schemaType || item.data?.schema_type || item.schemaType,
            cornerstone: item.data?.seo?.cornerstone ?? item.data?.cornerstone ?? item.cornerstone,
          });
        }
        cursor = page.cursor;
        if (entries.length >= MAX_AUDIT_ENTRIES) break;
      } while (cursor);
    } catch {
      return null;
    }
  }
  return entries;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleRunAudit(ctx: any): Promise<Response> {
  const entries = await collectEntries(ctx);
  if (!entries) {
    return json({ success: false, error: 'not wired' }, 501);
  }

  latestAudit = runSitewideAudit(entries);

  return json({ success: true, audit: latestAudit });
}

export async function handleGetAudit(_ctx: any): Promise<Response> {
  return json({ success: true, audit: latestAudit });
}
