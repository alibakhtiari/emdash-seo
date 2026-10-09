import { describe, it, expect } from 'vitest';
import { requireSeoCapFor, canManageModule } from '../packages/emdash-seo/src/engine/auth.js';

describe('Role capability matrix', () => {
  it('allows admins everywhere and unknown callers through (server-side)', async () => {
    expect(await requireSeoCapFor({ user: { role: 'admin' } }, 'settings')).toBeNull();
    expect(await requireSeoCapFor({}, 'redirects')).toBeNull();
  });

  it('blocks editors from settings and non-editors from everything', async () => {
    const settings = await requireSeoCapFor({ user: { role: 'editor' } }, 'settings');
    expect(settings?.status).toBe(403);
    const viewer = await requireSeoCapFor({ user: { role: 'viewer' } }, 'audit');
    expect(viewer?.status).toBe(403);
  });

  it('allows editors on modules by default and honors stored caps', async () => {
    expect(await requireSeoCapFor({ user: { role: 'editor' } }, 'redirects')).toBeNull();
    const kv = new Map<string, unknown>([
      ['settings:seo_role_caps', JSON.stringify({ editor: { redirects: false } })],
    ]);
    const ctx = {
      user: { role: 'editor' },
      kv: { get: async (k: string) => kv.get(k) ?? null, set: async () => {} },
    };
    const denied = await requireSeoCapFor(ctx, 'redirects');
    expect(denied?.status).toBe(403);
    expect(canManageModule('editor', 'meta')).toBe(true);
    expect(canManageModule('editor', 'settings')).toBe(false);
  });
});
