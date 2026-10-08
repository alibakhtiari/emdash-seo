import type { SeoPluginOptions } from '../types.js';
import { buildPageUrl } from '../engine/urls.js';

/** Max URLs per sitemap file (sitemaps.org limit is 50k; 1000 keeps edge CPU safe). */
export const SITEMAP_PAGE_SIZE = 1000;

const ADMIN_SLUGS_RE = /^(_emdash|api)(\/|$)/;

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  images?: { loc: string; title?: string; caption?: string }[];
}

export function generateSitemapXml(entries: SitemapEntry[]): string {
  const parts: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
  ];
  for (const entry of entries) {
    const imgParts: string[] = [];
    if (entry.images) {
      for (const img of entry.images) {
        imgParts.push(
          `\n    <image:image>\n      <image:loc>${escapeXml(img.loc)}</image:loc>` +
            `${img.caption ? `\n      <image:caption>${escapeXml(img.caption)}</image:caption>` : ''}` +
            `${img.title ? `\n      <image:title>${escapeXml(img.title)}</image:title>` : ''}\n    </image:image>`
        );
      }
    }
    parts.push(
      `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>` +
        `${entry.lastmod ? `\n    <lastmod>${entry.lastmod}</lastmod>` : ''}` +
        `${entry.changefreq ? `\n    <changefreq>${entry.changefreq}</changefreq>` : ''}` +
        `${entry.priority ? `\n    <priority>${entry.priority.toFixed(1)}</priority>` : ''}` +
        `${imgParts.join('')}\n  </url>`
    );
  }
  parts.push('</urlset>');
  return parts.join('\n');
}

