import { describe, it, expect } from 'vitest';
import {
  auditReadability,
  segmentSentences,
} from '../packages/emdash-seo/src/engine/readability-auditor.js';
import {
  getSentenceHighlightStyle,
  getDifficultyBackgroundColor,
  getDifficultyLabel,
  generateSentenceSuggestion,
  tokenizeSentence,
  type FilterOptions,
} from '../packages/emdash-seo/src/components/LiveSentenceHighlighter.js';
import {
  auditImageAlts,
} from '../packages/emdash-seo/src/engine/alt-auditor.js';
import {
  updateAltInContent,
  getAltStatusBadge,
  getAltProgressColor,
  formatAltIssueLabel,
} from '../packages/emdash-seo/src/components/ImageAltAuditorWidget.js';

describe('Live Sentence Highlighter & Readability Auditor', () => {
  describe('1. Sentence Segmentation & Splitting', () => {
    it('splits standard sentences using terminal punctuation and tracks character offsets', () => {
      const text = 'First sentence is short. Second sentence is also short! Third sentence is a question?';
      const sentences = segmentSentences(text);

      expect(sentences).toHaveLength(3);
      expect(sentences[0].text).toBe('First sentence is short.');
      expect(sentences[0].startIndex).toBe(0);
      expect(sentences[0].endIndex).toBe(24);

      expect(sentences[1].text).toBe('Second sentence is also short!');
      expect(sentences[2].text).toBe('Third sentence is a question?');
    });

    it('does not split sentences on honorifics and abbreviations like Dr., Mr., e.g.', () => {
      const text = 'Dr. Smith visited the clinic at approx. 5 p.m. to see Mr. Jones. The visit went well.';
      const sentences = segmentSentences(text);

      expect(sentences).toHaveLength(2);
      expect(sentences[0].text).toContain('Dr. Smith');
      expect(sentences[0].text).toContain('Mr. Jones.');
      expect(sentences[1].text).toBe('The visit went well.');
    });

    it('does not split on decimal numbers', () => {
      const text = 'The room measured 3.14 meters in width. The price was £99.99 for all services.';
      const sentences = segmentSentences(text);

      expect(sentences).toHaveLength(2);
      expect(sentences[0].text).toBe('The room measured 3.14 meters in width.');
      expect(sentences[1].text).toBe('The price was £99.99 for all services.');
    });
  });

  describe('2. Sentence Difficulty Classification', () => {
    it('classifies sentences into normal, hard, and very-hard categories', () => {
      // Normal: <= 20 words
      const shortText = 'Our eco-friendly steam extraction removes stains and odors quickly.';
      // Hard: 21-28 words
      const hardText =
        'Our certified technicians utilize comprehensive hot water extraction methods that efficiently eliminate deeply embedded stains, allergens, and pet odors from all types of residential carpets.';
      // Very Hard: > 28 words
      const veryHardText =
        'Because our highly experienced and fully certified restoration specialists utilize modern high-pressure hot water extraction equipment, we can thoroughly guarantee that even the deepest, most stubborn grease and oil stains will be completely eliminated without leaving behind any chemical residues or persistent damp odors.';

      const combined = `${shortText} ${hardText} ${veryHardText}`;
      const report = auditReadability(combined);

      expect(report.sentences).toHaveLength(3);
      expect(report.sentences[0].difficulty).toBe('normal');
      expect(report.sentences[1].difficulty).toBe('hard');
      expect(report.sentences[2].difficulty).toBe('very-hard');
    });

    it('maps difficulty to correct background colors and labels', () => {
      expect(getDifficultyBackgroundColor('normal')).toBeUndefined();
      expect(getDifficultyBackgroundColor('hard')).toBe('#fef08a');
      expect(getDifficultyBackgroundColor('very-hard')).toBe('#fecaca');

      expect(getDifficultyLabel('normal')).toBe('Standard Reading');
      expect(getDifficultyLabel('hard')).toBe('Hard to Read');
      expect(getDifficultyLabel('very-hard')).toBe('Very Hard to Read');
    });
  });

  describe('3. Hemingway-Style Live Color Highlighting & Filter Toggles', () => {
    const defaultFilters: FilterOptions = {
      hardSentences: true,
      veryHardSentences: true,
      passiveVoice: true,
      complexWords: true,
    };

    it('applies yellow background for hard sentences and coral for very-hard sentences', () => {
      const report = auditReadability(
        'Short sentence. This medium-long sentence contains quite a few words to deliberately test the intermediate hard readability threshold accurately. Here is a tremendously prolonged sentence that carries on and on without pausing for breath because it is intentionally constructed to surpass the twenty-eight word boundary and trigger the very hard indicator.'
      );

      const sNormal = report.sentences[0];
      const sHard = report.sentences[1];
      const sVeryHard = report.sentences[2];

      const styleNormal = getSentenceHighlightStyle(sNormal, defaultFilters);
      const styleHard = getSentenceHighlightStyle(sHard, defaultFilters);
      const styleVeryHard = getSentenceHighlightStyle(sVeryHard, defaultFilters);

      expect(styleNormal.backgroundColor).toBeUndefined();
      expect(styleHard.backgroundColor).toBe('#fef08a');
      expect(styleVeryHard.backgroundColor).toBe('#fecaca');
    });

    it('applies dotted indigo underline for passive voice sentences', () => {
      const report = auditReadability(
        'The carpets were thoroughly cleaned by our certified specialists yesterday.'
      );
      const sentence = report.sentences[0];
      expect(sentence.isPassive).toBe(true);

      const style = getSentenceHighlightStyle(sentence, defaultFilters);
      expect(style.textDecoration).toBe('underline dotted #6366f1');
    });

    it('respects filter toggles when disabled', () => {
      const report = auditReadability(
        'Here is a tremendously prolonged sentence that carries on and on without pausing for breath because it is intentionally constructed to surpass the twenty-eight word boundary and trigger the very hard indicator.'
      );
      const sentence = report.sentences[0];

      const filtersDisabled: FilterOptions = {
        hardSentences: false,
        veryHardSentences: false,
        passiveVoice: false,
        complexWords: false,
      };

      const style = getSentenceHighlightStyle(sentence, filtersDisabled);
      expect(style.backgroundColor).toBeUndefined();
      expect(style.textDecoration).toBeUndefined();
    });

    it('dims non-highlighted sentences in focus mode', () => {
      const report = auditReadability('Short active sentence.');
      const sentence = report.sentences[0];

      const normalStyle = getSentenceHighlightStyle(sentence, defaultFilters, false, false);
      const focusStyle = getSentenceHighlightStyle(sentence, defaultFilters, true, false);

      expect(normalStyle.opacity).toBeUndefined();
      expect(focusStyle.opacity).toBe(0.35);
    });
  });

  describe('4. Complex Word Identification & Tokenizer', () => {
    it('detects complex words like "utilize" and provides suggestions', () => {
      const report = auditReadability('We utilize advanced cleaning machines to facilitate stain removal.');
      const sentence = report.sentences[0];

      expect(sentence.complexWords).toBeDefined();
      const words = sentence.complexWords?.map((cw) => cw.word.toLowerCase());
      expect(words).toContain('utilize');
      expect(words).toContain('facilitate');

      const utilizeEntry = sentence.complexWords?.find((cw) => cw.word.toLowerCase() === 'utilize');
      expect(utilizeEntry?.alternative).toBe('use');
    });

    it('tokenizes sentence text and wraps complex words in wavy underline spans', () => {
      const complexWords = [{ word: 'utilize', syllables: 3, alternative: 'use' }];
      const tokens = tokenizeSentence('We utilize eco steam.', complexWords, true);

      expect(tokens).toHaveLength(3);
      expect(tokens[0]).toBe('We ');
      // Token 1 should be a React element with wavy cyan underline
      const complexToken = tokens[1] as any;
      expect(complexToken.props.children).toBe('utilize');
      expect(complexToken.props.style.textDecoration).toBe('underline wavy #06b6d4');
      expect(tokens[2]).toBe(' eco steam.');
    });
  });

  describe('5. Actionable Sentence Suggestions', () => {
    it('generates suggestions for complex, passive, and very-hard sentences', () => {
      const report = auditReadability(
        'New cleaning standards were implemented by our team because we always endeavor to utilize superior methods.'
      );
      const sentence = report.sentences[0];
      const suggestion = generateSentenceSuggestion(sentence);

      expect(suggestion).toContain('Passive voice detected');
      expect(suggestion).toContain('were implemented');
      expect(suggestion).toContain('utilize');
    });
  });
});

