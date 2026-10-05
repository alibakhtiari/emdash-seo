import { describe, it, expect, beforeEach } from 'vitest';
import {
  handleSeoMetaGet,
  handleSeoMetaPut,
  handleStatelessAnalyze,
  handleLinkOpportunities,
  handleV1AuditRun,
  handleV1AuditLatest,
  handleV1Redirects,
  handleV1404s,
  resetApiV1State,
  record404Hit,
} from '../packages/emdash-seo/src/index.js';
import { DEFAULT_OPTIONS } from '../packages/emdash-seo/src/config.js';

describe('Unified REST API v1 (docs/EMDASH_ADMIN_AND_API_INTEGRATION.md)', () => {
  const options = {
    ...DEFAULT_OPTIONS,
    siteUrl: 'https://cleanpro.example.com',
    siteName: 'CleanPro London',
  };

  beforeEach(() => {
    resetApiV1State();
  });

  describe('1. handleSeoMetaGet (GET /_emdash/api/seo/v1/meta/:collection/:id)', () => {
    it('retrieves an entry SEO metadata, pre-computed head contributions, and schema graph', async () => {
      const mockEntry = {
        id: 'post-1',
        slug: 'posts/carpet-cleaning-tips',
        title: 'Top Carpet Cleaning Tips',
        createdAt: '2026-09-01T10:00:00.000Z',
        updatedAt: '2026-09-15T12:00:00.000Z',
        data: {
          title: 'Top Carpet Cleaning Tips',
          description: 'Learn how to remove stubborn stains and prolong carpet life.',
          seo: {
            metaTitle: 'Top Carpet Cleaning Tips | CleanPro',
            metaDescription: 'Learn how to remove stubborn stains and prolong carpet life.',
            focusKeywords: ['carpet cleaning tips'],
            noIndex: false,
            noFollow: false,
          },
        },
      };

      const ctx = {
        params: { collection: 'posts', id: 'post-1' },
        content: {
          get: async (col: string, id: string) => {
            if (col === 'posts' && id === 'post-1') return mockEntry;
            return null;
          },
        },
      };

      const res = await handleSeoMetaGet(ctx, options);
      expect(res.status).toBe(200);

      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.collection).toBe('posts');
      expect(json.id).toBe('post-1');
      expect(json.seo.metaTitle).toBe('Top Carpet Cleaning Tips | CleanPro');
      expect(json.seo.focusKeywords).toContain('carpet cleaning tips');
      expect(Array.isArray(json.head)).toBe(true);
      expect(json.schemaGraph).toBeDefined();
      expect(json.schemaGraph['@context']).toBe('https://schema.org');
    });

    it('extracts collection and id from URL path when not in ctx.params', async () => {
      const mockEntry = {
        id: 'service-deep-clean',
        slug: 'services/deep-clean',
        title: 'Deep Cleaning Service',
        data: {
          seo: {
            metaTitle: 'Professional Deep Cleaning Service',
            focusKeywords: ['deep cleaning'],
          },
        },
      };

      const ctx = {
        request: new Request('https://cleanpro.example.com/_emdash/api/seo/v1/meta/services/service-deep-clean'),
        content: {
          get: async (col: string, id: string) => {
            if (col === 'services' && id === 'service-deep-clean') return mockEntry;
            return null;
          },
        },
      };

      const res = await handleSeoMetaGet(ctx, options);
      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.collection).toBe('services');
      expect(json.id).toBe('service-deep-clean');
      expect(json.seo.metaTitle).toBe('Professional Deep Cleaning Service');
    });

    it('returns 404 when the entry is not found', async () => {
      const ctx = {
        params: { collection: 'posts', id: 'non-existent' },
        content: {
          get: async () => null,
        },
      };

      const res = await handleSeoMetaGet(ctx, options);
      expect(res.status).toBe(404);
      const json: any = await res.json();
      expect(json.error).toContain('Entry not found');
    });

    it('returns 400 when collection or id is missing', async () => {
      const ctx = {
        request: new Request('https://cleanpro.example.com/_emdash/api/seo/v1/meta/'),
      };

      const res = await handleSeoMetaGet(ctx, options);
      expect(res.status).toBe(400);
      const json: any = await res.json();
      expect(json.error).toContain('Missing required route parameters');
    });
  });

  describe('2. handleSeoMetaPut (PUT /_emdash/api/seo/v1/meta/:collection/:id)', () => {
    it('updates SEO metadata, saves to content repository, and recalculates head/schema', async () => {
      let storedEntry = {
        id: 'post-1',
        slug: 'posts/carpet-cleaning',
        title: 'Carpet Cleaning',
        data: {
          title: 'Carpet Cleaning',
          seo: {
            metaTitle: 'Old Title',
            focusKeywords: ['old keyword'],
            noIndex: false,
            noFollow: false,
          },
        },
      };

      const ctx = {
        params: { collection: 'posts', id: 'post-1' },
        request: new Request('https://cleanpro.example.com/_emdash/api/seo/v1/meta/posts/post-1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            seo: {
              metaTitle: 'Professional Carpet Cleaning London | CleanPro',
              metaDescription: 'Expert steam extraction and rapid drying in London.',
              focusKeywords: ['carpet cleaning london'],
              noIndex: true,
            },
          }),
        }),
        content: {
          get: async (_col: string, _id: string) => storedEntry,
          update: async (_col: string, _id: string, patch: any) => {
            storedEntry = {
              ...storedEntry,
              data: {
                ...storedEntry.data,
                ...patch.data,
              },
            };
            return storedEntry;
          },
        },
      };

      const res = await handleSeoMetaPut(ctx, options);
      expect(res.status).toBe(200);

      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.collection).toBe('posts');
      expect(json.id).toBe('post-1');
      expect(json.seo.metaTitle).toBe('Professional Carpet Cleaning London | CleanPro');
      expect(json.seo.metaDescription).toBe('Expert steam extraction and rapid drying in London.');
      expect(json.seo.noIndex).toBe(true);

      // Verify head and schema recomputation
      expect(Array.isArray(json.head)).toBe(true);
      const robotsContrib = json.head.find((c: any) => c.name === 'robots');
      expect(robotsContrib?.content).toContain('noindex');
    });

    it('returns 404 when updating non-existent entry', async () => {
      const ctx = {
        params: { collection: 'posts', id: 'missing-id' },
        request: new Request('https://cleanpro.example.com/_emdash/api/seo/v1/meta/posts/missing-id', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metaTitle: 'New Title' }),
        }),
        content: {
          get: async () => null,
        },
      };

      const res = await handleSeoMetaPut(ctx, options);
      expect(res.status).toBe(404);
      const json: any = await res.json();
      expect(json.error).toContain('Entry not found');
    });
  });

  describe('3. handleStatelessAnalyze (POST /_emdash/api/seo/v1/analyze)', () => {
    it('analyzes content according to section 3.2 specification', async () => {
      const requestPayload = {
        title: 'Professional Carpet Cleaning in London | Eco-Friendly Care',
        slug: 'carpet-cleaning-london',
        contentHtml:
          '<h2>Expert Carpet Cleaning</h2><p>Our <strong>hot water extraction</strong> process removes deep stains and <strong>pet odors</strong> efficiently. We specialize in steam cleaning carpets across London.</p>',
        focusKeywords: ['carpet cleaning london'],
        metaDescription:
          'Book professional carpet cleaning in London. Eco-friendly steam cleaning with quick drying times.',
      };

      const ctx = {
        request: new Request('https://cleanpro.example.com/_emdash/api/seo/v1/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload),
        }),
      };

      const res = await handleStatelessAnalyze(ctx, options);
      expect(res.status).toBe(200);

      const json: any = await res.json();

      // 1. Entity Coverage Index & Grade
      expect(typeof json.entityCoverageIndex).toBe('number');
      expect(json.entityCoverageIndex).toBeGreaterThanOrEqual(60);
      expect(['Good', 'OK', 'Needs Improvement']).toContain(json.grade);

      // 2. Entities Detected
      expect(Array.isArray(json.entitiesDetected)).toBe(true);
      expect(json.entitiesDetected.length).toBeGreaterThan(0);
      const entityNames = json.entitiesDetected.map((e: any) => e.name);
      expect(entityNames.some((name: string) => name.includes('hot water extraction') || name.includes('carpet cleaning'))).toBe(true);
      expect(typeof json.entitiesDetected[0].salienceScore).toBe('number');
      expect(typeof json.entitiesDetected[0].inHeadings).toBe('boolean');

      // 3. Entity Gaps
      expect(Array.isArray(json.entityGaps)).toBe(true);
      const gapNames = json.entityGaps.map((g: any) => g.entity);
      expect(gapNames.length).toBeGreaterThan(0);
      expect(json.entityGaps[0].recommendedCategory).toBeDefined();
      expect(['critical', 'recommended', 'optional']).toContain(json.entityGaps[0].importance);

      // 4. Readability
      expect(json.readability).toBeDefined();
      expect(typeof json.readability.fleschReadingEase).toBe('number');
      expect(json.readability.grade).toBeDefined();
      expect(typeof json.readability.hardSentencesCount).toBe('number');

      // 5. Technical Checks
      expect(json.technicalChecks).toBeDefined();
      expect(typeof json.technicalChecks.h1Valid).toBe('boolean');
      expect(typeof json.technicalChecks.imagesWithAlt).toBe('boolean');
      expect(json.technicalChecks.metaDescriptionLength).toBe(requestPayload.metaDescription.length);
    });

    it('returns 400 when missing required content fields', async () => {
      const ctx = {
        request: new Request('https://cleanpro.example.com/_emdash/api/seo/v1/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }),
      };

      const res = await handleStatelessAnalyze(ctx, options);
      expect(res.status).toBe(400);
      const json: any = await res.json();
      expect(json.error).toContain('Missing required fields');
    });
  });

  describe('4. handleLinkOpportunities (GET /_emdash/api/seo/v1/links/opportunities/:id)', () => {
    it('discovers contextual internal linking suggestions against published index', async () => {
      const currentEntry = {
        id: 'draft-sofa-care',
        title: 'Sofa & Fabric Care Guide',
        content:
          'When maintaining upholstered furniture, combine gentle vacuuming with professional carpet cleaning london to prevent dirt migration between rugs and chairs.',
      };

      const candidates = [
        {
          id: 'carpet-cleaning-page',
          collection: 'services',
          title: 'Carpet Cleaning London',
          slug: 'services/carpet-cleaning-london',
          focusKeywords: ['carpet cleaning london'],
        },
        {
          id: 'unrelated-post',
          collection: 'posts',
          title: 'Company News',
          slug: 'blog/news',
          focusKeywords: ['company news'],
        },
      ];

      const ctx = {
        params: { id: 'draft-sofa-care' },
        currentEntry,
        candidates,
      };

      const res = await handleLinkOpportunities(ctx, options);
      expect(res.status).toBe(200);

      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.id).toBe('draft-sofa-care');
      expect(json.total).toBe(1);
      expect(json.opportunities[0].targetId).toBe('carpet-cleaning-page');
      expect(json.opportunities[0].matchedKeyword.toLowerCase()).toBe('carpet cleaning london');
      expect(json.opportunities[0].snippet).toContain('carpet cleaning london');
    });

    it('returns 404 when entry cannot be found', async () => {
      const ctx = {
        params: { id: 'missing-doc' },
        content: {
          get: async () => null,
          list: async () => ({ items: [] }),
        },
      };

      const res = await handleLinkOpportunities(ctx, options);
      expect(res.status).toBe(404);
      const json: any = await res.json();
      expect(json.error).toContain('Entry not found');
    });

    it('returns 400 when id param is missing', async () => {
      const ctx = {
        request: new Request('https://cleanpro.example.com/_emdash/api/seo/v1/links/opportunities/'),
      };

      const res = await handleLinkOpportunities(ctx, options);
      expect(res.status).toBe(400);
      const json: any = await res.json();
      expect(json.error).toContain('Missing required route parameter');
    });
  });

  describe('5. handleV1AuditRun & 6. handleV1AuditLatest', () => {
    it('executes a sitewide technical SEO crawl and stores snapshot', async () => {
      const mockEntries = [
        {
          id: 'page-home',
          slug: '',
          title: 'CleanPro London | Home Cleaning Specialists',
          content: 'We provide premier professional home cleaning and carpet washing services across London with 100% satisfaction guarantees.',
          metaTitle: 'CleanPro London | Home Cleaning Specialists',
          metaDescription: 'Premier professional home cleaning and carpet washing services across London. Book online today.',
          focusKeywords: ['home cleaning specialists'],
        },
        {
          id: 'page-short-title',
          slug: 'about',
          title: 'About',
          content: 'Our company has been operating in the local region for over ten years offering quality services.',
          metaTitle: 'About',
          metaDescription: '',
          focusKeywords: [],
        },
      ];

      const ctx = {
        entries: mockEntries,
      };

      // 1. Run Audit
      const runRes = await handleV1AuditRun(ctx, options);
      expect(runRes.status).toBe(200);

      const runJson: any = await runRes.json();
      expect(runJson.success).toBe(true);
      expect(runJson.audit).toBeDefined();
      expect(typeof runJson.audit.healthScore).toBe('number');
      expect(runJson.audit.totalPages).toBe(2);
      expect(runJson.audit.report.length).toBe(2);

      // Verify detected issues in about page
      const aboutReport = runJson.audit.report.find((p: any) => p.url === '/about');
      expect(aboutReport).toBeDefined();
      expect(aboutReport.issues.some((i: string) => i.includes('Missing meta description') || i.includes('short'))).toBe(true);

      // 2. Fetch Latest Audit
      const latestRes = await handleV1AuditLatest({}, options);
      expect(latestRes.status).toBe(200);
      const latestJson: any = await latestRes.json();
      expect(latestJson.success).toBe(true);
      expect(latestJson.audit.id).toBe(runJson.audit.id);
      expect(latestJson.audit.healthScore).toBe(runJson.audit.healthScore);
    });

    it('returns audit: null when latest is called before any audit was executed', async () => {
      const res = await handleV1AuditLatest({}, options);
      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.audit).toBeNull();
      expect(json.message).toContain('No sitewide audit has been executed yet');
    });
  });

  describe('7. handleV1Redirects (GET / POST /_emdash/api/seo/v1/redirects)', () => {
    it('lists configured edge redirects with pagination', async () => {
      const ctx = {
        request: new Request('https://cleanpro.example.com/_emdash/api/seo/v1/redirects?page=1&limit=10'),
      };

      const res = await handleV1Redirects(ctx, options);
      expect(res.status).toBe(200);

      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.page).toBe(1);
      expect(json.limit).toBe(10);
      expect(json.total).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(json.items)).toBe(true);
      expect(json.items[0].pattern).toBeDefined();
      expect(json.items[0].destination).toBeDefined();
    });

    it('creates a new single redirect rule via POST', async () => {
      const ctx = {
        request: new Request('https://cleanpro.example.com/_emdash/api/seo/v1/redirects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pattern: '/old-service-page',
            destination: '/services/new-cleaning-page',
            statusCode: 301,
          }),
        }),
      };

      const res = await handleV1Redirects(ctx, options);
      expect(res.status).toBe(201);

      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.count).toBe(1);
      expect(json.rules[0].pattern).toBe('/old-service-page');
      expect(json.rules[0].destination).toBe('/services/new-cleaning-page');
      expect(json.rules[0].statusCode).toBe(301);

      // Verify rule is now present in GET list
      const getRes = await handleV1Redirects(
        { request: new Request('https://cleanpro.example.com/_emdash/api/seo/v1/redirects') },
        options
      );
      const getJson: any = await getRes.json();
      expect(getJson.items.some((r: any) => r.pattern === '/old-service-page')).toBe(true);
    });

    it('batch-imports multiple redirect rules via POST', async () => {
      const ctx = {
        request: new Request('https://cleanpro.example.com/_emdash/api/seo/v1/redirects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rules: [
              { from: '/old-1', to: '/new-1', type: 301 },
              { from: '/old-2', to: '/new-2', type: 302 },
            ],
          }),
        }),
      };

      const res = await handleV1Redirects(ctx, options);
      expect(res.status).toBe(201);

      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.count).toBe(2);
      expect(json.rules[0].destination).toBe('/new-1');
      expect(json.rules[1].destination).toBe('/new-2');
      expect(json.rules[1].statusCode).toBe(302);
    });

    it('returns 400 when redirect payload is missing required pattern or destination', async () => {
      const ctx = {
        request: new Request('https://cleanpro.example.com/_emdash/api/seo/v1/redirects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pattern: '/only-source-without-destination' }),
        }),
      };

      const res = await handleV1Redirects(ctx, options);
      expect(res.status).toBe(400);
      const json: any = await res.json();
      expect(json.error).toContain('Each redirect rule must define a source pattern');
    });
  });

  describe('8. handleV1404s (GET /_emdash/api/seo/v1/404s)', () => {
    it('retrieves top missed 404 URLs with hit counts and referrers', async () => {
      record404Hit('/missing-pricing-table', 'https://google.com/search?q=prices');
      record404Hit('/missing-pricing-table', 'https://google.com/search?q=prices');
      record404Hit('/broken-link-sample', 'https://example.org/blog');

      const ctx = {
        request: new Request('https://cleanpro.example.com/_emdash/api/seo/v1/404s?limit=10&orderBy=count'),
      };

      const res = await handleV1404s(ctx, options);
      expect(res.status).toBe(200);

      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.total).toBeGreaterThanOrEqual(2);
      expect(Array.isArray(json.items)).toBe(true);

      const hit = json.items.find((item: any) => item.path === '/missing-pricing-table');
      expect(hit).toBeDefined();
      expect(hit.count).toBeGreaterThanOrEqual(2);
      expect(hit.topReferrer).toContain('google.com');
      expect(hit.lastSeen).toBeDefined();
    });

    it('respects limit parameter', async () => {
      const ctx = {
        request: new Request('https://cleanpro.example.com/_emdash/api/seo/v1/404s?limit=1'),
      };

      const res = await handleV1404s(ctx, options);
      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.items.length).toBe(1);
    });
  });
});
