import type { SeoPluginOptions, RedirectRule } from '../../types.js';
import { jsonResponse, parseRequestBody } from './helpers.js';
import { v1RedirectRules } from './state.js';

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
      const pattern = (raw.pattern || raw.from || raw.source || '').trim();
      const destination = (raw.destination || raw.to || raw.target || '').trim();

      if (!pattern || !destination) {
        return jsonResponse(
          {
            error: 'Each redirect rule must define a source pattern (pattern/from/source) and destination (destination/to/target).',
            invalidRule: raw,
          },
          400
        );
      }

      const rule: RedirectRule = {
        id: raw.id || `redir_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        pattern,
        from: pattern,
        destination,
        to: destination,
        comparison: raw.comparison || raw.matchType || 'exact',
        matchType: raw.comparison || raw.matchType || 'exact',
        statusCode: Number(raw.statusCode || raw.type || 301),
        status: raw.status || (raw.enabled === false ? 'inactive' : 'active'),
      };

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

  return jsonResponse({ error: `Method ${method} not allowed` }, 405);
}
