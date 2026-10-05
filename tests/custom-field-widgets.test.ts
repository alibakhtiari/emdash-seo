import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as React from 'react';
import {
  fields,
  FocusKeywordFieldWidget,
  SeoSuiteFieldWidget,
} from '../packages/emdash-seo/src/admin.js';
import {
  FocusKeywordFieldWidget as RootFocusKeywordWidget,
  SeoSuiteFieldWidget as RootSeoSuiteWidget,
  fields as rootFields,
} from '../packages/emdash-seo/src/index.js';
import {
  extractEditorDomSnapshot,
  updateDomImageAlt,
} from '../packages/emdash-seo/src/admin/fields/dom-extractor.js';

describe('EmDash Custom Field Widgets for Live Content Drafting', () => {
  describe('1. Field Widget Registration & Exports', () => {
    it('registers focus-keyword and seo-suite widgets in admin fields map', () => {
      expect(fields).toBeDefined();
      expect(typeof fields['focus-keyword']).toBe('function');
      expect(typeof fields['seo-suite']).toBe('function');
      expect(fields['focus-keyword']).toBe(FocusKeywordFieldWidget);
      expect(fields['seo-suite']).toBe(SeoSuiteFieldWidget);
    });

    it('exports field widgets from root plugin package', () => {
      expect(rootFields).toBeDefined();
      expect(RootFocusKeywordWidget).toBe(FocusKeywordFieldWidget);
      expect(RootSeoSuiteWidget).toBe(SeoSuiteFieldWidget);
      expect(rootFields['focus-keyword']).toBe(FocusKeywordFieldWidget);
    });
  });

  describe('2. DOM Extractor in SSR / Node Environment', () => {
    it('gracefully returns empty snapshot when document is undefined', () => {
      const originalDoc = (globalThis as any).document;
      try {
        delete (globalThis as any).document;
        const snapshot = extractEditorDomSnapshot();
        expect(snapshot).toBeDefined();
        expect(snapshot.title).toBe('');
        expect(snapshot.excerpt).toBe('');
        expect(snapshot.content).toBe('');
        expect(snapshot.headings).toEqual([]);
        expect(snapshot.images).toEqual([]);
      } finally {
        if (originalDoc) (globalThis as any).document = originalDoc;
      }
    });

    it('returns false when updateDomImageAlt runs without document', () => {
      const originalDoc = (globalThis as any).document;
      try {
        delete (globalThis as any).document;
        expect(updateDomImageAlt('/test.webp', 'Alt text')).toBe(false);
      } finally {
        if (originalDoc) (globalThis as any).document = originalDoc;
      }
    });
  });

  describe('3. DOM Extractor in Browser Environment (Mock DOM)', () => {
    let mockImages: Array<{ src: string; alt: string; getAttribute: (k: string) => string; setAttribute: (k: string, v: string) => void }>;
    let mockEditorElement: any;
    let mockDispatchedEvents: string[];

    beforeEach(() => {
      mockDispatchedEvents = [];
      mockImages = [
        {
          src: '/media/rug-1.webp',
          alt: 'Antique silk rug',
          getAttribute(k: string) { return k === 'src' ? this.src : this.alt; },
          setAttribute(k: string, v: string) { if (k === 'alt') this.alt = v; },
        },
        {
          src: '/media/rug-2.webp',
          alt: '',
          getAttribute(k: string) { return k === 'src' ? this.src : this.alt; },
          setAttribute(k: string, v: string) { if (k === 'alt') this.alt = v; },
        },
      ];

      mockEditorElement = {
        innerText: 'Understanding Delicate Wool Fibres\nProper cleaning requires neutral pH soaps and gentle drying chambers.',
        querySelectorAll(selector: string) {
          if (selector.includes('h1') || selector.includes('h2')) {
            return [{ textContent: 'Understanding Delicate Wool Fibres' }];
          }
          if (selector === 'img') {
            return mockImages;
          }
          return [];
        },
        dispatchEvent(e: any) {
          mockDispatchedEvents.push(e.type);
        },
      };

      (globalThis as any).Event = class {
        type: string;
        constructor(type: string) { this.type = type; }
      };

      (globalThis as any).document = {
        querySelector(selector: string) {
          if (selector.includes('#field-title')) {
            return { value: '10 Best Persian Rug Cleaning Techniques in London' };
          }
          if (selector.includes('#field-excerpt')) {
            return { value: 'Discover how professional rug cleaning preserves ancient hand-woven heirlooms.' };
          }
          if (selector.includes('.tiptap') || selector.includes('.ProseMirror')) {
            return mockEditorElement;
          }
          return null;
        },
      };
    });

    afterEach(() => {
      delete (globalThis as any).document;
      delete (globalThis as any).Event;
    });

    it('accurately captures title, excerpt, and content from active editor elements', () => {
      const snapshot = extractEditorDomSnapshot();
      expect(snapshot.title).toBe('10 Best Persian Rug Cleaning Techniques in London');
      expect(snapshot.excerpt).toBe('Discover how professional rug cleaning preserves ancient hand-woven heirlooms.');
      expect(snapshot.content).toContain('Understanding Delicate Wool Fibres');
      expect(snapshot.content).toContain('Proper cleaning requires neutral pH soaps');
      expect(snapshot.headings).toContain('Understanding Delicate Wool Fibres');
      expect(snapshot.images).toHaveLength(2);
      expect(snapshot.images[0]).toEqual({ src: '/media/rug-1.webp', alt: 'Antique silk rug' });
      expect(snapshot.images[1]).toEqual({ src: '/media/rug-2.webp', alt: '' });
    });

    it('updates image alt in the editor DOM via updateDomImageAlt and dispatches input event', () => {
      const updated = updateDomImageAlt('/media/rug-2.webp', 'Restored fringe under microscope');
      expect(updated).toBe(true);
      expect(mockImages[1].alt).toBe('Restored fringe under microscope');
      expect(mockDispatchedEvents).toContain('input');
    });

    it('returns false when image src is not found in editor DOM', () => {
      const updated = updateDomImageAlt('/media/non-existent.jpg', 'Test');
      expect(updated).toBe(false);
      expect(mockDispatchedEvents).not.toContain('input');
    });
  });

  describe('4. Field Widget React Rendering & Props Contract', () => {
    it('initializes component function with expected signature', () => {
      expect(typeof FocusKeywordFieldWidget).toBe('function');
      expect(typeof SeoSuiteFieldWidget).toBe('function');

      const element = React.createElement(FocusKeywordFieldWidget, {
        value: 'rug cleaning london',
        onChange: () => {},
        label: 'Focus Keyword',
        id: 'field-focus_keyword',
      });

      expect(React.isValidElement(element)).toBe(true);
      expect(element.props.value).toBe('rug cleaning london');
      expect(element.props.label).toBe('Focus Keyword');
    });
  });
});
