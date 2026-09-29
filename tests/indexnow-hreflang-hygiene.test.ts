import { describe, it, expect, vi } from "vitest";
import {
  generateIndexNowKey,
  validateIndexNowKey,
  submitToIndexNow,
  buildContentUrl,
  urlMapKey,
} from "../packages/emdash-seo/src/engine/indexnow.js";
import { normalizeBcp47, buildAlternateLinks } from "../packages/emdash-seo/src/engine/hreflang.js";
import {
  cleanOgTitle,
  normalizeOgLocale,
  generateRobotsDirective,
  extractTaxonomyTerms,
} from "../packages/emdash-seo/src/engine/metadata-utils.js";
import { renderSchemaMap } from "../packages/emdash-seo/src/routes/schema-map.js";
import { handlePageMetadata } from "../packages/emdash-seo/src/engine/metadata-handler.js";
import { DEFAULT_OPTIONS } from "../packages/emdash-seo/src/config.js";

describe("IndexNow Protocol", () => {
  it("generates and validates 32-character hex keys", () => {
    const key = generateIndexNowKey(32);
    expect(key).toHaveLength(32);
    expect(validateIndexNowKey(key)).toBe(true);
    expect(validateIndexNowKey("invalid key with spaces!")).toBe(false);
    expect(validateIndexNowKey("short")).toBe(false);
  });

  it("submits batch URLs with proper JSON payload to IndexNow", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
    });

    const result = await submitToIndexNow({
      host: "example.com",
      key: "0123456789abcdef0123456789abcdef",
      urls: ["https://example.com/services/cleaning/"],
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.indexnow.org/indexnow",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json; charset=utf-8",
        }),
        body: JSON.stringify({
          host: "example.com",
          key: "0123456789abcdef0123456789abcdef",
          urlList: ["https://example.com/services/cleaning/"],
        }),
      })
    );
  });

  it("builds content canonical URL and urlmap keys accurately", () => {
    expect(buildContentUrl("https://example.com", "carpet-clean", "services")).toBe(
      "https://example.com/services/carpet-clean/"
    );
    expect(buildContentUrl("https://example.com", "about", "pages")).toBe(
      "https://example.com/about/"
    );
    expect(urlMapKey("posts", "123")).toBe("indexnow:urlmap:posts:123");
  });
});

describe("Hreflang & Multilingual Alternates", () => {
  it("normalizes BCP 47 codes with standard casing", () => {
    expect(normalizeBcp47("en")).toBe("en");
    expect(normalizeBcp47("fr-ca")).toBe("fr-CA");
    expect(normalizeBcp47("pt_br")).toBe("pt-BR");
    expect(normalizeBcp47("zh-hans-cn")).toBe("zh-Hans-CN");
  });

  it("builds alternate link set with automatic x-default", () => {
    const entries = [
      { locale: "en", url: "https://example.com/cleaning/" },
      { locale: "fr-ca", url: "https://example.com/fr-ca/nettoyage/" },
    ];

    const alternates = buildAlternateLinks(entries, "en");
    expect(alternates).toHaveLength(3);
    expect(alternates).toContainEqual({
      hreflang: "en",
      href: "https://example.com/cleaning/",
    });
    expect(alternates).toContainEqual({
      hreflang: "fr-CA",
      href: "https://example.com/fr-ca/nettoyage/",
    });
    expect(alternates).toContainEqual({
      hreflang: "x-default",
      href: "https://example.com/cleaning/",
    });
  });

  it("returns empty array when fewer than 2 locales exist", () => {
    expect(buildAlternateLinks([{ locale: "en", url: "https://example.com/" }])).toEqual([]);
  });
});

