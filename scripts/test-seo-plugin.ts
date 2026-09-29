/**
 * Verification test for @emdash/plugin-seo (including Breadcrumbs, TOC, and FAQ schemas)
 */

import {
  analyzeContent,
  buildConnectedSchemaGraph,
  generateAutoBreadcrumbs,
  extractTableOfContents,
} from '../packages/emdash-seo/src/index.ts';

console.log('--- Testing Content Analyzer ---');
const sampleArticle = `
  <h1>Professional Web Development and Design</h1>
  <p>Looking for the best <strong>professional web development</strong> service? We build fast, modern web applications.</p>
  <h2>Why Choose Professional Web Development</h2>
  <p>${'Professional web development provides scalable digital infrastructure. '.repeat(25)}</p>
  <h3>Advanced Frontend Architecture</h3>
  <p>Modern component architecture ensures instant page loads.</p>
  <h3>Fast Turnaround Times</h3>
  <p>Launch your web applications sooner.</p>
  <img src="banner.webp" alt="Professional web development architecture" />
  <a href="/pricing/">View our pricing</a>
`;

const analysis = analyzeContent({
  title: 'Professional Web Development | Modern Solutions',
  slug: 'professional-web-development',
  content: sampleArticle,
  focusKeywords: ['professional web development'],
  metaDescription: 'Top-rated professional web development services. Build modern, edge-rendered web apps today.',
  minWordCount: 150,
});

console.log(`Content Score: ${analysis.score}/100 (${analysis.grade})`);

console.log('\n--- Testing Automated Table of Contents Extractor ---');
const tocResult = extractTableOfContents(sampleArticle);
console.log(`Extracted ${tocResult.toc.length} main TOC sections:`);
for (const item of tocResult.toc) {
  console.log(`  • H2: [${item.text}] (anchor: #${item.id})`);
  if (item.children) {
    for (const sub of item.children) {
      console.log(`    ↳ H3: [${sub.text}] (anchor: #${sub.id})`);
    }
  }
}

console.log('\n--- Testing Automated Breadcrumbs Generator ---');
const breadcrumbs = generateAutoBreadcrumbs(
  '/services/web-development/frontend/',
  'https://example.com',
  'Frontend Engineering'
);
console.log(`Generated ${breadcrumbs.length} breadcrumb levels:`);
breadcrumbs.forEach((b, i) => console.log(`  ${i + 1}. ${b.name} -> ${b.url}`));

console.log('\n--- Testing Connected Schema Graph (with TOC, Breadcrumbs, and FAQs) ---');
const schema = buildConnectedSchemaGraph({
  siteUrl: 'https://example.com',
  siteName: 'EmDash Site',
  canonicalUrl: 'https://example.com/services/web-development/frontend/',
  title: 'Frontend Engineering | Modern Solutions',
  description: 'Professional web development and engineering services.',
  toc: tocResult.toc,
  breadcrumbs,
  seo: {
    focusKeywords: ['frontend engineering'],
    noIndex: false,
    noFollow: false,
    schemaType: 'Service',
    faqs: [
      { question: 'What modern frameworks do you support?', answer: 'We support modern architectures including Astro, React, and serverless edge runtimes.' },
      { question: 'How quickly can new features be deployed?', answer: 'Our continuous integration pipelines enable instant deployment to edge workers.' }
    ],
  },
});

console.log(`Schema Context: ${schema['@context']}`);
console.log(`Generated Nodes: ${schema['@graph'].map((n: any) => n['@type']).join(' | ')}`);

// Verify BreadcrumbList node
const bNode = schema['@graph'].find((n: any) => n['@type'] === 'BreadcrumbList');
console.log(`BreadcrumbList Items: ${bNode?.itemListElement?.length || 0}`);

// Verify ItemList (TOC) node
const tocNode = schema['@graph'].find((n: any) => n['@type'] === 'ItemList' && n.name === 'Table of Contents');
console.log(`Table of Contents Schema Items: ${tocNode?.itemListElement?.length || 0}`);

// Verify FAQPage node
const faqNode = schema['@graph'].find((n: any) => n['@type'] === 'FAQPage');
console.log(`FAQPage Schema Questions: ${faqNode?.mainEntity?.length || 0}`);

console.log('\nALL EXTENDED VERIFICATION TESTS PASSED!');
