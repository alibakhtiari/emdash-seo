import type { SeoPluginOptions } from '../types.js';

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  images?: { loc: string; title?: string }[];
}

export function generateSitemapXml(entries: SitemapEntry[]): string {
  const xmlItems = entries.map((entry) => {
    let imagesXml = '';
    if (entry.images && entry.images.length > 0) {
      imagesXml = entry.images
        .map(
          (img) =>
            `\n    <image:image>\n      <image:loc>${escapeXml(img.loc)}</image:loc>${
              img.title ? `\n      <image:title>${escapeXml(img.title)}</image:title>` : ''
            }\n    </image:image>`
        )
        .join('');
    }

    return `  <url>
    <loc>${escapeXml(entry.loc)}</loc>${entry.lastmod ? `\n    <lastmod>${entry.lastmod}</lastmod>` : ''}${
      entry.changefreq ? `\n    <changefreq>${entry.changefreq}</changefreq>` : ''
    }${entry.priority ? `\n    <priority>${entry.priority.toFixed(1)}</priority>` : ''}${imagesXml}
  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${xmlItems.join('\n')}
</urlset>`;
}

export function generateSitemapIndexXml(sitemaps: { loc: string; lastmod?: string }[]): string {
  const items = sitemaps.map(
    (s) => `  <sitemap>
    <loc>${escapeXml(s.loc)}</loc>${s.lastmod ? `\n    <lastmod>${s.lastmod}</lastmod>` : ''}
  </sitemap>`
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
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

export async function renderSitemap(ctx: any, options: SeoPluginOptions): Promise<Response> {
  const siteUrl = options.siteUrl.replace(/\/+$/, '');
  const url = new URL(ctx.request ? ctx.request.url : `${siteUrl}/sitemap.xml`);

  // Default entries for 4 Seasons Carpet Clean
  const defaultEntries: SitemapEntry[] = [
    { loc: `${siteUrl}/`, priority: 1.0, changefreq: 'weekly', lastmod: new Date().toISOString() },
    { loc: `${siteUrl}/carpet-cleaning-service-london/`, priority: 0.9, changefreq: 'weekly' },
    { loc: `${siteUrl}/commercial-carpet-cleaning-london/`, priority: 0.9, changefreq: 'weekly' },
    { loc: `${siteUrl}/rug-cleaning-near-me-london/`, priority: 0.9, changefreq: 'weekly' },
    { loc: `${siteUrl}/persian-rug-cleaning-london/`, priority: 0.9, changefreq: 'weekly' },
    { loc: `${siteUrl}/sofa-cleaning-london/`, priority: 0.9, changefreq: 'weekly' },
    { loc: `${siteUrl}/mattress-cleaning-london/`, priority: 0.8, changefreq: 'monthly' },
    { loc: `${siteUrl}/curtain-cleaning-london/`, priority: 0.8, changefreq: 'monthly' },
    { loc: `${siteUrl}/stain-removal-london/`, priority: 0.8, changefreq: 'monthly' },
    { loc: `${siteUrl}/steam-cleaning-london/`, priority: 0.8, changefreq: 'monthly' },
    { loc: `${siteUrl}/carpet-cleaning-prices-london/`, priority: 0.8, changefreq: 'monthly' },
    { loc: `${siteUrl}/booking-carpet-cleaning-services-london/`, priority: 0.8, changefreq: 'monthly' },
    { loc: `${siteUrl}/contact-us/`, priority: 0.7, changefreq: 'monthly' },
    { loc: `${siteUrl}/faq/`, priority: 0.7, changefreq: 'monthly' },
    { loc: `${siteUrl}/blog/`, priority: 0.7, changefreq: 'daily' },
  ];

  const xml = generateSitemapXml(defaultEntries);

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      'X-Robots-Tag': 'noindex',
    },
  });
}
