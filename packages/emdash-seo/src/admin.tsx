import { apiFetch as baseFetch, parseApiResponse } from 'emdash/plugin-utils';
import * as React from 'react';
import { FuzzyRedirectsPage } from './admin-redirects.js';
import { SerpPreviewPage, LiveSentenceHighlighter, ImageAltAuditorWidget } from './admin-preview.js';
import { auditReadability } from './engine/readability-auditor.js';
import { auditImageAlts } from './engine/alt-auditor.js';
import { analyzeContent } from './engine/content-analyzer.js';

const API = '/_emdash/api/plugins/emdash-seo';

async function apiFetch(route: string, body?: unknown): Promise<Response> {
  const cleanRoute = route.replace(/^\/+/, '');
  return baseFetch(`${API}/${cleanRoute}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
}

interface FieldDef {
  key: string;
  type: 'string' | 'select';
  label: string;
  description?: string;
  multiline?: boolean;
  options?: Array<{ value: string; label: string }>;
  default?: string;
  section?: string;
}

const FIELDS: FieldDef[] = [
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

const buttonStyle: React.CSSProperties = {
  padding: '0.375rem 0.75rem',
  borderRadius: 6,
  background: 'var(--color-kumo-control, #1a1a1a)',
  color: 'var(--text-color-kumo-default, #ededed)',
  border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))',
  cursor: 'pointer',
  fontSize: '0.75rem',
  fontFamily: 'inherit',
};

function Field({ field, value, onChange }: { field: FieldDef; value: string; onChange: (v: string) => void }) {
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

function BreadcrumbLabelsEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const parsed = React.useMemo<Array<{ segment: string; label: string }>>(() => {
    if (!value) return [];
    try {
      const obj = JSON.parse(value) as unknown;
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        return Object.entries(obj as Record<string, unknown>).map(([segment, label]) => ({
          segment,
          label: String(label ?? ''),
        }));
      }
    } catch {
      // Ignore
    }
    return [];
  }, [value]);

  const commit = (rows: Array<{ segment: string; label: string }>) => {
    const obj: Record<string, string> = {};
    for (const row of rows) {
      const key = row.segment.trim();
      if (key) obj[key] = row.label;
    }
    onChange(Object.keys(obj).length > 0 ? JSON.stringify(obj) : '');
  };

  const updateRow = (index: number, patch: Partial<{ segment: string; label: string }>) => {
    const next = parsed.map((r, i) => (i === index ? { ...r, ...patch } : r));
    commit(next);
  };

  const addRow = () => commit([...parsed, { segment: '', label: '' }]);
  const removeRow = (index: number) => commit(parsed.filter((_, i) => i !== index));

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontWeight: 500, marginBottom: 4, fontSize: '0.875rem', color: 'var(--text-color-kumo-strong, #ffffff)' }}>
        Segment labels
      </label>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)', marginBottom: 8 }}>
        Override the default title-cased segment name for breadcrumbs. E.g. <code>blog</code> → <code>Blog</code>.
      </div>
      {parsed.length === 0 && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-color-kumo-placeholder, #666)', fontStyle: 'italic', marginBottom: 8 }}>
          No overrides — breadcrumbs will use cleaned-up segment names.
        </div>
      )}
      {parsed.map((row, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          <input
            type="text"
            placeholder="segment"
            value={row.segment}
            onChange={(e) => updateRow(i, { segment: e.target.value })}
            style={{ ...inputStyle, flex: '1 1 40%' }}
          />
          <input
            type="text"
            placeholder="Display label"
            value={row.label}
            onChange={(e) => updateRow(i, { label: e.target.value })}
            style={{ ...inputStyle, flex: '1 1 60%' }}
          />
          <button type="button" onClick={() => removeRow(i)} style={buttonStyle} aria-label="Remove">
            ×
          </button>
        </div>
      ))}
      <button type="button" onClick={addRow} style={buttonStyle}>
        + Add label
      </button>
    </div>
  );
}

function BreadcrumbRulesEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [draft, setDraft] = React.useState(value);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setDraft(value);
  }, [value]);

  const handleChange = (next: string) => {
    setDraft(next);
    if (!next.trim()) {
      setError(null);
      onChange('');
      return;
    }
    try {
      JSON.parse(next);
      setError(null);
      onChange(next);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontWeight: 500, marginBottom: 4, fontSize: '0.875rem', color: 'var(--text-color-kumo-strong, #ffffff)' }}>
        Page type rules (advanced)
      </label>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)', marginBottom: 4 }}>
        JSON map from <code>pageType</code> to an ordered list of crumbs.
      </div>
      <pre style={{ fontSize: '0.7rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)', background: 'var(--color-kumo-recessed, #141414)', border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))', padding: 8, borderRadius: 4, marginBottom: 6, overflowX: 'auto' }}>
{`{
  "blogPost": [
    { "label": "Home", "href": "/" },
    { "label": "Blog", "href": "/blog/" },
    { "label": "{title}" }
  ]
}`}
      </pre>
      <textarea
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        rows={6}
        style={{
          ...inputStyle,
          resize: 'vertical',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: '0.75rem',
          borderColor: error ? 'var(--color-kumo-danger, #f87171)' : undefined,
        }}
        placeholder="{}"
      />
      {error && (
        <div style={{ fontSize: '0.7rem', color: 'var(--text-color-kumo-danger, #f87171)', marginTop: 4 }}>
          Invalid JSON: {error}
        </div>
      )}
    </div>
  );
}

function SettingsPage() {
  const [settings, setSettings] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

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

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>Loading settings...</div>;
  if (error) return <div style={{ padding: '2rem', color: 'var(--text-color-kumo-danger, #f87171)' }}>Error: {error}</div>;

  const siteRepresents = settings.siteRepresents || 'person';

  const sections = [
    { id: 'general', label: 'General' },
    ...(siteRepresents === 'person' ? [{ id: 'person', label: 'Person' }] : [{ id: 'org', label: 'Organization' }]),
    { id: 'social', label: 'Social Profiles' },
    { id: 'discovery', label: 'Agent Discovery & LLMs' },
  ];

  return (
    <div style={{ maxWidth: 640, padding: '1.5rem 0', color: 'var(--text-color-kumo-default, #ededed)' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-color-kumo-strong, #ffffff)' }}>SEO Settings</h1>
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
  );
}

export function ReadabilityAdminPage() {
  const [content, setContent] = React.useState(
    'Our hot water extraction and steam cleaning process removes deep stains, pet odors, and allergens. Drying time is under 2 hours. Eco-friendly and fully insured with transparent pricing and guarantee. Additionally, we utilize advanced methods that were implemented by our certified specialists.'
  );
  return (
    <div style={{ maxWidth: 840, padding: '1.5rem 0' }}>
      <LiveSentenceHighlighter content={content} onContentChange={setContent} />
    </div>
  );
}

export function ImageAltAuditorAdminPage() {
  const [content, setContent] = React.useState(
    '<p>Professional eco-friendly cleaning services across London.</p>\n<img src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80" alt="Professional technician cleaning carpet with steam extraction equipment" />\n<img src="/images/IMG_5021.jpg" alt="photo of rug" />\n<img src="/images/banner.png" />'
  );
  return (
    <div style={{ maxWidth: 840, padding: '1.5rem 0' }}>
      <ImageAltAuditorWidget content={content} onContentChange={setContent} />
    </div>
  );
}

export function extractTextFromContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!content) return '';
  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (!block || typeof block !== 'object') return '';
        if (block._type === 'block' && Array.isArray(block.children)) {
          return block.children
            .map((span: { text?: string }) => (typeof span?.text === 'string' ? span.text : ''))
            .join('');
        }
        if (typeof block.text === 'string') return block.text;
        return '';
      })
      .filter(Boolean)
      .join('\n\n');
  }
  return '';
}

export function extractAllImagesFromContent(content: unknown, data?: Record<string, unknown>): string {
  const parts: string[] = [];

  if (data?.featured_image && typeof data.featured_image === 'string') {
    const featuredAlt = typeof data.featured_image_alt === 'string' ? data.featured_image_alt : '';
    parts.push(`<img src="${data.featured_image}" alt="${featuredAlt}" />`);
  }

  if (Array.isArray(content)) {
    for (const block of content) {
      if (block && typeof block === 'object') {
        if (block._type === 'image') {
          const alt = block.alt !== undefined ? String(block.alt) : '';
          const url = block.url || block.asset?.url || '/media/image.jpg';
          parts.push(`<img src="${url}" alt="${alt}" />`);
        } else if (block._type === 'block' && Array.isArray(block.children)) {
          for (const span of block.children) {
            if (typeof span?.text === 'string' && (span.text.includes('<img') || span.text.includes('!['))) {
              parts.push(span.text);
            }
          }
        }
      }
    }
  } else if (typeof content === 'string') {
    parts.push(content);
  }

  return parts.join('\n');
}

export interface ContentEditorPanelProps {
  collection?: string;
  entry?: {
    id?: string;
    data?: Record<string, unknown>;
    seo?: {
      title?: string | null;
      description?: string | null;
      canonicalUrl?: string | null;
      noIndex?: boolean | null;
      ogImage?: string | null;
      [key: string]: unknown;
    };
    slug?: string;
    locale?: string;
    publishedAt?: string | null;
    [key: string]: unknown;
  };
  locale?: string;
}

export function ContentEditorSeoPanel(props: ContentEditorPanelProps) {
  const { entry } = props;
  const [activeTab, setActiveTab] = React.useState<'overview' | 'keyword' | 'highlighter' | 'alts'>('overview');

  const data = (entry?.data || {}) as Record<string, unknown>;
  const seoData = (data.seo || entry?.seo || {}) as Record<string, unknown>;
  const initialKeyword = (data.focus_keyword as string) || (seoData.focusKeyword as string) || '';
  const [focusKeyword, setFocusKeyword] = React.useState<string>(initialKeyword);

  // Sync keyword if data updates externally
  React.useEffect(() => {
    const nextKw = (data.focus_keyword as string) || (seoData.focusKeyword as string) || '';
    if (nextKw && nextKw !== focusKeyword) {
      setFocusKeyword(nextKw);
    }
  }, [data.focus_keyword, seoData.focusKeyword]);

  const isCornerstone = Boolean(data.cornerstone ?? seoData.cornerstone ?? false);
  const schemaType = String(data.schema_type ?? seoData.schemaType ?? 'Article');

  const rawContent = data.content || data.body || data.text || data.excerpt || '';
  const textContent = React.useMemo(() => extractTextFromContent(rawContent), [rawContent]);
  const imageContent = React.useMemo(() => extractAllImagesFromContent(rawContent, data), [rawContent, data]);

  const readability = React.useMemo(() => auditReadability(textContent), [textContent]);
  const altAudit = React.useMemo(() => auditImageAlts(imageContent, { targetKeywords: focusKeyword ? [focusKeyword] : [] }), [imageContent, focusKeyword]);

  const postTitle = (typeof data.title === 'string' ? data.title : '') || entry?.slug || '';
  const postSlug = entry?.slug || (typeof data.slug === 'string' ? data.slug : '');
  const metaDesc = (typeof seoData.description === 'string' ? seoData.description : '') ||
    (typeof data.excerpt === 'string' ? data.excerpt : '');

  const seoReport = React.useMemo(() => {
    return analyzeContent({
      title: postTitle,
      slug: postSlug,
      content: textContent,
      focusKeywords: focusKeyword ? [focusKeyword] : [],
      metaDescription: metaDesc,
      minWordCount: isCornerstone ? 1200 : 600,
    });
  }, [postTitle, postSlug, textContent, focusKeyword, metaDesc, isCornerstone]);

  const seoScore = seoReport.score;
  const seoColor = seoScore >= 80 ? 'var(--text-color-kumo-success, #4ade80)' : seoScore >= 50 ? 'var(--text-color-kumo-warning, #fbbf24)' : 'var(--text-color-kumo-danger, #f87171)';
  const seoBg = seoScore >= 80 ? 'var(--color-kumo-success-tint, rgba(34, 197, 94, 0.12))' : seoScore >= 50 ? 'var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.12))' : 'var(--color-kumo-danger-tint, rgba(239, 68, 68, 0.12))';

  const easeScore = readability.readingEase;
  const easeColor = easeScore >= 60 ? 'var(--text-color-kumo-success, #4ade80)' : easeScore >= 50 ? 'var(--text-color-kumo-warning, #fbbf24)' : 'var(--text-color-kumo-danger, #f87171)';
  const easeBg = easeScore >= 60 ? 'var(--color-kumo-success-tint, rgba(34, 197, 94, 0.12))' : easeScore >= 50 ? 'var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.12))' : 'var(--color-kumo-danger-tint, rgba(239, 68, 68, 0.12))';

  const altScore = altAudit.score;
  const altColor = altScore >= 80 ? 'var(--text-color-kumo-success, #4ade80)' : altScore >= 50 ? 'var(--text-color-kumo-warning, #fbbf24)' : 'var(--text-color-kumo-danger, #f87171)';
  const altBg = altScore >= 80 ? 'var(--color-kumo-success-tint, rgba(34, 197, 94, 0.12))' : altScore >= 50 ? 'var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.12))' : 'var(--color-kumo-danger-tint, rgba(239, 68, 68, 0.12))';

  const hasContent = textContent.trim().length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-color-kumo-default, #ededed)' }}>
      {/* Top Badges / Context Pills */}
      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {focusKeyword ? (
          <button
            type="button"
            onClick={() => setActiveTab('keyword')}
            style={{
              padding: '0.125rem 0.375rem',
              borderRadius: 4,
              background: 'var(--color-kumo-control, #2a2a2a)',
              border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))',
              fontSize: '0.6875rem',
              color: 'var(--text-color-kumo-strong, #ffffff)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <span>🎯</span> <strong>{focusKeyword}</strong>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setActiveTab('keyword')}
            style={{
              padding: '0.125rem 0.375rem',
              borderRadius: 4,
              background: 'var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.12))',
              border: '1px dashed var(--text-color-kumo-warning, #fbbf24)',
              fontSize: '0.6875rem',
              color: 'var(--text-color-kumo-warning, #fbbf24)',
              cursor: 'pointer',
            }}
          >
            + Set Focus Keyword
          </button>
        )}

        {isCornerstone && (
          <span
            style={{
              padding: '0.125rem 0.375rem',
              borderRadius: 4,
              background: 'rgba(234, 179, 8, 0.15)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              fontSize: '0.6875rem',
              color: '#facc15',
              fontWeight: 600,
            }}
          >
            ⭐ Pillar Content
          </span>
        )}

        <span
          style={{
            padding: '0.125rem 0.375rem',
            borderRadius: 4,
            background: 'var(--color-kumo-recessed, #141414)',
            border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))',
            fontSize: '0.6875rem',
            color: 'var(--text-color-kumo-subtle, #a0a0a0)',
          }}
        >
          📑 Schema: {schemaType}
        </span>
      </div>

      {/* Tab navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))', gap: '0.25rem', paddingBottom: '0.375rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '0.25rem 0.5rem',
            borderRadius: 4,
            border: activeTab === 'overview' ? '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))' : '1px solid transparent',
            background: activeTab === 'overview' ? 'var(--color-kumo-tint, #2e2e2e)' : 'transparent',
            color: activeTab === 'overview' ? 'var(--text-color-kumo-strong, #ffffff)' : 'var(--text-color-kumo-subtle, #a0a0a0)',
            fontWeight: activeTab === 'overview' ? 600 : 400,
            cursor: 'pointer',
            fontSize: '0.75rem',
          }}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('keyword')}
          style={{
            padding: '0.25rem 0.5rem',
            borderRadius: 4,
            border: activeTab === 'keyword' ? '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))' : '1px solid transparent',
            background: activeTab === 'keyword' ? 'var(--color-kumo-tint, #2e2e2e)' : 'transparent',
            color: activeTab === 'keyword' ? 'var(--text-color-kumo-strong, #ffffff)' : 'var(--text-color-kumo-subtle, #a0a0a0)',
            fontWeight: activeTab === 'keyword' ? 600 : 400,
            cursor: 'pointer',
            fontSize: '0.75rem',
          }}
        >
          Keyword {focusKeyword ? `(${seoScore}/100)` : ''}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('highlighter')}
          style={{
            padding: '0.25rem 0.5rem',
            borderRadius: 4,
            border: activeTab === 'highlighter' ? '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))' : '1px solid transparent',
            background: activeTab === 'highlighter' ? 'var(--color-kumo-tint, #2e2e2e)' : 'transparent',
            color: activeTab === 'highlighter' ? 'var(--text-color-kumo-strong, #ffffff)' : 'var(--text-color-kumo-subtle, #a0a0a0)',
            fontWeight: activeTab === 'highlighter' ? 600 : 400,
            cursor: 'pointer',
            fontSize: '0.75rem',
          }}
        >
          Sentences ({readability.hardSentencesCount + readability.veryHardSentencesCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('alts')}
          style={{
            padding: '0.25rem 0.5rem',
            borderRadius: 4,
            border: activeTab === 'alts' ? '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))' : '1px solid transparent',
            background: activeTab === 'alts' ? 'var(--color-kumo-tint, #2e2e2e)' : 'transparent',
            color: activeTab === 'alts' ? 'var(--text-color-kumo-strong, #ffffff)' : 'var(--text-color-kumo-subtle, #a0a0a0)',
            fontWeight: activeTab === 'alts' ? 600 : 400,
            cursor: 'pointer',
            fontSize: '0.75rem',
          }}
        >
          Images ({altAudit.totalImages})
        </button>
      </div>

      {!hasContent ? (
        <div style={{ padding: '0.75rem', borderRadius: 6, background: 'var(--color-kumo-recessed, #141414)', border: '1px dashed var(--color-kumo-line, rgba(255, 255, 255, 0.15))', color: 'var(--text-color-kumo-subtle, #a0a0a0)', textAlign: 'center' }}>
          <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-color-kumo-strong, #ffffff)' }}>No article body detected</p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem' }}>Add content to your post to calculate live SEO checklist, readability scores, and image alt audits.</p>
        </div>
      ) : activeTab === 'overview' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* 3 Score Badges Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.375rem' }}>
            <div
              onClick={() => setActiveTab('keyword')}
              style={{
                padding: '0.5rem 0.375rem',
                borderRadius: 6,
                background: seoBg,
                border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: '0.625rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)', textTransform: 'uppercase', fontWeight: 600 }}>SEO Content</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: seoColor, margin: '2px 0' }}>
                {seoScore} <span style={{ fontSize: '0.6875rem', fontWeight: 400, color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>/ 100</span>
              </div>
              <div style={{ fontSize: '0.625rem', color: seoColor, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {seoReport.grade}
              </div>
            </div>

            <div
              onClick={() => setActiveTab('highlighter')}
              style={{
                padding: '0.5rem 0.375rem',
                borderRadius: 6,
                background: easeBg,
                border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: '0.625rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)', textTransform: 'uppercase', fontWeight: 600 }}>Reading Ease</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: easeColor, margin: '2px 0' }}>
                {easeScore} <span style={{ fontSize: '0.6875rem', fontWeight: 400, color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>/ 100</span>
              </div>
              <div style={{ fontSize: '0.625rem', color: easeColor, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Gr. {readability.gradeLevel}
              </div>
            </div>

            <div
              onClick={() => setActiveTab('alts')}
              style={{
                padding: '0.5rem 0.375rem',
                borderRadius: 6,
                background: altBg,
                border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: '0.625rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)', textTransform: 'uppercase', fontWeight: 600 }}>Alt Health</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: altColor, margin: '2px 0' }}>
                {altScore} <span style={{ fontSize: '0.6875rem', fontWeight: 400, color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>/ 100</span>
              </div>
              <div style={{ fontSize: '0.625rem', color: altColor, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {altAudit.missingAltCount > 0 ? `${altAudit.missingAltCount} Missing` : 'All OK'}
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', background: 'var(--color-kumo-recessed, #141414)', padding: '0.5rem', borderRadius: 6, border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>Word count:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-color-kumo-strong, #ffffff)' }}>
                {readability.wordCount} words {isCornerstone ? '(Target: 1,200+)' : '(Target: 600+)'}
              </span>
            </div>
            {focusKeyword && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>Keyword density:</span>
                <span style={{
                  fontWeight: 600,
                  color: (seoReport.metrics.keywordDensity >= 0.5 && seoReport.metrics.keywordDensity <= 2.5)
                    ? 'var(--text-color-kumo-success, #4ade80)'
                    : 'var(--text-color-kumo-warning, #fbbf24)',
                }}>
                  {seoReport.metrics.keywordDensity.toFixed(1)}% ({seoReport.metrics.keywordMatches} matches)
                </span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>Headings:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-color-kumo-strong, #ffffff)' }}>
                H1: {seoReport.metrics.h1Count} · H2: {seoReport.metrics.h2Count} · H3: {seoReport.metrics.h3Count}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>Sentences:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-color-kumo-strong, #ffffff)' }}>
                {readability.sentenceCount} ({readability.hardSentencesCount} hard, {readability.veryHardSentencesCount} very hard)
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>Passive voice:</span>
              <span style={{ fontWeight: 600, color: readability.passiveVoicePercentage > 10 ? 'var(--text-color-kumo-danger, #f87171)' : 'var(--text-color-kumo-success, #4ade80)' }}>
                {readability.passiveVoicePercentage}% ({readability.passiveVoiceCount})
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>Transition words:</span>
              <span style={{ fontWeight: 600, color: readability.transitionPercentage < 30 ? 'var(--text-color-kumo-warning, #fbbf24)' : 'var(--text-color-kumo-success, #4ade80)' }}>
                {readability.transitionPercentage}%
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>Links:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-color-kumo-strong, #ffffff)' }}>
                {seoReport.metrics.internalLinkCount} internal · {seoReport.metrics.externalLinkCount} external
              </span>
            </div>
          </div>

          {/* Key Findings / Actionable Alerts */}
          {!focusKeyword && (
            <div
              onClick={() => setActiveTab('keyword')}
              style={{
                padding: '0.5rem',
                borderRadius: 6,
                background: 'var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.12))',
                border: '1px solid var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.25))',
                fontSize: '0.75rem',
                color: 'var(--text-color-kumo-warning, #fbbf24)',
                cursor: 'pointer',
              }}
            >
              🎯 <strong>No Focus Keyword Set:</strong> Click here to define a target keyword and evaluate ranking criteria.
            </div>
          )}

          {readability.veryHardSentencesCount > 0 && (
            <div
              onClick={() => setActiveTab('highlighter')}
              style={{
                padding: '0.5rem',
                borderRadius: 6,
                background: 'var(--color-kumo-danger-tint, rgba(239, 68, 68, 0.12))',
                border: '1px solid var(--color-kumo-danger-tint, rgba(239, 68, 68, 0.25))',
                fontSize: '0.75rem',
                color: 'var(--text-color-kumo-danger, #f87171)',
                cursor: 'pointer',
              }}
            >
              ⚠️ <strong>{readability.veryHardSentencesCount} sentence(s) are very hard to read.</strong> Click to inspect in Sentences highlighter.
            </div>
          )}

          {altAudit.missingAltCount > 0 && (
            <div
              onClick={() => setActiveTab('alts')}
              style={{
                padding: '0.5rem',
                borderRadius: 6,
                background: 'var(--color-kumo-danger-tint, rgba(239, 68, 68, 0.12))',
                border: '1px solid var(--color-kumo-danger-tint, rgba(239, 68, 68, 0.25))',
                fontSize: '0.75rem',
                color: 'var(--text-color-kumo-danger, #f87171)',
                cursor: 'pointer',
              }}
            >
              🖼️ <strong>{altAudit.missingAltCount} image(s) missing alt text.</strong> Click to inspect and edit inline in Images tab.
            </div>
          )}

          {seoReport.recommendations.length > 0 && (
            <div style={{ padding: '0.5rem', borderRadius: 6, background: 'var(--color-kumo-recessed, #141414)', border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))', fontSize: '0.75rem' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-color-kumo-strong, #ffffff)', marginBottom: '0.25rem' }}>
                💡 Top Recommendation
              </div>
              <div style={{ color: 'var(--text-color-kumo-default, #ededed)', fontSize: '0.6875rem', lineHeight: 1.4 }}>
                {seoReport.recommendations[0]}
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'keyword' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Target Keyword Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-color-kumo-strong, #ffffff)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🎯 Target Focus Keyword</span>
              {isCornerstone && <span style={{ fontSize: '0.6875rem', color: '#facc15' }}>⭐ Pillar: 1,200+ words</span>}
            </label>
            <input
              type="text"
              value={focusKeyword}
              onChange={(e) => setFocusKeyword(e.target.value)}
              placeholder="e.g. carpet cleaning london"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.375rem 0.5rem',
                borderRadius: 4,
                border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))',
                background: 'var(--color-kumo-control, #2a2a2a)',
                color: 'var(--text-color-kumo-strong, #ffffff)',
                fontSize: '0.8125rem',
                outline: 'none',
              }}
            />
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>
              Type to simulate live content optimization scores and density checks.
            </div>
          </div>

          {/* Density Gauge */}
          {focusKeyword ? (
            <div style={{ padding: '0.5rem', borderRadius: 6, background: 'var(--color-kumo-recessed, #141414)', border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>Keyword Density:</span>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: (seoReport.metrics.keywordDensity >= 0.5 && seoReport.metrics.keywordDensity <= 2.5)
                    ? 'var(--text-color-kumo-success, #4ade80)'
                    : seoReport.metrics.keywordDensity > 2.5
                    ? 'var(--text-color-kumo-danger, #f87171)'
                    : 'var(--text-color-kumo-warning, #fbbf24)',
                }}>
                  {seoReport.metrics.keywordDensity.toFixed(1)}% ({seoReport.metrics.keywordMatches} times)
                </span>
              </div>

              {/* Progress meter bar */}
              <div style={{ width: '100%', height: 6, background: 'var(--color-kumo-control, #2a2a2a)', borderRadius: 3, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, (seoReport.metrics.keywordDensity / 3.0) * 100)}%`,
                    background: (seoReport.metrics.keywordDensity >= 0.5 && seoReport.metrics.keywordDensity <= 2.5)
                      ? 'var(--text-color-kumo-success, #4ade80)'
                      : seoReport.metrics.keywordDensity > 2.5
                      ? 'var(--text-color-kumo-danger, #f87171)'
                      : 'var(--text-color-kumo-warning, #fbbf24)',
                    transition: 'width 0.2s ease',
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.625rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>
                <span>0%</span>
                <span>Target: 0.5% – 2.5%</span>
                <span>3.0%+</span>
              </div>
            </div>
          ) : null}

          {/* SEO Checklist */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-color-kumo-subtle, #a0a0a0)', textTransform: 'uppercase' }}>
              Content SEO Checklist ({seoReport.checks.filter((c) => c.passed).length}/{seoReport.checks.length})
            </div>
            {seoReport.checks.map((chk) => {
              const icon = chk.passed ? '🟢' : chk.severity === 'error' ? '🔴' : '🟡';
              const textColor = chk.passed
                ? 'var(--text-color-kumo-default, #ededed)'
                : chk.severity === 'error'
                ? 'var(--text-color-kumo-danger, #f87171)'
                : 'var(--text-color-kumo-warning, #fbbf24)';
              return (
                <div
                  key={chk.id}
                  style={{
                    padding: '0.375rem 0.5rem',
                    borderRadius: 4,
                    background: 'var(--color-kumo-recessed, #141414)',
                    border: `1px solid ${chk.passed ? 'var(--color-kumo-line, rgba(255, 255, 255, 0.08))' : chk.severity === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.375rem',
                    fontSize: '0.75rem',
                  }}
                >
                  <span style={{ fontSize: '0.6875rem', marginTop: 1 }}>{icon}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-color-kumo-strong, #ffffff)' }}>{chk.label}</div>
                    <div style={{ color: textColor, fontSize: '0.6875rem', lineHeight: 1.3 }}>{chk.message}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recommendations */}
          {seoReport.recommendations.length > 0 && (
            <div style={{ padding: '0.5rem', borderRadius: 6, background: 'var(--color-kumo-recessed, #141414)', border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-color-kumo-subtle, #a0a0a0)', textTransform: 'uppercase' }}>
                💡 Optimization Opportunities
              </div>
              <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.6875rem', color: 'var(--text-color-kumo-default, #ededed)', lineHeight: 1.4 }}>
                {seoReport.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : activeTab === 'highlighter' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <LiveSentenceHighlighter
            content={textContent}
            showEditor={false}
            defaultViewMode="preview"
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <ImageAltAuditorWidget
            content={imageContent}
          />
        </div>
      )}

      {/* Standalone Tool Links */}
      <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))', display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem' }}>
        <a
          href="/_emdash/admin/plugins/emdash-seo/readability"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--color-kumo-brand, #f6821f)', textDecoration: 'none', fontWeight: 500 }}
        >
          Full Readability Editor ↗
        </a>
        <a
          href="/_emdash/admin/plugins/emdash-seo/alt-auditor"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--color-kumo-brand, #f6821f)', textDecoration: 'none', fontWeight: 500 }}
        >
          Full Alt Auditor ↗
        </a>
      </div>
    </div>
  );
}

export const contentEditorPanels = [
  {
    id: 'seo-readability-panel',
    title: 'SEO & Readability Suite',
    component: ContentEditorSeoPanel,
    order: 15,
  },
];

export const pages = {
  '/settings': SettingsPage,
  '/preview': SerpPreviewPage,
  '/fuzzy-redirects': FuzzyRedirectsPage,
  '/readability': ReadabilityAdminPage,
  '/alt-auditor': ImageAltAuditorAdminPage,
};

export {
  SettingsPage,
  SerpPreviewPage,
  FuzzyRedirectsPage,
  LiveSentenceHighlighter,
  ImageAltAuditorWidget,
};
export default pages;

