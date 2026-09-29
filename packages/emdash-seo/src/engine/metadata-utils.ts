/**
 * Metadata hygiene and Open Graph normalization utilities.
 * Handles Facebook locale validation, suffix-free og:title, snippet directives, and 404 hygiene.
 */

const FIX_LOCALES: Record<string, string> = {
  ca: 'ca_ES',
  en: 'en_US',
  el: 'el_GR',
  et: 'et_EE',
  ja: 'ja_JP',
  sq: 'sq_AL',
  uk: 'uk_UA',
  vi: 'vi_VN',
  zh: 'zh_CN',
  fa: 'fa_IR',
  ar: 'ar_AR',
  da: 'da_DK',
  de: 'de_DE',
  es: 'es_ES',
  fi: 'fi_FI',
  fr: 'fr_FR',
  he: 'he_IL',
  hi: 'hi_IN',
  it: 'it_IT',
  ko: 'ko_KR',
  nl: 'nl_NL',
  no: 'nb_NO',
  pl: 'pl_PL',
  pt: 'pt_PT',
  ru: 'ru_RU',
  sv: 'sv_SE',
  tr: 'tr_TR',
};

const VALID_LOCALES = new Set([
  'af_ZA', 'ar_AR', 'bg_BG', 'bn_IN', 'bs_BA', 'ca_ES', 'cs_CZ', 'cy_GB',
  'da_DK', 'de_DE', 'el_GR', 'en_GB', 'en_PI', 'en_UD', 'en_US', 'es_ES',
  'es_LA', 'es_MX', 'et_EE', 'eu_ES', 'fa_IR', 'fi_FI', 'fo_FO', 'fr_CA',
  'fr_FR', 'fy_NL', 'ga_IE', 'gl_ES', 'he_IL', 'hi_IN', 'hr_HR', 'hu_HU',
  'hy_AM', 'id_ID', 'is_IS', 'it_IT', 'ja_JP', 'ka_GE', 'km_KH', 'ko_KR',
  'ku_TR', 'la_VA', 'lt_LT', 'lv_LV', 'mk_MK', 'ml_IN', 'ms_MY', 'nb_NO',
  'nl_BE', 'nl_NL', 'nn_NO', 'pa_IN', 'pl_PL', 'pt_BR', 'pt_PT', 'ro_RO',
  'ru_RU', 'sk_SK', 'sl_SI', 'sq_AL', 'sr_RS', 'sv_SE', 'sw_KE', 'ta_IN',
  'te_IN', 'th_TH', 'tr_TR', 'uk_UA', 'ur_PK', 'vi_VN', 'zh_CN', 'zh_HK',
  'zh_TW',
]);

/**
 * Convert arbitrary language or locale strings to standard Facebook Open Graph locale format.
 * E.g. "en" -> "en_US", "en-gb" -> "en_GB", "fr-ca" -> "fr_CA".
 */
export function normalizeOgLocale(locale?: string): string {
  if (!locale) return 'en_US';

  const clean = locale.trim().toLowerCase();
  if (FIX_LOCALES[clean]) return FIX_LOCALES[clean];

  // Convert hyphens to underscores
  let normalized = clean.replace('-', '_');
  if (normalized.length === 2) {
    normalized = normalized.toLowerCase() + '_' + normalized.toUpperCase();
  }

  // Exact match in valid locales
  for (const valid of VALID_LOCALES) {
    if (valid.toLowerCase() === normalized.toLowerCase()) {
      return valid;
    }
  }

  // Check language prefix (e.g. "en-us" -> "en_US")
  const lang = clean.slice(0, 2);
  if (FIX_LOCALES[lang]) return FIX_LOCALES[lang];

  return 'en_US';
}

/**
 * Remove duplicate site name suffix from og:title as per OpenGraph specification.
 * og:title should only contain the page title; og:site_name contains the brand.
 */
