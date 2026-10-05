export interface BreadcrumbItem {
  name: string;
  url?: string;
  item?: string; // Schema.org alias for url
}

export interface BreadcrumbRuleCrumb {
  label: string;
  href?: string;
}

export type BreadcrumbRule = BreadcrumbRuleCrumb[];

export interface BreadcrumbOptions {
  breadcrumbLabels?: Record<string, string>;
  breadcrumbRules?: Record<string, BreadcrumbRule>;
  pageType?: string;
  canonicalUrl?: string;
}

const COMMON_SLUG_LABELS: Record<string, string> = {
  'contact-us': 'Contact Us',
  'about-us': 'About Us',
  'faq': 'FAQ',
  'blog': 'Blog',
  'posts': 'Articles',
  'services': 'Services',
  'products': 'Products',
  'pricing': 'Pricing',
  'gallery': 'Gallery',
  'terms': 'Terms & Conditions',
  'privacy-policy': 'Privacy Policy',
};

/**
 * Noise segments that should not appear as crumbs:
 * - /.../page/N pagination — both the literal 'page' and the number
 * - Pure numeric year (4 digits) or month (1-2 digits) archive segments
 */
export function shouldSkipSegment(segment: string, all: string[], index: number): boolean {
  // /.../page/N — both segments
  if (segment === 'page' && index < all.length - 1 && /^\d+$/.test(all[index + 1])) {
    return true;
  }
  if (index > 0 && all[index - 1] === 'page' && /^\d+$/.test(segment)) {
    return true;
  }

  // Pure numeric year (4 digits) or month (1-2 digits) archive segments
  if (/^\d{4}$/.test(segment)) return true;
  if (/^\d{1,2}$/.test(segment)) return true;

  return false;
}

export function formatSlugToLabel(slug: string, overrides?: Record<string, string>): string {
  if (overrides && overrides[slug]) return overrides[slug];
  if (COMMON_SLUG_LABELS[slug]) return COMMON_SLUG_LABELS[slug];

  return slug
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

/**
 * Automatically generates Google-compliant breadcrumb trails from the URL pathname.
 * Handles pagination & date archive suppression and custom segment/pageType overrides.
 */
export function generateAutoBreadcrumbs(
  pathname: string,
  siteUrl: string,
  currentTitle?: string,
  category?: string,
  options?: BreadcrumbOptions
): BreadcrumbItem[] {
  const cleanSiteUrl = siteUrl.replace(/\/+$/, '');
  const cleanPath = pathname.replace(/^\/+|\/+$/g, '');

  const breadcrumbs: BreadcrumbItem[] = [
    { name: 'Home', url: `${cleanSiteUrl}/`, item: `${cleanSiteUrl}/` }
  ];

  if (!cleanPath || pathname === '/' || pathname === '/404') {
    return breadcrumbs;
  }

  // 1. Layer 1: Rule match by pageType if provided
  if (options?.pageType && options?.breadcrumbRules && options.breadcrumbRules[options.pageType]) {
    const rule = options.breadcrumbRules[options.pageType];
    if (rule.length > 0) {
      const pageUrl = options.canonicalUrl || `${cleanSiteUrl}/${cleanPath}/`;
      const ruleCrumbs: BreadcrumbItem[] = [];
      for (const crumb of rule) {
        const name = crumb.label === '{title}' ? currentTitle || 'Item' : crumb.label;
        let href = crumb.href;
        if (!href || href === '{path}') {
          href = pageUrl;
        } else if (href.startsWith('/')) {
          href = `${cleanSiteUrl}${href}`;
        }
        ruleCrumbs.push({ name, url: href, item: href });
      }
      if (ruleCrumbs.length > 1) {
        return ruleCrumbs;
      }
    }
  }

  // 2. Layer 2: Path derivation with smart segment skipping and label overrides
  const rawSegments = cleanPath.split('/').filter(Boolean);
  let accumulatedPath = cleanSiteUrl;

  for (let i = 0; i < rawSegments.length; i++) {
    const segment = rawSegments[i];
    accumulatedPath = `${accumulatedPath.replace(/\/+$/, '')}/${segment}/`;

    if (shouldSkipSegment(segment, rawSegments, i)) {
      continue;
    }

    const isLast = i === rawSegments.length - 1;
    let label: string;
    if (isLast && currentTitle) {
      label = currentTitle;
    } else {
      label = formatSlugToLabel(segment, options?.breadcrumbLabels);
    }

    const url = isLast && options?.canonicalUrl ? options.canonicalUrl : accumulatedPath;

    breadcrumbs.push({
      name: label,
      url,
      item: url,
    });
  }

  // If a single slug post with category provided, insert category between Home and post
  if (rawSegments.length === 1 && category && category.toLowerCase() !== 'home') {
    const catSlug = category.toLowerCase().replace(/\s+/g, '-');
    const catUrl = `${cleanSiteUrl}/category/${catSlug}/`;
    breadcrumbs.splice(1, 0, {
      name: category,
      url: catUrl,
      item: catUrl,
    });
  }

  return breadcrumbs;
}
