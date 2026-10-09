import type { SeoPluginOptions } from '../types.js';
import { buildPageUrl } from '../engine/urls.js';
import { cachedProtocol } from '../engine/protocol-cache.js';

/** Max URLs per sitemap file (sitemaps.org limit is 50k; 1000 keeps edge CPU safe). */
export const SITEMAP_PAGE_SIZE = 1000;

const ADMIN_SLUGS_RE = /^(_emdash|api)(\/|$)/;

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  images?: { loc: string; title?: string; caption?: string }[];
  alternates?: { hreflang: string; href: string }[];
  videos?: { title: string; description?: string; thumbnail?: string; playerLoc?: string }[];
  newsTitle?: string;
  newsDate?: string;
}

/** Detect embedded videos (YouTube/Vimeo iframes, <video> tags) in content. Capped at 2. */
export function extractContentVideos(content: unknown): Array<{ playerLoc?: string }> {
  if (typeof content !== 'string' || content.length === 0) return [];
  const out: Array<{ playerLoc?: string }> = [];
  const src = content.slice(0, 20000);
  const re = /<(?:iframe|video)[^>]+(?:src|data-src)=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while (out.length < 2 && (m = re.exec(src)) !== null) {
    const url = m[1].trim();
    if (!url || url.startsWith('data:')) continue;
    if (/youtube(?:-nocookie)?\.com|youtu\.be|vimeo\.com|\.(mp4|webm|mov)(\?|#|$)/i.test(url)) {
      if (!out.some((v) => v.playerLoc === url)) out.push({ playerLoc: url });
    }
  }
  return out;
}

/** Tiny local BCP 47 encoder (inline to avoid an import cycle with hreflang engine). */
function normalizeHreflang(code: string): string {
  if (!code) return 'x-default';
  const p = code.trim().toLowerCase().split(/[-_]/);
  if (p.length === 1) return p[0];
  if (p.length === 2) return `${p[0]}-${p[1].toUpperCase()}`;
  return `${p[0]}-${p[1].charAt(0).toUpperCase()}${p[1].slice(1)}-${p.slice(2).join('-').toUpperCase()}`;
}

export function generateSitemapXml(entries: SitemapEntry[]): string {
  const parts: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"',
    '        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
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
    const altParts: string[] = [];
    if (entry.alternates) {
      for (const alt of entry.alternates) {
        if (alt?.hreflang && alt?.href) {
          altParts.push(`\n    <xhtml:link rel="alternate" hreflang="${escapeXml(normalizeHreflang(alt.hreflang))}" href="${escapeXml(alt.href)}" />`);
        }
      }
    }
    const videoParts: string[] = [];
    if (entry.videos) {
      for (const v of entry.videos) {
        if (!v?.title) continue;
        videoParts.push(
          `\n    <video:video>\n      <video:title>${escapeXml(v.title.slice(0, 100))}</video:title>` +
            `${v.description ? `\n      <video:description>${escapeXml(v.description.slice(0, 500))}</video:description>` : ''}` +
            `${v.thumbnail ? `\n      <video:thumbnail_loc>${escapeXml(v.thumbnail)}</video:thumbnail_loc>` : ''}` +
            `${v.playerLoc ? `\n      <video:player_loc>${escapeXml(v.playerLoc)}</video:player_loc>` : `\n      <video:content_loc>${escapeXml(entry.loc)}</video:content_loc>`}\n    </video:video>`
        );
      }
    }
    parts.push(
      `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>` +
        `${entry.lastmod ? `\n    <lastmod>${entry.lastmod}</lastmod>` : ''}` +
        `${entry.changefreq ? `\n    <changefreq>${entry.changefreq}</changefreq>` : ''}` +
        `${entry.priority ? `\n    <priority>${entry.priority.toFixed(1)}</priority>` : ''}` +
        `${altParts.join('')}${imgParts.join('')}${videoParts.join('')}\n  </url>`
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

/** Map embed URLs onto sitemap video entries (title/description/thumbnail context). */
function collectEntryVideos(
  data: Record<string, unknown>,
  thumbnail: string | undefined,
  siteUrl: string
): SitemapEntry['videos'] {
  const embeds = extractContentVideos(data.content);
  if (embeds.length === 0) return undefined;
  const title = (typeof data.title === 'string' && data.title) || (typeof data.name === 'string' && data.name) || 'Video';
  const description =
    (typeof data.excerpt === 'string' && data.excerpt) ||
    (typeof data.description === 'string' && data.description) ||
    undefined;
  return embeds.map((e) => ({
    title,
    description,
    thumbnail,
    playerLoc: e.playerLoc?.startsWith('http')
      ? e.playerLoc
      : e.playerLoc
        ? `${siteUrl}${e.playerLoc.startsWith('/') ? '' : '/'}${e.playerLoc}`
        : undefined,
  }));
}

/** News window: modified within the last 2 days (Google News sitemap rule). */
function isNewsFresh(lastmod: unknown): boolean {
  if (!lastmod) return false;
  const t = new Date(typeof lastmod === 'string' ? lastmod : (lastmod as any)).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < 2 * 24 * 60 * 60 * 1000;
}

/** Google News sitemap for entries modified in the last 2 days. */
export function generateNewsSitemapXml(
  entries: SitemapEntry[],
  publicationName: string,
  language = 'en'
): string {
  const items = entries
    .filter((e) => e.newsTitle && e.newsDate)
    .slice(0, 1000)
    .map(
      (e) => `  <url>\n    <loc>${escapeXml(e.loc)}</loc>\n    <news:news>\n      <news:publication>\n        <news:name>${escapeXml(publicationName.slice(0, 100))}</news:name>\n        <news:language>${escapeXml(language)}</news:language>\n      </news:publication>\n      <news:publication_date>${escapeXml(e.newsDate as string)}</news:publication_date>\n      <news:title>${escapeXml((e.newsTitle as string).slice(0, 200))}</news:title>\n    </news:news>\n  </url>`
    );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n${items.join('\n')}\n</urlset>`;
}

export async function renderSitemapNews(ctx: any, options: SeoPluginOptions): Promise<Response> {
  return cachedProtocol(ctx, 'seo:cache:sitemap-news.xml', async () => {
    const collected = await collectSitemapEntries(ctx, options);
    const fresh = collected.flatMap((c) => c.entries).filter((e) => e.newsTitle && e.newsDate);
    return xmlResponse(generateNewsSitemapXml(fresh, options.siteName, (options as any).defaultLocale || 'en'));
  });
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

/** Effective per-file URL cap: sitemapOptions.maxUrlsPerFile or protocol default. */
function pageSize(options: SeoPluginOptions): number {
  const n = Number(options.sitemapOptions?.maxUrlsPerFile);
  return Number.isFinite(n) && n >= 100 && n <= 50000 ? Math.floor(n) : SITEMAP_PAGE_SIZE;
}

/** Extract up to 3 in-content <img src> URLs (capped, CF-safe regex). */
function extractContentImages(content: unknown, siteUrl: string): string[] {
  if (typeof content !== 'string' || content.length === 0) return [];
  const out: string[] = [];
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while (out.length < 3 && (m = re.exec(content.slice(0, 20000))) !== null) {
    const src = m[1].trim();
    if (!src || src.startsWith('data:')) continue;
    out.push(src.startsWith('http') ? src : `${siteUrl}${src.startsWith('/') ? '' : '/'}${src}`);
  }
  return out;
}

/**
 * Content-driven sitemap collection: published entries only.
 * Excludes noindex entries, drafts, admin/API paths, and any collection
 * listed in sitemapOptions.excludeCollections.
 */
export async function collectSitemapEntries(ctx: any, options: SeoPluginOptions): Promise<CollectedSitemap[]> {
  const siteUrl = options.siteUrl.replace(/\/+$/, '');
  const out: CollectedSitemap[] = [];
  const excluded = new Set((options.sitemapOptions?.excludeCollections || []).map((s) => String(s).toLowerCase()));

  if (!ctx?.content?.list) return out;

  for (const col of listCollections(ctx)) {
    if (ADMIN_SLUGS_RE.test(col.slug)) continue;
    if (excluded.has(col.slug.toLowerCase())) continue;
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
          if (options.sitemapOptions?.includeImages !== false) {
            for (const src of extractContentImages(data.content, siteUrl)) {
              if (!images.some((i) => i.loc === src)) images.push({ loc: src });
              if (images.length >= 4) break;
            }
          }
          entries.push({
            loc,
            lastmod: typeof lastmod === 'string' ? lastmod : lastmod ? new Date(lastmod).toISOString() : undefined,
            changefreq: col.slug === 'posts' ? 'daily' : 'weekly',
            images: images.length > 0 ? images : undefined,
            videos: collectEntryVideos(data, images[0]?.loc, siteUrl),
            ...(isNewsFresh(lastmod)
              ? {
                  newsTitle: (typeof data.title === 'string' && data.title) || item.slug,
                  newsDate: typeof lastmod === 'string' ? lastmod : new Date(lastmod).toISOString(),
                }
              : {}),
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
  return cachedProtocol(ctx, 'seo:cache:sitemap.xml', async () => {
    const siteUrl = options.siteUrl.replace(/\/+$/, '');
    const collected = await collectSitemapEntries(ctx, options);

    if (collected.length === 0) {
      return xmlResponse(generateSitemapXml(defaultEntries(siteUrl)));
    }

    const total = collected.reduce((n, c) => n + c.entries.length, 0);
    if (total <= pageSize(options)) {
      return xmlResponse(generateSitemapXml(collected.flatMap((c) => c.entries)));
    }
    // Large sites: serve an index of per-collection sitemaps
    return renderSitemapIndex(ctx, options, collected);
  });
}

/** Sitemap index over per-collection sitemaps, paginated at SITEMAP_PAGE_SIZE. */
export async function renderSitemapIndex(
  ctx: any,
  options: SeoPluginOptions,
  collected?: CollectedSitemap[]
): Promise<Response> {
  return cachedProtocol(ctx, 'seo:cache:sitemap-index.xml', async () => {
    const siteUrl = options.siteUrl.replace(/\/+$/, '');
    const groups = collected ?? (await collectSitemapEntries(ctx, options));
    const sitemaps: { loc: string; lastmod?: string }[] = [];
    if (groups.length === 0) {
      sitemaps.push({ loc: `${siteUrl}/sitemap.xml` });
    }
    for (const g of groups) {
      const chunks = chunkEntries(g.entries, pageSize(options));
      chunks.forEach((chunk, i) => {
        const suffix = chunks.length > 1 ? `-${i + 1}` : '';
        sitemaps.push({
          loc: `${siteUrl}/sitemap-${g.collection}${suffix}.xml`,
          lastmod: chunk[0]?.lastmod,
        });
      });
    }
    return xmlResponse(generateSitemapIndexXml(sitemaps));
  });
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
  const chunks = chunkEntries(match.entries, pageSize(options));
  return xmlResponse(generateSitemapXml(chunks[Math.min(pageNum, chunks.length) - 1] || []));
}

/** Minimal XSL stylesheet so /sitemap.xsl renders human-readable in browsers. */
export function renderSitemapXsl(): Response {
  const xsl = `<?xml version="1.0" encoding="UTF-8"?>\n<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9">\n<xsl:template match="/"><html><head><title>XML Sitemap</title></head><body><h1>XML Sitemap</h1><ul><xsl:for-each select="sitemap:urlset/sitemap:url|sitemap:sitemapindex/sitemap:sitemap"><li><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a><xsl:if test="sitemap:lastmod"> (<xsl:value-of select="sitemap:lastmod"/>)</xsl:if></li></xsl:for-each></ul></body></html></xsl:template>\n</xsl:stylesheet>`;
  return new Response(xsl, {
    status: 200,
    headers: {
      'Content-Type': 'application/xslt+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
      'X-Robots-Tag': 'noindex',
    },
  });
}
