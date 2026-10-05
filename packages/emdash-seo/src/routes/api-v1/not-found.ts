import type { SeoPluginOptions } from '../../types.js';
import type { NotFoundEntry } from './types.js';
import { jsonResponse } from './helpers.js';
import { v1NotFoundLogs } from './state.js';

export async function handleV1404s(ctx: any, _options: SeoPluginOptions): Promise<Response> {
  const req = ctx?.request || ctx?.req;
  const url = req?.url ? new URL(req.url, 'http://localhost') : null;
  const limit = Math.max(1, Math.min(200, parseInt(url?.searchParams.get('limit') || '50', 10)));
  const orderBy = url?.searchParams.get('orderBy') || 'count';

  let logs: NotFoundEntry[] = [...v1NotFoundLogs];

  if (Array.isArray(ctx?.notFoundLog)) {
    logs = ctx.notFoundLog;
  } else if (ctx?.redirects?.get404s) {
    try {
      const dbLogs = await ctx.redirects.get404s();
      if (Array.isArray(dbLogs)) logs = dbLogs;
    } catch {
      // Ignore
    }
  }

  if (orderBy === 'lastSeen') {
    logs.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
  } else {
    logs.sort((a, b) => b.count - a.count);
  }

  const items = logs.slice(0, limit);

  return jsonResponse({
    success: true,
    total: logs.length,
    items,
  });
}
