import * as React from 'react';
import type {
  DetailedReadabilityReport,
  AltAuditReport,
  GeoAeoReport,
  AnalysisReport,
  AuthorProfile,
  FaqItem,
  HowToStep,
} from '../../types.js';
import type { EditorDomSnapshot } from './dom-extractor.js';
import { WidgetReadabilityTab } from './WidgetReadabilityTab.js';
import { WidgetAltTab } from './WidgetAltTab.js';
import { WidgetSerpTab } from './WidgetSerpTab.js';
import { WidgetChecklistTab } from './WidgetChecklistTab.js';
import { WidgetGeoAeoTab } from './WidgetGeoAeoTab.js';
import { WidgetSchemaAuthorTab } from './WidgetSchemaAuthorTab.js';
import {
  IconBook,
  IconBot,
  IconTag,
  IconImage,
  IconSearch,
  IconChecklist,
} from '../icons.js';

export interface WidgetStudioDrawerProps {
  activeTab: 'readability' | 'alts' | 'serp' | 'checklist' | 'geo-aeo' | 'schema-author';
  setActiveTab: (tab: 'readability' | 'alts' | 'serp' | 'checklist' | 'geo-aeo' | 'schema-author') => void;
  readability: DetailedReadabilityReport;
  altAudit: AltAuditReport;
  geoAeoReport: GeoAeoReport;
  snapshot: EditorDomSnapshot;
  author?: AuthorProfile;
  setAuthor: (author: AuthorProfile) => void;
  effectiveSchemaType: string;
  onSelectCustomSchemaType: (type: string) => void;
  reviewedBy?: AuthorProfile;
  setReviewedBy: (reviewer?: AuthorProfile) => void;
  speakableSelectors: string[];
  setSpeakableSelectors: (selectors: string[]) => void;
  faqs: FaqItem[];
  setFaqs: (faqs: FaqItem[]) => void;
  howToSteps: HowToStep[];
  setHowToSteps: (steps: HowToStep[]) => void;
  seoReport: AnalysisReport;
  keyword: string;
  refreshSnapshot: () => void;
}

export function WidgetStudioDrawer({
  activeTab,
  setActiveTab,
  readability,
  altAudit,
  geoAeoReport,
  snapshot,
  author,
  setAuthor,
  effectiveSchemaType,
  onSelectCustomSchemaType,
  reviewedBy,
  setReviewedBy,
  speakableSelectors,
  setSpeakableSelectors,
  faqs,
  setFaqs,
  howToSteps,
  setHowToSteps,
  seoReport,
  keyword,
  refreshSnapshot,
}: WidgetStudioDrawerProps) {
  return (
    <div
      style={{
        marginTop: '0.25rem',
        paddingTop: '0.625rem',
        borderTop: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      {/* Subtabs with SVG Icons */}
      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.375rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveTab('readability')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.25rem 0.5rem',
            borderRadius: 4,
            border: 'none',
            background: activeTab === 'readability' ? 'var(--color-kumo-control, #2a2a2a)' : 'transparent',
            color: activeTab === 'readability' ? 'var(--text-color-kumo-strong, #ffffff)' : 'var(--text-color-kumo-subtle, #9ca3af)',
            fontSize: '0.6875rem',
            fontWeight: activeTab === 'readability' ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          <IconBook size={12} />
          <span>Readability</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('geo-aeo')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.25rem 0.5rem',
            borderRadius: 4,
            border: 'none',
            background: activeTab === 'geo-aeo' ? 'var(--color-kumo-control, #2a2a2a)' : 'transparent',
            color: activeTab === 'geo-aeo' ? 'var(--text-color-kumo-strong, #ffffff)' : 'var(--text-color-kumo-subtle, #9ca3af)',
            fontSize: '0.6875rem',
            fontWeight: activeTab === 'geo-aeo' ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          <IconBot size={12} />
          <span>GEO & AEO AI ({geoAeoReport.overallAiScore}%)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('schema-author')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.25rem 0.5rem',
            borderRadius: 4,
            border: 'none',
            background: activeTab === 'schema-author' ? 'var(--color-kumo-control, #2a2a2a)' : 'transparent',
            color: activeTab === 'schema-author' ? 'var(--text-color-kumo-strong, #ffffff)' : 'var(--text-color-kumo-subtle, #9ca3af)',
            fontSize: '0.6875rem',
            fontWeight: activeTab === 'schema-author' ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          <IconTag size={12} />
          <span>Schema & Author</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('alts')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.25rem 0.5rem',
            borderRadius: 4,
            border: 'none',
            background: activeTab === 'alts' ? 'var(--color-kumo-control, #2a2a2a)' : 'transparent',
            color: activeTab === 'alts' ? 'var(--text-color-kumo-strong, #ffffff)' : 'var(--text-color-kumo-subtle, #9ca3af)',
            fontSize: '0.6875rem',
            fontWeight: activeTab === 'alts' ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          <IconImage size={12} />
          <span>Image Alts ({snapshot.images.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('serp')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.25rem 0.5rem',
            borderRadius: 4,
            border: 'none',
            background: activeTab === 'serp' ? 'var(--color-kumo-control, #2a2a2a)' : 'transparent',
            color: activeTab === 'serp' ? 'var(--text-color-kumo-strong, #ffffff)' : 'var(--text-color-kumo-subtle, #9ca3af)',
            fontSize: '0.6875rem',
            fontWeight: activeTab === 'serp' ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          <IconSearch size={12} />
          <span>SERP & Social Preview</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('checklist')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.25rem 0.5rem',
            borderRadius: 4,
            border: 'none',
            background: activeTab === 'checklist' ? 'var(--color-kumo-control, #2a2a2a)' : 'transparent',
            color: activeTab === 'checklist' ? 'var(--text-color-kumo-strong, #ffffff)' : 'var(--text-color-kumo-subtle, #9ca3af)',
            fontSize: '0.6875rem',
            fontWeight: activeTab === 'checklist' ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          <IconChecklist size={12} />
          <span>Checklist</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'readability' && <WidgetReadabilityTab readability={readability} />}
      {activeTab === 'geo-aeo' && (
        <WidgetGeoAeoTab
          geoAeoReport={geoAeoReport}
          onApplyFaqs={(extracted) => setFaqs(extracted)}
          onApplyHowTo={(extracted) => setHowToSteps(extracted)}
        />
      )}
      {activeTab === 'schema-author' && (
        <WidgetSchemaAuthorTab
          title={snapshot.title}
          excerpt={snapshot.excerpt}
          author={author}
          onAuthorChange={setAuthor}
          schemaType={effectiveSchemaType}
          onSchemaTypeChange={onSelectCustomSchemaType}
          reviewedBy={reviewedBy}
          onReviewerChange={setReviewedBy}
          speakableSelectors={speakableSelectors}
          onSpeakableChange={setSpeakableSelectors}
          faqs={faqs}
          howToSteps={howToSteps}
        />
      )}
      {activeTab === 'alts' && <WidgetAltTab altAudit={altAudit} onRefresh={refreshSnapshot} />}
      {activeTab === 'serp' && (
        <WidgetSerpTab
          title={snapshot.title}
          excerpt={snapshot.excerpt}
          featuredImage={snapshot.images[0]?.src}
        />
      )}
      {activeTab === 'checklist' && (
        <WidgetChecklistTab
          seoReport={seoReport}
          readability={readability}
          altAudit={altAudit}
          title={snapshot.title}
          focusKeyword={keyword}
          headingsCount={snapshot.headings.length}
        />
      )}
    </div>
  );
}
