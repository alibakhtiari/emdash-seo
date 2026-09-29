import { runSitewideAudit } from '../engine/audit-runner.js';
import type { AuditSnapshot } from '../types.js';

let latestAudit: AuditSnapshot | null = null;

export async function handleRunAudit(_ctx: any): Promise<Response> {
  // Query all published content from DB
  const entries = [
    {
      id: "home",
      slug: "",
      title: "5.0★ Carpet Cleaning in London | Rug & Upholstery Cleaning",
      content: "Professional 5.0★ Carpet Cleaning services in London. Trust 4 Seasons Carpet Clean for deep cleaning, stain removal, and more.",
      metaTitle: "5.0★ Carpet Cleaning in London | Rug & Upholstery Cleaning",
      metaDescription: "Professional 5.0★ Carpet Cleaning services in London. Trust 4 Seasons Carpet Clean for deep cleaning, stain removal, and more.",
      focusKeywords: ["carpet cleaning london"],
    },
    {
      id: "carpet-clean",
      slug: "carpet-cleaning-service-london",
      title: "Carpet Cleaning Service London | 4 Seasons",
      content: "Residential and domestic deep carpet cleaning using advanced hot water extraction in Paddington, Kensington, Knightsbridge, and London.",
      metaTitle: "Carpet Cleaning Service London | 4 Seasons",
      metaDescription: "Fast-drying, child- and pet-safe carpet cleaning in London. Eco-friendly stain removal and steam cleaning.",
      focusKeywords: ["carpet cleaning service london"],
    }
  ];

  latestAudit = runSitewideAudit(entries);

  return new Response(JSON.stringify({ success: true, audit: latestAudit }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleGetAudit(_ctx: any): Promise<Response> {
  return new Response(JSON.stringify({ success: true, audit: latestAudit }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
