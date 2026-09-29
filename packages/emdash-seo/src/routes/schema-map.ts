/**
 * Schema Map Endpoint.
 * Generates an index of published URLs with structured data for search engines, LLMs, and agent crawlers.
 * Serves XML (/schemamap.xml) or JSON (/_emdash/api/seo/schema-map).
 */

import type { SeoPluginOptions } from '../types.js';

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
  const origin = options.siteUrl.replace(/\/+$/, '');
  const items: SchemaMapItem[] = [];

  // Try fetching collections via EmDash SchemaRegistry or ctx.content
  if (ctx?.content) {
    try {
      const collections = ['posts', 'services', 'pages'];

      for (const col of collections) {
        let cursor: string | undefined;
        let count = 0;
        do {
          const page = await ctx.content.list(col, {
            limit: 100,
            cursor,
            where: { status: 'published' },
          });

          if (!page || !page.items) break;

          for (const item of page.items) {
            if (!item.slug) continue;
            const path = col === 'pages' ? `/${item.slug}/` : `/${col}/${item.slug}/`;
            const url = `${origin}${path}`;
            const updatedAt =
              item.updatedAt || item.createdAt || new Date().toISOString();

            items.push({
              url,
              collection: col,
              updatedAt: typeof updatedAt === 'string' ? updatedAt : new Date(updatedAt).toISOString(),
            });
          }

          cursor = page.cursor;
          count += page.items.length;
        } while (cursor && count < 1000);
      }
    } catch {
      // Fall through to fallback
    }
  }

  // If no items were retrieved (e.g. mock or static fallback), emit homepage
  if (items.length === 0) {
    items.push({
      url: `${origin}/`,
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
