import { describe, it, expect } from "vitest";
import {
  extractTopicalNgrams,
  calculateBm25Salience,
  calculateEntityCoverage,
  calculateFleschReadingEase,
  countSyllables,
} from "../packages/emdash-seo/src/engine/semantic-analyzer.js";
import { analyzeContent } from "../packages/emdash-seo/src/engine/content-analyzer.js";

describe("Semantic Analyzer - N-Gram Topical Extraction", () => {
  it("extracts unigrams, bigrams, and trigrams while filtering stopwords and short tokens", () => {
    const text = "Professional carpet cleaning services provide carpet cleaning and upholstery care.";
    const ngrams = extractTopicalNgrams(text, 3);

    // Stopwords like 'and' must be filtered
    expect(ngrams.has("and")).toBe(false);

    // Unigrams
    expect(ngrams.get("professional")).toBe(1);
    expect(ngrams.get("carpet")).toBe(2);
    expect(ngrams.get("cleaning")).toBe(2);
    expect(ngrams.get("upholstery")).toBe(1);

    // Bigrams
    expect(ngrams.get("carpet cleaning")).toBe(2);
    expect(ngrams.get("upholstery care")).toBe(1);

    // Trigrams
    expect(ngrams.get("professional carpet cleaning")).toBe(1);
  });

  it("respects maxN parameter limits", () => {
    const text = "Deep steam extraction removes stubborn stains.";
    const unigramsOnly = extractTopicalNgrams(text, 1);
    const bigramsMax = extractTopicalNgrams(text, 2);

    expect(unigramsOnly.has("steam")).toBe(true);
    expect(unigramsOnly.has("steam extraction")).toBe(false);

    expect(bigramsMax.has("steam extraction")).toBe(true);
    expect(bigramsMax.has("deep steam extraction")).toBe(false);
  });

  it("strips HTML tags and handles special characters cleanly", () => {
    const html = "<p>Get <strong>eco-friendly</strong> cleaning with <em>hot water extraction</em>!</p>";
    const ngrams = extractTopicalNgrams(html, 3);

    expect(ngrams.has("eco-friendly")).toBe(true);
    expect(ngrams.has("hot water extraction")).toBe(true);
    expect(ngrams.has("p")).toBe(false);
    expect(ngrams.has("strong")).toBe(false);
    expect(ngrams.has("em")).toBe(false);
  });

  it("returns empty map for empty text or maxN < 1", () => {
    expect(extractTopicalNgrams("").size).toBe(0);
    expect(extractTopicalNgrams("   ").size).toBe(0);
    expect(extractTopicalNgrams("valid text", 0).size).toBe(0);
  });
});

describe("Semantic Analyzer - BM25 Term Salience Scoring", () => {
  it("scores exactly 1.0 when termFreq=1, docWordCount=avgdl (800), and idf=1.0", () => {
    const score = calculateBm25Salience(1, 800, 1.0);
    expect(score).toBe(1.0);
  });

  it("demonstrates saturation with diminishing returns for high term frequency", () => {
    const score1 = calculateBm25Salience(1, 800, 1.0);
    const score5 = calculateBm25Salience(5, 800, 1.0);
    const score20 = calculateBm25Salience(20, 800, 1.0);
    const score100 = calculateBm25Salience(100, 800, 1.0);

    expect(score5).toBeGreaterThan(score1);
    expect(score20).toBeGreaterThan(score5);
    expect(score100).toBeGreaterThan(score20);
    // Upper bound for k1=1.2 is idf * (k1 + 1) = 2.2
    expect(score100).toBeLessThan(2.2);
    expect(score100).toBeCloseTo(2.1739, 2);
  });

  it("normalizes term salience against document length", () => {
    // 3 occurrences in a short 200-word post vs. a long 2,000-word article
    const shortDocScore = calculateBm25Salience(3, 200, 1.0);
    const longDocScore = calculateBm25Salience(3, 2000, 1.0);

    expect(shortDocScore).toBeGreaterThan(longDocScore);
  });

  it("scales linearly with inverse document frequency (IDF)", () => {
    const scoreBase = calculateBm25Salience(2, 800, 1.0);
    const scoreHighIdf = calculateBm25Salience(2, 800, 2.5);

    expect(scoreHighIdf).toBeCloseTo(scoreBase * 2.5, 4);
  });

  it("returns 0 for non-positive term frequency or word count", () => {
    expect(calculateBm25Salience(0, 800)).toBe(0);
    expect(calculateBm25Salience(-1, 800)).toBe(0);
    expect(calculateBm25Salience(5, 0)).toBe(0);
    expect(calculateBm25Salience(5, -10)).toBe(0);
  });
});

