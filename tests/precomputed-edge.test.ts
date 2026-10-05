import { describe, it, expect } from 'vitest';
import {
  compilePrecomputedHead,
  compilePrecomputedSchemaGraph,
  computeContentHash,
  isCacheValid,
} from '../packages/emdash-seo/src/engine/head-compiler.js';
import { DEFAULT_OPTIONS, DEFAULT_LOCAL_BUSINESS } from '../packages/emdash-seo/src/config.js';
import { createPlugin } from '../packages/emdash-seo/src/index.js';

describe('Pre-Computed Edge Delivery Architecture (docs/EDGE_PERFORMANCE_AND_STORAGE_SPEC.md)', () => {
  const sampleEntry = {
    id: 'post-101',
    collection: 'blog',
    slug: 'carpet-cleaning-tips',
    createdAt: '2026-03-15T10:00:00Z',
    updatedAt: '2026-03-16T12:00:00Z',
    author: 'Sarah Jenkins',
    data: {
      title: 'Top Carpet Cleaning Tips for Pet Owners',
      excerpt: 'Discover expert tips for removing tough pet stains and odours.',
      featured_image: 'https://example.com/images/pet-carpet.jpg',
      category: 'Pet Care',
      content: `## Why Pet Stains Require Fast Action
Stains should be treated immediately with enzyme cleaners.
## Recommended Tools
Use a steam extractor.`,
      seo: {
        metaTitle: 'Pet Carpet Cleaning Tips & Stain Guide',
        metaDescription: 'Complete guide to removing pet stains from carpets quickly.',
        canonicalUrl: 'https://example.com/blog/carpet-cleaning-tips/',
        focusKeywords: ['pet stains', 'carpet cleaning'],
        noIndex: false,
        noFollow: false,
        ogTitle: 'Pet Stain Removal Guide',
        ogDescription: 'Expert guide for pet owners.',
        ogImage: 'https://example.com/images/pet-carpet-og.jpg',
        ogType: 'article' as const,
        twitterCard: 'summary_large_image' as const,
        schemaType: 'Article' as const,
        faqs: [
          { question: 'What removes old dog urine?', answer: 'An enzymatic cleaner works best.' },
        ],
      },
    },
  };

  describe('1. compilePrecomputedHead', () => {
    it('generates complete HTML string with <title>, <meta>, <link rel="canonical">, OG, and Twitter tags', () => {
      const html = compilePrecomputedHead(sampleEntry, DEFAULT_OPTIONS);

      // Core Meta
      expect(html).toContain('<title>Pet Carpet Cleaning Tips &amp; Stain Guide | EmDash CMS Site</title>');
      expect(html).toContain('<meta name="description" content="Complete guide to removing pet stains from carpets quickly." />');
      expect(html).toContain('<link rel="canonical" href="https://example.com/blog/carpet-cleaning-tips/" />');
      expect(html).toContain('<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />');

      // OpenGraph
      expect(html).toContain('<meta property="og:title" content="Pet Stain Removal Guide" />');
      expect(html).toContain('<meta property="og:description" content="Expert guide for pet owners." />');
      expect(html).toContain('<meta property="og:url" content="https://example.com/blog/carpet-cleaning-tips/" />');
      expect(html).toContain('<meta property="og:site_name" content="EmDash CMS Site" />');
      expect(html).toContain('<meta property="og:type" content="article" />');
      expect(html).toContain('<meta property="og:locale" content="en_GB" />');
      expect(html).toContain('<meta property="og:image" content="https://example.com/images/pet-carpet-og.jpg" />');
      expect(html).toContain('<meta property="og:image:width" content="1200" />');
      expect(html).toContain('<meta property="og:image:height" content="630" />');
      expect(html).toContain('<meta property="article:published_time" content="2026-03-15T10:00:00Z" />');
      expect(html).toContain('<meta property="article:modified_time" content="2026-03-16T12:00:00Z" />');
      expect(html).toContain('<meta property="article:author" content="Sarah Jenkins" />');

      // Twitter Card
      expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
      expect(html).toContain('<meta name="twitter:title" content="Pet Stain Removal Guide" />');
      expect(html).toContain('<meta name="twitter:description" content="Expert guide for pet owners." />');
      expect(html).toContain('<meta name="twitter:image" content="https://example.com/images/pet-carpet-og.jpg" />');
    });

    it('suppresses canonical URL and applies noindex when noIndex is true', () => {
      const noIndexEntry = {
        ...sampleEntry,
        data: {
          ...sampleEntry.data,
          seo: {
            ...sampleEntry.data.seo,
            noIndex: true,
            noFollow: true,
          },
        },
      };

      const html = compilePrecomputedHead(noIndexEntry, DEFAULT_OPTIONS);
      expect(html).not.toContain('<link rel="canonical"');
      expect(html).toContain('<meta name="robots" content="noindex, nofollow');
    });

    it('resolves %title% %separator% %siteName% template tokens', () => {
      const templatedEntry = {
        data: {
          title: 'Special Carpet Care',
          excerpt: 'Short summary here.',
          seo: {
            metaTitle: '%title% %sep% %siteName%',
            metaDescription: 'Description',
            focusKeywords: [],
            noIndex: false,
            noFollow: false,
          },
        },
      };

      const html = compilePrecomputedHead(templatedEntry, {
        siteUrl: 'https://mysite.com',
        siteName: 'CleanPro',
        defaultSeparator: ' — ',
      });

      expect(html).toContain('<title>Special Carpet Care — CleanPro</title>');
    });

    it('includes NLWeb and alternate hreflang tags when provided', () => {
      const entryWithAlternates = {
        ...sampleEntry,
        alternateLinks: [
          { hreflang: 'en-GB', href: 'https://example.com/blog/carpet-cleaning-tips/' },
          { hreflang: 'fr-FR', href: 'https://example.com/fr/blog/carpet-cleaning-tips/' },
        ],
      };

      const html = compilePrecomputedHead(entryWithAlternates, {
        ...DEFAULT_OPTIONS,
        nlwebEndpoint: 'https://example.com/.well-known/nlweb.json',
      });

      expect(html).toContain('<link rel="nlweb" href="https://example.com/.well-known/nlweb.json" />');
      expect(html).toContain('<link rel="alternate" hreflang="en-GB" href="https://example.com/blog/carpet-cleaning-tips/" />');
      expect(html).toContain('<link rel="alternate" hreflang="fr-FR" href="https://example.com/fr/blog/carpet-cleaning-tips/" />');
    });

    it('escapes special characters to prevent HTML injection', () => {
      const unsafeEntry = {
        data: {
          title: 'Tips & Tricks <script>alert("xss")</script>',
          excerpt: 'Quote "test" & <ampersand>',
          seo: {
            metaTitle: 'Bed & Breakfast "Special" <Deal>',
            metaDescription: 'Fast & clean "quotes"',
            focusKeywords: [],
            noIndex: false,
            noFollow: false,
          },
        },
      };

      const html = compilePrecomputedHead(unsafeEntry, DEFAULT_OPTIONS);
      expect(html).toContain('Bed &amp; Breakfast &quot;Special&quot; &lt;Deal&gt;');
      expect(html).toContain('Fast &amp; clean &quot;quotes&quot;');
      expect(html).not.toContain('<script>');
    });
  });

  describe('2. compilePrecomputedSchemaGraph', () => {
    it('generates raw JSON-LD <script type="application/ld+json"> tag containing connected @graph', () => {
      const scriptTag = compilePrecomputedSchemaGraph(sampleEntry, {
        ...DEFAULT_OPTIONS,
        business: DEFAULT_LOCAL_BUSINESS,
      });

      expect(scriptTag.startsWith('<script type="application/ld+json">')).toBe(true);
      expect(scriptTag.endsWith('</script>')).toBe(true);

      const jsonString = scriptTag
        .replace('<script type="application/ld+json">', '')
        .replace(/<\/script>$/, '');

      const parsed = JSON.parse(jsonString);
      expect(parsed['@context']).toBe('https://schema.org');
      expect(Array.isArray(parsed['@graph'])).toBe(true);

      const nodes = parsed['@graph'] as any[];
      const types = nodes.map((n) => (Array.isArray(n['@type']) ? n['@type'].join(',') : n['@type']));

      expect(types.some((t) => t.includes('WebSite'))).toBe(true);
      expect(types.some((t) => t.includes('LocalBusiness') || t.includes('Organization'))).toBe(true);
      expect(types.some((t) => t.includes('WebPage'))).toBe(true);
      expect(types.some((t) => t.includes('BreadcrumbList'))).toBe(true);
      expect(types.some((t) => t.includes('Article'))).toBe(true);
      expect(types.some((t) => t.includes('FAQPage'))).toBe(true);
      expect(types.some((t) => t.includes('ItemList'))).toBe(true); // From TOC headings

      // Check connected @id references
      const webpageNode = nodes.find((n) => n['@type'] === 'WebPage');
      expect(webpageNode.isPartOf['@id']).toBe('https://example.com/#website');
      expect(webpageNode.about['@id']).toBe('https://example.com/#organization');

      const articleNode = nodes.find((n) => n['@type'] === 'Article');
      expect(articleNode.isPartOf['@id']).toBe('https://example.com/blog/carpet-cleaning-tips#webpage');
      expect(articleNode.author.name).toBe('Sarah Jenkins');
    });

    it('prevents script tag breakout by escaping closing tags', () => {
      const entryWithScript = {
        data: {
          title: 'Test </script><script>alert(1)</script>',
          seo: {
            focusKeywords: [],
            noIndex: false,
            noFollow: false,
          },
        },
      };

      const scriptTag = compilePrecomputedSchemaGraph(entryWithScript, DEFAULT_OPTIONS);
      // Ensure the inner json string does not have raw </script>
      const innerContent = scriptTag.slice(
        '<script type="application/ld+json">'.length,
        scriptTag.length - '</script>'.length
      );
      expect(innerContent).not.toContain('</script>');
    });
  });

  describe('3. computeContentHash and Cache Invalidation', () => {
    it('computes deterministic 8-character hex hash using DJB2 algorithm', () => {
      const hash1 = computeContentHash('Hello World');
      const hash2 = computeContentHash('Hello World');
      expect(hash1).toHaveLength(8);
      expect(hash1).toBe(hash2);
      expect(/^[0-9a-f]{8}$/.test(hash1)).toBe(true);
    });

    it('produces a different hash when content changes (invalidation trigger)', () => {
      const initial = computeContentHash('Original content body v1');
      const modified = computeContentHash('Original content body v2');
      expect(initial).not.toBe(modified);
    });

    it('handles empty and null inputs safely', () => {
      expect(computeContentHash('')).toBe('00001505');
      expect(computeContentHash(null)).toBe('00000000');
      expect(computeContentHash(undefined)).toBe('00000000');
    });

    it('verifies cache validity with isCacheValid helper', () => {
      const contentStr = 'Article body text';
      const hash = computeContentHash(contentStr);

      const validEntry = {
        data: {
          seo: {
            _cachedHead: '<title>Test</title>',
            _cachedSchemaGraph: '<script type="application/ld+json">{}</script>',
            _cachedHash: hash,
          },
        },
      };

      // Valid case: hash matches
      expect(isCacheValid(validEntry, contentStr)).toBe(true);

      // Invalidation case: content changed
      expect(isCacheValid(validEntry, 'Updated article body text')).toBe(false);

      // Invalid case: cache fields missing
      const invalidEntry = { data: { seo: {} } };
      expect(isCacheValid(invalidEntry, contentStr)).toBe(false);
    });

    it('executes 1,000 hashes in under 10ms (sub-0.01ms per hash)', () => {
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        computeContentHash(`Benchmarking iteration number ${i} with sample blog content`);
      }
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(10);
    });
  });

  describe('4. Write-Time content:beforeSave Hook & Read-Time Edge Fast Path', () => {
    it('automatically compiles _cachedHead and _cachedSchemaGraph during content:beforeSave', async () => {
      const plugin = createPlugin(DEFAULT_OPTIONS);
      const hook = plugin.hooks['content:beforeSave'];

      const rawEntry = {
        content: {
          id: 'carpet-clean',
          collection: 'services',
          slug: 'carpet-cleaning',
          data: {
            title: 'Carpet Cleaning Service',
            excerpt: 'Professional deep carpet cleaning in London.',
            content: 'Expert carpet washing with hot water extraction.',
            seo: {
              metaTitle: 'Carpet Cleaning in London | Top Rated',
              metaDescription: 'Professional carpet cleaning services.',
              focusKeywords: ['carpet cleaning london'],
              noIndex: false,
              noFollow: false,
            },
          },
        },
      };

      const result = await hook.handler(rawEntry);
      const savedSeo = result.data.seo;

      expect(savedSeo._cachedHead).toBeDefined();
      expect(savedSeo._cachedSchemaGraph).toBeDefined();
      expect(savedSeo._cachedAt).toBeDefined();
      expect(savedSeo._cachedHash).toBeDefined();

      expect(savedSeo._cachedHead).toContain('<title>Carpet Cleaning in London | Top Rated | EmDash CMS Site</title>');
      expect(savedSeo._cachedHead).toContain('<link rel="canonical"');
      expect(savedSeo._cachedSchemaGraph).toContain('<script type="application/ld+json">');
      expect(savedSeo._cachedHash).toBe(computeContentHash('Expert carpet washing with hot water extraction.'));
    });

    it('fast-path execution: pre-computed string access completes in sub-0.05ms', () => {
      const head = compilePrecomputedHead(sampleEntry, DEFAULT_OPTIONS);
      const schema = compilePrecomputedSchemaGraph(sampleEntry, DEFAULT_OPTIONS);

      const entryWithCache = {
        data: {
          seo: {
            _cachedHead: head,
            _cachedSchemaGraph: schema,
          },
        },
      };

      // Simulates the reading of cached chunks in SeoHead.astro
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        const cachedHead = entryWithCache.data.seo._cachedHead;
        const cachedSchema = entryWithCache.data.seo._cachedSchemaGraph;
        const hasPrecomputed = Boolean(cachedHead && cachedSchema);
        expect(hasPrecomputed).toBe(true);
      }
      const elapsed = performance.now() - start;
      const perIterationMs = elapsed / 100;

      // Ensure reading cached strings takes well under 0.05ms per request
      expect(perIterationMs).toBeLessThan(0.05);
    });
  });
});
