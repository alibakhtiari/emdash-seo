import { describe, it, expect } from 'vitest';
import {
  buildAuthorNode,
  buildHowToNode,
  inferSchemaType,
} from '../packages/emdash-seo/src/engine/schema-nodes.js';
import { buildConnectedSchemaGraph } from '../packages/emdash-seo/src/engine/schema-builder.js';
import { handleContentBeforeSave } from '../packages/emdash-seo/src/hooks/content-hooks.js';
import { DEFAULT_OPTIONS, DEFAULT_LOCAL_BUSINESS } from '../packages/emdash-seo/src/config.js';
import type { AuthorProfile, HowToStep } from '../packages/emdash-seo/src/types.js';

describe('Author E-E-A-T, Schema-Per-Page & GEO/AEO Integration', () => {
  const authorProfile: AuthorProfile = {
    name: 'Dr. Emily Watson',
    jobTitle: 'Senior Textile Conservator',
    worksFor: 'British Heritage Restoration Guild',
    image: 'https://example.com/authors/emily-watson.jpg',
    url: 'https://example.com/author/dr-emily-watson/',
    sameAs: [
      'https://www.linkedin.com/in/emily-watson',
      'https://twitter.com/emilywatson_rugs',
    ],
    knowsAbout: ['Textile Conservation', 'Persian Rug Restoration', 'Natural Wool Dyes'],
  };

  const reviewerProfile: AuthorProfile = {
    name: 'Marcus Vance',
    jobTitle: 'Master Rug Appraiser & Auditor',
    worksFor: 'Oriental Rug Historical Society',
    url: 'https://example.com/author/marcus-vance/',
  };

  const sampleSteps: HowToStep[] = [
    { position: 1, name: 'Dry soil removal', text: 'Thoroughly beat or vacuum the backside of the rug.' },
    { position: 2, name: 'Cold water submersion', text: 'Gently rinse with pure cold water.' },
  ];

  describe('1. buildAuthorNode', () => {
    it('constructs a Google-compliant Person entity with complete E-E-A-T credentials', () => {
      const node = buildAuthorNode(authorProfile, 'https://example.com');

      expect(node['@type']).toBe('Person');
      expect(node['@id']).toBe('https://example.com/author/dr-emily-watson#author');
      expect(node.name).toBe('Dr. Emily Watson');
      expect(node.jobTitle).toBe('Senior Textile Conservator');
      expect(node.worksFor['@type']).toBe('Organization');
      expect(node.worksFor.name).toBe('British Heritage Restoration Guild');
      expect(node.image['@type']).toBe('ImageObject');
      expect(node.image.url).toBe('https://example.com/authors/emily-watson.jpg');
      expect(node.sameAs).toContain('https://www.linkedin.com/in/emily-watson');
      expect(node.knowsAbout).toContain('Textile Conservation');
    });

    it('falls back to site organization when worksFor is not specified', () => {
      const simpleAuthor: AuthorProfile = { name: 'Editorial Staff' };
      const node = buildAuthorNode(simpleAuthor, 'https://example.com');

      expect(node['@type']).toBe('Person');
      expect(node.worksFor['@id']).toBe('https://example.com/#organization');
    });
  });

  describe('2. buildHowToNode', () => {
    it('constructs HowTo and HowToStep entities with sequential ordering', () => {
      const node = buildHowToNode(
        sampleSteps,
        'https://example.com/guides/clean-rugs/',
        'How to Wash Rugs',
        'Step by step rug washing procedure'
      );

      expect(node['@type']).toBe('HowTo');
      expect(node['@id']).toBe('https://example.com/guides/clean-rugs#howto');
      expect(node.name).toBe('How to Wash Rugs');
      expect(node.step.length).toBe(2);
      expect(node.step[0]['@type']).toBe('HowToStep');
      expect(node.step[0].position).toBe(1);
      expect(node.step[0].name).toBe('Dry soil removal');
    });
  });

  describe('3. inferSchemaType', () => {
    it('infers specific Schema types from path patterns when explicit type is absent', () => {
      expect(inferSchemaType('/about')).toBe('AboutPage');
      expect(inferSchemaType('/about-our-company/')).toBe('AboutPage');
      expect(inferSchemaType('/contact')).toBe('ContactPage');
      expect(inferSchemaType('/contact-us/')).toBe('ContactPage');
      expect(inferSchemaType('/services/persian-rug-cleaning/')).toBe('Service');
      expect(inferSchemaType('/blog/how-to-remove-stains/')).toBe('BlogPosting');
      expect(inferSchemaType('/posts/winter-carpet-care/')).toBe('BlogPosting');
      expect(inferSchemaType('/author/emily-watson/')).toBe('ProfilePage');
    });

    it('honors explicit schema type overrides', () => {
      expect(inferSchemaType('/blog/some-tech-article', 'TechArticle')).toBe('TechArticle');
      expect(inferSchemaType('/news/annual-report', 'NewsArticle')).toBe('NewsArticle');
    });
  });

  describe('4. buildConnectedSchemaGraph with Author, Reviewer & Voice Speakable', () => {
    it('integrates Author, Fact-Checker Reviewer, and Speakable Voice specification into connected graph', () => {
      const graphResult = buildConnectedSchemaGraph({
        siteUrl: 'https://example.com',
        siteName: 'CleanCo',
        canonicalUrl: 'https://example.com/blog/persian-rug-guide/',
        title: 'Complete Persian Rug Guide',
        description: 'Comprehensive care guide for Persian rugs.',
        pathname: '/blog/persian-rug-guide/',
        author: authorProfile,
        reviewedBy: reviewerProfile,
        speakableSelectors: ['#field-excerpt', '.post-lead', '.aeo-summary'],
        howToSteps: sampleSteps,
        business: DEFAULT_LOCAL_BUSINESS,
        seo: {
          schemaType: 'TechArticle',
          focusKeywords: ['persian rugs'],
          noIndex: false,
          noFollow: false,
        },
      });

      const nodes = graphResult['@graph'] as any[];

      // 1. Author Person Node in graph
      const authorNode = nodes.find(
        (n) => n['@type'] === 'Person' && n.name === 'Dr. Emily Watson'
      );
      expect(authorNode).toBeDefined();
      expect(authorNode.jobTitle).toBe('Senior Textile Conservator');

      // 2. Reviewer Person Node in graph
      const reviewerNode = nodes.find(
        (n) => n['@type'] === 'Person' && n.name === 'Marcus Vance'
      );
      expect(reviewerNode).toBeDefined();
      expect(reviewerNode.jobTitle).toBe('Master Rug Appraiser & Auditor');

      // 3. WebPage Node contains Speakable Specification
      const webPageNode = nodes.find((n) => n['@type'] === 'WebPage');
      expect(webPageNode).toBeDefined();
      expect(webPageNode.speakable['@type']).toBe('SpeakableSpecification');
      expect(webPageNode.speakable.cssSelector).toEqual([
        '#field-excerpt',
        '.post-lead',
        '.aeo-summary',
      ]);

      // 4. TechArticle entity is connected to author, reviewer, and webpage
      const articleNode = nodes.find((n) => n['@type'] === 'TechArticle');
      expect(articleNode).toBeDefined();
      expect(articleNode.isPartOf['@id']).toBe('https://example.com/blog/persian-rug-guide#webpage');
      expect(articleNode.author['@id']).toBe(authorNode['@id']);
      expect(articleNode.author.name).toBe('Dr. Emily Watson');
      expect(articleNode.reviewedBy['@id']).toBe(reviewerNode['@id']);
      expect(articleNode.reviewedBy.name).toBe('Marcus Vance');

      // 5. HowTo Node in graph
      const howToNode = nodes.find((n) => n['@type'] === 'HowTo');
      expect(howToNode).toBeDefined();
      expect(howToNode.step.length).toBe(2);
    });
  });

  describe('5. Automated Content Lifecycle Hooks (Write-Time Content Preparation)', () => {
    it('automatically assigns author, infers schema type, extracts FAQs and HowTo steps on save', async () => {
      const rawEntry = {
        id: 'guide-202',
        slug: 'how-to-clean-persian-rugs',
        author: 'Sarah Jenkins',
        data: {
          title: 'How to Clean Persian Rugs at Home',
          excerpt: 'Safe, natural cleaning steps for delicate Persian rugs.',
          content: `
# Cleaning Guide
We tested 100 rugs and observed 90% better results with neutral pH water.

## What water temperature is best?
Always use cold or lukewarm water to prevent wool fiber shrinkage.

### Step 1: Pre-dusting
Gently shake or vacuum the underside of the rug.

### Step 2: Sponge application
Use a soft natural sponge with diluted wool wash.
`,
          seo: {
            focusKeywords: ['clean Persian rugs'],
            noIndex: false,
            noFollow: false,
          },
        },
      };

      const processed = await handleContentBeforeSave(
        { content: rawEntry },
        {
          ...DEFAULT_OPTIONS,
          defaultAuthor: {
            name: 'Editorial Team',
            jobTitle: 'Senior Care Specialist',
          },
        }
      );

      // Auto-resolved author from entry
      expect(processed.data.seo.author).toBeDefined();
      expect(processed.data.seo.author.name).toBe('Sarah Jenkins');

      // Auto-inferred schema type
      expect(processed.data.seo.schemaType).toBe('BlogPosting');

      // Auto-extracted FAQs
      expect(processed.data.seo.faqs.length).toBeGreaterThanOrEqual(1);
      expect(processed.data.seo.faqs[0].question).toContain('What water temperature is best?');

      // Auto-extracted HowTo steps
      expect(processed.data.seo.howToSteps.length).toBe(2);
      expect(processed.data.seo.howToSteps[0].name).toBe('Pre-dusting');

      // Auto-computed GEO & AEO metrics
      expect(processed.data.seo.geoOptimization).toBeDefined();
      expect(processed.data.seo.geoOptimization.score).toBeGreaterThan(0);
      expect(processed.data.seo.aeoOptimization).toBeDefined();

      // Pre-computed edge cache ready
      expect(processed.data.seo._cachedHead).toContain('<title>');
      expect(processed.data.seo._cachedSchemaGraph).toContain('"@type":"Person"');
      expect(processed.data.seo._cachedSchemaGraph).toContain('Sarah Jenkins');
    });
  });
});
