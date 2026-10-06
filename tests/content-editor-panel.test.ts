import { describe, it, expect } from 'vitest';
import {
  extractTextFromContent,
  extractAllImagesFromContent,
  contentEditorPanels,
  ContentEditorSeoPanel,
} from '../packages/emdash-seo/src/admin.js';
import { seoPlugin, createPlugin, analyzeContent } from '../packages/emdash-seo/src/index.js';

describe('EmDash Content Editor Sidebar SEO Panel & Integration', () => {
  describe('1. Content Extraction from CMS Entry', () => {
    it('extracts plain string content directly', () => {
      const raw = 'This is a sample blog post text for SEO readability testing.';
      const extracted = extractTextFromContent(raw);
      expect(extracted).toBe(raw);
    });

    it('extracts text from Sanity/EmDash PortableText blocks', () => {
      const blocks = [
        {
          _type: 'block',
          style: 'h2',
          children: [{ _type: 'span', text: 'Section Heading' }],
        },
        {
          _type: 'block',
          style: 'normal',
          children: [
            { _type: 'span', text: 'First paragraph with ' },
            { _type: 'span', text: 'inline bold text.' },
          ],
        },
      ];

      const extracted = extractTextFromContent(blocks);
      expect(extracted).toContain('Section Heading');
      expect(extracted).toContain('First paragraph with inline bold text.');
    });

    it('handles null, undefined, or empty content gracefully', () => {
      expect(extractTextFromContent(null)).toBe('');
      expect(extractTextFromContent(undefined)).toBe('');
      expect(extractTextFromContent([])).toBe('');
      expect(extractTextFromContent({})).toBe('');
    });
  });

  describe('2. Image Extraction from CMS Entry', () => {
    it('extracts featured image with alt from entry data', () => {
      const data = {
        featured_image: 'https://example.com/banner.webp',
        featured_image_alt: 'Hero banner description',
      };
      const extracted = extractAllImagesFromContent('', data);
      expect(extracted).toContain('<img src="https://example.com/banner.webp" alt="Hero banner description" />');
    });

    it('extracts image blocks from PortableText', () => {
      const content = [
        {
          _type: 'image',
          url: 'https://example.com/photo.jpg',
          alt: 'A clean rug after steam treatment',
        },
      ];
      const extracted = extractAllImagesFromContent(content);
      expect(extracted).toContain('<img src="https://example.com/photo.jpg" alt="A clean rug after steam treatment" />');
    });

    it('extracts raw HTML and Markdown images from string body', () => {
      const raw = 'Here is an image: <img src="/test.jpg" alt="Test image" /> and markdown ![Alt text](/photo.png)';
      const extracted = extractAllImagesFromContent(raw);
      expect(extracted).toContain('<img src="/test.jpg" alt="Test image" />');
      expect(extracted).toContain('![Alt text](/photo.png)');
    });
  });

  describe('3. EmDash Native Plugin Editor Panel Contract', () => {
    it('exports contentEditorPanels array conforming to EmDash CMS requirements', () => {
      expect(Array.isArray(contentEditorPanels)).toBe(true);
      expect(contentEditorPanels.length).toBeGreaterThan(0);

      const panel = contentEditorPanels[0];
      expect(panel.id).toBe('seo-readability-panel');
      expect(panel.title).toBe('SEO & Readability Suite');
      expect(typeof panel.component).toBe('function');
      expect(panel.component).toBe(ContentEditorSeoPanel);
      expect(panel.order).toBe(15);
    });

    it('seoPlugin registers unified WebABC SEO adminPages', () => {
      const descriptor = seoPlugin();
      expect(descriptor.id).toBe('emdash-seo');
      expect(descriptor.format).toBe('native');
      expect(descriptor.adminPages).toEqual([
        { path: '/settings', label: 'WebABC SEO', icon: 'globe' },
      ]);
    });
  });

  describe('4. Custom SEO Collection Fields & Cornerstone Analysis', () => {
    it('syncs focus_keyword, schema_type, and cornerstone in content:beforeSave hook', async () => {
      const plugin = createPlugin();
      const beforeSaveHook = plugin.hooks['content:beforeSave'];
      expect(beforeSaveHook).toBeDefined();

      const item = {
        collection: 'posts',
        content: {
          data: {
            title: 'Complete Guide to Rug Cleaning',
            focus_keyword: 'rug cleaning',
            schema_type: 'TechArticle',
            cornerstone: true,
          },
        },
      };

      const result = await beforeSaveHook.handler(item);
      expect(result.data.seo).toBeDefined();
      expect(result.data.seo.focusKeywords).toContain('rug cleaning');
      expect(result.data.seo.schemaType).toBe('TechArticle');
      expect(result.data.seo.cornerstone).toBe(true);
    });

    it('enforces 1,200 words min length for cornerstone content vs 600 words for regular', () => {
      // 700 words content
      const content700 = Array(700).fill('word').join(' ');

      // Regular post: 700 words >= 600 words -> length check passes
      const regularAnalysis = analyzeContent({
        title: 'Regular Post on Cleaning',
        content: content700,
        focusKeywords: ['cleaning'],
        minWordCount: 600,
      });
      const regularLengthCheck = regularAnalysis.checks.find((c) => c.id === 'word_count');
      expect(regularLengthCheck?.passed).toBe(true);

      // Cornerstone post: 700 words < 1200 words -> length check warns
      const cornerstoneAnalysis = analyzeContent({
        title: 'Cornerstone Pillar on Cleaning',
        content: content700,
        focusKeywords: ['cleaning'],
        minWordCount: 1200,
      });
      const cornerstoneLengthCheck = cornerstoneAnalysis.checks.find((c) => c.id === 'word_count');
      expect(cornerstoneLengthCheck?.passed).toBe(false);
    });
  });
});

