import { describe, it, expect } from 'vitest';
import {
  auditGeoAeo,
  extractAutoFaqs,
  extractAutoHowTo,
  extractSpeakableText,
} from '../packages/emdash-seo/src/engine/geo-aeo-analyzer.js';

describe('GEO (Generative Engine Optimization) & AEO (Answer Engine Optimization) Engine', () => {
  const highQualityAiContent = `
# How to Clean Persian Rugs Safely at Home

Persian rug cleaning requires pH-neutral solutions and gentle cold-water extraction to protect delicate natural wool fibers and vegetable dyes from bleeding.

## In our experience testing 150 delicate rugs
Over the last 12 years, we tested 150 antique Persian rugs and found that standard alkaline detergents caused fiber stiffness in 85% of samples. We recommend using distilled white vinegar diluted with water at a 1:4 ratio.

## What is the best cleaning solution for wool rugs?
The best cleaning solution is a mild solution of pure wool-safe shampoo mixed with lukewarm water. Never use harsh bleaches or rotary scrubbing brushes.

## How do you dry a wet Persian rug?
Lay the rug completely flat on a clean, dry surface with ample air circulation. Use a low-heat fan and never hang wet rugs as gravity can stretch wet warp fibers.

### Step 1: Vacuum thoroughly
Vacuum both the front and back of the rug with a gentle suction-only nozzle.

### Step 2: Spot test the cleaning solution
Apply a few drops of solution to an inconspicuous corner with a white cloth.

### Step 3: Rinse and blot dry
Blot gently with clean cotton towels until moisture is fully absorbed.
`;

  describe('1. auditGeoAeo', () => {
    it('analyzes content and computes GEO and AEO scores with recommendations', () => {
      const report = auditGeoAeo(highQualityAiContent, {
        title: 'How to Clean Persian Rugs Safely at Home',
        focusKeyword: 'Persian rug cleaning',
        excerpt: 'Persian rug cleaning requires pH-neutral solutions to protect delicate wool fibers.',
      });

      // Overall Scores
      expect(report.geo.score).toBeGreaterThanOrEqual(60);
      expect(report.aeo.score).toBeGreaterThanOrEqual(60);
      expect(report.overallAiScore).toBeGreaterThanOrEqual(60);

      // GEO Specifics
      expect(report.geo.hasQuotableDefinitions).toBe(true);
      expect(report.geo.quotableQuotes.length).toBeGreaterThan(0);
      expect(report.geo.statisticalEvidenceScore).toBeGreaterThan(50);
      expect(report.geo.firstPartyExperienceScore).toBeGreaterThan(50);

      // AEO Specifics
      expect(report.aeo.questionHeadingsCount).toBeGreaterThanOrEqual(2);
      expect(report.aeo.directAnswersCount).toBeGreaterThanOrEqual(1);
      expect(report.aeo.directAnswerCandidate).toBeTruthy();
      expect(report.aeo.speakableCandidate).toBeTruthy();
      expect(report.aeo.hasVoiceSearchReadiness).toBe(true);

      // Recommendations list
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('penalizes generic content lacking statistics and authoritative first-person experience', () => {
      const weakContent = `
# Rug Cleaning
Rugs are nice items. People buy rugs for their houses. Cleaning them is a good idea.
You can clean your rugs sometimes.
`;
      const report = auditGeoAeo(weakContent, {
        title: 'Rug Cleaning',
        focusKeyword: 'rugs',
      });

      expect(report.geo.score).toBeLessThan(50);
      expect(report.geo.statisticalEvidenceScore).toBe(0);
      expect(report.geo.firstPartyExperienceScore).toBe(0);
      expect(report.aeo.questionHeadingsCount).toBe(0);
      expect(report.recommendations.some((r) => r.dimension === 'GEO')).toBe(true);
      expect(report.recommendations.some((r) => r.dimension === 'AEO')).toBe(true);
    });
  });

  describe('2. extractAutoFaqs', () => {
    it('extracts FAQ pairs from natural question headings and answers', () => {
      const faqs = extractAutoFaqs(highQualityAiContent);

      expect(faqs.length).toBeGreaterThanOrEqual(2);
      expect(faqs[0].question).toContain('What is the best cleaning solution for wool rugs?');
      expect(faqs[0].answer).toContain('The best cleaning solution is a mild solution');
      expect(faqs[1].question).toContain('How do you dry a wet Persian rug?');
      expect(faqs[1].answer).toContain('Lay the rug completely flat');
    });

    it('ignores non-question headings', () => {
      const text = `
## Overview of Rugs
Persian rugs are made by hand.
## Conclusion
Always take care of carpets.
`;
      const faqs = extractAutoFaqs(text);
      expect(faqs.length).toBe(0);
    });
  });

  describe('3. extractAutoHowTo', () => {
    it('extracts sequential instructional steps into HowToStep structures', () => {
      const steps = extractAutoHowTo(highQualityAiContent);

      expect(steps.length).toBe(3);
      expect(steps[0].position).toBe(1);
      expect(steps[0].name).toBe('Vacuum thoroughly');
      expect(steps[0].text).toContain('Vacuum both the front and back');

      expect(steps[1].position).toBe(2);
      expect(steps[1].name).toBe('Spot test the cleaning solution');

      expect(steps[2].position).toBe(3);
      expect(steps[2].name).toBe('Rinse and blot dry');
    });

    it('handles numbered step formats like "1. Step Name"', () => {
      const numberedContent = `
## Instructions
1. Inspect the rug fibers
Check for preexisting color fade or moth damage.
2. Mix the solution
Combine water and cleaner gently.
`;
      const steps = extractAutoHowTo(numberedContent);
      expect(steps.length).toBe(2);
      expect(steps[0].name).toBe('Inspect the rug fibers');
      expect(steps[1].name).toBe('Mix the solution');
    });
  });

  describe('4. extractSpeakableText', () => {
    it('extracts concise high-impact direct answer for voice assistant speech synthesis', () => {
      const speakable = extractSpeakableText(
        highQualityAiContent,
        'Persian rug cleaning requires pH-neutral solutions to protect delicate wool fibers.'
      );

      expect(speakable).toBeTruthy();
      expect(speakable.length).toBeGreaterThan(20);
      expect(speakable.length).toBeLessThan(300);
      expect(speakable).toContain('Persian rug cleaning requires pH-neutral solutions');
    });
  });
});
