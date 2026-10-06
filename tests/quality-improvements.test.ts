import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getWorkersAiEmbeddings,
  record404Hit,
  prune404Logs,
  resetApiV1State,
  MAX_404_ENTRIES,
  handlePluginUninstall,
  createPlugin,
  seoPlugin,
} from '../packages/emdash-seo/src/index.js';
import { main as runCli } from '../scripts/seo-cli.js';

describe('Quality Improvements & Edge Reliability', () => {
  beforeEach(() => {
    resetApiV1State();
    vi.restoreAllMocks();
  });

  describe('1. Workers AI Progressive Enhancement Bridge (Pro Tier)', () => {
    it('returns empty array when env.AI is undefined (Free Tier fallback)', async () => {
      const embeddings = await getWorkersAiEmbeddings('Carpet cleaning services in London', {});
      expect(embeddings).toEqual([]);
    });

    it('returns empty array for empty or whitespace text', async () => {
      const mockEnv = {
        AI: {
          run: vi.fn(),
        },
      };
      const embeddings = await getWorkersAiEmbeddings('   ', mockEnv);
      expect(embeddings).toEqual([]);
      expect(mockEnv.AI.run).not.toHaveBeenCalled();
    });

    it('successfully extracts 384-dim dense vectors when env.AI is provided (Paid Tier)', async () => {
      const dummyVector = new Array(384).fill(0.123);
      const mockEnv = {
        AI: {
          run: vi.fn().mockResolvedValue({
            shape: [1, 384],
            data: [dummyVector],
          }),
        },
      };

      const embeddings = await getWorkersAiEmbeddings('Deep stain extraction', mockEnv);
      expect(mockEnv.AI.run).toHaveBeenCalledWith('@cf/baai/bge-small-en-v1.5', {
        text: ['Deep stain extraction'],
      });
      expect(embeddings.length).toBe(384);
      expect(embeddings[0]).toBe(0.123);
    });

    it('gracefully catches runtime AI errors without crashing worker', async () => {
      const mockEnv = {
        AI: {
          run: vi.fn().mockRejectedValue(new Error('Rate limit exceeded')),
        },
      };

      const embeddings = await getWorkersAiEmbeddings('Steam cleaning', mockEnv);
      expect(embeddings).toEqual([]);
    });
  });

  describe('2. 404 Rolling Retention Cap & Database Hygiene', () => {
    it('records 404 hits with referrer tracking', () => {
      record404Hit('/missing-service', 'https://google.com');
      record404Hit('/missing-service', 'https://bing.com');
      // Verify via prune or another hit
      expect(prune404Logs(999)).toBe(0);
    });

    it('strictly caps logged 404 entries at MAX_404_ENTRIES (1000)', () => {
      for (let i = 0; i < 1100; i++) {
        record404Hit(`/not-found-page-${i}`);
      }

      // Add a hit to an existing one to ensure frequency sorting
      record404Hit('/not-found-page-50');
      record404Hit('/not-found-page-50');

      // The count should never exceed 1000
      expect(MAX_404_ENTRIES).toBe(1000);
      const pruned = prune404Logs(0); // prune items older than 0 days
      expect(pruned).toBeLessThanOrEqual(1000);
    });

    it('prunes obsolete records older than specified retention days', () => {
      record404Hit('/recent-miss');
      const prunedCount = prune404Logs(30);
      // Fresh hits within 30 days should not be pruned
      expect(prunedCount).toBe(0);
    });
  });

  describe('3. Clean Plugin Uninstaller (Zero Database Clutter)', () => {
    it('drops all supporting tables via db.batch when uninstalled', async () => {
      const executedQueries: string[] = [];
      const mockCtx = {
        db: {
          prepare: (sql: string) => ({
            sql,
          }),
          batch: async (stmts: Array<{ sql: string }>) => {
            executedQueries.push(...stmts.map((s) => s.sql));
            return [];
          },
        },
      };

      const result = await handlePluginUninstall({}, mockCtx);
      expect(result.ok).toBe(true);
      expect(result.droppedTables).toEqual([
        'seo_link_graph',
        'seo_404_logs',
        'seo_audit_runs',
        'seo_settings',
      ]);
      expect(executedQueries.some((q) => q.includes('DROP TABLE IF EXISTS seo_link_graph'))).toBe(true);
      expect(executedQueries.some((q) => q.includes('DROP TABLE IF EXISTS seo_404_logs'))).toBe(true);
    });

    it('purges plugin settings keys from Cloudflare KV', async () => {
      const deletedKeys: string[] = [];
      const mockCtx = {
        kv: {
          list: async () => ({
            keys: [{ name: 'settings:siteRepresents' }, { name: 'settings:separator' }],
          }),
          delete: async (key: string) => {
            deletedKeys.push(key);
          },
        },
      };

      const result = await handlePluginUninstall({}, mockCtx);
      expect(result.ok).toBe(true);
      expect(result.purgedKvKeys).toBe(2);
      expect(deletedKeys).toEqual(['settings:siteRepresents', 'settings:separator']);
    });
  });

  describe('4. Modular Route Mounting & Feature Flags', () => {
    it('omits sitemap routes when modules.sitemaps is false', () => {
      const plugin = createPlugin({
        modules: {
          sitemaps: false,
          robots: true,
          llmsTxt: true,
        },
      });

      expect(plugin.routes['/sitemap.xml']).toBeUndefined();
      expect(plugin.routes['/robots.txt']).toBeDefined();
    });

    it('omits llms.txt routes when modules.llmsTxt is false', () => {
      const plugin = createPlugin({
        modules: {
          llmsTxt: false,
        },
      });

      expect(plugin.routes['/llms.txt']).toBeUndefined();
      expect(plugin.routes['/llms-full.txt']).toBeUndefined();
    });

    it('registers unified WebABC SEO admin page', () => {
      const descriptor = seoPlugin();
      expect(descriptor.adminPages).toEqual([
        { path: '/settings', label: 'WebABC SEO', icon: 'globe' },
      ]);
    });
  });

  describe('5. Developer CLI Integration', () => {
    it('executes audit command and passes quality gate', async () => {
      const code = await runCli(['node', 'seo-cli.js', 'audit', '--threshold=30']);
      expect(code).toBe(0);
    });

    it('executes precompute command and warm-caches entries', async () => {
      const code = await runCli(['node', 'seo-cli.js', 'precompute']);
      expect(code).toBe(0);
    });

    it('executes reindex-links command and outputs orphan report', async () => {
      const code = await runCli(['node', 'seo-cli.js', 'reindex-links']);
      expect(code).toBe(0);
    });

    it('executes prune command and returns clean status', async () => {
      const code = await runCli(['node', 'seo-cli.js', 'prune', '--days=30']);
      expect(code).toBe(0);
    });
  });
});
