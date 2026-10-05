/**
 * Schema Map Endpoint.
 * Generates an index of published URLs with structured data for search engines, LLMs, and agent crawlers.
 * Dynamically queries EmDash collection schema registry and urlPatterns.
 * Serves XML (/schemamap.xml) or JSON (/_emdash/api/seo/schema-map).
 */

import type { SeoPluginOptions } from '../types.js';
import { buildPageUrl } from '../engine/urls.js';

export interface SchemaMapItem {
  url: string;
  collection: string;
  updatedAt: string;
}

/**
 * Enumerate published entries across all collections with a public URL pattern.
 */
export async function listPublishedSchemaUrls(
  ctx: any,
  options: SeoPluginOptions
): Promise<SchemaMapItem[]> {
  const siteUrl = options.siteUrl.replace(/\/+$/, '');
  const items: SchemaMapItem[] = [];

  if (ctx?.content) {
    try {
      // 1. Try dynamic SchemaRegistry enumeration
      let collections: Array<{ slug: string; urlPattern?: string }> = [];

      try {
        const { SchemaRegistry } = await import('emdash');
        const { getDb } = await import('emdash/runtime');
        const db = await getDb?.();
        if (db) {
          const registry = new SchemaRegistry(db);
          collections = await registry.listCollections();
        }
      } catch {
        // Fall back to common collections if SchemaRegistry is unavailable
      }

      const cfg = {
        locales: ['en'],
        defaultLocale: 'en',
        prefixDefaultLocale: false,
      };

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
        // Use default i18n config
      }

      // If no collections found dynamically, use standard defaults
      if (!collections || collections.length === 0) {
        collections = [
          { slug: 'posts', urlPattern: '/posts/{slug}' },
          { slug: 'services', urlPattern: '/services/{slug}' },
          { slug: 'pages', urlPattern: '/{slug}' },
        ];
      }

      for (const col of collections) {
        const urlPattern = col.urlPattern || (col.slug === 'pages' ? '/{slug}' : `/${col.slug}/{slug}`);
        let cursor: string | undefined;
        let count = 0;

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

            const updatedAt =
              item.updatedAt || item.createdAt || new Date(0).toISOString();

            items.push({
              url,
              collection: col.slug,
              updatedAt: typeof updatedAt === 'string' ? updatedAt : new Date(updatedAt).toISOString(),
            });
          }

          cursor = page.cursor;
          count += page.items.length;
        } while (cursor && count < 1000);
      }
    } catch {
      // Fall through on error
    }
  }

  // If no items were retrieved (e.g. mock or static fallback), emit homepage
  if (items.length === 0) {
    items.push({
      url: `${siteUrl}/`,
      collection: 'pages',
      updatedAt: new Date().toISOString(),
    });
  }

  return items;
}

/**
 * Render Schema Map in XML or JSON format.
 */
export async function renderSchemaMap(ctx: any, options: SeoPluginOptions): Promise<Response> {
  const items = await listPublishedSchemaUrls(ctx, options);

  const req = ctx?.request || ctx?.req;
  const acceptHeader = req?.headers?.get?.('accept') || '';
  const url = req?.url || '';
  const wantsJson = acceptHeader.includes('application/json') || url.includes('json') || url.includes('/api/');

  if (wantsJson) {
    return new Response(JSON.stringify({ items }, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  }

  // XML format
  const xmlUrls = items
    .map(
      (item) => `  <url>\n    <loc>${item.url}</loc>\n    <lastmod>${item.updatedAt}</lastmod>\n  </url>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlUrls}\n</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
