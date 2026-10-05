import type { EntrySeoMetadata, LocalBusinessInfo, FaqItem, AuthorProfile, HowToStep } from '../types.js';
import { DEFAULT_LOCAL_BUSINESS } from '../config.js';
import { generateAutoBreadcrumbs, type BreadcrumbItem } from './breadcrumbs.js';
import type { TocItem } from './toc-extractor.js';
import { buildAuthorNode, buildHowToNode, inferSchemaType } from './schema-nodes.js';

export interface BuildSchemaGraphOptions {
  siteUrl: string;
  siteName: string;
  canonicalUrl: string;
  title: string;
  description: string;
  imageUrl?: string;
  datePublished?: string;
  dateModified?: string;
  authorName?: string;
  author?: AuthorProfile;
  reviewedBy?: AuthorProfile;
  speakableSelectors?: string[];
  howToSteps?: HowToStep[];
  breadcrumbs?: BreadcrumbItem[];
  pathname?: string;
  category?: string;
  toc?: TocItem[];
  seo?: EntrySeoMetadata;
  business?: LocalBusinessInfo;
  faqs?: FaqItem[];
  publishingPrinciples?: string;
  copyrightYear?: number | null;
  licenseUrl?: string;
  blogUrl?: string;
  blogName?: string;
  navigationItems?: Array<{ name: string; url: string }>;
  keywords?: string[];
  articleSection?: string;
  customGraphNodes?: Record<string, any>[];
}

/**
 * Builds a connected JSON-LD @graph matching Google Search, Rank Math Pro, and Yoast standards
 * Includes WebSite, Organization/LocalBusiness, WebPage, BreadcrumbList, FAQPage, TableOfContents, and Blog/Navigation
 */
