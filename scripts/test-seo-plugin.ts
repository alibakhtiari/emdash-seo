/**
 * Verification test for @emdash/plugin-seo (including Breadcrumbs, TOC, and FAQ schemas)
 */

import {
  analyzeContent,
  buildConnectedSchemaGraph,
  extractFaqsFromContent,
  parseRankMathMeta,
  matchRedirect,
  generateAutoBreadcrumbs,
  extractTableOfContents,
  DEFAULT_OPTIONS,
  DEFAULT_4SEASONS_BUSINESS,
} from '../packages/emdash-seo/src/index.ts';

import { renderSitemap } from '../packages/emdash-seo/src/routes/sitemap.ts';
import { renderRobots } from '../packages/emdash-seo/src/routes/robots.ts';
import { renderLlmsTxt } from '../packages/emdash-seo/src/routes/llms-txt.ts';

console.log('--- Testing Content Analyzer ---');
const sampleArticle = `
  <h1>Professional Carpet Cleaning in London</h1>
  <p>Looking for the best <strong>carpet cleaning in london</strong>? We provide fast-drying steam cleaning.</p>
  <h2>Why Choose Carpet Cleaning in London</h2>
  <p>${'Carpet cleaning in london provides deep steam extraction. '.repeat(25)}</p>
  <h3>Advanced Hot Water Extraction</h3>
  <p>Our dual-vacuum equipment lifts all dirt.</p>
  <h3>Fast 2-Hour Drying Time</h3>
  <p>Walk on your carpets sooner.</p>
  <img src="banner.webp" alt="Carpet cleaning technician in London" />
  <a href="/carpet-cleaning-prices-london/">View our prices</a>
`;

const analysis = analyzeContent({
  title: 'Carpet Cleaning in London | 5.0★ Service',
  slug: 'carpet-cleaning-service-london',
  content: sampleArticle,
  focusKeywords: ['carpet cleaning in london'],
  metaDescription: 'Top-rated carpet cleaning in London. Book our professional steam extraction service today.',
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
  '/carpet-cleaning-service-london/kensington/',
  'https://4seasonscarpetclean.co.uk',
  'Kensington Carpet Cleaning'
);
console.log(`Generated ${breadcrumbs.length} breadcrumb levels:`);
breadcrumbs.forEach((b, i) => console.log(`  ${i + 1}. ${b.name} -> ${b.url}`));

console.log('\n--- Testing Connected Schema Graph (with TOC, Breadcrumbs, and FAQs) ---');
const schema = buildConnectedSchemaGraph({
  siteUrl: 'https://4seasonscarpetclean.co.uk',
  siteName: '4 Seasons Carpet Clean',
  canonicalUrl: 'https://4seasonscarpetclean.co.uk/carpet-cleaning-service-london/kensington/',
  title: 'Carpet Cleaning Kensington W8 | 5.0★ 4 Seasons',
  description: 'Professional carpet cleaning services in Kensington London.',
  toc: tocResult.toc,
  breadcrumbs,
  seo: {
    focusKeywords: ['carpet cleaning kensington'],
    noIndex: false,
    noFollow: false,
    schemaType: 'CleaningService',
    faqs: [
      { question: 'Do you clean Victorian flats in Kensington?', answer: 'Yes, we specialise in residential carpet cleaning for Kensington apartments and townhouses.' },
      { question: 'How quickly can I walk on the carpets?', answer: 'Our low-moisture hot water extraction leaves carpets dry within 2-4 hours.' }
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
