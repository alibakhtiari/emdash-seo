import { describe, it, expect } from "vitest";
import { parseRankMathMeta, extractFaqsFromContent } from "../packages/emdash-seo/src/importers/rankmath-importer.js";
import { parseYoastMeta } from "../packages/emdash-seo/src/importers/yoast-importer.js";
import { matchRedirect } from "../packages/emdash-seo/src/routes/redirects.js";

describe("WordPress Migration Engine & Importers", () => {
  describe("Rank Math Importer", () => {
    it("parses focus keywords, titles, descriptions, and robots flags", () => {
      const wpMeta = {
        rank_math_title: "Cloud Infrastructure Services | TechPro",
        rank_math_description: "Top-rated cloud infrastructure specialists.",
        rank_math_focus_keyword: "cloud infrastructure, devops automation",
        rank_math_canonical_url: "https://example.com/services/cloud-infrastructure/",
        rank_math_robots: ["noarchive", "nosnippet"],
        rank_math_facebook_title: "Social Cloud Infrastructure",
        rank_math_facebook_image: "https://example.com/social.jpg",
      };

      const seo = parseRankMathMeta(wpMeta);

      expect(seo.metaTitle).toBe("Cloud Infrastructure Services | TechPro");
      expect(seo.metaDescription).toBe("Top-rated cloud infrastructure specialists.");
      expect(seo.focusKeywords).toEqual(["cloud infrastructure", "devops automation"]);
      expect(seo.canonicalUrl).toBe("https://example.com/services/cloud-infrastructure/");
      expect(seo.noArchive).toBe(true);
      expect(seo.noSnippet).toBe(true);
      expect(seo.ogTitle).toBe("Social Cloud Infrastructure");
      expect(seo.ogImage).toBe("https://example.com/social.jpg");
    });

    it("extracts FAQs from Kadence/Rank Math block HTML", () => {
      const html = `
        <div class="rank-math-block">
          <div class="rank-math-faq-item">
            <h3 class="rank-math-question">How do you deploy the edge workers?</h3>
            <div class="rank-math-answer">We deploy via automated CI/CD pipelines directly to Cloudflare.</div>
          </div>
          <div class="rank-math-faq-item">
            <h3 class="rank-math-question">Are databases replicated globally?</h3>
            <div class="rank-math-answer">Yes, D1 databases support read replication and edge caching.</div>
          </div>
        </div>
      `;

      const faqs = extractFaqsFromContent(html);
      expect(faqs.length).toBe(2);
      expect(faqs[0].question).toBe("How do you deploy the edge workers?");
      expect(faqs[0].answer).toContain("We deploy via automated CI/CD");
      expect(faqs[1].question).toBe("Are databases replicated globally?");
    });
  });

  describe("Yoast Importer", () => {
    it("parses Yoast SEO metadata and social cards", () => {
      const wpMeta = {
        _yoast_wpseo_title: "Yoast Sample Title",
        _yoast_wpseo_metadesc: "Yoast meta description for testing.",
        _yoast_wpseo_focuskw: "yoast test keyword",
        _yoast_wpseo_meta_robots_noindex: "1",
        _yoast_wpseo_opengraph_title: "Yoast OG Title",
      };

      const seo = parseYoastMeta(wpMeta);
      expect(seo.metaTitle).toBe("Yoast Sample Title");
      expect(seo.metaDescription).toBe("Yoast meta description for testing.");
      expect(seo.focusKeywords).toEqual(["yoast test keyword"]);
      expect(seo.noIndex).toBe(true);
      expect(seo.ogTitle).toBe("Yoast OG Title");
    });
  });

  describe("Edge Redirect Matcher", () => {
    const redirects = [
      { from: "/services/carpet-cleaning", to: "/services/deep-cleaning/", statusCode: 301, matchType: "exact" as const },
      { from: "/old-blog/*", to: "/posts/", statusCode: 301, matchType: "prefix" as const },
    ];

    it("matches exact path redirect", () => {
      const match = matchRedirect("/services/carpet-cleaning", redirects);
      expect(match).not.toBeNull();
      expect(match?.destination).toBe("/services/deep-cleaning/");
      expect(match?.to).toBe("/services/deep-cleaning/");
      expect(match?.statusCode).toBe(301);
    });

    it("matches prefix redirect with remaining path preserved", () => {
      const match = matchRedirect("/old-blog/spring-cleaning-tips", redirects);
      expect(match).not.toBeNull();
      expect(match?.destination).toBe("/posts/spring-cleaning-tips");
      expect(match?.to).toBe("/posts/spring-cleaning-tips");
    });

    it("returns null for non-matching URLs", () => {
      const match = matchRedirect("/unrelated-page", redirects);
      expect(match).toBeNull();
    });
  });
});
