/**
 * Schema Nodes Builder for Author E-E-A-T, HowTo, and Page Types
 */

import type { AuthorProfile, HowToStep, LocalBusinessBranch } from '../types.js';

export function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/**
 * Builds schema.org Person node for Author with rich E-E-A-T credentials
 */
export function buildAuthorNode(
  author: AuthorProfile,
  siteUrl: string,
  suffix = 'author'
): Record<string, any> {
  const cleanSiteUrl = siteUrl.replace(/\/+$/, '');
  const authorSlug = slugify(author.name || 'editorial-team');
  const authorId = `${cleanSiteUrl}/author/${authorSlug}#${suffix}`;
  const authorUrl = author.url || `${cleanSiteUrl}/author/${authorSlug}/`;

  return {
    '@type': 'Person',
    '@id': authorId,
    'name': author.name,
    'url': authorUrl,
    ...(author.jobTitle ? { 'jobTitle': author.jobTitle } : {}),
    ...(author.worksFor
      ? {
          'worksFor': {
            '@type': 'Organization',
            'name': author.worksFor,
          },
        }
      : { 'worksFor': { '@id': `${cleanSiteUrl}/#organization` } }),
    ...(author.image
      ? {
          'image': {
            '@type': 'ImageObject',
            '@id': `${authorId}-image`,
            'url': author.image,
            'caption': author.name,
          },
        }
      : {}),
    ...(author.sameAs && author.sameAs.length > 0 ? { 'sameAs': author.sameAs } : {}),
    ...(author.knowsAbout && author.knowsAbout.length > 0 ? { 'knowsAbout': author.knowsAbout } : {}),
    ...(author.alumniOf ? { 'alumniOf': author.alumniOf } : {}),
    ...(author.description ? { 'description': author.description } : {}),
    ...(author.email ? { 'email': author.email } : {}),
  };
}

/**
 * Builds schema.org HowTo node for step-by-step instructional content
 */
export function buildHowToNode(
  steps: HowToStep[],
  canonicalUrl: string,
  title: string,
  description: string,
  imageUrl?: string
): Record<string, any> {
  const cleanCanonical = canonicalUrl.replace(/\/+$/, '');

  return {
    '@type': 'HowTo',
    '@id': `${cleanCanonical}#howto`,
    'name': title,
    'description': description,
    ...(imageUrl ? { 'image': imageUrl } : {}),
    'step': steps.map((s, idx) => ({
      '@type': 'HowToStep',
      'position': s.position || idx + 1,
      'name': s.name || `Step ${idx + 1}`,
      'text': s.text,
      ...(s.image ? { 'image': s.image } : {}),
      ...(s.url ? { 'url': s.url } : {}),
    })),
  };
}

/**
 * Infers the most specific schema type based on path and slug.
 * Returns null when explicitly disabled via 'None'.
 */
export function inferSchemaType(pathname: string, explicitType?: string | null): string | null {
  if (explicitType === 'None' || explicitType === 'none') {
    return null;
  }
  if (explicitType) {
    return explicitType;
  }

  const p = pathname.toLowerCase().replace(/\/+$/, '');

  if (p === '/about' || p.startsWith('/about-') || p.startsWith('/about/')) return 'AboutPage';
  if (p === '/contact' || p.startsWith('/contact-') || p.startsWith('/contact/')) return 'ContactPage';
  if (p === '/profile' || p.startsWith('/author/')) return 'ProfilePage';
  if (p.startsWith('/product') || p === '/shop' || p.startsWith('/shop/')) return 'Product';
  if (p.includes('/faq')) return 'FAQPage';
  if (p === '/how-to' || p.startsWith('/how-to/') || p === '/howto' || p.startsWith('/howto/')) return 'HowTo';
  if (p.startsWith('/event')) return 'Event';
  if (p.startsWith('/recipe')) return 'Recipe';
  if (p.startsWith('/jobs') || p.startsWith('/careers') || p.startsWith('/job/')) return 'JobPosting';
  if (p === '/search' || p.startsWith('/search/')) return 'SearchResultsPage';
  if (p.startsWith('/categor') || p.startsWith('/tag/') || p === '/tags') return 'CollectionPage';
  if (p.startsWith('/services') || p.includes('/service/')) return 'Service';
  if (
    p.startsWith('/blog') ||
    p.startsWith('/guides') ||
    p.startsWith('/posts') ||
    p.startsWith('/how-to') ||
    p.startsWith('/guide')
  ) {
    return 'BlogPosting';
  }

  return 'Article';
}

/**
 * Builds one LocalBusiness branch node per location (cap 5), linked to the
 * parent organization via parentOrganization (mirrored by department refs).
 */
export function buildLocationNodes(
  business: { name: string; locations?: LocalBusinessBranch[] },
  cleanSiteUrl: string
): Record<string, any>[] {
  return (business.locations || []).slice(0, 5).map((loc, i) => ({
    "@type": "LocalBusiness",
    "@id": `${cleanSiteUrl}/#location-${i + 1}`,
    ...(loc.name ? { "name": loc.name } : { "name": `${business.name} — Location ${i + 1}` }),
    ...(loc.telephone ? { "telephone": loc.telephone } : {}),
    ...(loc.address ? {
      "address": {
        "@type": "PostalAddress",
        ...(loc.address.streetAddress ? { "streetAddress": loc.address.streetAddress } : {}),
        ...(loc.address.addressLocality ? { "addressLocality": loc.address.addressLocality } : {}),
        ...(loc.address.postalCode ? { "postalCode": loc.address.postalCode } : {}),
        ...(loc.address.addressCountry ? { "addressCountry": loc.address.addressCountry } : {}),
      }
    } : {}),
    ...(loc.geoCoordinates ? {
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": loc.geoCoordinates.latitude,
        "longitude": loc.geoCoordinates.longitude
      }
    } : {}),
    ...(loc.openingHours ? { "openingHours": loc.openingHours } : {}),
    "parentOrganization": { "@id": `${cleanSiteUrl}/#organization` },
  }));
}

export interface PlaceNodeContext {
  title: string;
  description: string;
  cleanCanonical: string;
  cleanSiteUrl: string;
  imageUrl?: string;
  datePublished?: string;
  overrides: Record<string, any>;
}

/**
 * Builds JobPosting / CollectionPage / SearchResultsPage nodes. Extracted
 * from schema-builder.ts to honor the 500-line file cap.
 */
export function buildPlaceNode(
  schemaType: 'JobPosting' | 'CollectionPage' | 'SearchResultsPage',
  ctx: PlaceNodeContext
): Record<string, any> | null {
  const { title, description, cleanCanonical, cleanSiteUrl, imageUrl, datePublished, overrides } = ctx;
  if (schemaType === 'JobPosting') {
    return {
      "@type": "JobPosting",
      "@id": `${cleanCanonical}#jobposting`,
      "title": title,
      "description": description,
      "hiringOrganization": { "@id": `${cleanSiteUrl}/#organization` },
      ...(datePublished ? { "datePosted": datePublished } : {}),
      ...(overrides.employmentType ? { "employmentType": overrides.employmentType } : {}),
      ...(overrides.jobLocation ? { "jobLocation": overrides.jobLocation } : {}),
      ...(imageUrl ? { "image": imageUrl } : {}),
      ...overrides,
    };
  }
  return {
    "@type": schemaType,
    "@id": `${cleanCanonical}#${schemaType.toLowerCase()}`,
    "name": title,
    "description": description,
    "isPartOf": { "@id": `${cleanCanonical}#webpage` },
    ...overrides,
  };
}
