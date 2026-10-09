/**
 * In-handler SEO capability guard.
 * Route-level `permission: 'seo:manage'` (stamped in index.ts createPlugin)
 * depends on the host honoring it, so handlers call requireSeoCap(ctx)
 * directly at a second layer. Safe no-op shape: ctx without identity info
 * is treated as internal/server-side and allowed; explicit non-privileged
 * roles are rejected with 403. Usage:
 *   const denied = requireSeoCap(ctx);
 *   if (denied) return denied;
 */
export function hasSeoRole(role?: string | null): boolean {
  return role === 'admin' || role === 'editor';
}

export type SeoManageModule = 'settings' | 'redirects' | 'audit' | 'meta' | 'indexnow' | 'links';

/**
 * Per-module capability check (RankMath-style role matrix, minimal):
 * admins manage everything; editors manage everything except settings.
 */
export function canManageModule(role?: string | null, module?: SeoManageModule): boolean {
  if (role === 'admin') return true;
  if (role === 'editor') return module !== 'settings';
  return false;
}

function ctxRole(ctx: any): string | null | undefined {
  const c = ctx?.user?.role ?? ctx?.actor?.role ?? ctx?.role ?? ctx?.auth?.role;
  return typeof c === 'string' ? c : c === null ? null : undefined;
}

export function requireSeoCap(ctx: any): { status: number; body: string } | null {
  const role = ctxRole(ctx);
  if (role === undefined) return null;
  if (hasSeoRole(role)) return null;
  return { status: 403, body: JSON.stringify({ error: 'Forbidden: seo:manage capability required.' }) };
}
