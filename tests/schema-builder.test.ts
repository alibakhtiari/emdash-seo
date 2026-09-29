import { describe, it, expect } from "vitest";
import { buildConnectedSchemaGraph } from "../packages/emdash-seo/src/engine/schema-builder.js";
import { DEFAULT_LOCAL_BUSINESS } from "../packages/emdash-seo/src/config.js";

describe("Connected JSON-LD Schema Builder", () => {
  it("builds a connected graph with WebSite, LocalBusiness, WebPage, and BreadcrumbList", () => {
    const graph = buildConnectedSchemaGraph({
      siteUrl: "https://example.com",
      siteName: "Example Service Co",
      canonicalUrl: "https://example.com/services/web-development/",
      title: "Web Development Service | Example Co",
      description: "Professional web development and design services.",
      business: DEFAULT_LOCAL_BUSINESS,
      breadcrumbs: [
        { name: "Home", url: "https://example.com/" },
        { name: "Services", url: "https://example.com/services/" },
        { name: "Web Development", url: "https://example.com/services/web-development/" },
      ],
      faqs: [
        { question: "How long does deployment take?", answer: "Usually under a minute." },
      ],
      toc: [
        { id: "pricing", text: "Pricing", level: 2 },
      ],
    });

    expect(graph["@context"]).toBe("https://schema.org");
    expect(Array.isArray(graph["@graph"])).toBe(true);

    const nodes = graph["@graph"] as any[];
    const types = nodes.map((n) => (Array.isArray(n["@type"]) ? n["@type"].join(",") : n["@type"]));

    expect(types.some((t) => t.includes("WebSite"))).toBe(true);
    expect(types.some((t) => t.includes("LocalBusiness") || t.includes("Organization"))).toBe(true);
    expect(types.some((t) => t.includes("WebPage"))).toBe(true);
    expect(types.some((t) => t.includes("BreadcrumbList"))).toBe(true);
    expect(types.some((t) => t.includes("FAQPage"))).toBe(true);
    expect(types.some((t) => t.includes("ItemList"))).toBe(true);

    // Verify business rating is preserved
    const businessNode = nodes.find((n) => n["@id"].includes("#organization"));
    expect(Number(businessNode.aggregateRating.ratingValue)).toBe(5.0);
    expect(Number(businessNode.aggregateRating.reviewCount)).toBe(150);
  });
});
