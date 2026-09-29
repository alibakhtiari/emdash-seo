import type { SeoPluginOptions } from '../types.js';

export function renderLlmsTxt(ctx: any, options: SeoPluginOptions): Response {
  const siteUrl = options.siteUrl.replace(/\/+$/, '');
  const siteName = options.siteName || '4 Seasons Carpet Clean';

  const content = `# ${siteName}
> Professional 5.0★ Carpet, Rug & Upholstery Cleaning in London since 2016. Fast drying times, child- & pet-safe hot water extraction.

## Core Cleaning Services
- [Carpet Cleaning London](${siteUrl}/carpet-cleaning-service-london/): Deep hot water extraction for domestic properties across London.
- [Commercial Carpet Cleaning](${siteUrl}/commercial-carpet-cleaning-london/): Office and commercial premises cleaning with flexible evening/weekend scheduling.
- [Rug Cleaning London](${siteUrl}/rug-cleaning-near-me-london/): Specialist care for synthetic, woollen, and Oriental rugs.
- [Persian Rug Cleaning](${siteUrl}/persian-rug-cleaning-london/): Hand-wash and delicate organic treatment for antique Persian rugs.
- [Upholstery & Sofa Cleaning](${siteUrl}/sofa-cleaning-london/): Fabric-safe steam cleaning for sofas, armchairs, and dining chairs.
- [Mattress Cleaning London](${siteUrl}/mattress-cleaning-london/): Dust mite, allergen, and deep stain extraction for all mattress types.
- [Curtain Cleaning London](${siteUrl}/curtain-cleaning-london/): In-situ steam curtain cleaning without the hassle of taking curtains down.
- [End of Tenancy Cleaning](${siteUrl}/end-of-tenancy-cleaning-london/): Landlord-approved check-out cleaning guarantee.
- [Stain Removal London](${siteUrl}/stain-removal-london/): Professional spot treatment for red wine, coffee, pet accidents, and ink.

## Company & Contact Details
- Phone: +44 20 3488 1970
- WhatsApp: https://wa.me/447572895134
- Address: 47 Westbourne Terrace, London, W2 3UY
- Coverage: Paddington, Kensington, Knightsbridge, Marylebone, Chelsea, Battersea, Clapham, Wandsworth and Greater London.
- Rating: 5.0★ (343+ verified reviews on Trustpilot & Google)
- Pricing: [Transparent Prices](${siteUrl}/carpet-cleaning-prices-london/)
- Bookings: [Book Online](${siteUrl}/booking-carpet-cleaning-services-london/)
`;

  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
