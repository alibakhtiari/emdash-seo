import { apiFetch as baseFetch, parseApiResponse } from 'emdash/plugin-utils';
import * as React from 'react';

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

export function BreadcrumbLabelsEditor({
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

export function BreadcrumbRulesEditor({
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

export function SettingsPage() {
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
