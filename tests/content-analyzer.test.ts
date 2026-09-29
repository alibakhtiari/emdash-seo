import { describe, it, expect } from "vitest";
import { analyzeContent } from "../packages/emdash-seo/src/engine/content-analyzer.js";

describe("Content Analyzer", () => {
  it("scores well for optimized content with keyword in title, slug, and subheadings", () => {
    const html = `
      <h1>Professional Carpet Cleaning London</h1>
      <p>Looking for the highest rated <strong>carpet cleaning london</strong> service? We provide deep steam extraction across Greater London with 2-hour rapid drying times for residential and commercial customers.</p>
      <h2>Affordable Carpet Cleaning London Solutions</h2>
      <p>Our experienced technicians utilize industrial-grade hot water extraction equipment that safely removes 99% of bacteria, allergens, dust mites, and persistent stains from wool, nylon, and synthetic carpet fibers without leaving sticky detergent residues behind.</p>
      <p>Every service includes pre-inspection, fabric testing, furniture moving, non-toxic stain pre-treatment, and high-velocity air dryer deployment. Check out our <a href="/sofa-cleaning-london/">sofa cleaning</a> solutions as well for complete upholstery revitalisation.</p>
      <img src="/carpet.jpg" alt="professional carpet cleaning london" />
    `;

    const result = analyzeContent({
      contentHtml: html,
      focusKeywords: ["carpet cleaning london"],
      title: "Professional Carpet Cleaning London | CleanPro",
      description: "Book expert carpet cleaning london with CleanPro. 5.0-star rated cleaning specialists.",
      slug: "carpet-cleaning-london",
      minWordCount: 80,
    });

    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.keywordInTitle).toBe(true);
    expect(result.keywordInSlug).toBe(true);
    expect(result.keywordInDescription).toBe(true);
    expect(result.keywordInFirstParagraph).toBe(true);
    expect(result.keywordInSubheadings).toBe(true);
    expect(result.hasImagesWithAlt).toBe(true);
    expect(result.checks.find((c) => c.id === "kw_in_title")?.passed).toBe(true);
    expect(result.checks.find((c) => c.id === "kw_in_slug")?.passed).toBe(true);
    expect(result.checks.find((c) => c.id === "kw_in_desc")?.passed).toBe(true);
    expect(result.checks.find((c) => c.id === "kw_in_intro")?.passed).toBe(true);
    expect(result.checks.find((c) => c.id === "kw_in_headings")?.passed).toBe(true);
    expect(result.checks.find((c) => c.id === "img_alt")?.passed).toBe(true);
  });

  it("penalizes missing keywords and missing image alt tags", () => {
    const html = `
      <h1>General Cleaning</h1>
      <p>We clean things very nicely.</p>
      <img src="/dirty.jpg" />
    `;

    const result = analyzeContent({
      contentHtml: html,
      focusKeywords: ["carpet cleaning london"],
      title: "About Us",
      description: "Just a regular page.",
      slug: "about",
    });

    expect(result.score).toBeLessThan(60);
    expect(result.keywordInTitle).toBe(false);
    expect(result.keywordInSlug).toBe(false);
    expect(result.keywordInDescription).toBe(false);
    expect(result.keywordInFirstParagraph).toBe(false);
    expect(result.hasImagesWithAlt).toBe(false);
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.checks.find((c) => c.id === "kw_in_title")?.passed).toBe(false);
    expect(result.checks.find((c) => c.id === "kw_in_slug")?.passed).toBe(false);
    expect(result.checks.find((c) => c.id === "kw_in_desc")?.passed).toBe(false);
    expect(result.checks.find((c) => c.id === "kw_in_intro")?.passed).toBe(false);
    expect(result.checks.filter((c) => !c.passed).length).toBeGreaterThan(0);
  });
});
