/**
 * Dynamic llms.txt & llms-full.txt Endpoints.
 * Conforms to https://llmstxt.org specification for LLM crawler context windows.
 * Dynamically queries published content across all collections or falls back to curated overview.
 */

import type { SeoPluginOptions } from '../types.js';
import { buildPageUrl } from '../engine/urls.js';

export interface LlmsTxtEntry {
  title: string;
  url: string;
  description?: string;
}

export interface LlmsTxtBuildOptions {
  siteName: string;
  siteDescription?: string;
  sections: Record<string, LlmsTxtEntry[]>;
}

function humanize(slug: string): string {
  return slug
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Format markdown string conforming to the llmstxt.org specification.
 */
export function buildLlmsTxt(opts: LlmsTxtBuildOptions): string {
  const lines: string[] = [];
  lines.push(`# ${opts.siteName}`, '');
  if (opts.siteDescription) {
    lines.push(`> ${opts.siteDescription}`, '');
  }

  for (const [heading, entries] of Object.entries(opts.sections)) {
    if (!entries.length) continue;
    lines.push(`## ${heading}`, '');
    for (const entry of entries) {
      const desc = entry.description ? `: ${entry.description}` : '';
      lines.push(`- [${entry.title}](${entry.url})${desc}`);
    }
    lines.push('');
  }

  return lines.join('\n').replace(/\n+$/, '\n');
}

/**
 * Dynamically generate llms.txt body from published collections.
 */
export async function generateLlmsTxtBody(ctx: any, options: SeoPluginOptions): Promise<string> {
  const siteUrl = options.siteUrl.replace(/\/+$/, '');
  const siteName = options.siteName || 'EmDash Site';
  const siteDescription = options.defaultDescription || `${siteName} knowledge index and content summary.`;

  const sections: Record<string, LlmsTxtEntry[]> = {};

  if (ctx?.content) {
    try {
      let collections: Array<{ slug: string; label?: string; urlPattern?: string }> = [];

      try {
        const { SchemaRegistry } = await import('emdash');
        const { getDb } = await import('emdash/runtime');
        const db = await getDb?.();
        if (db) {
          const registry = new SchemaRegistry(db);
          collections = await registry.listCollections();
        }
      } catch {
        // Fall back
      }

      if (!collections || collections.length === 0) {
        collections = [
          { slug: 'services', label: 'Services', urlPattern: '/services/{slug}' },
          { slug: 'posts', label: 'Articles', urlPattern: '/posts/{slug}' },
          { slug: 'pages', label: 'Pages', urlPattern: '/{slug}' },
        ];
      }

      const cfg = { locales: ['en'], defaultLocale: 'en', prefixDefaultLocale: false };
      try {
        const { isI18nEnabled, getI18nConfig } = await import('emdash');
        if (isI18nEnabled?.() && getI18nConfig?.()) {
          const c = getI18nConfig();
          if (c) {
            cfg.locales = c.locales || ['en'];
            cfg.defaultLocale = c.defaultLocale || 'en';
            cfg.prefixDefaultLocale = !!c.prefixDefaultLocale;
          }
        }
      } catch {
        // Continue
      }

      for (const col of collections) {
        const urlPattern = col.urlPattern || (col.slug === 'pages' ? '/{slug}' : `/${col.slug}/{slug}`);
        const entries: LlmsTxtEntry[] = [];
        let cursor: string | undefined;

        do {
          const page = await ctx.content.list(col.slug, {
            limit: 100,
            cursor,
            where: { status: 'published' },
          });

          if (!page || !page.items) break;

          for (const item of page.items) {
            if (!item.slug) continue;
            const locale = item.locale || cfg.defaultLocale;
            const url = buildPageUrl({
              locale,
              slug: item.slug,
              siteUrl,
              cfg,
              urlPattern,
            });

            if (!url) continue;

            const data = (item.data || {}) as Record<string, unknown>;
            const title =
              (typeof data.title === 'string' && data.title) ||
              (typeof data.name === 'string' && data.name) ||
              item.slug;
            const description =
              (typeof data.description === 'string' && data.description) ||
              (typeof data.excerpt === 'string' && data.excerpt) ||
              undefined;

            entries.push({ title, url, description });
          }

          cursor = page.cursor;
        } while (cursor);

        if (entries.length > 0) {
          sections[col.label || humanize(col.slug)] = entries;
        }
      }
    } catch {
      // Fall through to default sections
    }
  }

  // If no dynamic entries found, emit default overview sections
  if (Object.keys(sections).length === 0) {
    sections['Overview'] = [
      { title: 'Home', url: `${siteUrl}/`, description: 'Main homepage and service area overview.' },
      { title: 'Services', url: `${siteUrl}/services/`, description: 'Full catalog of professional solutions.' },
      { title: 'Blog & Articles', url: `${siteUrl}/posts/`, description: 'Technical guides, insights, and news.' },
      { title: 'About Us', url: `${siteUrl}/about/`, description: 'Team background, experience, and editorial policy.' },
      { title: 'Contact', url: `${siteUrl}/contact/`, description: 'Inquiries and communication channels.' },
      { title: 'FAQ', url: `${siteUrl}/faq/`, description: 'Frequently asked questions.' },
    ];
    sections['Sitemaps & Protocols'] = [
      { title: 'XML Sitemap', url: `${siteUrl}/sitemap.xml`, description: 'Standard XML sitemap index.' },
      { title: 'Full LLM Knowledge Base', url: `${siteUrl}/llms-full.txt`, description: 'Comprehensive documentation and entity schemas.' },
    ];
  }

  return buildLlmsTxt({ siteName, siteDescription, sections });
}

export function renderLlmsTxt(_ctx: any, options: SeoPluginOptions): Response {
  const siteUrl = options.siteUrl.replace(/\/+$/, '');
  const siteName = options.siteName || 'EmDash Site';
  const business = options.business;

  const content = `# ${siteName}
> LLM knowledge index and content summary for ${siteName}.

## Overview
- Website: ${siteUrl}
- Organization: ${business?.name || siteName}
${business?.telephone ? `- Telephone: ${business.telephone}` : ''}
${business?.email ? `- Email: ${business.email}` : ''}
${business?.address ? `- Address: ${business.address.streetAddress}, ${business.address.addressLocality}, ${business.address.postalCode}` : ''}

## Main Sections & Services
- [Home](${siteUrl}/): Main homepage and overview.
- [Services](${siteUrl}/services/): Directory of services and offerings.
- [Blog & Guides](${siteUrl}/posts/): Technical guides, articles, and knowledge base.
- [About Us](${siteUrl}/about/): Organization background and team.
- [Contact](${siteUrl}/contact/): Inquiries and contact details.
- [FAQ](${siteUrl}/faq/): Frequently asked questions.

## Sitemaps & Technical Feeds
- XML Sitemap: ${siteUrl}/sitemap.xml
- Full Knowledge Base: ${siteUrl}/llms-full.txt
`;
  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

export function renderLlmsFullTxt(_ctx: any, options: SeoPluginOptions): Response {
  const siteUrl = options.siteUrl.replace(/\/+$/, '');
  const siteName = options.siteName || 'EmDash Site';
  const business = options.business;

  const content = `# ${siteName} — Full LLM Knowledge Base & Documentation
> Comprehensive knowledge repository and contextual documentation for ${siteName}.

## Organization Entity
- Site URL: ${siteUrl}
- Entity Name: ${business?.name || siteName}
- Description: ${business?.description || `${siteName} documentation and services`}
${business?.telephone ? `- Phone: ${business.telephone}` : ''}
${business?.email ? `- Email: ${business.email}` : ''}
${business?.address ? `- Location: ${business.address.streetAddress}, ${business.address.addressLocality}, ${business.address.postalCode}` : ''}
${business?.priceRange ? `- Pricing Range: ${business.priceRange}` : ''}

## Primary Sections & Architecture
- Home: ${siteUrl}/ (Core offerings, customer reviews, service area coverage)
- Services Directory: ${siteUrl}/services/ (Full inventory of professional solutions)
- Technical Guides & Blog: ${siteUrl}/posts/ (In-depth maintenance guides, tutorials, and methodologies)
- Sitemap: ${siteUrl}/sitemap.xml (Comprehensive URL registry)
- Concise LLM Index: ${siteUrl}/llms.txt (Compact summary for LLM context windows)

## Edge Performance & SEO Standards
- Runtime: Cloudflare Workers edge execution with sub-millisecond overhead
- Schemas: Connected JSON-LD @graph (WebSite, LocalBusiness, WebPage, BreadcrumbList, ItemList, FAQPage)
- Equity Preservation: 1:1 path preservation and edge redirect matching
`;

  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
