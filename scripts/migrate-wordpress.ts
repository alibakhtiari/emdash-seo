/**
 * WordPress Migration CLI for EmDash CMS & Astro
 *
 * Supports:
 * - Option A: WP REST API with Application Password from .env
 * - Option B: Helper plugin endpoint (/wp-json/emdash-export/v1/all)
 * - Option C: Unauthenticated public REST API fallback with HTML meta extraction
 */

import fs from 'node:fs';
import path from 'node:path';
import { parseRankMathMeta, extractFaqsFromContent } from '../packages/emdash-seo/src/importers/rankmath-importer.ts';

// Load .env manually if exists
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const WP_URL = (process.env.WP_URL || 'https://example.com').replace(/\/+$/, '');
const WP_USER = process.env.WP_USER || '';
const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD || '';
const WP_EXPORT_SECRET = process.env.WP_EXPORT_SECRET || '';

interface WpPost {
  id: number;
  date: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  featured_media?: number;
  categories?: number[];
  tags?: number[];
  meta?: Record<string, any>;
  seo?: Record<string, any>;
  featured_image_src_large?: [string, number, number, boolean];
}

async function fetchWithAuth(endpoint: string) {
  const headers: Record<string, string> = {
    'User-Agent': 'EmDash-Migrator/1.0',
    'Accept': 'application/json',
  };

  if (WP_USER && WP_APP_PASSWORD) {
    const creds = Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString('base64');
    headers['Authorization'] = `Basic ${creds}`;
  }

  const res = await fetch(`${WP_URL}${endpoint}`, { headers });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${endpoint}: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function runMigration() {
  console.log('=====================================================');
  console.log('       WordPress -> EmDash Migration Engine          ');
  console.log('=====================================================');
  console.log(`Source URL: ${WP_URL}`);
  if (WP_USER && WP_APP_PASSWORD) {
    console.log(`Authentication: Basic Auth (User: ${WP_USER})`);
  } else if (WP_EXPORT_SECRET) {
    console.log(`Authentication: Helper Plugin Secret Token`);
  } else {
    console.log(`Authentication: Public REST API mode (Notice: configure WP_APP_PASSWORD in .env for private meta)`);
  }

  // Check if helper plugin endpoint is available
  let helperData: any = null;
  if (WP_EXPORT_SECRET || process.argv.includes('--helper')) {
    try {
      console.log('Attempting helper plugin extraction...');
      helperData = await fetchWithAuth(`/wp-json/emdash-export/v1/all?secret=${WP_EXPORT_SECRET}`);
      console.log(`Successfully connected to helper plugin! Found ${helperData.total_items} items and ${helperData.redirects?.length || 0} redirects.`);
    } catch (e: any) {
      console.log(`Helper plugin endpoint not available (${e.message}), proceeding with standard WP REST API.`);
    }
  }

  let posts: WpPost[] = [];
  let pages: WpPost[] = [];

  if (helperData && helperData.items) {
    posts = helperData.items.filter((i: any) => i.post_type === 'post').map(transformHelperItem);
    pages = helperData.items.filter((i: any) => i.post_type === 'page').map(transformHelperItem);
  } else {
    console.log('Fetching posts from WP REST API (/wp-json/wp/v2/posts)...');
    try {
      posts = (await fetchWithAuth('/wp-json/wp/v2/posts?per_page=100')) as WpPost[];
      console.log(`Fetched ${posts.length} blog posts.`);
    } catch (e: any) {
      console.error(`Error fetching posts: ${e.message}`);
    }

    console.log('Fetching pages from WP REST API (/wp-json/wp/v2/pages)...');
    try {
      pages = (await fetchWithAuth('/wp-json/wp/v2/pages?per_page=100')) as WpPost[];
      console.log(`Fetched ${pages.length} pages.`);
    } catch (e: any) {
      console.error(`Error fetching pages: ${e.message}`);
    }
  }

  // Distinguish service pages from general pages
  const serviceKeywords = [
    'carpet-cleaning',
    'rug-cleaning',
    'sofa-cleaning',
    'upholstery',
    'mattress-cleaning',
    'curtain-cleaning',
    'steam-cleaning',
    'end-of-tenancy',
    'stain-removal',
    'airbnb-cleaning',
    'hard-floor',
    'hardwood-floor',
    'emergency-carpet',
    'persian-rug',
  ];

  const servicePages: any[] = [];
  const standardPages: any[] = [];

  for (const page of pages) {
    const isService = serviceKeywords.some((kw) => page.slug.includes(kw));
    const rawContent = page.content?.rendered || '';
    const rawMeta = page.meta || {};

    const seoMeta = page.seo || parseRankMathMeta(rawMeta, rawContent);
    const faqs = extractFaqsFromContent(rawContent);
    if (faqs.length > 0 && !seoMeta.faqs) {
      seoMeta.faqs = faqs;
    }

    const entry = {
      id: `page-${page.id}`,
      slug: page.slug,
      status: page.status || 'published',
      data: {
        title: cleanHtmlEntities(page.title?.rendered || ''),
        excerpt: cleanHtmlEntities(page.excerpt?.rendered || '').slice(0, 200),
        featured_image: page.featured_image_src_large?.[0] || undefined,
        content: [
          {
            _type: 'block',
            style: 'normal',
            children: [{ _type: 'span', text: cleanHtmlText(rawContent) }],
            _key: `k-${page.id}`,
          },
        ],
        seo: seoMeta,
      },
    };

    if (isService) {
      servicePages.push(entry);
    } else {
      standardPages.push(entry);
    }
  }

  // Format blog posts
  const formattedPosts = posts.map((post) => {
    const rawContent = post.content?.rendered || '';
    const rawMeta = post.meta || {};
    const seoMeta = post.seo || parseRankMathMeta(rawMeta, rawContent);
    const faqs = extractFaqsFromContent(rawContent);
    if (faqs.length > 0 && !seoMeta.faqs) {
      seoMeta.faqs = faqs;
    }

    return {
      id: `post-${post.id}`,
      slug: post.slug,
      status: post.status || 'published',
      createdAt: post.date,
      data: {
        title: cleanHtmlEntities(post.title?.rendered || ''),
        excerpt: cleanHtmlEntities(post.excerpt?.rendered || '').slice(0, 200),
        featured_image: post.featured_image_src_large?.[0] || undefined,
        content: [
          {
            _type: 'block',
            style: 'normal',
            children: [{ _type: 'span', text: cleanHtmlText(rawContent) }],
            _key: `k-${post.id}`,
          },
        ],
        seo: seoMeta,
      },
    };
  });

  // Construct complete seed.json
  const seedPath = path.resolve(process.cwd(), 'seed/seed.json');

  const fullSeed = {
    $schema: 'https://emdashcms.com/seed.schema.json',
    version: '1',
    meta: {
      name: 'EmDash WordPress Migration',
      description: 'Imported from WordPress with full Rank Math / Yoast SEO suite',
      author: 'EmDash Migrator',
    },
    settings: {
      title: 'EmDash Migrated Site',
      tagline: 'High-performance Astro + EmDash CMS',
    },
    collections: [
      {
        slug: 'services',
        label: 'Cleaning Services',
        labelSingular: 'Service',
        urlPattern: '/{slug}',
        supports: ['drafts', 'revisions', 'preview', 'search', 'seo'],
        fields: [
          { slug: 'title', label: 'Service Name', type: 'string', required: true, searchable: true },
          { slug: 'featured_image', label: 'Featured Image', type: 'image' },
          { slug: 'content', label: 'Details', type: 'portableText', searchable: true },
          { slug: 'excerpt', label: 'Short Excerpt', type: 'text' },
        ],
      },
      {
        slug: 'posts',
        label: 'Blog Guides',
        labelSingular: 'Guide',
        urlPattern: '/{slug}',
        supports: ['drafts', 'revisions', 'preview', 'scheduling', 'search', 'seo'],
        fields: [
          { slug: 'title', label: 'Title', type: 'string', required: true, searchable: true },
          { slug: 'featured_image', label: 'Featured Image', type: 'image' },
          { slug: 'content', label: 'Content', type: 'portableText', searchable: true },
          { slug: 'excerpt', label: 'Excerpt', type: 'text' },
        ],
      },
      {
        slug: 'pages',
        label: 'Pages',
        labelSingular: 'Page',
        urlPattern: '/{slug}',
        supports: ['drafts', 'revisions', 'preview', 'search', 'seo'],
        fields: [
          { slug: 'title', label: 'Title', type: 'string', required: true, searchable: true },
          { slug: 'featured_image', label: 'Featured Image', type: 'image' },
          { slug: 'content', label: 'Content', type: 'portableText', searchable: true },
        ],
      },
    ],
    content: {
      services: servicePages,
      posts: formattedPosts,
      pages: standardPages,
    },
  };

  fs.mkdirSync(path.dirname(seedPath), { recursive: true });
  fs.writeFileSync(seedPath, JSON.stringify(fullSeed, null, 2), 'utf-8');

  // Summary Report
  const summary = {
    migratedAt: new Date().toISOString(),
    sourceUrl: WP_URL,
    totalPosts: formattedPosts.length,
    totalServices: servicePages.length,
    totalPages: standardPages.length,
    totalFaqsExtracted: [...servicePages, ...formattedPosts].filter((i) => i.data.seo?.faqs?.length).length,
    seedFile: seedPath,
  };

  fs.writeFileSync(
    path.resolve(process.cwd(), 'migration-summary.json'),
    JSON.stringify(summary, null, 2),
    'utf-8'
  );

  console.log('\n=====================================================');
  console.log('              Migration Complete!                    ');
  console.log('=====================================================');
  console.log(`• Total Cleaning Services Migrated: ${servicePages.length}`);
  console.log(`• Total Blog Guides Migrated:       ${formattedPosts.length}`);
  console.log(`• Total Pages Migrated:             ${standardPages.length}`);
  console.log(`• Generated EmDash Seed:            seed/seed.json`);
  console.log(`• Migration Summary Written:        migration-summary.json`);
  console.log('=====================================================\n');
}

function cleanHtmlEntities(str: string): string {
  return str
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#038;/g, '&')
    .replace(/&#8211;/g, '—')
    .replace(/<[^>]*>?/gm, '')
    .trim();
}

function cleanHtmlText(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function transformHelperItem(item: any): WpPost {
  return {
    id: item.id,
    date: item.date,
    slug: item.slug,
    status: item.status,
    type: item.post_type,
    link: item.permalink,
    title: { rendered: item.title },
    content: { rendered: item.content },
    excerpt: { rendered: item.excerpt },
    featured_image_src_large: item.featured_image ? [item.featured_image, 1024, 683, true] : undefined,
    seo: item.seo,
    meta: item.raw_meta,
  };
}

runMigration().catch((err) => {
  console.error('Fatal error during migration:', err);
  process.exit(1);
});
