import { describe, it, expect } from 'vitest';
import {
  buildPageUrl,
  shouldSkipSegment,
  generateAutoBreadcrumbs,
  getIndexNowKeyFileContent,
  buildLlmsTxt,
} from '../packages/emdash-seo/src/index.js';

describe('Cherry-Picked Joost de Valk Features', () => {
  describe('buildPageUrl (Collection & i18n URL Builder)', () => {
    const SITE = 'https://example.com';
    const CFG_NO_PREFIX = {
      defaultLocale: 'en',
      locales: ['en', 'fr', 'es'],
      prefixDefaultLocale: false,
    };
    const CFG_PREFIX_DEFAULT = {
      defaultLocale: 'en',
      locales: ['en', 'fr', 'es'],
      prefixDefaultLocale: true,
    };

    it('produces an unprefixed URL for default locale when prefixDefaultLocale is false', () => {
      const url = buildPageUrl({
        locale: 'en',
        slug: 'hello-world',
        siteUrl: SITE,
        cfg: CFG_NO_PREFIX,
        urlPattern: '/posts/{slug}',
      });
      expect(url).toBe('https://example.com/posts/hello-world/');
    });

    it('produces a prefixed URL for non-default locale', () => {
      const url = buildPageUrl({
        locale: 'fr',
        slug: 'bonjour',
        siteUrl: SITE,
        cfg: CFG_NO_PREFIX,
        urlPattern: '/posts/{slug}',
      });
      expect(url).toBe('https://example.com/fr/posts/bonjour/');
    });

    it('prefixes default locale when prefixDefaultLocale is true', () => {
      const url = buildPageUrl({
        locale: 'en',
        slug: 'hello',
        siteUrl: SITE,
        cfg: CFG_PREFIX_DEFAULT,
        urlPattern: '/{slug}',
      });
      expect(url).toBe('https://example.com/en/hello/');
    });

    it('normalizes uppercase, duplicate slashes, and enforces trailing slash', () => {
      const url = buildPageUrl({
        locale: 'en',
        slug: 'Acme-Widget',
        siteUrl: 'https://example.com///',
        cfg: CFG_NO_PREFIX,
        urlPattern: '/products//{slug}',
      });
      expect(url).toBe('https://example.com/products/acme-widget/');
    });

    it('rejects patterns without {slug} or with unsubstituted placeholders', () => {
      expect(
        buildPageUrl({
          locale: 'en',
          slug: 'test',
          siteUrl: SITE,
          cfg: CFG_NO_PREFIX,
          urlPattern: '/fixed-path',
        })
      ).toBeNull();

      expect(
        buildPageUrl({
          locale: 'en',
          slug: 'test',
          siteUrl: SITE,
          cfg: CFG_NO_PREFIX,
          urlPattern: '/{category}/{slug}',
        })
      ).toBeNull();
    });
  });

  describe('Smart Breadcrumb Segment Filtering & Overrides', () => {
    it('detects and skips pagination segments (/page/2)', () => {
      const segments = ['blog', 'page', '2'];
      expect(shouldSkipSegment('page', segments, 1)).toBe(true);
      expect(shouldSkipSegment('2', segments, 2)).toBe(true);
      expect(shouldSkipSegment('blog', segments, 0)).toBe(false);
    });

    it('detects and skips 4-digit year and 1-2 digit month date archive segments', () => {
      const segments = ['blog', '2026', '09', 'my-post'];
      expect(shouldSkipSegment('2026', segments, 1)).toBe(true);
      expect(shouldSkipSegment('09', segments, 2)).toBe(true);
      expect(shouldSkipSegment('blog', segments, 0)).toBe(false);
      expect(shouldSkipSegment('my-post', segments, 3)).toBe(false);
    });

    it('generates clean breadcrumb trail skipping date archive segments', () => {
      const crumbs = generateAutoBreadcrumbs(
        '/blog/2026/09/my-post/',
        'https://example.com',
        'My Great Post'
      );
      // Expected: Home > Blog > My Great Post
      expect(crumbs.map((c) => c.name)).toEqual(['Home', 'Blog', 'My Great Post']);
      expect(crumbs[1].url).toBe('https://example.com/blog/');
      expect(crumbs[2].url).toBe('https://example.com/blog/2026/09/my-post/');
    });

    it('respects custom breadcrumbLabels segment map', () => {
      const crumbs = generateAutoBreadcrumbs(
        '/dev-tools/open-source/',
        'https://example.com',
        'My Project',
        undefined,
        {
          breadcrumbLabels: {
            'dev-tools': 'Developer Tools',
          },
        }
      );
      expect(crumbs[1].name).toBe('Developer Tools');
    });

    it('applies custom per-pageType breadcrumbRules', () => {
      const crumbs = generateAutoBreadcrumbs(
        '/deep/nested/page/',
        'https://example.com',
        'Specific Article',
        undefined,
        {
          pageType: 'blogPost',
          breadcrumbRules: {
            blogPost: [
              { label: 'Home', href: '/' },
              { label: 'Knowledge Base', href: '/kb/' },
              { label: '{title}' },
            ],
          },
          canonicalUrl: 'https://example.com/deep/nested/page/',
        }
      );

      expect(crumbs.map((c) => c.name)).toEqual(['Home', 'Knowledge Base', 'Specific Article']);
      expect(crumbs[1].url).toBe('https://example.com/kb/');
      expect(crumbs[2].url).toBe('https://example.com/deep/nested/page/');
    });
  });

  describe('IndexNow Key File Body Helper', () => {
    it('returns trimmed key with trailing newline for verification file', () => {
      const key = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';
      const body = getIndexNowKeyFileContent(key);
      expect(body).toBe(`${key}\n`);
    });
  });

  describe('Dynamic llms.txt Markdown Generation (llmstxt.org spec)', () => {
    it('renders structured markdown with H1, blockquote, and H2 sections', () => {
      const output = buildLlmsTxt({
        siteName: 'Acme Corp',
        siteDescription: 'World-class widgets and services',
        sections: {
          Services: [
            { title: 'Cloud Hosting', url: 'https://example.com/services/cloud/', description: 'Fast cloud VPS' },
            { title: 'DNS Management', url: 'https://example.com/services/dns/' },
          ],
          Blog: [
            { title: 'Release 1.0', url: 'https://example.com/blog/v1/', description: 'Initial launch' },
          ],
        },
      });

      expect(output).toContain('# Acme Corp\n');
      expect(output).toContain('> World-class widgets and services\n');
      expect(output).toContain('## Services\n');
      expect(output).toContain('- [Cloud Hosting](https://example.com/services/cloud/): Fast cloud VPS');
      expect(output).toContain('- [DNS Management](https://example.com/services/dns/)');
      expect(output).toContain('## Blog\n');
      expect(output).toContain('- [Release 1.0](https://example.com/blog/v1/): Initial launch');
    });
  });

  describe('EmDash 1.1.0 HookPipeline & ResolvedHook Contract Compatibility', () => {
    it('ensures every hook registered by createPlugin provides dependencies: [] for sortHooks', async () => {
      const { createPlugin } = await import('../packages/emdash-seo/src/index.js');
      const plugin = createPlugin();

      expect(plugin.hooks).toBeDefined();
      const hookEntries = Object.entries(plugin.hooks);
      expect(hookEntries.length).toBeGreaterThan(0);

      for (const [_name, hook] of hookEntries) {
        expect(hook).toBeDefined();
        // EmDash 1.1.0 sortHooks does: hook.dependencies.every(...)
        // hook.dependencies MUST be an array, never undefined!
        expect(Array.isArray((hook as any).dependencies)).toBe(true);
        expect(typeof (hook as any).priority).toBe('number');
        expect(typeof (hook as any).handler).toBe('function');
        expect(typeof (hook as any).pluginId).toBe('string');

        // Verify executing every() never throws
        expect(() => {
          (hook as any).dependencies.every((dep: string) => dep.length > 0);
        }).not.toThrow();
      }
    });

    it('ensures plugin.storage is an empty record instead of invalid { collections: [] }', async () => {
      const { createPlugin } = await import('../packages/emdash-seo/src/index.js');
      const plugin = createPlugin();

      expect(plugin.storage).toBeDefined();
      // EmDash createStorageAccess does: for (const [name, config] of Object.entries(storageConfig))
      // It expects each entry to have config.indexes. If storage has { collections: [] }, it crashes!
      expect(Object.keys(plugin.storage)).toHaveLength(0);
    });
  });
});


