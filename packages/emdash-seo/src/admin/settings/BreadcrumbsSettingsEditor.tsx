import * as React from 'react';

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
