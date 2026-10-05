/**
 * Strict TypeScript types for @emdash/plugin-seo
 */

export interface FaqItem {
  question: string;
  answer: string;
}

export interface AuthorProfile {
  name: string;
  jobTitle?: string;
  worksFor?: string;
  url?: string;
  image?: string;
  sameAs?: string[];
  knowsAbout?: string[];
  alumniOf?: string;
  description?: string;
  email?: string;
}

export interface HowToStep {
  position?: number;
  name: string;
  text: string;
  image?: string;
  url?: string;
}

export interface GeoMetrics {
  geoScore: number;
  quotableSnippetsCount: number;
  statisticsCount: number;
  experienceSignalsCount: number;
  comparativeTablesCount: number;
  quotableSnippets: string[];
  statistics: string[];
  experienceSignals: string[];
}

export interface AeoMetrics {
  aeoScore: number;
  questionHeadingsCount: number;
  directAnswersCount: number;
  howToStepsCount: number;
  faqCandidatesCount: number;
  questionHeadings: string[];
  directAnswers: Array<{ question: string; answer: string }>;
  howToSteps: HowToStep[];
  speakableCandidate?: string;
}

export interface GeoAeoRecommendation {
  category: 'GEO' | 'AEO';
  dimension: 'GEO' | 'AEO';
  type: 'critical' | 'improvement' | 'good';
  title: string;
  message: string;
}

export interface GeoAeoReport {
  geoScore: number;
  aeoScore: number;
  overallAiScore: number;
  geo: {
    score: number;
    quotableQuotes: string[];
    hasQuotableDefinitions: boolean;
    statisticalEvidenceScore: number;
    firstPartyExperienceScore: number;
  };
  aeo: {
    score: number;
    questionHeadingsCount: number;
    directAnswersCount: number;
    directAnswerCandidate?: string;
    speakableCandidate?: string;
    hasVoiceSearchReadiness: boolean;
  };
  geoMetrics: GeoMetrics;
  aeoMetrics: AeoMetrics;
  faqCandidates: FaqItem[];
  recommendations: GeoAeoRecommendation[];
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
  schemaType?: 'CleaningService' | 'LocalBusiness' | 'Service' | 'Article' | 'BlogPosting' | 'TechArticle' | 'NewsArticle' | 'FAQPage' | 'HowTo' | 'AboutPage' | 'ContactPage' | 'ProfilePage' | 'Product' | 'Review' | 'MedicalWebPage' | 'None' | (string & {});
  schemaOverrides?: Record<string, any>;
  faqs?: FaqItem[];
  author?: AuthorProfile;
  reviewedBy?: AuthorProfile;
  speakableSelectors?: string[];
  howToSteps?: HowToStep[];
  primaryCategory?: string;
  cornerstone?: boolean;
  geoOptimization?: Partial<GeoMetrics>;
  aeoOptimization?: Partial<AeoMetrics>;

  // Pre-rendered cache records (populated on save/publish for sub-0.1ms edge SSR)
  _cachedHead?: string;
  _cachedSchemaGraph?: string;
  _cachedAt?: string;
  _cachedHash?: string;
}

