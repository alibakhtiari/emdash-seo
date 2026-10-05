/**
 * Clean Plugin Uninstaller
 * Reference: docs/EDGE_PERFORMANCE_AND_STORAGE_SPEC.md Section 3.4
 *
 * Purges all supporting database tables and records created by @emdash/plugin-seo.
 * Fulfills the strict "Zero Database Clutter" architectural principle.
 */

export interface UninstallResult {
  droppedTables: string[];
  purgedKvKeys: number;
  ok: boolean;
}

export async function handlePluginUninstall(
  _event?: any,
  ctx?: any
): Promise<UninstallResult> {
  const tables = ['seo_link_graph', 'seo_404_logs', 'seo_audit_runs', 'seo_settings'];
  const dropped: string[] = [];
  let purgedKvKeys = 0;

  if (ctx?.db) {
    if (typeof ctx.db.batch === 'function') {
      const stmts = tables.map((t) => ctx.db.prepare(`DROP TABLE IF EXISTS ${t};`));
      await ctx.db.batch(stmts);
      dropped.push(...tables);
    } else if (typeof ctx.db.prepare === 'function') {
      for (const t of tables) {
        await ctx.db.prepare(`DROP TABLE IF EXISTS ${t};`).run();
        dropped.push(t);
      }
    }
  }

  if (ctx?.kv) {
    try {
      if (typeof ctx.kv.list === 'function' && typeof ctx.kv.delete === 'function') {
        const res = await ctx.kv.list({ prefix: 'settings:' });
        const keys = Array.isArray(res) ? res : res?.keys || [];
        for (const item of keys) {
          const keyName = typeof item === 'string' ? item : item?.name || item?.key;
          if (keyName) {
            await ctx.kv.delete(keyName);
            purgedKvKeys++;
          }
        }
      }
    } catch {
      // Ignore non-fatal KV cleanup error
    }
  }

  return {
    droppedTables: dropped,
    purgedKvKeys,
    ok: true,
  };
}
