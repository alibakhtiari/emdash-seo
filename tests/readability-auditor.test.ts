import { describe, it, expect } from 'vitest';
import {
  auditReadability,
  segmentSentences,
  TRANSITION_WORDS,
  COMPLEX_WORD_ALTERNATIVES,
} from '../packages/emdash-seo/src/index.js';

describe('Readability Auditor Engine', () => {
  describe('1. Sentence Segmentation & Exact Character Offsets', () => {
    it('accurately segments sentences and preserves exact character offsets matching original text', () => {
      const text = 'The carpet cleaning service was prompt. The technicians arrived on time. We were delighted!';
      const report = auditReadability(text);

      expect(report.sentenceCount).toBe(3);
      for (const s of report.sentences) {
        expect(text.slice(s.startIndex, s.endIndex)).toBe(s.text);
      }
      expect(report.sentences[0].text).toBe('The carpet cleaning service was prompt.');
      expect(report.sentences[1].text).toBe('The technicians arrived on time.');
      expect(report.sentences[2].text).toBe('We were delighted!');
    });

    it('correctly handles abbreviations like Dr., e.g., i.e., vs., and U.S. without splitting', () => {
      const text =
        'Dr. Smith visited the U.S. hospital yesterday. The patient had questions, e.g. about recovery time, i.e. how long it takes. This treatment was tested vs. standard care.';
      const report = auditReadability(text);

      expect(report.sentenceCount).toBe(3);
      for (const s of report.sentences) {
        expect(text.slice(s.startIndex, s.endIndex)).toBe(s.text);
      }
      expect(report.sentences[0].text).toBe('Dr. Smith visited the U.S. hospital yesterday.');
      expect(report.sentences[1].text).toBe(
        'The patient had questions, e.g. about recovery time, i.e. how long it takes.'
      );
      expect(report.sentences[2].text).toBe('This treatment was tested vs. standard care.');
    });

    it('handles decimal numbers and quotation marks cleanly', () => {
      const text = 'Inflation rose by 3.5% this quarter. The analyst said, "Prices will stabilize soon."';
      const report = auditReadability(text);

      expect(report.sentenceCount).toBe(2);
      expect(report.sentences[0].text).toBe('Inflation rose by 3.5% this quarter.');
      expect(report.sentences[1].text).toBe('The analyst said, "Prices will stabilize soon."');
      for (const s of report.sentences) {
        expect(text.slice(s.startIndex, s.endIndex)).toBe(s.text);
      }
    });

    it('handles multiple newlines and paragraph breaks without errors', () => {
      const text = 'First paragraph sentence.\n\nSecond paragraph sentence here.\n\nThird paragraph sentence.';
      const report = auditReadability(text);

      expect(report.sentenceCount).toBe(3);
      for (const s of report.sentences) {
        expect(text.slice(s.startIndex, s.endIndex)).toBe(s.text);
      }
    });

    it('exports and runs segmentSentences directly with exact offsets', () => {
      const text = 'First sentence here. Second sentence follows.';
      const segments = segmentSentences(text);

      expect(segments.length).toBe(2);
      expect(segments[0].text).toBe('First sentence here.');
      expect(segments[0].startIndex).toBe(0);
      expect(segments[0].endIndex).toBe(20);
      expect(text.slice(segments[0].startIndex, segments[0].endIndex)).toBe(segments[0].text);
      expect(segments[1].text).toBe('Second sentence follows.');
      expect(text.slice(segments[1].startIndex, segments[1].endIndex)).toBe(segments[1].text);
    });

    it('handles HTML formatted text and maintains exact character offsets', () => {
      const html = '<p>Professional carpet cleaning in London.</p><p>We provide deep steam extraction.</p>';
      const report = auditReadability(html);

      expect(report.sentenceCount).toBe(2);
      for (const s of report.sentences) {
        expect(html.slice(s.startIndex, s.endIndex)).toBe(s.text);
      }
      expect(report.sentences[0].text).toBe('Professional carpet cleaning in London.');
      expect(report.sentences[1].text).toBe('We provide deep steam extraction.');
    });
  });

  describe('2. Reading Ease and Grade Level Scoring', () => {
    it('computes high Flesch Reading Ease and low Grade Level for simple plain English', () => {
      const text = 'The dog sat on the rug. The cat ran in the yard. We played all day long.';
      const report = auditReadability(text);

      expect(report.readingEase).toBeGreaterThanOrEqual(80);
      expect(report.score).toBe(report.readingEase);
      expect(report.gradeLevel).toBeLessThan(5);
      expect(['Easy', 'Very Easy']).toContain(report.readingEaseLevel);
    });

    it('computes low Flesch Reading Ease and high Grade Level for dense academic text', () => {
      const text =
        'Comprehensive epistemological investigations into algorithmic computational architectures substantiate multi-layered institutional disequilibrium. Furthermore, socioeconomic differentiation exacerbates programmatic infrastructural vulnerabilities.';
      const report = auditReadability(text);

      expect(report.readingEase).toBeLessThan(35);
      expect(report.gradeLevel).toBeGreaterThan(12);
      expect(['Difficult', 'Very Difficult']).toContain(report.readingEaseLevel);
    });

    it('handles empty text gracefully', () => {
      const report = auditReadability('');
      expect(report.sentenceCount).toBe(0);
      expect(report.wordCount).toBe(0);
      expect(report.score).toBe(100);
      expect(report.gradeLevel).toBe(0);
      expect(report.sentences).toEqual([]);
    });
  });

  describe('3. Sentence Difficulty Categorization', () => {
    it('categorizes short simple sentences as "normal"', () => {
      const text = 'We clean carpets thoroughly and affordably across London with rapid drying times.';
      const report = auditReadability(text);

      expect(report.sentenceCount).toBe(1);
      expect(report.sentences[0].difficulty).toBe('normal');
      expect(report.hardSentencesCount).toBe(0);
      expect(report.veryHardSentencesCount).toBe(0);
    });

    it('categorizes sentences with 21-28 words as "hard"', () => {
      // 24 words
      const text =
        'Our experienced technicians utilize industrial-grade hot water extraction equipment that safely removes bacteria and deep stubborn stains from residential wool and synthetic carpets.';
      const report = auditReadability(text);

      expect(report.sentenceCount).toBe(1);
      expect(report.sentences[0].wordCount).toBeGreaterThanOrEqual(21);
      expect(report.sentences[0].wordCount).toBeLessThanOrEqual(28);
      expect(report.sentences[0].difficulty).toBe('hard');
      expect(report.hardSentencesCount).toBe(1);
      expect(report.veryHardSentencesCount).toBe(0);
    });

    it('categorizes sentences with <= 20 words but > 2.0 avg syllables/word as "hard"', () => {
      // 9 words, highly multi-syllabic (avg > 2.0)
      const text = 'Algorithmic computational methodologies substantiate institutional vulnerabilities.';
      const report = auditReadability(text);

      expect(report.sentenceCount).toBe(1);
      expect(report.sentences[0].wordCount).toBeLessThanOrEqual(20);
      expect(report.sentences[0].avgSyllablesPerWord).toBeGreaterThan(2.0);
      expect(report.sentences[0].difficulty).toBe('hard');
      expect(report.hardSentencesCount).toBe(1);
    });

    it('categorizes sentences exceeding 28 words as "very-hard"', () => {
      // 32 words
      const text =
        'Our certified professional commercial cleaning technicians utilize state-of-the-art industrial steam extraction machinery that penetrates deeply into delicate fiber structures, completely eradicating harmful microorganisms, trapped pet dander, and heavy traffic discolorations across corporate office environments.';
      const report = auditReadability(text);

      expect(report.sentenceCount).toBe(1);
      expect(report.sentences[0].wordCount).toBeGreaterThan(28);
      expect(report.sentences[0].difficulty).toBe('very-hard');
      expect(report.veryHardSentencesCount).toBe(1);
      expect(report.hardSentencesPercentage).toBe(100);
    });
  });

  describe('4. Passive Voice Detection', () => {
    it('detects regular past participles ending in -ed with auxiliary to-be verbs and adverbs', () => {
      const text =
        'The carpets were professionally cleaned yesterday. The stains were quickly removed by our team.';
      const report = auditReadability(text);

      expect(report.passiveVoiceCount).toBe(2);
      expect(report.passiveVoicePercentage).toBe(100);
      expect(report.sentences[0].isPassive).toBe(true);
      expect(report.sentences[0].passivePhrases).toBeDefined();
      expect(report.sentences[0].passivePhrases).toContain('were professionally cleaned');
      expect(report.sentences[1].isPassive).toBe(true);
      expect(report.sentences[1].passivePhrases).toContain('were quickly removed');
    });

    it('detects irregular past participles (written, chosen, taken, made, seen, given, done, built)', () => {
      const text =
        'The report was written carefully. A candidate was chosen. Decisions were made. The skyscraper was built.';
      const report = auditReadability(text);

      expect(report.passiveVoiceCount).toBe(4);
      expect(report.sentences[0].passivePhrases).toContain('was written');
      expect(report.sentences[1].passivePhrases).toContain('was chosen');
      expect(report.sentences[2].passivePhrases).toContain('were made');
      expect(report.sentences[3].passivePhrases).toContain('was built');
    });

    it('does not falsely flag active voice sentences', () => {
      const text = 'Our team cleaned the carpets quickly. The manager wrote a detailed report.';
      const report = auditReadability(text);

      expect(report.passiveVoiceCount).toBe(0);
      expect(report.passiveVoicePercentage).toBe(0);
      expect(report.sentences[0].isPassive).toBe(false);
      expect(report.sentences[1].isPassive).toBe(false);
    });
  });

  describe('5. Transition Words Detector', () => {
    it('matches common transition words and phrases and calculates transition percentage', () => {
      const text =
        'However, carpet steam cleaning requires careful fabric testing. Furthermore, drying time should be minimized. As a result, clients can walk on carpets within hours. For example, our turbo dryers accelerate airflow.';
      const report = auditReadability(text);

      expect(report.sentenceCount).toBe(4);
      expect(report.transitionWordsCount).toBe(4);
      expect(report.transitionPercentage).toBe(100);

      expect(report.sentences[0].hasTransition).toBe(true);
      expect(report.sentences[0].transitionWords).toContain('however');

      expect(report.sentences[1].hasTransition).toBe(true);
      expect(report.sentences[1].transitionWords).toContain('furthermore');

      expect(report.sentences[2].hasTransition).toBe(true);
      expect(report.sentences[2].transitionWords).toContain('as a result');

      expect(report.sentences[3].hasTransition).toBe(true);
      expect(report.sentences[3].transitionWords).toContain('for example');
    });

    it('identifies sentences without transitions and calculates percentage correctly', () => {
      const text =
        'In addition, we provide rug care. We clean wool rugs. We also restore antique fibers.';
      const report = auditReadability(text);

      expect(report.sentenceCount).toBe(3);
      expect(report.sentences[0].hasTransition).toBe(true);
      expect(report.sentences[1].hasTransition).toBe(false);
      expect(report.sentences[2].hasTransition).toBe(true); // "also"
      expect(report.transitionPercentage).toBe(66.7);
    });

    it('includes ~100 transitions in library', () => {
      expect(TRANSITION_WORDS.length).toBeGreaterThanOrEqual(95);
      expect(TRANSITION_WORDS).toContain('on the other hand');
      expect(TRANSITION_WORDS).toContain('consequently');
      expect(TRANSITION_WORDS).toContain('moreover');
      expect(TRANSITION_WORDS).toContain('therefore');
    });
  });

  describe('6. Complex Words & Simpler Alternatives', () => {
    it('finds words with >= 3 syllables and suggests common simpler alternatives', () => {
      const text = 'We utilize modern methods to commence service and terminate odor issues.';
      const report = auditReadability(text);

      expect(report.complexWordsCount).toBeGreaterThanOrEqual(3);

      const utilizeEntry = report.complexWords.find((w) => w.word.toLowerCase() === 'utilize');
      expect(utilizeEntry).toBeDefined();
      expect(utilizeEntry?.alternative).toBe('use');

      const commenceEntry = report.complexWords.find((w) => w.word.toLowerCase() === 'commence');
      expect(commenceEntry).toBeDefined();
      expect(commenceEntry?.alternative).toBe('start');

      const terminateEntry = report.complexWords.find((w) => w.word.toLowerCase() === 'terminate');
      expect(terminateEntry).toBeDefined();
      expect(terminateEntry?.alternative).toBe('end');
    });

    it('substantiates complex word map with expected plain English alternatives', () => {
      expect(COMPLEX_WORD_ALTERNATIVES['substantiate']).toBe('prove');
      expect(COMPLEX_WORD_ALTERNATIVES['facilitate']).toBe('help');
      expect(COMPLEX_WORD_ALTERNATIVES['implement']).toBe('carry out');
    });
  });

  describe('7. Consecutive Sentence Starters Detection', () => {
    it('flags 3 or more consecutive sentences starting with the same word', () => {
      const text =
        'We clean residential carpets. We remove tough stains. We offer free instant quotes. Next, we test fabric.';
      const report = auditReadability(text);

      expect(report.consecutiveSentenceStarters.length).toBe(1);
      expect(report.consecutiveSentenceStarters[0].word).toBe('we');
      expect(report.consecutiveSentenceStarters[0].count).toBe(3);
      expect(report.consecutiveSentenceStarters[0].sentenceIndices).toEqual([0, 1, 2]);

      expect(report.sentences[0].consecutiveStarterWarning).toBe(true);
      expect(report.sentences[1].consecutiveStarterWarning).toBe(true);
      expect(report.sentences[2].consecutiveStarterWarning).toBe(true);
      expect(report.sentences[3].consecutiveStarterWarning).toBeUndefined();
    });

    it('does not flag only 2 consecutive sentences', () => {
      const text = 'We clean carpets. We clean rugs. Our prices are reasonable.';
      const report = auditReadability(text);

      expect(report.consecutiveSentenceStarters.length).toBe(0);
      expect(report.sentences[0].consecutiveStarterWarning).toBeUndefined();
      expect(report.sentences[1].consecutiveStarterWarning).toBeUndefined();
    });
  });

  describe('8. Paragraph and Section Length Checks', () => {
    it('flags paragraphs exceeding 150 words', () => {
      const longPara = Array(160).fill('word').join(' ') + '.';
      const shortPara = 'This is a short paragraph.';
      const fullText = `${longPara}\n\n${shortPara}`;

      const report = auditReadability(fullText);
      expect(report.longParagraphsCount).toBe(1);
      expect(report.issues.some((i) => i.includes('recommended max: 150 words'))).toBe(true);
    });

    it('flags sections exceeding 300 words without subheadings', () => {
      const longSection = Array(310).fill('word').join(' ') + '.';
      const report = auditReadability(longSection);

      expect(report.longSectionsCount).toBe(1);
      expect(report.issues.some((i) => i.includes('without a subheading'))).toBe(true);
    });
  });
});
