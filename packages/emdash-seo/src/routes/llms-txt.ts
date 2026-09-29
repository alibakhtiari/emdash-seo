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
