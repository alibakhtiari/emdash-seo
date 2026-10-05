import * as React from 'react';
import { calculateEntityCoverage, calculateFleschReadingEase, TOPIC_ENTITY_CLUSTERS } from './engine/semantic-analyzer.js';
import { LiveSentenceHighlighter } from './components/LiveSentenceHighlighter.js';
import { ImageAltAuditorWidget } from './components/ImageAltAuditorWidget.js';
import { SerpDesktopPreview, SerpMobilePreview } from './admin/preview/SerpSearchCards.js';
import { FacebookOgCard, TwitterCard } from './admin/preview/SocialCards.js';
import { SemanticCoverageCard } from './admin/preview/SemanticCoverageCard.js';
import { PreviewInputsForm } from './admin/preview/PreviewInputsForm.js';

export {
  LiveSentenceHighlighter,
  ImageAltAuditorWidget,
  SerpDesktopPreview,
  SerpMobilePreview,
  FacebookOgCard,
  TwitterCard,
  SemanticCoverageCard,
  PreviewInputsForm,
};

export interface SerpPreviewProps {
  initialTitle?: string;
  initialSlug?: string;
  initialDescription?: string;
  initialImage?: string;
  initialContent?: string;
  siteUrl?: string;
  siteName?: string;
}

export function SerpPreviewPage({
  initialTitle = 'Professional Carpet Cleaning London | Eco Steam Care',
  initialSlug = 'carpet-cleaning-london',
  initialDescription = 'Book certified 5.0-star professional carpet cleaning in London. Eco-friendly steam extraction, rapid drying times, and pet odor removal.',
  initialImage = 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&h=630&q=80',
  initialContent = 'Our hot water extraction and steam cleaning process removes deep stains, pet odors, and allergens. Drying time is under 2 hours. Eco-friendly and fully insured with transparent pricing and guarantee. Additionally, we utilize advanced methods that were implemented by our certified specialists.\n\n<img src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80" alt="Professional technician cleaning carpet with steam extraction equipment" />\n\n<img src="/images/IMG_5021.jpg" alt="photo of rug" />',
  siteUrl = 'https://example.com',
  siteName = 'Modern Service Co',
}: SerpPreviewProps) {
  const [tab, setTab] = React.useState<
    'desktop' | 'mobile' | 'facebook' | 'twitter' | 'semantic' | 'readability' | 'alt-auditor'
  >('desktop');
  const [title, setTitle] = React.useState(initialTitle);
  const [slug, setSlug] = React.useState(initialSlug);
  const [description, setDescription] = React.useState(initialDescription);
  const [image, setImage] = React.useState(initialImage);
  const [content, setContent] = React.useState(initialContent);
  const [topicCluster, setTopicCluster] = React.useState<keyof typeof TOPIC_ENTITY_CLUSTERS>('cleaning');

  const cleanSlug = slug.replace(/^\/+|\/+$/g, '');
  const pageUrl = `${siteUrl.replace(/\/+$/, '')}/${cleanSlug}/`;

  // Semantic and readability evaluations
  const expectedEntities = TOPIC_ENTITY_CLUSTERS[topicCluster] || [];
  const coverage = React.useMemo(() => {
    return calculateEntityCoverage(content, expectedEntities);
  }, [content, expectedEntities]);

  const readability = React.useMemo(() => {
    return calculateFleschReadingEase(content);
  }, [content]);

  const tabButtonStyle = (current: string): React.CSSProperties => ({
    padding: '0.5rem 1rem',
    borderRadius: 6,
    background: tab === current ? 'var(--color-kumo-brand, #f6821f)' : 'var(--color-kumo-control, #1a1a1a)',
    color: tab === current ? 'var(--color-kumo-contrast, #ffffff)' : 'var(--text-color-kumo-subtle, #a0a0a0)',
    border: tab === current ? '1px solid var(--color-kumo-brand, #f6821f)' : '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))',
    cursor: 'pointer',
    fontSize: '0.8125rem',
    fontWeight: tab === current ? 600 : 400,
    transition: 'all 0.15s ease',
  });

  return (
    <div style={{ maxWidth: 840, padding: '1.5rem 0', fontFamily: 'inherit', color: 'var(--text-color-kumo-default, #ededed)' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-color-kumo-strong, #ffffff)' }}>
        SERP & Social Preview
      </h1>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)', marginBottom: '1.5rem' }}>
        Live pixel-accurate preview for Google Desktop/Mobile search results, Social Cards (OpenGraph & X/Twitter), and live Entity Coverage Index.
      </p>

      {/* Target Tab Navigation */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => setTab('desktop')} style={tabButtonStyle('desktop')}>
          Google Desktop
        </button>
        <button type="button" onClick={() => setTab('mobile')} style={tabButtonStyle('mobile')}>
          Google Mobile
        </button>
        <button type="button" onClick={() => setTab('facebook')} style={tabButtonStyle('facebook')}>
          Facebook (OG Card)
        </button>
        <button type="button" onClick={() => setTab('twitter')} style={tabButtonStyle('twitter')}>
          X / Twitter Card
        </button>
        <button type="button" onClick={() => setTab('semantic')} style={tabButtonStyle('semantic')}>
          Entity Coverage
        </button>
        <button type="button" onClick={() => setTab('readability')} style={tabButtonStyle('readability')}>
          Live Readability
        </button>
        <button type="button" onClick={() => setTab('alt-auditor')} style={tabButtonStyle('alt-auditor')}>
          Image Alt Auditor
        </button>
      </div>

      {/* Live Preview Display Box */}
      <div
        style={{
          border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))',
          borderRadius: 8,
          padding: '1.5rem',
          background: tab === 'semantic' || tab === 'readability' || tab === 'alt-auditor' ? 'var(--color-kumo-base, #181818)' : '#ffffff',
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        {/* 1. Google Desktop Preview */}
        {tab === 'desktop' && (
          <SerpDesktopPreview
            siteUrl={siteUrl}
            cleanSlug={cleanSlug}
            title={title}
            description={description}
          />
        )}

        {/* 2. Google Mobile Preview */}
        {tab === 'mobile' && (
          <SerpMobilePreview
            siteName={siteName}
            pageUrl={pageUrl}
            title={title}
            description={description}
            image={image}
          />
        )}

        {/* 3. Facebook OpenGraph Card */}
        {tab === 'facebook' && (
          <FacebookOgCard
            siteUrl={siteUrl}
            title={title}
            description={description}
            image={image}
          />
        )}

        {/* 4. X (Twitter) Card */}
        {tab === 'twitter' && (
          <TwitterCard
            siteUrl={siteUrl}
            title={title}
            description={description}
            image={image}
          />
        )}

        {/* 5. Entity Coverage & Readability Breakdown */}
        {tab === 'semantic' && (
          <SemanticCoverageCard
            coverage={coverage}
            readability={readability}
            onNavigateToReadability={() => setTab('readability')}
            onNavigateToAltAuditor={() => setTab('alt-auditor')}
          />
        )}

        {/* 6. Live Readability (Hemingway) */}
        {tab === 'readability' && (
          <LiveSentenceHighlighter
            content={content}
            onContentChange={setContent}
            showEditor={true}
            defaultViewMode="split"
          />
        )}

        {/* 7. Image Alt Auditor */}
        {tab === 'alt-auditor' && (
          <ImageAltAuditorWidget
            content={content}
            onContentChange={setContent}
          />
        )}
      </div>

      {/* Interactive Controls & Inputs */}
      <PreviewInputsForm
        title={title}
        onTitleChange={setTitle}
        slug={slug}
        onSlugChange={setSlug}
        description={description}
        onDescriptionChange={setDescription}
        image={image}
        onImageChange={setImage}
        content={content}
        onContentChange={setContent}
        topicCluster={topicCluster}
        onTopicClusterChange={setTopicCluster}
      />
    </div>
  );
}

export default SerpPreviewPage;
