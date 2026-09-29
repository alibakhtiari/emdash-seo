import type { SeoPluginOptions, LocalBusinessInfo } from './types.js';

export const DEFAULT_4SEASONS_BUSINESS: LocalBusinessInfo = {
  name: "4 Seasons Carpet Clean",
  legalName: "4SEASONSCLEAN LTD",
  url: "https://4seasonscarpetclean.co.uk",
  logo: "https://4seasonscarpetclean.co.uk/wp-content/uploads/2023/10/4-seasons-carpet-clean.png",
  image: "https://4seasonscarpetclean.co.uk/wp-content/uploads/2024/11/4-Seasons-Carpet-Clean.jpg",
  telephone: "+442034881970",
  email: "info@4seasonscarpetclean.co.uk",
  priceRange: "££",
  address: {
    streetAddress: "47 Westbourne Terrace",
    addressLocality: "London",
    postalCode: "W2 3UY",
    addressCountry: "GB",
  },
  geoCoordinates: {
    latitude: "51.5150421",
    longitude: "-0.177878",
  },
  geoRadiusMeters: "30000",
  openingHours: [
    "Mo,Tu,We,Th,Fr,Sa 07:00-21:00",
    "Su 10:00-16:00",
  ],
  sameAs: [
    "https://www.facebook.com/4seasonscarpetclean",
    "https://www.instagram.com/4seasons_clean",
    "https://www.linkedin.com/company/4-seasons-carpet-clean",
    "https://uk.trustpilot.com/review/www.4seasonscarpetclean.co.uk",
    "https://x.com/4seasonclean",
    "https://wa.me/447572895134",
  ],
  aggregateRating: {
    ratingValue: "5.0",
    reviewCount: "343",
  },
};

export const DEFAULT_OPTIONS: SeoPluginOptions = {
  siteUrl: "https://4seasonscarpetclean.co.uk",
  siteName: "4 Seasons Carpet Clean",
  defaultTitleTemplate: "%title% %separator% %siteName%",
  defaultSeparator: " | ",
  defaultOgImage: "https://4seasonscarpetclean.co.uk/wp-content/uploads/2024/11/4-Seasons-Carpet-Clean.jpg",
  enableLlmsTxt: true,
  enableSitemap: true,
  enableRobots: true,
  enableRedirects: true,
  business: DEFAULT_4SEASONS_BUSINESS,
};

export interface ResolveVariablesContext {
  title?: string;
  excerpt?: string;
  date?: string;
  category?: string;
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
  const siteName = opts.siteName || '4 Seasons Carpet Clean';

  let result = template
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
