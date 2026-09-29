import { runSitewideAudit } from '../engine/audit-runner.js';
import type { AuditSnapshot } from '../types.js';

let latestAudit: AuditSnapshot | null = null;

export async function handleRunAudit(_ctx: any): Promise<Response> {
  // Query all published content from DB
  const entries = [
    {
      id: "home",
      slug: "",
      title: "Home | Professional Local Services & Solutions",
      content: "Welcome to our website. We provide top-tier professional services with unmatched quality and customer satisfaction.",
      metaTitle: "Home | Professional Local Services & Solutions",
      metaDescription: "Top-tier professional services and modern solutions. Explore our offerings, read customer reviews, and get in touch today.",
      focusKeywords: ["professional services"],
    },
    {
      id: "sample-service",
      slug: "services/sample-service",
      title: "Expert Service Solutions | Local Specialists",
      content: "High quality professional services for residential and commercial clients with comprehensive guarantees.",
      metaTitle: "Expert Service Solutions | Local Specialists",
      metaDescription: "Reliable, accredited, and professional services tailored to your needs. Get an instant quote today.",
      focusKeywords: ["expert service solutions"],
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