export function generateSitemapIndexXml(sitemaps: { loc: string; lastmod?: string }[]): string {
  const items = sitemaps.map(
    (s) => `  <sitemap>
    <loc>${escapeXml(s.loc)}</loc>${s.lastmod ? `\n    <lastmod>${s.lastmod}</lastmod>` : ''}
  </sitemap>`
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items.join('\n')}
</sitemapindex>`;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export interface CollectedSitemap {
  collection: string;
  entries: SitemapEntry[];
}

/** Chunk entries into pages of SITEMAP_PAGE_SIZE for index pagination. */
export function chunkEntries<T>(items: T[], size = SITEMAP_PAGE_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function listCollections(ctx: any): Array<{ slug: string; urlPattern?: string }> {
  const fromCtx = ctx?.collections || ctx?.content?.collections;
  if (Array.isArray(fromCtx) && fromCtx.length > 0) return fromCtx;
  return [
    { slug: 'services', urlPattern: '/services/{slug}' },
    { slug: 'posts', urlPattern: '/posts/{slug}' },
    { slug: 'pages', urlPattern: '/{slug}' },
  ];
}

/**
 * Content-driven sitemap collection: published entries only.
 * Excludes noindex entries, drafts, and admin/API paths.
 */
export async function collectSitemapEntries(ctx: any, options: SeoPluginOptions): Promise<CollectedSitemap[]> {
  const siteUrl = options.siteUrl.replace(/\/+$/, '');
  const out: CollectedSitemap[] = [];

  if (!ctx?.content?.list) return out;

  for (const col of listCollections(ctx)) {
    if (ADMIN_SLUGS_RE.test(col.slug)) continue;
    const entries: SitemapEntry[] = [];
    let cursor: string | undefined;
    try {
      do {
        const page = await ctx.content.list(col.slug, {
          limit: 100,
          cursor,
          where: { status: 'published' },
        });
        if (!page || !page.items) break;
        for (const item of page.items) {
          if (!item.slug || ADMIN_SLUGS_RE.test(item.slug)) continue;
          const data = (item.data || {}) as Record<string, unknown>;
          if ((data.seo as any)?.noIndex === true || data.noIndex === true) continue;
          const urlPattern = col.urlPattern || (col.slug === 'pages' ? '/{slug}' : `/${col.slug}/{slug}`);
          const loc = buildPageUrl({ locale: item.locale || 'en', slug: item.slug, siteUrl, urlPattern });
          if (!loc) continue;
          const lastmod = item.updatedAt || item.createdAt || undefined;
          const images: SitemapEntry['images'] = [];
          const imgLoc =
            (typeof data.ogImage === 'string' && data.ogImage) ||
            (typeof data.featured_image === 'string' && data.featured_image) ||
            (typeof data.image === 'string' && data.image);
          if (imgLoc) {
            const caption =
              (typeof data.title === 'string' && data.title) ||
              (typeof data.name === 'string' && data.name) ||
              undefined;
            images.push({ loc: imgLoc.startsWith('http') ? imgLoc : `${siteUrl}${imgLoc}`, caption });
          }
          entries.push({
            loc,
            lastmod: typeof lastmod === 'string' ? lastmod : lastmod ? new Date(lastmod).toISOString() : undefined,
            changefreq: col.slug === 'posts' ? 'daily' : 'weekly',
            images: images.length > 0 ? images : undefined,
          });
        }
        cursor = page.cursor;
      } while (cursor);
    } catch {
      // Skip failing collections, keep the rest
    }
    if (entries.length > 0) out.push({ collection: col.slug, entries });
  }
  return out;
}

function xmlResponse(xml: string): Response {
  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      'X-Robots-Tag': 'noindex',
    },
  });
}

function defaultEntries(siteUrl: string): SitemapEntry[] {
  return [
    { loc: `${siteUrl}/`, priority: 1.0, changefreq: 'weekly', lastmod: new Date().toISOString() },
    { loc: `${siteUrl}/services/`, priority: 0.9, changefreq: 'weekly' },
    { loc: `${siteUrl}/posts/`, priority: 0.8, changefreq: 'daily' },
    { loc: `${siteUrl}/about/`, priority: 0.7, changefreq: 'monthly' },
    { loc: `${siteUrl}/contact/`, priority: 0.7, changefreq: 'monthly' },
    { loc: `${siteUrl}/faq/`, priority: 0.7, changefreq: 'monthly' },
  ];
}

export async function renderSitemap(ctx: any, options: SeoPluginOptions): Promise<Response> {
  const siteUrl = options.siteUrl.replace(/\/+$/, '');
  const collected = await collectSitemapEntries(ctx, options);

  if (collected.length === 0) {
    return xmlResponse(generateSitemapXml(defaultEntries(siteUrl)));
  }

  const total = collected.reduce((n, c) => n + c.entries.length, 0);
  if (total <= SITEMAP_PAGE_SIZE) {
    return xmlResponse(generateSitemapXml(collected.flatMap((c) => c.entries)));
  }
  // Large sites: serve an index of per-collection sitemaps
  return renderSitemapIndex(ctx, options, collected);
}

/** Sitemap index over per-collection sitemaps, paginated at SITEMAP_PAGE_SIZE. */
export async function renderSitemapIndex(
  ctx: any,
  options: SeoPluginOptions,
  collected?: CollectedSitemap[]
): Promise<Response> {
  const siteUrl = options.siteUrl.replace(/\/+$/, '');
  const groups = collected ?? (await collectSitemapEntries(ctx, options));
  const sitemaps: { loc: string; lastmod?: string }[] = [];
  if (groups.length === 0) {
    sitemaps.push({ loc: `${siteUrl}/sitemap.xml` });
  }
  for (const g of groups) {
    const chunks = chunkEntries(g.entries);
    chunks.forEach((chunk, i) => {
      const suffix = chunks.length > 1 ? `-${i + 1}` : '';
      sitemaps.push({
        loc: `${siteUrl}/sitemap-${g.collection}${suffix}.xml`,
        lastmod: chunk[0]?.lastmod,
      });
    });
  }
  return xmlResponse(generateSitemapIndexXml(sitemaps));
}

/** Per-collection sitemap (sitemap-{collection}.xml, optional `-{page}` suffix). */
export async function renderSitemapCollection(
  ctx: any,
  options: SeoPluginOptions,
  collection?: string
): Promise<Response> {
  const siteUrl = options.siteUrl.replace(/\/+$/, '');
  const slug =
    collection ?? ctx?.params?.collection ?? ctx?.collection ?? ctx?.input?.collection;
  const collected = await collectSitemapEntries(ctx, options);
  const match = slug
    ? collected.find((c) => c.collection === slug)
    : collected[0];
  if (!match) {
    return xmlResponse(generateSitemapXml(defaultEntries(siteUrl)));
  }
  const pageNum = Math.max(1, Number(ctx?.params?.page ?? ctx?.input?.page ?? 1) || 1);
  const chunks = chunkEntries(match.entries);
  return xmlResponse(generateSitemapXml(chunks[Math.min(pageNum, chunks.length) - 1] || []));
}
