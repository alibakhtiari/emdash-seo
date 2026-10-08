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
  /** WP permalink trailing-slash preference. Defaults to true. */
  trailingSlash?: boolean;
  /** Archive pagination: appends /page/N when N > 1. */
  page?: number;
  /** Preserved query string or params, e.g. "?s=q" or { s: "q" }. */
  query?: string | Record<string, string>;
}

const UNSUBSTITUTED_PLACEHOLDER_RE = /\{[^}]+\}/;
const MULTI_SLASH_RE = /\/+/g;

/**
 * Build an absolute page URL for a (locale, slug) pair, honoring Astro i18n rules.
 */
export function buildPageUrl(input: BuildPageUrlInput): string | null {
  const { locale, slug, siteUrl, cfg, urlPattern } = input;
  const trailingSlash = input.trailingSlash ?? true;

  if (!urlPattern || !urlPattern.includes('{slug}')) return null;

  // Substitute {slug} into the pattern (slug case preserved for equity)
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

  // Normalize: ensure leading slash, collapse duplicate slashes (case preserved —
  // only scheme/host are lowercased via URL parsing below, slugs keep equity).
  if (!path.startsWith('/')) path = `/${path}`;
  path = path.replace(MULTI_SLASH_RE, '/');

  // /page/N archive pagination (N > 1 only; page 1 is the canonical URL)
  if (input.page && input.page > 1) {
    path = path.replace(/\/+$/, '');
    path += `/page/${Math.floor(input.page)}`;
  }

  // Trailing-slash preference (WP permalink setting); root always keeps "/"
  if (trailingSlash) {
    if (!path.endsWith('/')) path += '/';
  } else if (path.length > 1) {
    path = path.replace(/\/+$/, '');
  }

  // Lowercase only scheme/host — never the path (slug case equity).
  const origin = siteUrl.replace(/\/+$/, '').toLowerCase();

  try {
    const url = new URL(`${origin}${path}`);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    // Preserve query params (search/filter state) when provided
    if (input.query) {
      url.search =
        typeof input.query === 'string'
          ? input.query.startsWith('?') || input.query === ''
            ? input.query
            : `?${input.query}`
          : `?${new URLSearchParams(input.query).toString()}`;
    }
    return url.toString();
  } catch {
    return null;
  }
}
