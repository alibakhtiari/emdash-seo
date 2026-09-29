import { describe, it, expect } from "vitest";
import { buildConnectedSchemaGraph } from "../packages/emdash-seo/src/engine/schema-builder.js";
import { DEFAULT_4SEASONS_BUSINESS } from "../packages/emdash-seo/src/config.js";

describe("Connected JSON-LD Schema Builder", () => {
  it("builds a connected graph with WebSite, LocalBusiness, WebPage, and BreadcrumbList", () => {
    const graph = buildConnectedSchemaGraph({
      siteUrl: "https://4seasonscarpetclean.co.uk",
      siteName: "4 Seasons Carpet Clean",
      canonicalUrl: "https://4seasonscarpetclean.co.uk/carpet-cleaning-service-london/",
      title: "Carpet Cleaning Service London | 4 Seasons",
      description: "Professional steam carpet cleaning across London.",
      business: DEFAULT_4SEASONS_BUSINESS,
      breadcrumbs: [
        { name: "Home", url: "https://4seasonscarpetclean.co.uk/" },
        { name: "Carpet Cleaning", url: "https://4seasonscarpetclean.co.uk/carpet-cleaning-service-london/" },
      ],
      faqs: [
        { question: "How long does carpet drying take?", answer: "Usually 2 to 4 hours." },
      ],
      toc: [
        { id: "pricing", text: "Cleaning Pricing", level: 2 },
      ],
    });

    expect(graph["@context"]).toBe("https://schema.org");
    expect(Array.isArray(graph["@graph"])).toBe(true);

    const nodes = graph["@graph"] as any[];
    const types = nodes.map((n) => (Array.isArray(n["@type"]) ? n["@type"].join(",") : n["@type"]));

    expect(types.some((t) => t.includes("WebSite"))).toBe(true);
    expect(types.some((t) => t.includes("CleaningService") || t.includes("LocalBusiness"))).toBe(true);
    expect(types.some((t) => t.includes("WebPage"))).toBe(true);
    expect(types.some((t) => t.includes("BreadcrumbList"))).toBe(true);
    expect(types.some((t) => t.includes("FAQPage"))).toBe(true);
    expect(types.some((t) => t.includes("ItemList"))).toBe(true);

    // Verify business rating is preserved
    const businessNode = nodes.find((n) => n["@id"].includes("#organization"));
    expect(Number(businessNode.aggregateRating.ratingValue)).toBe(5.0);
    expect(Number(businessNode.aggregateRating.reviewCount)).toBe(343);
  });
});
