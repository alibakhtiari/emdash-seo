import { describe, it, expect } from "vitest";
import { generateAutoBreadcrumbs } from "../packages/emdash-seo/src/engine/breadcrumbs.js";
import { extractTableOfContents } from "../packages/emdash-seo/src/engine/toc-extractor.js";

describe("Breadcrumbs and Table of Contents", () => {
  describe("Automated Breadcrumbs", () => {
    it("generates correct hierarchy for deep service URL", () => {
      const trail = generateAutoBreadcrumbs(
        "/carpet-cleaning-service-london/kensington/",
        "https://4seasonscarpetclean.co.uk",
        "Kensington Carpet Cleaning"
      );

      expect(trail.length).toBe(3);
      expect(trail[0].name).toBe("Home");
      expect(trail[0].url).toBe("https://4seasonscarpetclean.co.uk/");
      expect(trail[1].name).toBe("Carpet Cleaning");
      expect(trail[1].url).toBe("https://4seasonscarpetclean.co.uk/carpet-cleaning-service-london/");
      expect(trail[2].name).toBe("Kensington Carpet Cleaning");
    });

    it("generates root breadcrumb for homepage", () => {
      const trail = generateAutoBreadcrumbs(
        "/",
        "https://4seasonscarpetclean.co.uk",
        "Home"
      );
      expect(trail.length).toBe(1);
      expect(trail[0].name).toBe("Home");
    });
  });

  describe("Automated Table of Contents", () => {
    it("extracts H2 and H3 headings and injects anchor IDs", () => {
      const html = `
        <h2>Methodology</h2>
        <p>Details about methods.</p>
        <h3>Steam Cleaning</h3>
        <p>Steam details.</p>
        <h3>Dry Cleaning</h3>
        <p>Dry details.</p>
        <h2>Customer Guarantees</h2>
        <p>Guarantees.</p>
      `;

      const result = extractTableOfContents(html);

      expect(result.toc.length).toBe(2);
      expect(result.toc[0].text).toBe("Methodology");
      expect(result.toc[0].id).toBe("methodology");
      expect(result.toc[0].children?.length).toBe(2);
      expect(result.toc[0].children?.[0].text).toBe("Steam Cleaning");
      expect(result.toc[0].children?.[0].id).toBe("steam-cleaning");

      // Verify HTML has injected IDs
      expect(result.htmlWithAnchors).toContain('id="methodology"');
      expect(result.htmlWithAnchors).toContain('id="steam-cleaning"');
    });

    it("handles duplicate heading names by appending incrementing index", () => {
      const html = `
        <h2>Overview</h2>
        <p>First overview.</p>
        <h2>Overview</h2>
        <p>Second overview.</p>
      `;

      const result = extractTableOfContents(html);
      expect(result.toc.length).toBe(2);
      expect(result.toc[0].id).toBe("overview");
      expect(result.toc[1].id).toBe("overview-1");
    });
  });
});