describe("Metadata Hygiene & OpenGraph Polish", () => {
  it("cleans duplicate siteName suffix from og:title", () => {
    expect(cleanOgTitle("Deep Cleaning Services | ACME Cleaners", "ACME Cleaners", " | ")).toBe(
      "Deep Cleaning Services"
    );
    expect(cleanOgTitle("Carpet Care — ACME Cleaners", "ACME Cleaners", " — ")).toBe(
      "Carpet Care"
    );
    expect(cleanOgTitle("About Us", "ACME Cleaners")).toBe("About Us");
  });

  it("normalizes Facebook OpenGraph locales", () => {
    expect(normalizeOgLocale("en")).toBe("en_US");
    expect(normalizeOgLocale("fr-ca")).toBe("fr_CA");
    expect(normalizeOgLocale("el")).toBe("el_GR");
    expect(normalizeOgLocale("ca")).toBe("ca_ES");
    expect(normalizeOgLocale("ja")).toBe("ja_JP");
  });

  it("formats robots directives with 404 suppression and snippet directives", () => {
    // 404 suppression
    expect(generateRobotsDirective({ path: "/404" })).toBeNull();
    expect(generateRobotsDirective({ path: "/services/404/" })).toBeNull();

    // Standard indexable page
    const normal = generateRobotsDirective({ path: "/services/cleaning/" });
    expect(normal).toContain("index, follow");
    expect(normal).toContain("max-snippet:-1");
    expect(normal).toContain("max-image-preview:large");
    expect(normal).toContain("max-video-preview:-1");

    // Search page
    const search = generateRobotsDirective({ path: "/search" });
    expect(search).toContain("noindex, follow");
  });

  it("extracts taxonomy categories and keywords from EmDash entry terms", () => {
    const entryData = {
      terms: {
        category: [{ name: "Commercial Cleaning" }],
        post_tag: [{ name: "Office" }, { name: "Sanitization" }],
      },
    };
    const extracted = extractTaxonomyTerms(entryData);
    expect(extracted.articleSection).toBe("Commercial Cleaning");
    expect(extracted.keywords).toEqual(["Commercial Cleaning", "Office", "Sanitization"]);
  });
});

describe("Public Schema Map & EmDash page:metadata Hook", () => {
  it("renders XML and JSON schema maps", async () => {
    const xmlRes = await renderSchemaMap({}, DEFAULT_OPTIONS);
    expect(xmlRes.status).toBe(200);
    expect(xmlRes.headers.get("Content-Type")).toContain("application/xml");
    const xml = await xmlRes.text();
    expect(xml).toContain("<urlset");
    expect(xml).toContain("<loc>");

    // JSON format
    const jsonRes = await renderSchemaMap(
      { request: { url: "https://example.com/api/schema-map", headers: new Headers({ accept: "application/json" }) } },
      DEFAULT_OPTIONS
    );
    expect(jsonRes.status).toBe(200);
    const data = (await jsonRes.json()) as { items: any[] };
    expect(data.items).toBeDefined();
    expect(data.items.length).toBeGreaterThan(0);
  });

  it("handles page:metadata hook and produces clean contributions", async () => {
    const event = {
      page: {
        url: "https://example.com/services/carpet-cleaning/",
        title: "Carpet Cleaning | EmDash CMS Site",
        description: "Professional steam carpet cleaning services",
        siteName: "EmDash CMS Site",
        locale: "en",
        kind: "content" as const,
        seo: {
          noIndex: false,
          noFollow: false,
        },
      },
    };

    const contributions = await handlePageMetadata(event, null, DEFAULT_OPTIONS);
    expect(contributions.length).toBeGreaterThan(0);

    const ogTitle = contributions.find(
      (c) => c.kind === "property" && c.property === "og:title"
    );
    expect(ogTitle).toBeDefined();
    if (ogTitle && ogTitle.kind === "property") {
      expect(ogTitle.content).toBe("Carpet Cleaning"); // stripped siteName suffix!
    }

    const canonical = contributions.find(
      (c) => c.kind === "link" && c.rel === "canonical"
    );
    expect(canonical).toBeDefined();

    const jsonld = contributions.find((c) => c.kind === "jsonld");
    expect(jsonld).toBeDefined();
  });
});
