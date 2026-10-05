export interface DetectedEntity {
  name: string;
  salienceScore: number;
  inHeadings: boolean;
}

export interface EntityGap {
  entity: string;
  recommendedCategory: string;
  importance: 'critical' | 'recommended' | 'optional';
}

export interface ReadabilityMetrics {
  fleschReadingEase: number;
  grade: string;
  hardSentencesCount: number;
}

export interface TechnicalChecks {
  h1Valid: boolean;
  imagesWithAlt: boolean;
  metaDescriptionLength: number;
  wordCount?: number;
}

export interface StatelessAnalyzeResponse {
  entityCoverageIndex: number;
  grade: 'Good' | 'OK' | 'Needs Improvement';
  entitiesDetected: DetectedEntity[];
  entityGaps: EntityGap[];
  readability: ReadabilityMetrics;
  technicalChecks: TechnicalChecks;
  metrics?: any;
  recommendations?: string[];
}

export interface NotFoundEntry {
  path: string;
  count: number;
  lastSeen: string;
  topReferrer: string | null;
}
