import type { EntrySeoMetadata, LocalBusinessInfo, FaqItem } from '../types.js';
import { DEFAULT_4SEASONS_BUSINESS } from '../config.js';
import { generateAutoBreadcrumbs, type BreadcrumbItem } from './breadcrumbs.js';
import type { TocItem } from './toc-extractor.js';

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
  breadcrumbs?: BreadcrumbItem[];
  pathname?: string;
  category?: string;
  toc?: TocItem[];
  seo?: EntrySeoMetadata;
  business?: LocalBusinessInfo;
  faqs?: FaqItem[];
  customGraphNodes?: Record<string, any>[];
}

/**
 * Builds a connected JSON-LD @graph matching Google Search and Rank Math Pro standards
 * Includes WebSite, Organization/CleaningService, WebPage, BreadcrumbList, FAQPage, and TableOfContents
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
    authorName = "Ali Bakhtiari",
    pathname = "",
    category,
    toc = [],
    seo = { focusKeywords: [], noIndex: false, noFollow: false },
    business = DEFAULT_4SEASONS_BUSINESS,
    faqs: explicitFaqs,
    customGraphNodes = [],
  } = options;

  const cleanSiteUrl = siteUrl.replace(/\/+$/, '');
  const cleanCanonical = canonicalUrl.replace(/\/+$/, '');

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

  // 2. Organization / CleaningService / LocalBusiness Node
  const organizationNode: Record<string, any> = {
    "@type": ["CleaningService", "LocalBusiness", "Organization"],
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
    ...(business.aggregateRating ? {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": String(business.aggregateRating.ratingValue),
        "reviewCount": String(business.aggregateRating.reviewCount)
      }
    } : {})
  };

  // 3. WebPage Node
  const webPageNode: Record<string, any> = {
    "@type": "WebPage",
    "@id": `${cleanCanonical}#webpage`,
    "url": cleanCanonical,
    "name": title,
    "description": description,
    "isPartOf": { "@id": `${cleanSiteUrl}/#website` },
    "about": { "@id": `${cleanSiteUrl}/#organization` },
    "inLanguage": "en-GB",
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

  const graph: Record<string, any>[] = [websiteNode, organizationNode, webPageNode];

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
        "item": crumb.url
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

  // 6. Contextual Entity Node (Service, Article, CleaningService)
  const schemaType = seo.schemaType || 'CleaningService';

  if (schemaType === 'CleaningService' || schemaType === 'Service') {
    graph.push({
      "@type": "Service",
      "@id": `${cleanCanonical}#service`,
      "name": title,
      "description": description,
      "serviceType": "Cleaning services",
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
  } else if (schemaType === 'Article') {
    graph.push({
      "@type": "Article",
      "@id": `${cleanCanonical}#article`,
      "isPartOf": { "@id": `${cleanCanonical}#webpage` },
      "headline": title,
      "description": description,
      "mainEntityOfPage": cleanCanonical,
      "publisher": { "@id": `${cleanSiteUrl}/#organization` },
      "author": {
        "@type": "Person",
        "name": authorName,
        "url": `${cleanSiteUrl}/author/alib/`
      },
      ...(datePublished ? { "datePublished": datePublished } : {}),
      ...(dateModified ? { "dateModified": dateModified } : {}),
      ...(imageUrl ? { "image": imageUrl } : {}),
      ...(seo.schemaOverrides || {})
    });
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
