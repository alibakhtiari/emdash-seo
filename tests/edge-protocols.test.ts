import { describe, it, expect } from "vitest";
import { renderSitemap, generateSitemapXml, generateNewsSitemapXml, extractContentVideos } from "../packages/emdash-seo/src/routes/sitemap.js";
import { renderRobots } from "../packages/emdash-seo/src/routes/robots.js";
import { renderLlmsTxt, renderLlmsFullTxt } from "../packages/emdash-seo/src/routes/llms-txt.js";
import { DEFAULT_OPTIONS } from "../packages/emdash-seo/src/config.js";

describe("Edge Protocols (Sitemaps, Robots, LLMs.txt)", () => {
  it("generates XML sitemap with XML headers and canonical service URLs", async () => {
    const res = await renderSitemap({}, DEFAULT_OPTIONS);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/xml");

    const text = await res.text();
    expect(text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(text).toContain("<urlset");
    expect(text).toContain(`${DEFAULT_OPTIONS.siteUrl}/services/`);
  });

  it("generates virtual robots.txt pointing to XML sitemap and AI sitemaps", async () => {
    const res = renderRobots({}, DEFAULT_OPTIONS);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/plain");

    const text = await res.text();
    expect(text).toContain("User-agent: *");
    expect(text).toContain(`Sitemap: ${DEFAULT_OPTIONS.siteUrl}/sitemap.xml`);
  });

  it("generates markdown-formatted /llms.txt for LLM crawlers", async () => {
    const res = renderLlmsTxt({}, DEFAULT_OPTIONS);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/plain");

    const text = await res.text();
    expect(text).toContain(`# ${DEFAULT_OPTIONS.siteName}`);
    expect(text).toContain("Main Sections & Services");
    expect(text).toContain(`${DEFAULT_OPTIONS.siteUrl}/services/`);
  });

  it("generates deep knowledge base /llms-full.txt from plugin generator", async () => {
    const res = renderLlmsFullTxt({}, DEFAULT_OPTIONS);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/plain");

    const text = await res.text();
    expect(text).toContain(`# ${DEFAULT_OPTIONS.siteName} — Full LLM Knowledge Base`);
    expect(text).toContain("Edge Performance & SEO Standards");
    expect(text).toContain("Connected JSON-LD @graph");
  });
});

describe("News and video sitemap extensions", () => {
  it("emits video and xhtml namespaces with video blocks", () => {
    const xml = generateSitemapXml([
      {
        loc: "https://example.com/posts/film/",
        videos: [{ title: "Launch Film", playerLoc: "https://www.youtube.com/embed/abc123" }],
        alternates: [{ hreflang: "fr-CA", href: "https://example.com/fr-ca/film/" }],
      },
    ]);
    expect(xml).toContain("xmlns:video=");
    expect(xml).toContain("<video:title>Launch Film</video:title>");
    expect(xml).toContain("youtube.com/embed/abc123");
    expect(xml).toContain('hreflang="fr-CA"');
  });

  it("detects YouTube embeds and renders a news sitemap for fresh posts", () => {
    expect(
      extractContentVideos('<p>Hi</p><iframe src="https://www.youtube.com/embed/abc123"></iframe>')
    ).toEqual([{ playerLoc: "https://www.youtube.com/embed/abc123" }]);
    expect(extractContentVideos("<p>No video here</p>")).toEqual([]);
    const news = generateNewsSitemapXml(
      [{ loc: "https://example.com/posts/fresh/", newsTitle: "Fresh Post", newsDate: new Date().toISOString() }],
      "Example Site"
    );
    expect(news).toContain("xmlns:news=");
    expect(news).toContain("<news:title>Fresh Post</news:title>");
  });
});

describe("Robots AI governance", () => {
  it("keeps llms endpoints open when AI training is blocked", async () => {
    const { buildRobotsTxt } = await import("../packages/emdash-seo/src/routes/robots.js");
    const txt = buildRobotsTxt(
      { ...DEFAULT_OPTIONS, siteUrl: "https://example.com" },
      { blockAiBots: true }
    );
    expect(txt).toContain("User-agent: OAI-SearchBot");
    expect(txt).toContain("User-agent: Claude-SearchBot");
    expect(txt).toContain("Disallow: /");
    expect(txt).toContain("Allow: /llms.txt");
    expect(txt).toContain("Allow: /llms-full.txt");
  });
});

describe("AI crawler training/search split", () => {
  it("allows search citers while denying training crawlers under search-only", async () => {
    const { buildRobotsTxt } = await import("../packages/emdash-seo/src/routes/robots.js");
    const txt = buildRobotsTxt(
      { ...DEFAULT_OPTIONS, siteUrl: "https://example.com", aiCrawlerPolicy: "search-only" },
      {}
    );
    const blockOf = (bot: string) => {
      const i = txt.indexOf(`User-agent: ${bot}`);
      return txt.slice(i, txt.indexOf("User-agent:", i + 1) === -1 ? undefined : txt.indexOf("User-agent:", i + 1));
    };
    expect(blockOf("OAI-SearchBot")).toContain("Allow: /");
    expect(blockOf("GPTBot")).toContain("Disallow: /");
    expect(blockOf("GPTBot")).toContain("Allow: /llms.txt");
    expect(blockOf("CCBot")).toContain("Disallow: /");
  });

  it("preserves legacy blockAiBots behavior", async () => {
    const { buildRobotsTxt } = await import("../packages/emdash-seo/src/routes/robots.js");
    const blocked = buildRobotsTxt({ ...DEFAULT_OPTIONS, siteUrl: "https://example.com", blockAiBots: true }, {});
    expect(blocked).toContain("Disallow: /");
    const open = buildRobotsTxt({ ...DEFAULT_OPTIONS, siteUrl: "https://example.com" }, {});
    expect(open).toContain("User-agent: Claude-SearchBot");
  });
});
