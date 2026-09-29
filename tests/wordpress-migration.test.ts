import { describe, it, expect } from "vitest";
import { parseRankMathMeta, extractFaqsFromContent } from "../packages/emdash-seo/src/importers/rankmath-importer.js";
import { parseYoastMeta } from "../packages/emdash-seo/src/importers/yoast-importer.js";
import { matchRedirect } from "../packages/emdash-seo/src/routes/redirects.js";

describe("WordPress Migration Engine & Importers", () => {
  describe("Rank Math Importer", () => {
    it("parses focus keywords, titles, descriptions, and robots flags", () => {
      const wpMeta = {
        rank_math_title: "Rug Cleaning Near Me | 4 Seasons",
        rank_math_description: "Top-rated rug cleaning specialists in London.",
        rank_math_focus_keyword: "rug cleaning london, oriental rug cleaning",
        rank_math_canonical_url: "https://4seasonscarpetclean.co.uk/rug-cleaning-near-me-london/",
        rank_math_robots: ["noarchive", "nosnippet"],
        rank_math_facebook_title: "Social Rug Cleaning",
        rank_math_facebook_image: "https://4seasonscarpetclean.co.uk/social.jpg",
      };

      const seo = parseRankMathMeta(wpMeta);

      expect(seo.metaTitle).toBe("Rug Cleaning Near Me | 4 Seasons");
      expect(seo.metaDescription).toBe("Top-rated rug cleaning specialists in London.");
      expect(seo.focusKeywords).toEqual(["rug cleaning london", "oriental rug cleaning"]);
      expect(seo.canonicalUrl).toBe("https://4seasonscarpetclean.co.uk/rug-cleaning-near-me-london/");
      expect(seo.noArchive).toBe(true);
      expect(seo.noSnippet).toBe(true);
      expect(seo.ogTitle).toBe("Social Rug Cleaning");
      expect(seo.ogImage).toBe("https://4seasonscarpetclean.co.uk/social.jpg");
    });

    it("extracts FAQs from Kadence/Rank Math block HTML", () => {
      const html = `
        <div class="rank-math-block">
          <div class="rank-math-faq-item">
            <h3 class="rank-math-question">How do you clean Persian rugs?</h3>
            <div class="rank-math-answer">We hand-wash them using pH-neutral wool shampoos.</div>
          </div>
          <div class="rank-math-faq-item">
            <h3 class="rank-math-question">Are treatments safe for pets?</h3>
            <div class="rank-math-answer">Yes, 100% pet-safe eco-friendly solutions.</div>
          </div>
        </div>
      `;

      const faqs = extractFaqsFromContent(html);
      expect(faqs.length).toBe(2);
      expect(faqs[0].question).toBe("How do you clean Persian rugs?");
      expect(faqs[0].answer).toContain("We hand-wash them");
      expect(faqs[1].question).toBe("Are treatments safe for pets?");
    });
  });

  describe("Yoast Importer", () => {
    it("parses Yoast SEO metadata and social cards", () => {
      const wpMeta = {
        _yoast_wpseo_title: "Yoast Carpet Cleaning Title",
        _yoast_wpseo_metadesc: "Yoast meta description for testing.",
        _yoast_wpseo_focuskw: "yoast carpet cleaning",
        _yoast_wpseo_meta_robots_noindex: "1",
        _yoast_wpseo_opengraph_title: "Yoast OG Title",
      };

      const seo = parseYoastMeta(wpMeta);
      expect(seo.metaTitle).toBe("Yoast Carpet Cleaning Title");
      expect(seo.metaDescription).toBe("Yoast meta description for testing.");
      expect(seo.focusKeywords).toEqual(["yoast carpet cleaning"]);
      expect(seo.noIndex).toBe(true);
      expect(seo.ogTitle).toBe("Yoast OG Title");
    });
  });

  describe("Edge Redirect Matcher", () => {
    const redirects = [
      { id: "1", pattern: "/services/carpet-cleaning", destination: "/carpet-cleaning-service-london/", statusCode: 301 as const, comparison: "exact" as const, status: "active" as const },
      { id: "2", pattern: "/old-blog/*", destination: "/posts/", statusCode: 301 as const, comparison: "prefix" as const, status: "active" as const },
    ];

    it("matches exact path redirect", () => {
      const match = matchRedirect("/services/carpet-cleaning", redirects);
      expect(match).not.toBeNull();
      expect(match?.destination).toBe("/carpet-cleaning-service-london/");
      expect(match?.statusCode).toBe(301);
    });

    it("matches prefix redirect with remaining path preserved", () => {
      const match = matchRedirect("/old-blog/spring-cleaning-tips", redirects);
      expect(match).not.toBeNull();
      expect(match?.destination).toBe("/posts/spring-cleaning-tips");
    });

    it("returns null for non-matching URLs", () => {
      const match = matchRedirect("/unrelated-page", redirects);
      expect(match).toBeNull();
    });
  });
});
