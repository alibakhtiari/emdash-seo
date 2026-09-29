export interface BreadcrumbItem {
  name: string;
  url?: string;
  item?: string; // Schema.org alias for url
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

function formatSlugToLabel(slug: string): string {
  if (COMMON_SLUG_LABELS[slug]) return COMMON_SLUG_LABELS[slug];

  return slug
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

/**
 * Automatically generates Google-compliant breadcrumb trails from the URL pathname.
 */
export function generateAutoBreadcrumbs(
  pathname: string,
  siteUrl: string,
  currentTitle?: string,
  category?: string
): BreadcrumbItem[] {
  const cleanSiteUrl = siteUrl.replace(/\/+$/, '');
  const cleanPath = pathname.replace(/^\/+|\/+$/g, '');

  const breadcrumbs: BreadcrumbItem[] = [
    { name: 'Home', url: `${cleanSiteUrl}/`, item: `${cleanSiteUrl}/` }
  ];

  if (!cleanPath) {
    return breadcrumbs;
  }

  const segments = cleanPath.split('/').filter(Boolean);

  let accumulatedPath = cleanSiteUrl;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    accumulatedPath = `${accumulatedPath.replace(/\/+$/, '')}/${segment}/`;

    const isLast = i === segments.length - 1;

    let label: string;
    if (isLast && currentTitle) {
      label = currentTitle;
    } else {
      label = formatSlugToLabel(segment);
    }

    breadcrumbs.push({
      name: label,
      url: accumulatedPath,
      item: accumulatedPath,
    });
  }

  // If a single slug post with category provided, insert category between Home and post
  if (segments.length === 1 && category && category.toLowerCase() !== 'home') {
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
