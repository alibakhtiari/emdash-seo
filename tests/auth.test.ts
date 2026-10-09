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

describe('Weekly digest honesty', () => {
  it('reports skip reasons instead of fabricating sends', async () => {
    const { runSeoDigest } = await import('../packages/emdash-seo/src/index.js');
    const disabled = await runSeoDigest({}, { siteUrl: 'https://example.com', siteName: 'Ex' } as any);
    expect(disabled).toEqual({ ran: false, emailed: false, reason: 'digest disabled (digest_enabled not set)' });
    const noProvider = await runSeoDigest(
      {
        settings: { get: async (k: string) => (k === 'digest_enabled' ? '1' : k === 'digest_email' ? 'a@b.c' : null) },
        content: { list: async () => ({ items: [{ id: '1', slug: 'a', data: { title: 'A Sufficiently Long Page Title Here', content: 'Word '.repeat(400) } }] }) },
      },
      { siteUrl: 'https://example.com', siteName: 'Ex' } as any
    );
    expect(noProvider.ran).toBe(true);
    expect(noProvider.emailed).toBe(false);
    expect(noProvider.reason).toBe('email provider not configured');
  });
});
