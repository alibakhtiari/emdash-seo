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
        { name: "Home", item: "https://example.com/" },
        { name: "Services", item: "https://example.com/services/" },
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

describe("LocalBusiness subtype inference", () => {
  it("emits a specific subtype for matching verticals and stays generic otherwise", () => {
    const base = {
      siteUrl: "https://example.com",
      siteName: "Example",
      canonicalUrl: "https://example.com/",
      title: "Welcome",
      description: "Home.",
      business: DEFAULT_LOCAL_BUSINESS,
    };
    const orgOf = (g: any) => (g["@graph"] as any[]).find((n) => n["@id"].includes("#organization"))["@type"];
    expect(orgOf(buildConnectedSchemaGraph({ ...base, title: "Luigi's Restaurant" }))).toContain("Restaurant");
    expect(orgOf(buildConnectedSchemaGraph({ ...base, title: "Welcome" }))).toEqual(["LocalBusiness", "Organization"]);
    expect(
      orgOf(
        buildConnectedSchemaGraph({
          ...base,
          business: { ...DEFAULT_LOCAL_BUSINESS, businessType: "Dentist" },
        })
      )
    ).toContain("Dentist");
  });
});

describe("Product commerce fields", () => {
  it("emits sku/gtin/brand/price from dedicated seo fields with overrides fallback", () => {
    const base = {
      siteUrl: "https://example.com",
      siteName: "Example",
      canonicalUrl: "https://example.com/products/widget/",
      title: "Widget",
      description: "A fine widget.",
      business: DEFAULT_LOCAL_BUSINESS,
    };
    const graph = buildConnectedSchemaGraph({
      ...base,
      pathname: "/products/widget/",
      seo: { focusKeywords: [], noIndex: false, noFollow: false, schemaType: "Product", sku: "W-1", gtin: "123", brand: "Acme", price: 19.99 } as any,
    });
    const product = (graph["@graph"] as any[]).find((n) => n["@type"] === "Product");
    expect(product.sku).toBe("W-1");
    expect(product.brand.name).toBe("Acme");
    expect(product.offers.price).toBe("19.99");
  });
});

describe("Multi-location branches", () => {
  it("emits department links plus one node per branch", () => {
    const graph = buildConnectedSchemaGraph({
      siteUrl: "https://example.com",
      siteName: "Example",
      canonicalUrl: "https://example.com/",
      title: "Home",
      description: "Home.",
      business: {
        ...DEFAULT_LOCAL_BUSINESS,
        locations: [
          { name: "North Branch", telephone: "+441234", address: { addressLocality: "Leeds", addressCountry: "UK" } },
          { name: "South Branch" },
        ],
      },
    });
    const nodes = graph["@graph"] as any[];
    const org = nodes.find((n) => n["@id"].includes("#organization"));
    expect(org.department).toHaveLength(2);
    const branches = nodes.filter((n) => String(n["@id"]).includes("#location-"));
    expect(branches).toHaveLength(2);
    expect(branches[0].parentOrganization["@id"]).toContain("#organization");
  });
});
