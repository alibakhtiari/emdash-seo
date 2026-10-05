import { describe, it, expect } from 'vitest';
import { auditImageAlts, analyzeContent } from '../packages/emdash-seo/src/index.js';

describe('Image Alt Text Auditor Engine', () => {
  describe('1. Parsing HTML and Markdown Images', () => {
    it('parses both HTML <img> tags and Markdown ![alt](src) images', () => {
      const content = `
        <img src="/images/carpet-cleaning.jpg" alt="Commercial carpet cleaning in London office" />
        <p>Some text</p>
        ![Technician using hot water extraction](/images/tech.png)
      `;

      const report = auditImageAlts(content);
      expect(report.totalImages).toBe(2);
      expect(report.goodCount).toBe(2);
      expect(report.score).toBe(100);

      expect(report.images[0].src).toBe('/images/carpet-cleaning.jpg');
      expect(report.images[0].alt).toBe('Commercial carpet cleaning in London office');
      expect(report.images[0].status).toBe('good');

      expect(report.images[1].src).toBe('/images/tech.png');
      expect(report.images[1].alt).toBe('Technician using hot water extraction');
      expect(report.images[1].status).toBe('good');
    });

    it('returns a perfect score when no images are present in content', () => {
      const report = auditImageAlts('<p>Just regular text with no images.</p>');
      expect(report.totalImages).toBe(0);
      expect(report.score).toBe(100);
      expect(report.issues).toEqual([]);
    });
  });

  describe('2. alt_missing Detection', () => {
    it('flags HTML images with completely absent alt attribute as critical', () => {
      const content = '<img src="/banner.jpg" />';
      const report = auditImageAlts(content);

      expect(report.totalImages).toBe(1);
      expect(report.missingAltCount).toBe(1);
      expect(report.criticalCount).toBe(1);
      expect(report.score).toBe(0);

      const item = report.images[0];
      expect(item.issues).toContain('alt_missing');
      expect(item.status).toBe('critical');
      expect(item.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('3. alt_empty and Decorative Image Detection', () => {
    it('flags empty alt="" on non-decorative images as critical', () => {
      const content = '<img src="/services.png" alt="" /> and <img src="/clean.png" alt="   " />';
      const report = auditImageAlts(content);

      expect(report.totalImages).toBe(2);
      expect(report.emptyAltCount).toBe(2);
      expect(report.criticalCount).toBe(2);
      expect(report.images[0].issues).toContain('alt_empty');
      expect(report.images[0].status).toBe('critical');
      expect(report.images[1].issues).toContain('alt_empty');
      expect(report.images[1].status).toBe('critical');
    });

    it('recognizes role="presentation", role="none", and aria-hidden="true" as decorative images without issues', () => {
      const content = `
        <img src="/spacer.gif" alt="" role="presentation" />
        <img src="/divider.svg" alt="" role="none" />
        <img src="/bg-shape.svg" alt="" aria-hidden="true" />
      `;
      const report = auditImageAlts(content);

      expect(report.totalImages).toBe(3);
      expect(report.decorativeCount).toBe(3);
      expect(report.emptyAltCount).toBe(0);
      expect(report.criticalCount).toBe(0);
      expect(report.goodCount).toBe(3);
      expect(report.score).toBe(100);

      for (const img of report.images) {
        expect(img.isDecorative).toBe(true);
        expect(img.issues).toEqual([]);
        expect(img.status).toBe('good');
      }
    });
  });

  describe('4. alt_filename Detection', () => {
    it('flags filenames with extensions or camera prefixes as warnings', () => {
      const content = `
        <img src="/img1.jpg" alt="carpet_cleaning_final.jpg" />
        <img src="/img2.png" alt="IMG_20260901_102030" />
        ![photo.webp](/img3.webp)
      `;
      const report = auditImageAlts(content);

      expect(report.totalImages).toBe(3);
      expect(report.warningCount).toBe(3);
      expect(report.criticalCount).toBe(0);

      for (const img of report.images) {
        expect(img.issues).toContain('alt_filename');
        expect(img.status).toBe('warning');
      }
    });
  });

  describe('5. alt_redundant Detection', () => {
    it('flags redundant prefixes like "image of", "photo of", "picture of"', () => {
      const content = `
        <img src="/rug1.jpg" alt="image of a clean Persian rug in living room" />
        <img src="/rug2.jpg" alt="Photo of our steam cleaning equipment" />
        ![picture of satisfied customer](/happy.jpg)
      `;
      const report = auditImageAlts(content);

      expect(report.totalImages).toBe(3);
      for (const img of report.images) {
        expect(img.issues).toContain('alt_redundant');
        expect(img.status).toBe('warning');
        expect(img.suggestions.some((s) => s.includes('Remove redundant prefix'))).toBe(true);
      }
    });
  });

  describe('6. alt_length Validation', () => {
    it('flags alt text shorter than 5 characters as a warning', () => {
      const content = '<img src="/icon.png" alt="rug" />';
      const report = auditImageAlts(content);

      expect(report.images[0].issues).toContain('alt_length');
      expect(report.images[0].status).toBe('warning');
      expect(report.images[0].suggestions.some((s) => s.includes('too short'))).toBe(true);
    });

    it('flags alt text longer than 125 characters as a warning', () => {
      const longAlt =
        'This is an exceptionally descriptive and unnecessarily lengthy alt text explaining in immense detail every single thread, weave, color pattern, and micro-fiber found on the oriental rug that was cleaned in North London.';
      const content = `<img src="/rug.jpg" alt="${longAlt}" />`;
      const report = auditImageAlts(content);

      expect(report.images[0].charCount).toBeGreaterThan(125);
      expect(report.images[0].issues).toContain('alt_length');
      expect(report.images[0].status).toBe('warning');
      expect(report.images[0].suggestions.some((s) => s.includes('too long'))).toBe(true);
    });
  });

  describe('7. Keyword Stuffing Detection', () => {
    it('flags alt text repeating the target keyword multiple times as critical', () => {
      const content = `
        <img src="/carpet.jpg" alt="carpet cleaning London provides best carpet cleaning London for all carpet cleaning London clients" />
      `;
      const report = auditImageAlts(content, {
        targetKeywords: ['carpet cleaning London'],
      });

      expect(report.images[0].issues).toContain('alt_kw_stuffing');
      expect(report.images[0].status).toBe('critical');
      expect(report.criticalCount).toBe(1);
    });

    it('allows a target keyword to appear once naturally without flagging stuffing', () => {
      const content = `
        <img src="/carpet.jpg" alt="Technician delivering carpet cleaning London service" />
      `;
      const report = auditImageAlts(content, {
        targetKeywords: ['carpet cleaning London'],
      });

      expect(report.images[0].issues).not.toContain('alt_kw_stuffing');
      expect(report.images[0].status).toBe('good');
    });
  });

  describe('8. Integration with Content Analyzer', () => {
    it('wires altAudit and detailedReadability directly into analyzeContent report', () => {
      const html = `
        <h1>Professional Carpet Cleaning London</h1>
        <p>We provide deep steam carpet cleaning in London with fast drying times.</p>
        <h2>Eco-friendly Stain Removal</h2>
        <p>Our solutions remove pet stains safely.</p>
        <img src="/carpet.jpg" alt="professional carpet cleaning london" />
        <img src="/decorative.svg" alt="" role="presentation" />
      `;

      const result = analyzeContent({
        contentHtml: html,
        focusKeywords: ['carpet cleaning london'],
        title: 'Carpet Cleaning London | CleanPro',
        description: 'Premier carpet cleaning in London by CleanPro specialists.',
        slug: 'carpet-cleaning-london',
      });

      expect(result.altAudit).toBeDefined();
      expect(result.altAudit?.totalImages).toBe(2);
      expect(result.altAudit?.goodCount).toBe(2);
      expect(result.altAudit?.score).toBe(100);

      expect(result.detailedReadability).toBeDefined();
      expect(result.detailedReadability?.sentenceCount).toBeGreaterThan(0);
      expect(result.detailedReadability?.sentences.length).toBeGreaterThan(0);
    });
  });
});