export interface LocalBusinessInfo {
  name: string;
  legalName?: string;
  description?: string;
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

export interface NavigationItem {
  name: string;
  url: string;
}

export interface SeoPluginModules {
  sitemaps?: boolean;
  robots?: boolean;
  redirects?: boolean;
  llmsTxt?: boolean;
  schemaMap?: boolean;
  auditApi?: boolean;
  indexNow?: boolean;
  fuzzyRedirects?: boolean;
}

export interface SeoPluginOptions {
  siteUrl: string;
  siteName: string;
  defaultTitleTemplate?: string; // e.g. "%title% %separator% %siteName%"
  defaultSeparator?: string; // e.g. " | " or " — "
  defaultOgImage?: string;
  defaultDescription?: string;
  llmsTxtDescription?: string;
  breadcrumbLabels?: Record<string, string>;
  breadcrumbRules?: Record<string, any>;
  enableLlmsTxt?: boolean;
  enableSitemap?: boolean;
  enableRobots?: boolean;
  enableRedirects?: boolean;
  enableIndexNow?: boolean;
  indexnowKey?: string;
  enableSchemaMap?: boolean;
  nlwebEndpoint?: string;
  publishingPrinciples?: string;
  copyrightYear?: number | null;
  licenseUrl?: string;
  blogUrl?: string;
  blogName?: string;
  navigationItems?: NavigationItem[];
  business?: LocalBusinessInfo;
  defaultAuthor?: AuthorProfile;
  defaultSpeakableSelectors?: string[];
  enableGeoOptimization?: boolean;
  enableAeoOptimization?: boolean;
  modules?: SeoPluginModules;
}

export interface BreadcrumbItem {
  name: string;
  url?: string;
  item?: string; // Schema.org alias for url
}

export interface ContentCheck {
  id: string;
  label: string;
  passed: boolean;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export type SentenceDifficulty = 'normal' | 'hard' | 'very-hard';

export interface SentenceComplexWord {
  word: string;
  syllables: number;
  alternative?: string;
}

export interface SentenceAnalysis {
  text: string;
  startIndex: number;
  endIndex: number;
  wordCount: number;
  syllableCount: number;
  avgSyllablesPerWord: number;
  difficulty: SentenceDifficulty;
  isPassive: boolean;
  passivePhrases?: string[];
  hasTransition: boolean;
  transitionWords?: string[];
  complexWords?: SentenceComplexWord[];
  starterWord?: string;
  consecutiveStarterWarning?: boolean;
}

export interface ConsecutiveSentenceStarter {
  word: string;
  count: number;
  sentenceIndices: number[];
}

export interface ComplexWordMetric {
  word: string;
  count: number;
  syllables: number;
  alternative?: string;
}

export interface DetailedReadabilityReport {
  score: number;
  readingEase: number;
  gradeLevel: number;
  readingEaseLevel: string;
  sentenceCount: number;
  wordCount: number;
  hardSentencesCount: number;
  veryHardSentencesCount: number;
  hardSentencesPercentage: number;
  passiveVoiceCount: number;
  passiveVoicePercentage: number;
  transitionWordsCount: number;
  transitionPercentage: number;
  complexWordsCount: number;
  complexWords: ComplexWordMetric[];
  consecutiveSentenceStarters: ConsecutiveSentenceStarter[];
  longParagraphsCount: number;
  longSectionsCount: number;
  sentences: SentenceAnalysis[];
  issues: string[];
}

export type AltIssueType =
  | 'alt_missing'
  | 'alt_empty'
  | 'alt_filename'
  | 'alt_redundant'
  | 'alt_length'
  | 'alt_kw_stuffing';

export interface ImageAltAuditItem {
  src: string;
  alt: string;
  charCount: number;
  isDecorative: boolean;
  issues: AltIssueType[];
  suggestions: string[];
  status: 'good' | 'warning' | 'critical';
}

export interface AltAuditReport {
  score: number;
  totalImages: number;
  missingAltCount: number;
  emptyAltCount: number;
  decorativeCount: number;
  goodCount: number;
  warningCount: number;
  criticalCount: number;
  images: ImageAltAuditItem[];
  issues: string[];
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
  keywordInTitle: boolean;
  keywordInSlug: boolean;
  keywordInDescription: boolean;
  keywordInFirstParagraph: boolean;
  keywordInSubheadings: boolean;
  hasImagesWithAlt: boolean;
  recommendations: string[];
  eciScore: number;
  detectedEntities: string[];
  topicalGaps: string[];
  readability: {
    score: number;
    level: string;
    fleschReadingEase?: number;
    sentenceCount?: number;
    avgWordsPerSentence?: number;
    hardSentencesCount?: number;
  };
  detailedReadability?: DetailedReadabilityReport;
  altAudit?: AltAuditReport;
}

export interface RedirectRule {
  id?: string;
  pattern?: string;
  from?: string;
  destination?: string;
  to?: string;
  comparison?: 'exact' | 'prefix' | 'regex';
  matchType?: 'exact' | 'prefix' | 'regex';
  statusCode?: 301 | 302 | 307 | 410 | number;
  status?: 'active' | 'inactive';
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

export type PageMetadataContribution =
  | { kind: 'meta'; name: string; content: string }
  | { kind: 'property'; property: string; content: string }
  | { kind: 'link'; rel: string; href: string; hreflang?: string; key?: string }
  | { kind: 'jsonld'; id: string; graph: Record<string, any> };

export interface PageMetadataEvent {
  page: {
    url: string;
    path?: string;
    title?: string;
    description?: string;
    image?: string;
    canonical?: string;
    siteName?: string;
    locale?: string;
    kind?: 'content' | 'index' | 'archive' | 'custom';
    seo?: {
      metaTitle?: string;
      ogDescription?: string;
      robots?: string;
      noIndex?: boolean;
      noFollow?: boolean;
    };
    content?: {
      id: string;
      collection: string;
      slug?: string;
      data?: Record<string, any>;
    };
    articleMeta?: {
      publishedTime?: string;
      modifiedTime?: string;
      author?: string;
    };
  };
}