export function cleanOgTitle(
  title: string,
  siteName?: string,
  separator?: string
): string {
  if (!title) return siteName || '';
  if (!siteName) return title;

  let cleaned = title.trim();

  // Strip separator + siteName (e.g. "My Page | ACME" or "My Page — ACME")
  const separators = separator ? [separator, ' | ', ' — ', ' - ', ' · '] : [' | ', ' — ', ' - ', ' · '];
  for (const sep of separators) {
    const suffix = `${sep}${siteName}`.toLowerCase();
    if (cleaned.toLowerCase().endsWith(suffix)) {
      cleaned = cleaned.slice(0, cleaned.length - suffix.length).trim();
      break;
    }
  }

  // Also check if ends with bare siteName
  if (cleaned.toLowerCase().endsWith(siteName.toLowerCase()) && cleaned.length > siteName.length) {
    cleaned = cleaned.slice(0, cleaned.length - siteName.length).trim();
    cleaned = cleaned.replace(/[\s|—\-·]+$/, '').trim();
  }

  return cleaned || siteName;
}

export interface RobotsOptions {
  noIndex?: boolean;
  noFollow?: boolean;
  noArchive?: boolean;
  noSnippet?: boolean;
  maxImagePreview?: 'none' | 'standard' | 'large';
  path?: string;
}

/**
 * Generate standard compliant robots directive.
 * - Suppressed (returns null) on 404 pages (best practice)
 * - Automatically applies noindex on search pages
 * - Includes max-snippet and preview directives
 */
export function generateRobotsDirective(options: RobotsOptions): string | null {
  const {
    noIndex = false,
    noFollow = false,
    noArchive = false,
    noSnippet = false,
    maxImagePreview = 'large',
    path = '',
  } = options;

  // 404 pages should omit robots directives
  if (path === '/404' || path.endsWith('/404') || path.endsWith('/404/')) {
    return null;
  }

  // Search pages should not be indexed
  const isSearch = path === '/search' || path.startsWith('/search/');
  const shouldNoIndex = noIndex || isSearch;

  const directives: string[] = [];

  if (shouldNoIndex) {
    directives.push('noindex');
    directives.push(noFollow ? 'nofollow' : 'follow');
  } else {
    directives.push('index');
    directives.push(noFollow ? 'nofollow' : 'follow');
  }

  if (noArchive) directives.push('noarchive');
  if (noSnippet) {
    directives.push('nosnippet');
  } else {
    directives.push('max-snippet:-1');
    directives.push(`max-image-preview:${maxImagePreview}`);
    directives.push('max-video-preview:-1');
  }

  return directives.join(', ');
}

export interface ExtractedTaxonomy {
  keywords: string[];
  articleSection?: string;
}

/**
 * Auto-extract taxonomy terms (categories and tags) from EmDash native content entry.
 */
export function extractTaxonomyTerms(entryData: any): ExtractedTaxonomy {
  const result: ExtractedTaxonomy = { keywords: [] };
  if (!entryData) return result;

  const termsMap = entryData.terms as Record<string, Array<{ name?: string }>> | undefined;
  if (!termsMap || typeof termsMap !== 'object') {
    if (entryData.category) {
      result.articleSection = typeof entryData.category === 'string' ? entryData.category : entryData.category.name;
    }
    return result;
  }

  // Extract all tag / keyword names
  const allTerms = Object.values(termsMap).flat();
  result.keywords = allTerms
    .map((t) => t?.name)
    .filter((name): name is string => typeof name === 'string' && name.length > 0);

  // Find category key for articleSection
  const categoryKey = Object.keys(termsMap).find((k) => /^categor/i.test(k));
  if (categoryKey && termsMap[categoryKey]?.[0]?.name) {
    result.articleSection = termsMap[categoryKey][0].name;
  } else if (entryData.category) {
    result.articleSection = typeof entryData.category === 'string' ? entryData.category : entryData.category.name;
  }

  return result;
}