describe("Semantic Analyzer - Entity Coverage Index (ECI) & Gap Detection", () => {
  const cleaningEntities = [
    "hot water extraction",
    "steam cleaning",
    "stain removal",
    "drying time",
    "eco-friendly",
    "upholstery",
    "pet odors",
    "quote",
  ];

  it("achieves 100% ECI when all entities are present and structured in subheadings", () => {
    const html = `
      <h2>Professional Steam Cleaning & Hot Water Extraction</h2>
      <p>We provide hot water extraction and steam cleaning for homes and businesses.</p>
      <h2>Stain Removal & Rapid Drying Time</h2>
      <p>Our advanced stain removal technology achieves a 2-hour drying time.</p>
      <h3>Eco-Friendly Upholstery Care</h3>
      <p>We use eco-friendly treatments on fine upholstery fabric to eliminate pet odors and give an instant quote.</p>
    `;

    const result = calculateEntityCoverage(html, cleaningEntities);

    expect(result.score).toBe(100);
    expect(result.detected.length).toBe(cleaningEntities.length);
    expect(result.missing).toEqual([]);
    for (const entity of cleaningEntities) {
      expect(result.detected).toContain(entity);
    }
  });

  it("accurately detects entity gaps and missing topical concepts", () => {
    const html = `
      <h2>Carpet Cleaning Solutions</h2>
      <p>We provide steam cleaning and stain removal with non-toxic solutions.</p>
    `;

    const result = calculateEntityCoverage(html, cleaningEntities);

    expect(result.detected).toContain("steam cleaning");
    expect(result.detected).toContain("stain removal");
    expect(result.missing).toContain("hot water extraction");
    expect(result.missing).toContain("drying time");
    expect(result.missing).toContain("eco-friendly");
    expect(result.missing).toContain("upholstery");
    expect(result.missing).toContain("pet odors");
    expect(result.missing).toContain("quote");
    expect(result.score).toBeLessThan(50);
  });

  it("awards 70% for body entity presence and 30% for heading distribution", () => {
    // All 8 entities in body, but 0 in subheadings:
    const htmlWithoutHeadingEntities = `
      <h2>General Information</h2>
      <h2>Our Company</h2>
      <p>We offer hot water extraction, steam cleaning, stain removal, drying time, eco-friendly, upholstery, pet odors, and quote.</p>
    `;

    const resultWithoutHeadingEntities = calculateEntityCoverage(htmlWithoutHeadingEntities, cleaningEntities);
    // 8/8 entities * 70 = 70. 0/2 subheadings with entities * 30 = 0. Total = 70.
    expect(resultWithoutHeadingEntities.score).toBe(70);

    // All 8 entities in body, and all subheadings contain entities:
    const htmlWithHeadingEntities = `
      <h2>Steam Cleaning & Stain Removal Services</h2>
      <p>We offer hot water extraction, steam cleaning, stain removal, drying time, eco-friendly, upholstery, pet odors, and quote.</p>
    `;

    const resultWithHeadingEntities = calculateEntityCoverage(htmlWithHeadingEntities, cleaningEntities);
    // 8/8 entities * 70 = 70. 1/1 subheading with entities * 30 = 30. Total = 100.
    expect(resultWithHeadingEntities.score).toBe(100);
  });

  it("supports Markdown subheadings (##, ###) in addition to HTML tags", () => {
    const markdown = `
## Steam Cleaning
We provide steam cleaning and hot water extraction.
### Stain Removal
Specialized stain removal care.
    `;

    const result = calculateEntityCoverage(markdown, ["steam cleaning", "stain removal", "hot water extraction"]);
    expect(result.detected.length).toBe(3);
    expect(result.missing).toEqual([]);
    expect(result.score).toBe(100);
  });

  it("handles edge cases: empty entities and empty text", () => {
    expect(calculateEntityCoverage("Some content", [])).toEqual({
      score: 100,
      detected: [],
      missing: [],
    });

    const emptyTextResult = calculateEntityCoverage("", ["entity1", "entity2"]);
    expect(emptyTextResult.score).toBe(0);
    expect(emptyTextResult.detected).toEqual([]);
    expect(emptyTextResult.missing).toEqual(["entity1", "entity2"]);
  });
});