describe('Image Alt Auditor & Quick-Edit Utilities', () => {
  describe('1. Content Image Extraction & Audit Scoring', () => {
    it('detects HTML and Markdown images with issues like missing alt, redundant prefixes, and filenames', () => {
      const content = `
        <p>Welcome to our site</p>
        <img src="/img/clean.jpg" alt="Professional carpet cleaner extracting water from rug" />
        <img src="/img/broken.jpg" />
        <img src="/img/banner.jpg" alt="photo of living room carpet" />
        <img src="/img/IMG_9921.jpg" alt="IMG_9921.jpg" />
        ![Technician using steam wand](/img/wand.jpg)
      `;

      const report = auditImageAlts(content);

      expect(report.totalImages).toBe(5);
      expect(report.missingAltCount).toBe(1); // img/broken.jpg has no alt
      expect(report.goodCount).toBe(2); // clean.jpg and wand.jpg
      expect(report.warningCount).toBe(2); // redundant "photo of" and filename IMG_9921.jpg
      expect(report.score).toBeGreaterThan(0);
      expect(report.score).toBeLessThan(100);
    });

    it('returns status badges and progress colors properly', () => {
      const goodBadge = getAltStatusBadge('good');
      expect(goodBadge.icon).toBe('🟢');
      expect(goodBadge.label).toBe('Good');

      const warnBadge = getAltStatusBadge('warning');
      expect(warnBadge.icon).toBe('🟡');

      const critBadge = getAltStatusBadge('critical');
      expect(critBadge.icon).toBe('🔴');

      expect(getAltProgressColor(0)).toBe('#ef4444');
      expect(getAltProgressColor(50)).toBe('#10b981');
      expect(getAltProgressColor(140)).toBe('#f59e0b');

      expect(formatAltIssueLabel('alt_missing')).toBe('Missing alt attribute');
      expect(formatAltIssueLabel('alt_filename')).toBe('Filename used as alt text');
    });
  });

  describe('2. Inline Quick-Edit Content Replacement (updateAltInContent)', () => {
    it('replaces existing alt in HTML img tags', () => {
      const content = '<p>Hi</p><img src="/rug.jpg" alt="old text" /><p>Bye</p>';
      const updated = updateAltInContent(content, 0, 'New descriptive carpet alt text');

      expect(updated).toBe('<p>Hi</p><img src="/rug.jpg" alt="New descriptive carpet alt text" /><p>Bye</p>');
    });

    it('inserts alt attribute in HTML img tags missing alt', () => {
      const content = '<p>Intro</p><img src="/photo.jpg" class="hero" />';
      const updated = updateAltInContent(content, 0, 'Restored alt text');

      expect(updated).toContain('alt="Restored alt text"');
      expect(updated).toContain('src="/photo.jpg"');
    });

    it('replaces alt text in Markdown images', () => {
      const content = 'Check out this image: ![old alt](/images/carpet.jpg)';
      const updated = updateAltInContent(content, 0, 'Cleaned oriental rug');

      expect(updated).toBe('Check out this image: ![Cleaned oriental rug](/images/carpet.jpg)');
    });

    it('updates only the targeted image index in multi-image content', () => {
      const content = `
        <img src="/1.jpg" alt="First" />
        <img src="/2.jpg" alt="Second" />
        ![Third](/3.jpg)
      `;

      // Update 2nd image (index 1)
      const updated1 = updateAltInContent(content, 1, 'Updated Second');
      expect(updated1).toContain('alt="First"');
      expect(updated1).toContain('alt="Updated Second"');
      expect(updated1).toContain('![Third](/3.jpg)');

      // Update 3rd image (index 2 - Markdown)
      const updated2 = updateAltInContent(content, 2, 'Updated Third');
      expect(updated2).toContain('alt="First"');
      expect(updated2).toContain('alt="Second"');
      expect(updated2).toContain('![Updated Third](/3.jpg)');
    });
  });
});
