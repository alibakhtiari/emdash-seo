import type { SeoPluginOptions, RedirectRule } from '../../types.js';
import { jsonResponse, parseRequestBody } from './helpers.js';
import { v1RedirectRules } from './state.js';

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
  };
}

/**
 * Parse a bulk CSV string into RedirectRule[].
 * Format per line: pattern,destination[,statusCode[,comparison]]
 * Skips blank lines, `#` comments, and an optional header row.
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
    const cells = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
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
 * Callable from content lifecycle hooks; not wired here to avoid conflicts.
 * Returns null when slugs are identical or empty.
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

  // GET: List configured redirects with pagination
  if (method === 'GET') {
    const url = req?.url ? new URL(req.url, 'http://localhost') : null;
    const page = Math.max(1, parseInt(url?.searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(url?.searchParams.get('limit') || '20', 10)));
    const statusFilter = url?.searchParams.get('status');

    let rules = [...v1RedirectRules];

    if (Array.isArray(ctx?.redirects)) {
      rules = ctx.redirects;
    } else if (ctx?.redirects?.list) {
      try {
        const customRules = await ctx.redirects.list();
        if (Array.isArray(customRules)) rules = customRules;
      } catch {
        // Ignore
      }
    }

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

  // POST: Create or batch-import redirect rules
  if (method === 'POST') {
    const body = await parseRequestBody(ctx);
    let incomingRules: any[] = [];

    if (Array.isArray(body)) {
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

    // Persist into store / ctx
    for (const rule of createdRules) {
      v1RedirectRules.unshift(rule);
      if (Array.isArray(ctx?.redirects)) {
        ctx.redirects.unshift(rule);
      }
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

  // PUT/PATCH: Edit a redirect rule by id
  if (method === 'PUT' || method === 'PATCH') {
    const body = await parseRequestBody(ctx);
    const id = extractId(ctx, body);
    if (!id) return jsonResponse({ error: 'Missing redirect rule id.' }, 400);
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
    store[idx] = rule;
    return jsonResponse({ success: true, rule });
  }

  // DELETE: Remove a redirect rule by id (?id= or body { id })
  if (method === 'DELETE') {
    const body = await parseRequestBody(ctx);
    const id = extractId(ctx, body);
    if (!id) return jsonResponse({ error: 'Missing redirect rule id.' }, 400);
    const store = findRuleStore(ctx);
    const idx = store.findIndex((r) => r.id === id);
    if (idx < 0) return jsonResponse({ error: `Redirect rule not found: ${id}` }, 404);
    const [removed] = store.splice(idx, 1);
    return jsonResponse({ success: true, removed });
  }

  return jsonResponse({ error: `Method ${method} not allowed` }, 405);
}
