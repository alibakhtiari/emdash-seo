import { apiFetch as baseFetch, parseApiResponse } from 'emdash/plugin-utils';
import * as React from 'react';
import { ContentTypesIntegrationPanel } from './editor/ContentTypesIntegrationPanel.js';
import { SerpPreviewPage } from '../admin-preview.js';
import { ReadabilityAdminPage, ImageAltAuditorAdminPage } from './standalone-pages.js';
import { FuzzyRedirectsPage } from '../admin-redirects.js';
import { AuditTab, LinksTab, BulkMetaTab } from './settings/HubDataTabs.js';
import { CornerstonePanel } from './settings/CornerstonePanel.js';
import { RoleCapsPanel } from './settings/RoleCapsPanel.js';
import {
  IconSettings,
  IconSearch,
  IconBook,
  IconImage,
  IconArrowRight,
  IconChecklist,
  IconList,
  IconEdit,
} from './icons.js';

const API = '/_emdash/api/plugins/emdash-seo';

export async function apiFetch(route: string, body?: unknown): Promise<Response> {
  const cleanRoute = route.replace(/^\/+/, '');
  return baseFetch(`${API}/${cleanRoute}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
}

export interface FieldDef {
  key: string;
  type: 'string' | 'select';
  label: string;
  description?: string;
  multiline?: boolean;
  options?: Array<{ value: string; label: string }>;
  default?: string;
  section?: string;
}

export const FIELDS: FieldDef[] = [
  { key: 'siteRepresents', type: 'select', label: 'Site represents', description: 'Does this site represent a person or an organization?', options: [{ value: 'person', label: 'Person' }, { value: 'organization', label: 'Organization' }], default: 'person', section: 'general' },
  { key: 'separator', type: 'select', label: 'Title separator', description: 'Character between page title and site name', options: [{ value: ' — ', label: '— (em dash)' }, { value: ' | ', label: '| (pipe)' }, { value: ' - ', label: '- (hyphen)' }, { value: ' · ', label: '· (dot)' }], default: ' — ', section: 'general' },
  { key: 'defaultDescription', type: 'string', label: 'Default meta description', description: 'Fallback for pages without their own', multiline: true, section: 'general' },
  { key: 'personName', type: 'string', label: 'Person name', description: 'Full name of the person this site represents', section: 'person' },
  { key: 'personDescription', type: 'string', label: 'Person bio', description: 'Short biography (max 250 characters for schema.org)', multiline: true, section: 'person' },
  { key: 'personImageUrl', type: 'string', label: 'Person image URL', description: 'URL to the person\'s photo', section: 'person' },
  { key: 'personJobTitle', type: 'string', label: 'Person job title', description: 'Job title for schema.org Person', section: 'person' },
  { key: 'personUrl', type: 'string', label: 'Person URL', description: 'About page or personal website', section: 'person' },
  { key: 'orgName', type: 'string', label: 'Organization name', section: 'org' },
  { key: 'orgLogoUrl', type: 'string', label: 'Organization logo URL', section: 'org' },
  { key: 'socialTwitter', type: 'string', label: 'X (Twitter) URL', section: 'social' },
  { key: 'socialFacebook', type: 'string', label: 'Facebook URL', section: 'social' },
  { key: 'socialLinkedIn', type: 'string', label: 'LinkedIn URL', section: 'social' },
  { key: 'socialInstagram', type: 'string', label: 'Instagram URL', section: 'social' },
  { key: 'socialYouTube', type: 'string', label: 'YouTube URL', section: 'social' },
  { key: 'socialGitHub', type: 'string', label: 'GitHub URL', section: 'social' },
  { key: 'socialBluesky', type: 'string', label: 'Bluesky URL', section: 'social' },
  { key: 'socialMastodon', type: 'string', label: 'Mastodon URL', section: 'social' },
  { key: 'socialWikipedia', type: 'string', label: 'Wikipedia URL', section: 'social' },
  { key: 'defaultAuthorName', type: 'string', label: 'Default author name', description: 'Fallback author for articles and posts without an explicit author', section: 'author' },
  { key: 'defaultAuthorJobTitle', type: 'string', label: 'Author job title / credentials', description: 'Job title or specialty for schema.org Person E-E-A-T (e.g. Master Cleaner, Lead Editor)', section: 'author' },
  { key: 'defaultAuthorWorksFor', type: 'string', label: 'Author affiliated organization', description: 'Company or institution the author represents', section: 'author' },
  { key: 'defaultAuthorImageUrl', type: 'string', label: 'Author photo / avatar URL', description: 'Square avatar photo for Person schema', section: 'author' },
  { key: 'defaultAuthorSameAs', type: 'string', label: 'Author authority links (sameAs)', description: 'Comma-separated URLs to author\'s LinkedIn, Twitter, Wikipedia, or MuckRack profiles', multiline: true, section: 'author' },
  { key: 'enableGeoOptimization', type: 'select', label: 'GEO (Generative Engine Optimization)', description: 'Optimize content for AI search engines (ChatGPT Search, Google Gemini AI Overviews, Perplexity)', options: [{ value: 'true', label: 'Enabled' }, { value: 'false', label: 'Disabled' }], default: 'true', section: 'geo_aeo' },
  { key: 'enableAeoOptimization', type: 'select', label: 'AEO (Answer Engine Optimization)', description: 'Optimize for voice search & Google Featured Snippets with direct answers and speakable specs', options: [{ value: 'true', label: 'Enabled' }, { value: 'false', label: 'Disabled' }], default: 'true', section: 'geo_aeo' },
  { key: 'defaultSpeakableSelectors', type: 'string', label: 'Speakable CSS Selectors', description: 'CSS selectors for voice assistants (comma-separated, e.g. #field-excerpt, .post-lead, .aeo-summary)', default: '#field-excerpt, .post-lead, .aeo-summary', section: 'geo_aeo' },
  { key: 'nlwebEndpoint', type: 'string', label: 'NLWeb endpoint URL', description: 'Absolute URL of conversational endpoint for agent discovery. Emits <link rel="nlweb" href="...">.', section: 'discovery' },
  { key: 'digest_enabled', type: 'select', label: 'Weekly audit digest', description: 'Run the sitewide audit weekly via host cron and email score deltas (requires email provider).', options: [{ value: 'false', label: 'Disabled' }, { value: 'true', label: 'Enabled' }], default: 'false', section: 'discovery' },
  { key: 'digest_email', type: 'string', label: 'Digest recipient email', description: 'Where the weekly SEO digest is sent.', section: 'discovery' },
  { key: 'aiCrawlerPolicy', type: 'select', label: 'AI crawler policy', description: 'Allow all AI bots, search citers only (recommended: citations without training), or block all. llms.txt stays open as the consented channel.', options: [{ value: 'allow-all', label: 'Allow all' }, { value: 'search-only', label: 'Search citers only (recommended)' }, { value: 'block-all', label: 'Block all' }], default: 'allow-all', section: 'discovery' },
  { key: 'noindexCategory', type: 'select', label: 'Noindex category archives', description: 'Prevent category archive pages from appearing in search results', options: [{ value: 'true', label: 'Noindex' }, { value: 'false', label: 'Index' }], default: 'false', section: 'taxonomies' },
  { key: 'noindexTag', type: 'select', label: 'Noindex tag archives', description: 'Prevent tag archive pages from appearing in search results', options: [{ value: 'true', label: 'Noindex' }, { value: 'false', label: 'Index' }], default: 'false', section: 'taxonomies' },
  { key: 'noindexAuthor', type: 'select', label: 'Noindex author archives', description: 'Prevent author archive pages from appearing in search results', options: [{ value: 'true', label: 'Noindex' }, { value: 'false', label: 'Index' }], default: 'false', section: 'taxonomies' },
  { key: 'noindexDate', type: 'select', label: 'Noindex date archives', description: 'Prevent year/month/day archive pages from appearing in search results', options: [{ value: 'true', label: 'Noindex' }, { value: 'false', label: 'Index' }], default: 'true', section: 'taxonomies' },
  { key: 'noindexSearch', type: 'select', label: 'Noindex internal search', description: 'Prevent internal search result pages from appearing in search results', options: [{ value: 'true', label: 'Noindex' }, { value: 'false', label: 'Index' }], default: 'true', section: 'taxonomies' },
];

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  borderRadius: 6,
  border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))',
  background: 'var(--color-kumo-control, #1a1a1a)',
  color: 'var(--text-color-kumo-default, #ededed)',
  fontSize: '0.875rem',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

export function Field({ field, value, onChange }: { field: FieldDef; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontWeight: 500, marginBottom: 4, fontSize: '0.875rem', color: 'var(--text-color-kumo-strong, #ffffff)' }}>
        {field.label}
      </label>
      {field.description && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)', marginBottom: 4 }}>{field.description}</div>
      )}
      {field.type === 'select' ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value} style={{ background: 'var(--color-kumo-elevated, #202020)', color: 'var(--text-color-kumo-default, #ededed)' }}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : field.multiline ? (
        <textarea
          value={value} onChange={(e) => onChange(e.target.value)}
          rows={3} style={{ ...inputStyle, resize: 'vertical' }}
        />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
      )}
    </div>
  );
}

import {
  BreadcrumbLabelsEditor,
  BreadcrumbRulesEditor,
} from './settings/BreadcrumbsSettingsEditor.js';

export { BreadcrumbLabelsEditor, BreadcrumbRulesEditor };


type HubTab = 'settings' | 'preview' | 'readability' | 'alts' | 'redirects' | 'audit' | 'links' | 'bulk';

const HUB_TABS: Array<{ id: HubTab; label: string; Icon: (p: { size?: number }) => React.ReactElement }> = [
  { id: 'settings', label: 'SEO Settings', Icon: IconSettings },
  { id: 'preview', label: 'SERP & Social Preview', Icon: IconSearch },
  { id: 'readability', label: 'Readability Checker', Icon: IconBook },
  { id: 'alts', label: 'Alt Image Auditor', Icon: IconImage },
  { id: 'redirects', label: 'Fuzzy 301 Redirects', Icon: IconArrowRight },
  { id: 'audit', label: 'Site Audit', Icon: IconChecklist },
  { id: 'links', label: 'Link Opportunities', Icon: IconList },
  { id: 'bulk', label: 'Bulk Editor', Icon: IconEdit },
];

const HUB_TAB_IDS = HUB_TABS.map((t) => t.id);

export function SettingsPage() {
  const [hubTab, setHubTab] = React.useState<HubTab>('settings');
  const [settings, setSettings] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const h = window.location.hash.replace('#', '');
      if ((HUB_TAB_IDS as string[]).includes(h)) {
        setHubTab(h as HubTab);
      }
    }
  }, []);

  React.useEffect(() => {
    apiFetch('settings').then(async (res) => {
      if (res.status === 401) {
        setError('Authentication required. Please log in to EmDash Admin at /_emdash/admin.');
        setLoading(false);
        return;
      }
      const data = await parseApiResponse<{ settings: Record<string, string> }>(res);
      setSettings(data.settings || {});
      setLoading(false);
    }).catch((err) => {
      setError(String(err));
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await apiFetch('settings/save', { settings });
      if (res.status === 401) {
        setError('Authentication required. Please log in to EmDash Admin at /_emdash/admin.');
        setSaving(false);
        return;
      }
      await parseApiResponse<{ ok: boolean }>(res);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(String(err));
    }
    setSaving(false);
  };

  const update = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>Loading WebABC SEO...</div>;
  if (error) return <div style={{ padding: '2rem', color: 'var(--text-color-kumo-danger, #f87171)' }}>Error: {error}</div>;

  const siteRepresents = settings.siteRepresents || 'person';

  const sections = [
    { id: 'general', label: 'General' },
    ...(siteRepresents === 'person' ? [{ id: 'person', label: 'Person' }] : [{ id: 'org', label: 'Organization' }]),
    { id: 'author', label: 'Default Author & E-E-A-T Credentials' },
    { id: 'taxonomies', label: 'Taxonomy & Archive Indexing' },
    { id: 'geo_aeo', label: 'GEO & AEO (AI Search & Voice Optimization)' },
    { id: 'social', label: 'Social Profiles' },
    { id: 'discovery', label: 'Agent Discovery & LLMs' },
  ];

  return (
    <div style={{ maxWidth: 840, padding: '1.5rem 0', color: 'var(--text-color-kumo-default, #ededed)' }}>
      {/* WebABC SEO Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-color-kumo-strong, #ffffff)' }}>
          WebABC SEO
        </h1>
        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>
          Comprehensive Search, Generative AI (GEO) & Answer Engine (AEO) Optimization Suite
        </p>
      </div>

      {/* Top Tab Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '0.375rem',
          borderBottom: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.12))',
          paddingBottom: '0.5rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        {HUB_TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setHubTab(id);
              if (typeof window !== 'undefined') window.location.hash = id;
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.375rem 0.75rem',
              borderRadius: 6,
              border: hubTab === id ? '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.2))' : '1px solid transparent',
              background: hubTab === id ? 'var(--color-kumo-control, #2a2a2a)' : 'transparent',
              color: hubTab === id ? 'var(--text-color-kumo-strong, #ffffff)' : 'var(--text-color-kumo-subtle, #9ca3af)',
              fontSize: '0.8125rem',
              fontWeight: hubTab === id ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            <Icon size={13} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {hubTab === 'settings' && (
        <div style={{ maxWidth: 640 }}>
          {sections.map((section) => (
            <div key={section.id} style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', borderBottom: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))', paddingBottom: '0.5rem', color: 'var(--text-color-kumo-strong, #ffffff)' }}>
                {section.label}
              </h3>
              {FIELDS.filter((f) => f.section === section.id).map((field) => (
                <Field
                  key={field.key}
                  field={field}
                  value={settings[field.key] || field.default || ''}
                  onChange={(v) => update(field.key, v)}
                />
              ))}
            </div>
          ))}

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', borderBottom: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))', paddingBottom: '0.5rem', color: 'var(--text-color-kumo-strong, #ffffff)' }}>
              Breadcrumbs
            </h3>
            <BreadcrumbLabelsEditor
              value={settings.breadcrumbLabels || ''}
              onChange={(v) => update('breadcrumbLabels', v)}
            />
            <BreadcrumbRulesEditor
              value={settings.breadcrumbRules || ''}
              onChange={(v) => update('breadcrumbRules', v)}
            />
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', borderBottom: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))', paddingBottom: '0.5rem', color: 'var(--text-color-kumo-strong, #ffffff)' }}>
              Cornerstone Content
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)', marginBottom: '0.75rem' }}>
              Pillar posts flagged in the content editor. Cornerstone entries target 1,200+ words.
            </p>
            <CornerstonePanel fallbackCount={settings.cornerstoneCount} />
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', borderBottom: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))', paddingBottom: '0.5rem', color: 'var(--text-color-kumo-strong, #ffffff)' }}>
              Role Capabilities
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)', marginBottom: '0.75rem' }}>
              Admins manage everything. Toggle which modules editors may change; enforced on every mutating API route.
            </p>
            <RoleCapsPanel />
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', borderBottom: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))', paddingBottom: '0.5rem', color: 'var(--text-color-kumo-strong, #ffffff)' }}>
              Content Types & Live Editor Integration
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)', marginBottom: '0.75rem' }}>
              Enable the real-time Focus Keyword, Hemingway Readability Checker, Alt Auditor, and SERP Preview widgets directly inside the content editor for new posts, pages, and custom content types.
            </p>
            <ContentTypesIntegrationPanel />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '0.5rem 1.5rem', borderRadius: 6, background: 'var(--color-kumo-brand, #f6821f)',
              color: 'var(--color-kumo-contrast, #ffffff)', border: 'none', cursor: saving ? 'wait' : 'pointer', fontWeight: 600,
            }}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {saved && <span style={{ marginLeft: 12, color: 'var(--text-color-kumo-success, #4ade80)', fontSize: '0.875rem' }}>Settings saved!</span>}
        </div>
      )}

      {hubTab === 'preview' && <SerpPreviewPage />}
      {hubTab === 'readability' && <ReadabilityAdminPage />}
      {hubTab === 'alts' && <ImageAltAuditorAdminPage />}
      {hubTab === 'redirects' && <FuzzyRedirectsPage />}
      {hubTab === 'audit' && <AuditTab />}
      {hubTab === 'links' && <LinksTab />}
      {hubTab === 'bulk' && <BulkMetaTab />}
    </div>
  );
}
