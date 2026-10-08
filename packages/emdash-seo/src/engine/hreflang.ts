/**
 * Multilingual & Hreflang Alternates Engine.
 * Supports Astro i18n and EmDash translation_group configurations.
 * Generates <link rel="alternate" hreflang="..." href="..."> with BCP 47 normalization and automatic x-default.
 * Zero runtime dependencies, sub-millisecond execution.
 */

export interface HreflangEntry {
  locale: string;
  url: string;
}

export interface AlternateLink {
  hreflang: string;
  href: string;
}

/**
 * Standard BCP 47 code normalization.
 * E.g. "fr-ca" -> "fr-CA", "pt-br" -> "pt-BR", "zh-hans-cn" -> "zh-Hans-CN"
 */
export function normalizeBcp47(code: string): string {
  if (!code) return '';
  const parts = code.trim().toLowerCase().split(/[-_]/);

  if (parts.length === 1) {
    return parts[0]; // e.g. "en", "es", "fr"
  }

  if (parts.length === 2) {
    const [lang, region] = parts;
    // 2-letter region code is capitalized: fr-CA, en-US
    return `${lang}-${region.toUpperCase()}`;
  }

  if (parts.length === 3) {
    // e.g. zh-hans-cn -> zh-Hans-CN
    const [lang, script, region] = parts;
    const titleScript = script.charAt(0).toUpperCase() + script.slice(1);
    return `${lang}-${titleScript}-${region.toUpperCase()}`;
  }

  return code;
}

/**
 * Build alternate links for a set of translated pages.
 * Always emits a self-referential tag (even for a single locale) plus an
 * automatic x-default pointing to the defaultLocale page (or first entry).
 *
 * og:locale:alternate coupling: page-head renderers emit `og:locale` for the
 * current locale and derive `og:locale:alternate` from these same alternates —
 * do NOT duplicate OG logic here, this module only returns link data.
 */
export function buildAlternateLinks(
  entries: HreflangEntry[],
  defaultLocale = 'en'
): AlternateLink[] {
  if (!entries || entries.length < 1) {
    return [];
  }

  const seenLocales = new Set<string>();
  const alternates: AlternateLink[] = [];
  let defaultHref: string | undefined;

  for (const entry of entries) {
    if (!entry.locale || !entry.url) continue;
    const norm = normalizeBcp47(entry.locale);
    if (seenLocales.has(norm)) continue;
    seenLocales.add(norm);

    alternates.push({
      hreflang: norm,
      href: entry.url,
    });

    if (entry.locale.toLowerCase() === defaultLocale.toLowerCase()) {
      defaultHref = entry.url;
    }
  }

  // Add x-default pointing to defaultLocale, or the first entry if defaultLocale not matched
  const xDefaultTarget = defaultHref || entries[0]?.url;
  if (xDefaultTarget) {
    alternates.push({
      hreflang: 'x-default',
      href: xDefaultTarget,
    });
  }

  return alternates;
}
