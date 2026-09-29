import type { SeoPluginOptions } from '../types.js';

export function renderLlmsTxt(_ctx: any, options: SeoPluginOptions): Response {
  const siteUrl = options.siteUrl.replace(/\/+$/, '');
  const siteName = options.siteName || 'EmDash Site';
  const business = options.business;

  const content = `# ${siteName}
> LLM knowledge index and content summary for ${siteName}.

## Overview
- Website: ${siteUrl}
- Organization: ${business?.name || siteName}
${business?.telephone ? `- Telephone: ${business.telephone}` : ''}
${business?.email ? `- Email: ${business.email}` : ''}
${business?.address ? `- Address: ${business.address.streetAddress}, ${business.address.addressLocality}, ${business.address.postalCode}` : ''}

## Main Sections & Services
- [Home](${siteUrl}/): Main homepage and overview.
- [Services](${siteUrl}/services/): Directory of services and offerings.
- [Blog & Guides](${siteUrl}/posts/): Technical guides, articles, and knowledge base.
- [About Us](${siteUrl}/about/): Organization background and team.
- [Contact](${siteUrl}/contact/): Inquiries and contact details.
- [FAQ](${siteUrl}/faq/): Frequently asked questions.

## Sitemaps & Technical Feeds
- XML Sitemap: ${siteUrl}/sitemap.xml
- Full Knowledge Base: ${siteUrl}/llms-full.txt
`;

  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

export function renderLlmsFullTxt(_ctx: any, options: SeoPluginOptions): Response {
  const siteUrl = options.siteUrl.replace(/\/+$/, '');
  const siteName = options.siteName || 'EmDash Site';
  const business = options.business;

  const content = `# ${siteName} — Full LLM Knowledge Base & Documentation
> Comprehensive knowledge repository and contextual documentation for ${siteName}.

## Organization Entity
- Site URL: ${siteUrl}
- Entity Name: ${business?.name || siteName}
- Description: ${business?.description || `${siteName} documentation and services`}
${business?.telephone ? `- Phone: ${business.telephone}` : ''}
${business?.email ? `- Email: ${business.email}` : ''}
${business?.address ? `- Location: ${business.address.streetAddress}, ${business.address.addressLocality}, ${business.address.postalCode}` : ''}
${business?.priceRange ? `- Pricing Range: ${business.priceRange}` : ''}

## Primary Sections & Architecture
- Home: ${siteUrl}/ (Core offerings, customer reviews, service area coverage)
- Services Directory: ${siteUrl}/services/ (Full inventory of professional solutions)
- Technical Guides & Blog: ${siteUrl}/posts/ (In-depth maintenance guides, tutorials, and methodologies)
- Sitemap: ${siteUrl}/sitemap.xml (Comprehensive URL registry)
- Concise LLM Index: ${siteUrl}/llms.txt (Compact summary for LLM context windows)

## Edge Performance & SEO Standards
- Runtime: Cloudflare Workers edge execution with sub-millisecond overhead
- Schemas: Connected JSON-LD @graph (WebSite, LocalBusiness, WebPage, BreadcrumbList, ItemList, FAQPage)
- Equity Preservation: 1:1 path preservation and edge redirect matching
`;

  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

