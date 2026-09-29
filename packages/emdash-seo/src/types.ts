/**
 * Strict TypeScript types for @emdash/plugin-seo
 */

export interface FaqItem {
  question: string;
  answer: string;
}

export interface EntrySeoMetadata {
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  focusKeywords: string[];
  noIndex: boolean;
  noFollow: boolean;
  noArchive?: boolean;
  noSnippet?: boolean;
  maxImagePreview?: 'none' | 'standard' | 'large';
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'service';
  twitterCard?: 'summary' | 'summary_large_image';
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  schemaType?: 'CleaningService' | 'LocalBusiness' | 'Service' | 'Article' | 'FAQPage' | 'None';
  schemaOverrides?: Record<string, any>;
  faqs?: FaqItem[];
  primaryCategory?: string;
}

export interface LocalBusinessInfo {
  name: string;
  legalName?: string;
  url: string;
  logo: string;
  image?: string;
  telephone: string;
  email: string;
  priceRange?: string;
  address: {
    streetAddress: string;
    addressLocality: string;
    postalCode: string;
    addressCountry: string;
  };
  geoCoordinates?: {
    latitude: string | number;
    longitude: string | number;
  };
  geoRadiusMeters?: string | number;
  openingHours?: string[];
  sameAs?: string[];
  aggregateRating?: {
    ratingValue: string | number;
    reviewCount: string | number;
  };
}

export interface SeoPluginOptions {
  siteUrl: string;
  siteName: string;
  defaultTitleTemplate?: string; // e.g. "%title% %separator% %siteName%"
  defaultSeparator?: string; // e.g. " | " or " — "
  defaultOgImage?: string;
  enableLlmsTxt?: boolean;
  enableSitemap?: boolean;
  enableRobots?: boolean;
  enableRedirects?: boolean;
  business?: LocalBusinessInfo;
}

export interface ContentCheck {
  id: string;
  label: string;
  passed: boolean;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export interface AnalysisReport {
  score: number;
  grade: 'Good' | 'OK' | 'Needs Improvement';
  checks: ContentCheck[];
  metrics: {
    wordCount: number;
    keywordDensity: number;
    keywordMatches: number;
    h1Count: number;
    h2Count: number;
    h3Count: number;
    internalLinkCount: number;
    externalLinkCount: number;
    imageCount: number;
    imagesWithoutAlt: number;
  };
}

export interface RedirectRule {
  id: string;
  pattern: string;
  destination: string;
  comparison: 'exact' | 'prefix' | 'regex';
  statusCode: 301 | 302 | 307 | 410;
  status: 'active' | 'inactive';
}

export interface LinkGraphEntry {
  id: string;
  sourceCollection: string;
  sourceId: string;
  targetUrl: string;
  targetCollection?: string;
  targetId?: string;
  anchorText?: string;
  isExternal: boolean;
}

export interface AuditSnapshot {
  id: string;
  healthScore: number;
  totalPages: number;
  issuesCritical: number;
  issuesWarning: number;
  issuesNotice: number;
  startedAt: string;
  completedAt?: string;
  report: {
    url: string;
    title: string;
    score: number;
    issues: string[];
  }[];
}
