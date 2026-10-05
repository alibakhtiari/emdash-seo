/**
 * Schema Nodes Builder for Author E-E-A-T, HowTo, and Page Types
 */

import type { AuthorProfile, HowToStep } from '../types.js';

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
 * Infers the most specific schema type based on path and slug
 */
export function inferSchemaType(pathname: string, explicitType?: string): string {
  if (explicitType && explicitType !== 'None') {
    return explicitType;
  }

  const p = pathname.toLowerCase().replace(/\/+$/, '');

  if (p === '/about' || p.startsWith('/about-') || p.startsWith('/about/')) return 'AboutPage';
  if (p === '/contact' || p.startsWith('/contact-') || p.startsWith('/contact/')) return 'ContactPage';
  if (p === '/profile' || p.startsWith('/author/')) return 'ProfilePage';
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
