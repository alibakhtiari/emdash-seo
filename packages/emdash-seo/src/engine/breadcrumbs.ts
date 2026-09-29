export interface BreadcrumbItem {
  name: string;
  url: string;
}

const COMMON_SLUG_LABELS: Record<string, string> = {
  'carpet-cleaning-service-london': 'Carpet Cleaning',
  'commercial-carpet-cleaning-london': 'Commercial Carpet Cleaning',
  'rug-cleaning-near-me-london': 'Rug Cleaning',
  'persian-rug-cleaning-london': 'Persian Rug Cleaning',
  'sofa-cleaning-london': 'Upholstery & Sofa Cleaning',
  'mattress-cleaning-london': 'Mattress Cleaning',
  'curtain-cleaning-london': 'Curtain Cleaning',
  'end-of-tenancy-cleaning-london': 'End of Tenancy Cleaning',
  'stain-removal-london': 'Stain Removal',
  'steam-cleaning-london': 'Steam Cleaning',
  'carpet-cleaning-prices-london': 'Prices',
  'expert-cleaning-services-london-gallery': 'Gallery',
  'booking-carpet-cleaning-services-london': 'Book Online',
  'contact-us': 'Contact Us',
  'faq': 'FAQ',
  'blog': 'Blog Guides',
  'posts': 'Blog',
  'services': 'Services',
  'pages': 'Pages',
  'tips': 'Cleaning Tips',
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
    { name: 'Home', url: `${cleanSiteUrl}/` }
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
    });
  }

  // If a single slug post with category provided, insert category between Home and post
  if (segments.length === 1 && category && category.toLowerCase() !== 'home') {
    const catSlug = category.toLowerCase().replace(/\s+/g, '-');
    breadcrumbs.splice(1, 0, {
      name: category,
      url: `${cleanSiteUrl}/category/${catSlug}/`,
    });
  }

  return breadcrumbs;
}