describe("Semantic Analyzer - Flesch-Kincaid Reading Ease", () => {
  it("scores high readability for simple, short sentences", () => {
    const text = "The cat sat on the mat. Dogs run in the park. The sun is out today.";
    const result = calculateFleschReadingEase(text);

    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(["Easy", "Very Easy"]).toContain(result.level);
    expect(result.sentenceCount).toBe(3);
    expect(result.hardSentencesCount).toBe(0);
    expect(result.avgWordsPerSentence).toBeLessThan(7);
  });

  it("scores lower readability for dense, multi-syllabic academic prose", () => {
    const denseText =
      "Interdisciplinary methodologies utilizing comprehensive multidimensional institutional infrastructure fundamentally misunderstand contemporary socio-economic circumstances. Furthermore, algorithmic computational epistemologies exacerbate institutional disequilibrium.";
    const result = calculateFleschReadingEase(denseText);

    expect(result.score).toBeLessThan(40);
    expect(["Difficult", "Very Difficult"]).toContain(result.level);
  });

  it("accurately detects hard sentences exceeding 28 words", () => {
    const longSentence =
      "Our exceptionally experienced commercial technicians deploy state-of-the-art industrial-grade hot water extraction equipment that completely sanitizes contaminated carpets, removing stubborn stains, pet allergens, and bacterial deposits across large corporate office complexes.";
    const shortSentence = "Book your appointment today.";
    const fullText = `${longSentence} ${shortSentence}`;

    const result = calculateFleschReadingEase(fullText);
    expect(result.sentenceCount).toBe(2);
    expect(result.hardSentencesCount).toBe(1);
  });

  it("handles syllable counting heuristics accurately", () => {
    expect(countSyllables("the")).toBe(1);
    expect(countSyllables("cat")).toBe(1);
    expect(countSyllables("make")).toBe(1); // Silent 'e'
    expect(countSyllables("table")).toBe(2); // 'le' after consonant
    expect(countSyllables("jumped")).toBe(1); // Silent 'ed'
    expect(countSyllables("wanted")).toBe(2); // Pronounced 'ed'
    expect(countSyllables("watches")).toBe(2); // Pronounced 'es' after 'ch'
    expect(countSyllables("games")).toBe(1); // Silent 'es'
    expect(countSyllables("carpet")).toBe(2);
    expect(countSyllables("cleaning")).toBe(2);
    expect(countSyllables("extraction")).toBe(3);
    expect(countSyllables("professional")).toBe(4);
  });

  it("handles empty input gracefully", () => {
    const result = calculateFleschReadingEase("");
    expect(result.score).toBe(0);
    expect(result.level).toBe("N/A");
    expect(result.sentenceCount).toBe(0);
  });
});

