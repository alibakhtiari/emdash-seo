import { describe, it, expect } from "vitest";
import { renderSitemap } from "../packages/emdash-seo/src/routes/sitemap.js";
import { renderRobots } from "../packages/emdash-seo/src/routes/robots.js";
import { renderLlmsTxt } from "../packages/emdash-seo/src/routes/llms-txt.js";
import { DEFAULT_OPTIONS } from "../packages/emdash-seo/src/config.js";

describe("Edge Protocols (Sitemaps, Robots, LLMs.txt)", () => {
  it("generates XML sitemap with XML headers and cleaning service URLs", async () => {
    const res = await renderSitemap({}, DEFAULT_OPTIONS);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/xml");

    const text = await res.text();
    expect(text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(text).toContain("<urlset");
    expect(text).toContain("https://4seasonscarpetclean.co.uk/carpet-cleaning-service-london/");
  });

  it("generates virtual robots.txt pointing to XML sitemap and AI sitemaps", async () => {
    const res = renderRobots({}, DEFAULT_OPTIONS);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/plain");

    const text = await res.text();
    expect(text).toContain("User-agent: *");
    expect(text).toContain("Sitemap: https://4seasonscarpetclean.co.uk/sitemap.xml");
  });

  it("generates markdown-formatted /llms.txt for LLM crawlers", async () => {
    const res = renderLlmsTxt({}, DEFAULT_OPTIONS);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/plain");

    const text = await res.text();
    expect(text).toContain("# 4 Seasons Carpet Clean");
    expect(text).toContain("Carpet Cleaning London");
    expect(text).toContain("Rug Cleaning London");
  });
});
