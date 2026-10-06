import { apiFetch as baseFetch, parseApiResponse } from 'emdash/plugin-utils';
import * as React from 'react';
import { ContentTypesIntegrationPanel } from './editor/ContentTypesIntegrationPanel.js';
import { SerpPreviewPage } from '../admin-preview.js';
import { ReadabilityAdminPage, ImageAltAuditorAdminPage } from './standalone-pages.js';
import { FuzzyRedirectsPage } from '../admin-redirects.js';
import {
  IconSettings,
  IconSearch,
  IconBook,
  IconImage,
  IconArrowRight,
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


export function SettingsPage() {
  const [hubTab, setHubTab] = React.useState<'settings' | 'preview' | 'readability' | 'alts' | 'redirects'>('settings');
  const [settings, setSettings] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const h = window.location.hash.replace('#', '');
      if (['settings', 'preview', 'readability', 'alts', 'redirects'].includes(h)) {
        setHubTab(h as 'settings' | 'preview' | 'readability' | 'alts' | 'redirects');
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
        <button
          type="button"
          onClick={() => {
            setHubTab('settings');
            if (typeof window !== 'undefined') window.location.hash = 'settings';
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.375rem 0.75rem',
            borderRadius: 6,
            border: hubTab === 'settings' ? '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.2))' : '1px solid transparent',
            background: hubTab === 'settings' ? 'var(--color-kumo-control, #2a2a2a)' : 'transparent',
            color: hubTab === 'settings' ? 'var(--text-color-kumo-strong, #ffffff)' : 'var(--text-color-kumo-subtle, #9ca3af)',
            fontSize: '0.8125rem',
            fontWeight: hubTab === 'settings' ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          <IconSettings size={13} />
          <span>SEO Settings</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setHubTab('preview');
            if (typeof window !== 'undefined') window.location.hash = 'preview';
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.375rem 0.75rem',
            borderRadius: 6,
            border: hubTab === 'preview' ? '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.2))' : '1px solid transparent',
            background: hubTab === 'preview' ? 'var(--color-kumo-control, #2a2a2a)' : 'transparent',
            color: hubTab === 'preview' ? 'var(--text-color-kumo-strong, #ffffff)' : 'var(--text-color-kumo-subtle, #9ca3af)',
            fontSize: '0.8125rem',
            fontWeight: hubTab === 'preview' ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          <IconSearch size={13} />
          <span>SERP & Social Preview</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setHubTab('readability');
            if (typeof window !== 'undefined') window.location.hash = 'readability';
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.375rem 0.75rem',
            borderRadius: 6,
            border: hubTab === 'readability' ? '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.2))' : '1px solid transparent',
            background: hubTab === 'readability' ? 'var(--color-kumo-control, #2a2a2a)' : 'transparent',
            color: hubTab === 'readability' ? 'var(--text-color-kumo-strong, #ffffff)' : 'var(--text-color-kumo-subtle, #9ca3af)',
            fontSize: '0.8125rem',
            fontWeight: hubTab === 'readability' ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          <IconBook size={13} />
          <span>Readability Checker</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setHubTab('alts');
            if (typeof window !== 'undefined') window.location.hash = 'alts';
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.375rem 0.75rem',
            borderRadius: 6,
            border: hubTab === 'alts' ? '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.2))' : '1px solid transparent',
            background: hubTab === 'alts' ? 'var(--color-kumo-control, #2a2a2a)' : 'transparent',
            color: hubTab === 'alts' ? 'var(--text-color-kumo-strong, #ffffff)' : 'var(--text-color-kumo-subtle, #9ca3af)',
            fontSize: '0.8125rem',
            fontWeight: hubTab === 'alts' ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          <IconImage size={13} />
          <span>Alt Image Auditor</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setHubTab('redirects');
            if (typeof window !== 'undefined') window.location.hash = 'redirects';
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.375rem 0.75rem',
            borderRadius: 6,
            border: hubTab === 'redirects' ? '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.2))' : '1px solid transparent',
            background: hubTab === 'redirects' ? 'var(--color-kumo-control, #2a2a2a)' : 'transparent',
            color: hubTab === 'redirects' ? 'var(--text-color-kumo-strong, #ffffff)' : 'var(--text-color-kumo-subtle, #9ca3af)',
            fontSize: '0.8125rem',
            fontWeight: hubTab === 'redirects' ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          <IconArrowRight size={13} />
          <span>Fuzzy 301 Redirects</span>
        </button>
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
    </div>
  );
}
