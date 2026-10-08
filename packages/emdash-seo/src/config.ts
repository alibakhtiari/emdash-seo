import type { SeoPluginOptions, LocalBusinessInfo } from './types.js';

export const DEFAULT_LOCAL_BUSINESS: LocalBusinessInfo = {
  name: "Local Service Business",
  legalName: "Local Business Ltd",
  url: "https://example.com",
  logo: "https://example.com/logo.png",
  image: "https://example.com/og-image.jpg",
  telephone: "+442080000000",
  email: "info@example.com",
  priceRange: "££",
  address: {
    streetAddress: "123 High Street",
    addressLocality: "London",
    postalCode: "SW1A 1AA",
    addressCountry: "GB",
  },
  geoCoordinates: {
    latitude: "51.5074",
    longitude: "-0.1278",
  },
  geoRadiusMeters: "30000",
  openingHours: [
    "Mo,Tu,We,Th,Fr 08:00-18:00",
    "Sa 09:00-17:00",
  ],
  sameAs: [
    "https://facebook.com/example",
    "https://instagram.com/example",
    "https://linkedin.com/company/example",
  ],
  aggregateRating: {
    ratingValue: "5.0",
    reviewCount: "150",
  },
};

export const DEFAULT_OPTIONS: SeoPluginOptions = {
  siteUrl: "https://example.com",
  siteName: "EmDash CMS Site",
  defaultTitleTemplate: "%title% %separator% %siteName%",
  defaultSeparator: " | ",
  defaultOgImage: "/og-image.jpg",
  enableLlmsTxt: true,
  enableSitemap: true,
  enableRobots: true,
  enableRedirects: true,
  enableIndexNow: false,
  enableSchemaMap: true,
  modules: {
    sitemaps: true,
    robots: true,
    redirects: true,
    llmsTxt: true,
    schemaMap: true,
    auditApi: true,
    indexNow: false,
    fuzzyRedirects: true,
  },
  business: DEFAULT_LOCAL_BUSINESS,
};

export interface ResolveVariablesContext {
  title?: string;
  excerpt?: string;
  date?: string;
  category?: string;
  seoTitle?: string;
  focusKeyword?: string;
  tag?: string;
  searchQuery?: string;
  page?: string | number;
  postTypePlural?: string;
  parentTitle?: string;
  customFields?: Record<string, any>;
}

/**
 * Resolves SEO template variables like %title%, %separator%, %siteName%, %excerpt%
 */
export function resolveSeoVariables(
  template: string,
  ctx: ResolveVariablesContext,
  options: Partial<SeoPluginOptions> = {}
): string {
  if (!template) return '';

  const opts = { ...DEFAULT_OPTIONS, ...options };
  const separator = opts.defaultSeparator || ' | ';
  const siteName = opts.siteName || 'EmDash CMS Site';

  const now = new Date();
  const currentDate = now.toISOString().slice(0, 10);
  const currentYear = String(now.getUTCFullYear());
  const currentMonth = now.toLocaleString('en-GB', { month: 'long', timeZone: 'UTC' });

  let result = template
    .replace(/%seo_title%/gi, ctx.seoTitle || ctx.title || '')
    .replace(/%focus_?kw%/gi, ctx.focusKeyword || '')
    .replace(/%currentdate%/gi, currentDate)
    .replace(/%currentmonth%/gi, currentMonth)
    .replace(/%currentyear%/gi, currentYear)
    .replace(/%tag%/gi, ctx.tag || '')
    .replace(/%search%/gi, ctx.searchQuery || '')
    .replace(/%page%/gi, ctx.page !== undefined && ctx.page !== null ? String(ctx.page) : '')
    .replace(/%pt_plural%/gi, ctx.postTypePlural || '')
    .replace(/%parent_title%/gi, ctx.parentTitle || '')
    .replace(/%title%/gi, ctx.title || '')
    .replace(/%separator%/gi, separator)
    .replace(/%sep%/gi, separator)
    .replace(/%siteName%/gi, siteName)
    .replace(/%sitename%/gi, siteName)
    .replace(/%excerpt%/gi, ctx.excerpt || '')
    .replace(/%date%/gi, ctx.date || '')
    .replace(/%category%/gi, ctx.category || '');

  // Handle %customField:fieldName%
  result = result.replace(/%customField:([a-zA-Z0-9_]+)%/gi, (_, key) => {
    return ctx.customFields?.[key] ? String(ctx.customFields[key]) : '';
  });

  // Clean double spaces or leading/trailing separators
  return result
    .replace(/\s+/g, ' ')
    .trim()
    .replace(new RegExp(`^\\${separator.trim()}\\s*`), '')
    .replace(new RegExp(`\\s*\\${separator.trim()}$`), '');
}