export function buildConnectedSchemaGraph(options: BuildSchemaGraphOptions): Record<string, any> {
  const {
    siteUrl,
    siteName,
    canonicalUrl,
    title,
    description,
    imageUrl,
    datePublished,
    dateModified,
    authorName = "Editorial Team",
    author,
    reviewedBy,
    speakableSelectors,
    howToSteps,
    pathname = "",
    category,
    toc = [],
    seo = { focusKeywords: [], noIndex: false, noFollow: false },
    business = DEFAULT_LOCAL_BUSINESS,
    faqs: explicitFaqs,
    publishingPrinciples,
    copyrightYear,
    licenseUrl,
    blogUrl,
    blogName,
    navigationItems,
    keywords = [],
    articleSection,
    customGraphNodes = [],
  } = options;

  const cleanSiteUrl = siteUrl.replace(/\/+$/, '');
  const cleanCanonical = canonicalUrl.replace(/\/+$/, '');

  // Resolve Schema Type & Author Nodes
  const schemaType = inferSchemaType(pathname, seo.schemaType || options.seo?.schemaType);
  const effectiveAuthor: AuthorProfile =
    author ||
    seo.author ||
    (authorName ? { name: authorName } : { name: 'Editorial Team' });
  const authorNode = buildAuthorNode(effectiveAuthor, cleanSiteUrl);

  const effectiveReviewer = reviewedBy || seo.reviewedBy;
  const reviewerNode = effectiveReviewer
    ? buildAuthorNode(effectiveReviewer, cleanSiteUrl, 'reviewer')
    : undefined;

  const effectiveSpeakable = speakableSelectors || seo.speakableSelectors;
  const speakableSpec = effectiveSpeakable && effectiveSpeakable.length > 0 ? {
    "speakable": {
      "@type": "SpeakableSpecification",
      "cssSelector": effectiveSpeakable
    }
  } : {};

  // 1. WebSite Node
  const websiteNode: Record<string, any> = {
    "@type": "WebSite",
    "@id": `${cleanSiteUrl}/#website`,
    "url": cleanSiteUrl,
    "name": siteName,
    "alternateName": business.legalName || siteName,
    "publisher": { "@id": `${cleanSiteUrl}/#organization` },
    "inLanguage": "en-GB",
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${cleanSiteUrl}/?s={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };

  // 2. Organization / LocalBusiness Node
  const organizationNode: Record<string, any> = {
    "@type": ["LocalBusiness", "Organization"],
    "@id": `${cleanSiteUrl}/#organization`,
    "name": business.name,
    "legalName": business.legalName,
    "url": cleanSiteUrl,
    "logo": {
      "@type": "ImageObject",
      "@id": `${cleanSiteUrl}/#logo`,
      "url": business.logo,
      "contentUrl": business.logo,
      "caption": business.name,
      "inLanguage": "en-GB"
    },
    "image": { "@id": `${cleanSiteUrl}/#logo` },
    "telephone": business.telephone,
    "email": business.email,
    "priceRange": business.priceRange || "££",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": business.address.streetAddress,
      "addressLocality": business.address.addressLocality,
      "postalCode": business.address.postalCode,
      "addressCountry": business.address.addressCountry,
    },
    ...(business.geoCoordinates ? {
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": business.geoCoordinates.latitude,
        "longitude": business.geoCoordinates.longitude
      },
      "areaServed": {
        "@type": "GeoCircle",
        "geoMidpoint": {
          "@type": "GeoCoordinates",
          "latitude": business.geoCoordinates.latitude,
          "longitude": business.geoCoordinates.longitude
        },
        "geoRadius": business.geoRadiusMeters || "30000"
      }
    } : {}),
    ...(business.openingHours ? { "openingHours": business.openingHours } : {}),
    ...(business.sameAs ? { "sameAs": business.sameAs } : {}),
    ...(publishingPrinciples ? { "publishingPrinciples": publishingPrinciples } : {}),
    ...(business.aggregateRating ? {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": String(business.aggregateRating.ratingValue),
        "reviewCount": String(business.aggregateRating.reviewCount)
      }
    } : {})
  };

  // 3. WebPage Node (with optional Speakable for voice / AEO)
  const isPageSpecific = ['AboutPage', 'ContactPage', 'ProfilePage'].includes(schemaType);
  const webPageNode: Record<string, any> = {
    "@type": isPageSpecific ? ["WebPage", schemaType] : "WebPage",
    "@id": `${cleanCanonical}#webpage`,
    "url": cleanCanonical,
    "name": title,
    "description": description,
    "isPartOf": { "@id": `${cleanSiteUrl}/#website` },
    "about": { "@id": `${cleanSiteUrl}/#organization` },
    "inLanguage": "en-GB",
    ...speakableSpec,
    ...(copyrightYear ? { "copyrightYear": copyrightYear } : {}),
    ...(licenseUrl ? { "license": licenseUrl } : {}),
    ...(datePublished ? { "datePublished": datePublished } : {}),
    ...(dateModified ? { "dateModified": dateModified } : {}),
    ...(imageUrl ? {
      "primaryImageOfPage": {
        "@type": "ImageObject",
        "@id": `${cleanCanonical}#primaryimage`,
        "url": imageUrl,
        "contentUrl": imageUrl,
        "inLanguage": "en-GB"
      }
    } : {}),
    ...(toc && toc.length > 0 ? {
      "hasPart": { "@id": `${cleanCanonical}#toc` }
    } : {})
  };

  const graph: Record<string, any>[] = [websiteNode, organizationNode, webPageNode, authorNode];
  if (reviewerNode) graph.push(reviewerNode);

  // Optional: SiteNavigationElement Schema
  if (navigationItems && navigationItems.length > 0) {
    graph.push({
      "@type": "SiteNavigationElement",
      "@id": `${cleanSiteUrl}/#navigation`,
      "name": "Main Navigation",
      "isPartOf": { "@id": `${cleanSiteUrl}/#website` },
      "itemListElement": navigationItems.map((item, idx) => ({
        "@type": "SiteNavigationElement",
        "position": idx + 1,
        "name": item.name,
        "url": item.url
      }))
    });
  }

  // Optional: Blog Schema Entity
  if (blogUrl) {
    const cleanBlogUrl = blogUrl.replace(/\/+$/, '');
    graph.push({
      "@type": "Blog",
      "@id": `${cleanBlogUrl}/#blog`,
      "name": blogName || "Blog",
      "url": cleanBlogUrl,
      "publisher": { "@id": `${cleanSiteUrl}/#organization` },
      "inLanguage": "en-GB"
    });
  }

  // 4. Automated Breadcrumbs Node
  const effectiveBreadcrumbs: BreadcrumbItem[] =
    options.breadcrumbs && options.breadcrumbs.length > 0
      ? options.breadcrumbs
      : generateAutoBreadcrumbs(pathname || new URL(canonicalUrl).pathname, siteUrl, title, category);

  if (effectiveBreadcrumbs.length > 0) {
    graph.push({
      "@type": "BreadcrumbList",
      "@id": `${cleanCanonical}#breadcrumb`,
      "itemListElement": effectiveBreadcrumbs.map((crumb, idx) => ({
        "@type": "ListItem",
        "position": idx + 1,
        "name": crumb.name,
        "item": crumb.url || crumb.item
      }))
    });
  }

  // 5. Table of Contents Schema (ItemList / SiteNavigationElement)
  if (toc && toc.length > 0) {
    graph.push({
      "@type": "ItemList",
      "@id": `${cleanCanonical}#toc`,
      "name": "Table of Contents",
      "description": `Sections and outline for ${title}`,
      "itemListElement": toc.map((item, idx) => ({
        "@type": "ListItem",
        "position": idx + 1,
        "name": item.text,
        "url": `${cleanCanonical}#${item.id}`
      }))
    });
  }

  // 6. Contextual Entity Node (Service, Article, BlogPosting, TechArticle, NewsArticle, HowTo)
  const isArticleKind = ['Article', 'BlogPosting', 'TechArticle', 'NewsArticle', 'MedicalWebPage'].includes(schemaType);

  if (schemaType === 'CleaningService' || schemaType === 'Service') {
    graph.push({
      "@type": "Service",
      "@id": `${cleanCanonical}#service`,
      "name": title,
      "description": description,
      "serviceType": category || "Professional Service",
      "provider": { "@id": `${cleanSiteUrl}/#organization` },
      "mainEntityOfPage": { "@id": `${cleanCanonical}#webpage` },
      "offers": {
        "@type": "Offer",
        "price": business.priceRange || "££",
        "priceCurrency": "GBP",
        "availability": "https://schema.org/InStock"
      },
      ...(imageUrl ? { "image": imageUrl } : {}),
      ...(seo.schemaOverrides || {})
    });
  } else if (isArticleKind) {
    graph.push({
      "@type": schemaType,
      "@id": `${cleanCanonical}#${schemaType.toLowerCase()}`,
      "isPartOf": { "@id": `${cleanCanonical}#webpage` },
      "headline": title,
      "description": description,
      "mainEntityOfPage": cleanCanonical,
      "publisher": { "@id": `${cleanSiteUrl}/#organization` },
      "author": {
        "@type": "Person",
        "@id": authorNode["@id"],
        "name": effectiveAuthor.name,
        ...(effectiveAuthor.url || authorNode.url ? { "url": effectiveAuthor.url || authorNode.url } : {})
      },
      ...(reviewerNode ? {
        "reviewedBy": {
          "@type": "Person",
          "@id": reviewerNode["@id"],
          "name": effectiveReviewer?.name,
          ...(effectiveReviewer?.url || reviewerNode.url ? { "url": effectiveReviewer?.url || reviewerNode.url } : {})
        }
      } : {}),
      ...speakableSpec,
      ...(articleSection || category ? { "articleSection": articleSection || category } : {}),
      ...(keywords && keywords.length > 0 ? { "keywords": keywords.join(', ') } : {}),
      ...(datePublished ? { "datePublished": datePublished } : {}),
      ...(dateModified ? { "dateModified": dateModified } : {}),
      ...(imageUrl ? { "image": imageUrl } : {}),
      ...(seo.schemaOverrides || {})
    });
  }

  // HowTo Node (explicit HowTo schema or detected steps)
  const effectiveSteps = howToSteps || seo.howToSteps || [];
  if (schemaType === 'HowTo' || effectiveSteps.length > 0) {
    graph.push(buildHowToNode(effectiveSteps, cleanCanonical, title, description, imageUrl));
  }

  // 7. FAQPage Node (auto-extracted from seo.faqs or Rank Math FAQ blocks)
  const faqs: FaqItem[] = explicitFaqs || seo.faqs || [];
  if (faqs.length > 0) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${cleanCanonical}#faq`,
      "isPartOf": { "@id": `${cleanCanonical}#webpage` },
      "mainEntity": faqs.map((faq) => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    });
  }

  // Add any custom nodes
  for (const node of customGraphNodes) {
    graph.push(node);
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph
  };
}
