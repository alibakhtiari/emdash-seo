import type { SeoPluginOptions, RedirectRule } from '../../types.js';
import { jsonResponse, parseRequestBody } from './helpers.js';
import { requireSeoCapFor } from '../../engine/auth.js';
import {
  v1RedirectRules,
  loadRedirectRules,
  persistRedirectRules,
  fromHostRedirect,
  toHostCreateInput,
} from './state.js';

function hostWriteAccess(ctx: any): any | null {
  const r = ctx?.redirects;
  return r && typeof r.list === 'function' ? r : null;
}

function hitCountField(raw: any): { hitCount?: number } {
  const n = Number(raw?.hitCount);
  return Number.isFinite(n) && n >= 0 ? { hitCount: Math.floor(n) } : {};
}

function normalizeRule(raw: any): RedirectRule | null {
  const pattern = (raw.pattern || raw.from || raw.source || '').trim();
  const destination = (raw.destination || raw.to || raw.target || '').trim();
  if (!pattern || !destination) return null;
  const comparison = raw.comparison || raw.matchType || 'exact';
  if (comparison === 'regex') {
    try {
      new RegExp(pattern);
    } catch {
      return null;
    }
  }
  return {
    id: raw.id || `redir_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    pattern,
    from: pattern,
    destination,
    to: destination,
    comparison,
    matchType: comparison,
    statusCode: Number(raw.statusCode || raw.type || 301),
    status: raw.status || (raw.enabled === false ? 'inactive' : 'active'),
    ...hitCountField(raw),
  };
}

/**
 * Split one CSV line on commas, honoring double-quoted cells that may
 * contain commas or escaped quotes (""). No dependencies, CF-safe.
 */
export function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      cells.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur.trim());
  return cells;
}

/**
 * Parse a bulk CSV string into RedirectRule[].
 * Format per line: pattern,destination[,statusCode[,comparison]]
 * Quoted cells may contain commas. Skips blank lines, `#` comments,
 * and an optional header row.
 */
export function parseRedirectsCsv(csv: string): RedirectRule[] {
  const rules: RedirectRule[] = [];
  let seenData = false;
  for (const rawLine of csv.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    if (!seenData && /^pattern\s*,/i.test(line)) {
      seenData = true;
      continue;
    }
    seenData = true;
    const cells = splitCsvLine(line);
    const [pattern, destination, statusCode, comparison] = cells;
    if (!pattern || !destination) continue;
    const rule = normalizeRule({
      pattern,
      destination,
      statusCode: statusCode ? Number(statusCode) : 301,
      comparison: comparison || 'exact',
    });
    if (rule) rules.push(rule);
  }
  return rules;
}

/**
 * Auto-monitor helper: build a 301 rule when a slug changes.
 * NOTE: the EmDash host creates slug-change 301s natively (with chain
 * collapsing), so content hooks deliberately do NOT call this — it exists
 * for CSV/manual flows and non-hosted stores. Returns null on no-op.
 */
export function onSlugChange(oldSlug: string, newSlug: string, statusCode = 301): RedirectRule | null {
  const from = (oldSlug || '').trim();
  const to = (newSlug || '').trim();
  if (!from || !to || from === to) return null;
  const norm = (s: string) => (s.startsWith('/') ? s : `/${s}`);
  return {
    id: `redir_slug_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    pattern: norm(from),
    from: norm(from),
    destination: norm(to),
    to: norm(to),
    comparison: 'exact',
    matchType: 'exact',
    statusCode,
    status: 'active',
  };
}

function findRuleStore(ctx: any): RedirectRule[] {
  if (Array.isArray(ctx?.redirects)) return ctx.redirects;
  return v1RedirectRules;
}

function extractId(ctx: any, body: any): string | null {
  if (body?.id) return String(body.id);
  const req = ctx?.request || ctx?.req;
  if (ctx?.params?.id) return String(ctx.params.id);
  if (req?.url) {
    try {
      const url = new URL(req.url, 'http://localhost');
      const id = url.searchParams.get('id');
      if (id) return id;
    } catch {
      // Ignore
    }
  }
  return null;
}

export async function handleV1Redirects(ctx: any, _options: SeoPluginOptions): Promise<Response> {
  const req = ctx?.request || ctx?.req;
  const method = (req?.method || ctx?.method || 'GET').toUpperCase();

  if (method !== 'GET') {
    const denied = await requireSeoCapFor(ctx, 'redirects');
    if (denied) return jsonResponse({ error: 'Forbidden: editor role cannot manage redirects.' }, denied.status);
  }

  // GET: List configured redirects with pagination
  if (method === 'GET') {
    const url = req?.url ? new URL(req.url, 'http://localhost') : null;
    const page = Math.max(1, parseInt(url?.searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(url?.searchParams.get('limit') || '20', 10)));
    const statusFilter = url?.searchParams.get('status');

    let rules = [...(await loadRedirectRules(ctx))];

    if (statusFilter) {
      rules = rules.filter((r) => (r.status || 'active') === statusFilter);
    }

    const total = rules.length;
    const startIndex = (page - 1) * limit;
    const items = rules.slice(startIndex, startIndex + limit);

    return jsonResponse({
      success: true,
      page,
      limit,
      total,
      items,
    });
  }

  // POST: Create, CSV-import, or batch-import redirect rules
  if (method === 'POST') {
    const body = await parseRequestBody(ctx);
    let incomingRules: any[] = [];

    if (typeof body?.csv === 'string') {
      incomingRules = parseRedirectsCsv(body.csv);
    } else if (Array.isArray(body)) {
      incomingRules = body;
    } else if (Array.isArray(body?.rules)) {
      incomingRules = body.rules;
    } else if (body && typeof body === 'object') {
      incomingRules = [body];
    }

    if (incomingRules.length === 0) {
      return jsonResponse(
        { error: 'No redirect rule or rules array provided in request body.' },
        400
      );
    }

    const createdRules: RedirectRule[] = [];

    for (const raw of incomingRules) {
      const rule = normalizeRule(raw);
      if (!rule) {
        const pattern = (raw.pattern || raw.from || raw.source || '').trim();
        if ((raw.comparison || raw.matchType) === 'regex' && pattern) {
          return jsonResponse({ error: `Invalid regex pattern: ${pattern}` }, 400);
        }
        return jsonResponse(
          {
            error: 'Each redirect rule must define a source pattern (pattern/from/source) and destination (destination/to/target).',
            invalidRule: raw,
          },
          400
        );
      }

      createdRules.push(rule);
    }

    // Persist: host store first (rules take effect in middleware),
    // memory + KV fallback otherwise.
    const host = hostWriteAccess(ctx);
    if (host && typeof host.create === 'function') {
      const written: RedirectRule[] = [];
      for (const rule of createdRules) {
        try {
          const created = await host.create(toHostCreateInput(rule));
          const info = (created as any)?.redirect ?? created;
          const mapped = info?.id ? fromHostRedirect(info) : rule;
          written.push({ ...mapped, _rev: (created as any)?._rev } as RedirectRule);
        } catch {
          v1RedirectRules.unshift(rule);
          written.push(rule);
        }
      }
      try {
        await persistRedirectRules(ctx);
      } catch {
        // Memory fallback already updated
      }
      return jsonResponse({ success: true, count: written.length, rules: written }, 201);
    }
    for (const rule of createdRules) {
      v1RedirectRules.unshift(rule);
      if (Array.isArray(ctx?.redirects)) {
        ctx.redirects.unshift(rule);
      }
    }
    try {
      await persistRedirectRules(ctx);
    } catch {
      // Memory fallback already updated
    }

    return jsonResponse(
      {
        success: true,
        count: createdRules.length,
        rules: createdRules,
      },
      201
    );
  }

  // PUT/PATCH: Edit a redirect rule by id (host write-through when available)
  if (method === 'PUT' || method === 'PATCH') {
    const body = await parseRequestBody(ctx);
    const id = extractId(ctx, body);
    if (!id) return jsonResponse({ error: 'Missing redirect rule id.' }, 400);
    const host = hostWriteAccess(ctx);
    if (host && typeof host.update === 'function' && typeof host.get === 'function') {
      try {
        const current = await host.get(id);
        const info = (current as any)?.redirect ?? current;
        if (!info?.id) return jsonResponse({ error: `Redirect rule not found: ${id}` }, 404);
        const base = fromHostRedirect(info);
        const merged = {
          pattern: body.pattern ?? body.from ?? body.source ?? base.pattern,
          destination: body.destination ?? body.to ?? body.target ?? base.destination,
          comparison: body.comparison ?? body.matchType ?? base.comparison ?? 'exact',
          statusCode: body.statusCode ?? body.type ?? base.statusCode ?? 301,
          status: body.status ?? (body.enabled === false ? 'inactive' : base.status ?? 'active'),
        };
        const rule = normalizeRule({ ...merged, id });
        if (!rule) {
          return jsonResponse({ error: 'Invalid redirect rule: pattern/destination required, regex must compile.' }, 400);
        }
        const updated = await host.update(id, { ...toHostCreateInput(rule), _rev: (current as any)?._rev });
        const updatedInfo = (updated as any)?.redirect ?? updated;
        return jsonResponse({ success: true, rule: { ...rule, ...(updatedInfo?.id ? fromHostRedirect(updatedInfo) : {}), _rev: (updated as any)?._rev } });
      } catch (err) {
        if (err instanceof Error && /not found/i.test(err.message)) {
          return jsonResponse({ error: `Redirect rule not found: ${id}` }, 404);
        }
        return jsonResponse({ error: 'Host redirect update failed.' }, 502);
      }
    }
    const store = findRuleStore(ctx);
    const idx = store.findIndex((r) => r.id === id);
    if (idx < 0) return jsonResponse({ error: `Redirect rule not found: ${id}` }, 404);
    const existing = store[idx];
    const merged = {
      pattern: existing.pattern,
      destination: existing.destination,
      comparison: existing.comparison || existing.matchType || 'exact',
      statusCode: existing.statusCode || 301,
      status: existing.status || 'active',
      ...body,
      id,
    };
    const rule = normalizeRule(merged);
    if (!rule) {
      return jsonResponse({ error: 'Invalid redirect rule: pattern/destination required, regex must compile.' }, 400);
    }
    if ((rule as any).hitCount === undefined && (existing as any).hitCount !== undefined) {
      (rule as any).hitCount = (existing as any).hitCount;
    }
    store[idx] = rule;
    try {
      await persistRedirectRules(ctx);
    } catch {
      // Memory fallback already updated
    }
    return jsonResponse({ success: true, rule });
  }

  // DELETE: Remove a redirect rule by id (?id= or body { id })
  if (method === 'DELETE') {
    const body = await parseRequestBody(ctx);
    const id = extractId(ctx, body);
    if (!id) return jsonResponse({ error: 'Missing redirect rule id.' }, 400);
    const host = hostWriteAccess(ctx);
    if (host && typeof host.delete === 'function' && typeof host.get === 'function') {
      try {
        const current = await host.get(id);
        if (!(current as any)?.redirect && !(current as any)?.id) {
          return jsonResponse({ error: `Redirect rule not found: ${id}` }, 404);
        }
        await host.delete(id, { _rev: (current as any)?._rev });
        return jsonResponse({ success: true, removed: { id } });
      } catch (err) {
        if (err instanceof Error && /not found/i.test(err.message)) {
          return jsonResponse({ error: `Redirect rule not found: ${id}` }, 404);
        }
        return jsonResponse({ error: 'Host redirect delete failed.' }, 502);
      }
    }
    const store = findRuleStore(ctx);
    const idx = store.findIndex((r) => r.id === id);
    if (idx < 0) return jsonResponse({ error: `Redirect rule not found: ${id}` }, 404);
    const [removed] = store.splice(idx, 1);
    try {
      await persistRedirectRules(ctx);
    } catch {
      // Memory fallback already updated
    }
    return jsonResponse({ success: true, removed });
  }

  return jsonResponse({ error: `Method ${method} not allowed` }, 405);
}