describe("Content Analyzer Integration with Semantic Engine", () => {
  it("integrates eciScore, detectedEntities, topicalGaps, and readability into AnalysisReport", () => {
    const html = `
      <h1>Professional Carpet Cleaning London</h1>
      <p>Looking for the highest rated <strong>carpet cleaning london</strong> service? We provide deep steam extraction across Greater London with 2-hour rapid drying times for residential and commercial customers.</p>
      <h2>Affordable Carpet Cleaning London Solutions</h2>
      <p>Our experienced technicians utilize industrial-grade hot water extraction equipment that safely removes 99% of bacteria, allergens, dust mites, and persistent stains from wool, nylon, and synthetic carpet fibers without leaving sticky detergent residues behind.</p>
      <p>Every service includes pre-inspection, fabric testing, furniture moving, non-toxic stain pre-treatment, and high-velocity air dryer deployment. Check out our <a href="/sofa-cleaning-london/">sofa cleaning</a> solutions as well for complete upholstery revitalisation.</p>
      <img src="/carpet.jpg" alt="professional carpet cleaning london" />
    `;

    const report = analyzeContent({
      contentHtml: html,
      focusKeywords: ["carpet cleaning london"],
      title: "Professional Carpet Cleaning London | CleanPro",
      description: "Book expert carpet cleaning london with CleanPro. 5.0-star rated cleaning specialists.",
      slug: "carpet-cleaning-london",
      minWordCount: 80,
    });

    // Existing checks and backwards compatibility
    expect(report.score).toBeGreaterThanOrEqual(80);
    expect(report.keywordInTitle).toBe(true);
    expect(report.keywordInSlug).toBe(true);
    expect(report.keywordInDescription).toBe(true);
    expect(report.keywordInFirstParagraph).toBe(true);
    expect(report.keywordInSubheadings).toBe(true);
    expect(report.hasImagesWithAlt).toBe(true);

    // Semantic SEO additions
    expect(typeof report.eciScore).toBe("number");
    expect(report.eciScore).toBeGreaterThan(0);
    expect(Array.isArray(report.detectedEntities)).toBe(true);
    expect(Array.isArray(report.topicalGaps)).toBe(true);
    expect(report.readability).toBeDefined();
    expect(typeof report.readability.score).toBe("number");
    expect(typeof report.readability.level).toBe("string");

    // Cleaning cluster should be auto-detected
    expect(report.detectedEntities).toContain("hot water extraction");
    expect(report.detectedEntities).toContain("drying time");
    expect(report.detectedEntities).toContain("upholstery");
  });

  it("supports explicit expectedEntities in ContentAnalyzeOptions", () => {
    const html = `
      <h1>Web Performance Guide</h1>
      <p>In this guide we examine system architecture, performance optimization, and benchmarks.</p>
      <h2>System Architecture</h2>
      <p>We detail prerequisites, configuration, and troubleshooting steps.</p>
    `;

    const customEntities = [
      "architecture",
      "performance",
      "benchmarks",
      "configuration",
      "prerequisites",
      "troubleshooting",
    ];

    const report = analyzeContent({
      contentHtml: html,
      focusKeywords: ["web performance"],
      title: "Web Performance Guide",
      description: "Web performance benchmarks and architecture configuration.",
      slug: "web-performance-guide",
      expectedEntities: customEntities,
      minWordCount: 20,
    });

    expect(report.eciScore).toBe(100);
    expect(report.detectedEntities.length).toBe(6);
    expect(report.topicalGaps).toEqual([]);
  });

  it("handles missing primary keyword while preserving semantic outputs", () => {
    const report = analyzeContent({
      contentHtml: "<p>We clean carpets using hot water extraction and steam cleaning.</p>",
      focusKeywords: [],
      title: "About Us",
      expectedEntities: ["hot water extraction", "steam cleaning", "drying time"],
    });

    expect(report.score).toBe(40);
    expect(report.checks.find((c) => c.id === "no_keyword")?.passed).toBe(false);
    expect(report.eciScore).toBeDefined();
    expect(report.detectedEntities).toContain("hot water extraction");
    expect(report.detectedEntities).toContain("steam cleaning");
    expect(report.topicalGaps).toContain("drying time");
    expect(report.readability).toBeDefined();
  });
});
