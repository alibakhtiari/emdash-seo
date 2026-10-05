/**
 * Absolute page URL builder for content entries.
 * Honors Astro i18n locale-prefix routing rules and collection urlPattern.
 * Zero external dependencies.
 */

export interface I18nConfigLike {
  locales: string[];
  defaultLocale: string;
  prefixDefaultLocale?: boolean;
}

export interface BuildPageUrlInput {
  locale: string;
  slug: string;
  /** ctx.site.url or options.siteUrl — absolute origin */
  siteUrl: string;
  cfg?: I18nConfigLike;
  /** e.g. "/{slug}" or "/blog/{slug}" */
  urlPattern: string;
}

const UNSUBSTITUTED_PLACEHOLDER_RE = /\{[^}]+\}/;
const MULTI_SLASH_RE = /\/+/g;

/**
 * Build an absolute page URL for a (locale, slug) pair, honoring Astro i18n rules.
 */
export function buildPageUrl(input: BuildPageUrlInput): string | null {
  const { locale, slug, siteUrl, cfg, urlPattern } = input;

  if (!urlPattern || !urlPattern.includes('{slug}')) return null;

  // Substitute {slug} into the pattern
  let path = urlPattern.replace('{slug}', slug);

  // Reject patterns that still carry unsubstituted placeholders
  if (UNSUBSTITUTED_PLACEHOLDER_RE.test(path)) return null;

  // Astro i18n locale prefixing
  if (cfg) {
    const shouldPrefix = locale !== cfg.defaultLocale || cfg.prefixDefaultLocale === true;
    if (shouldPrefix) {
      if (!path.startsWith('/')) path = `/${path}`;
      path = `/${locale}${path}`;
    }
  }

  // Normalize: ensure leading slash, lowercase, collapse duplicate slashes, enforce trailing slash
  if (!path.startsWith('/')) path = `/${path}`;
  path = path.toLowerCase().replace(MULTI_SLASH_RE, '/');
  if (!path.endsWith('/')) path += '/';

  // Strip trailing slash from siteUrl before concatenation
  const origin = siteUrl.replace(/\/+$/, '');

  try {
    const url = new URL(`${origin}${path}`);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}
