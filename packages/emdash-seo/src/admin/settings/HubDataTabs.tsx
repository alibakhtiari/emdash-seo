import { apiFetch as baseFetch } from 'emdash/plugin-utils';
import * as React from 'react';
import type { AuditSnapshot } from '../../types.js';

interface LinksResult {
  id: string;
  total: number;
  opportunities: Array<{ targetId?: string; matchedKeyword?: string; snippet?: string }>;
}

const subtle: React.CSSProperties = { fontSize: '0.8125rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)' };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' };
const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '0.375rem 0.5rem', fontWeight: 600,
  color: 'var(--text-color-kumo-subtle, #a0a0a0)',
  borderBottom: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.12))',
};
const tdStyle: React.CSSProperties = {
  padding: '0.375rem 0.5rem', borderBottom: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.06))',
  color: 'var(--text-color-kumo-default, #ededed)', verticalAlign: 'top',
};

async function callSeoApi(path: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const res = await baseFetch(path, {
    method: init?.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: init?.body,
  });
  return res.json();
}

export function AuditTab() {
  const [audit, setAudit] = React.useState<AuditSnapshot | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = async (run: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const data = await callSeoApi(
        '/_emdash/api/seo/v1/audit/' + (run ? 'run' : 'latest'),
        run ? { method: 'POST', body: JSON.stringify({}) } : undefined
      );
      setAudit((data.audit as AuditSnapshot | null) ?? null);
      if (!data.audit && typeof data.message === 'string') setError(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setLoading(false);
  };

  React.useEffect(() => {
    load(false);
  }, []);

  return (
    <div style={{ maxWidth: 840 }}>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button type="button" onClick={() => load(true)} disabled={loading} style={btnStyle}>
          {loading ? 'Running...' : 'Run Site Audit'}
        </button>
        <button type="button" onClick={() => load(false)} disabled={loading} style={btnGhostStyle}>
          Refresh Latest
        </button>
      </div>
      {error && <div style={{ ...subtle, color: 'var(--text-color-kumo-danger, #f87171)', marginBottom: '0.75rem' }}>{error}</div>}
      {!audit && !error && !loading && <div style={subtle}>No audit snapshot yet. Run a site audit to populate this report.</div>}
      {audit && (
        <div>
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
            <span>Health: <strong>{audit.healthScore}</strong></span>
            <span>Pages: <strong>{audit.totalPages}</strong></span>
            <span>Critical: <strong>{audit.issuesCritical}</strong></span>
            <span>Warnings: <strong>{audit.issuesWarning}</strong></span>
          </div>
          <table style={tableStyle}>
            <thead>
              <tr><th style={thStyle}>URL</th><th style={thStyle}>Score</th><th style={thStyle}>Issues</th></tr>
            </thead>
            <tbody>
              {(audit.report || []).map((row, i) => (
                <tr key={row.url || i}>
                  <td style={tdStyle}><div style={{ fontWeight: 600 }}>{row.title}</div><div style={subtle}>{row.url}</div></td>
                  <td style={tdStyle}>{row.score}</td>
                  <td style={tdStyle}>{(row.issues || []).slice(0, 3).join('; ') || 'None'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function LinksTab() {
  const [entryId, setEntryId] = React.useState('');
  const [result, setResult] = React.useState<LinksResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const lookup = async () => {
    if (!entryId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await callSeoApi(
        `/_emdash/api/seo/v1/links/opportunities/${encodeURIComponent(entryId.trim())}`
      );
      if (typeof data.error === 'string') {
        setError(data.error);
      } else {
        setResult({
          id: String(data.id ?? entryId.trim()),
          total: typeof data.total === 'number' ? data.total : 0,
          opportunities: Array.isArray(data.opportunities) ? data.opportunities : [],
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 840 }}>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          type="text" value={entryId} onChange={(e) => setEntryId(e.target.value)}
          placeholder="Entry ID (e.g. post-1)" style={inputStyle}
        />
        <button type="button" onClick={lookup} disabled={loading} style={btnStyle}>
          {loading ? 'Searching...' : 'Find Links'}
        </button>
      </div>
      {error && <div style={{ ...subtle, color: 'var(--text-color-kumo-danger, #f87171)' }}>{error}</div>}
      {result && (
        <div>
          <div style={{ ...subtle, marginBottom: '0.5rem' }}>{result.total} opportunit{(result.total === 1 ? 'y' : 'ies')} for {result.id}</div>
          <table style={tableStyle}>
            <thead>
              <tr><th style={thStyle}>Target</th><th style={thStyle}>Keyword</th><th style={thStyle}>Snippet</th></tr>
            </thead>
            <tbody>
              {(result.opportunities || []).map((o, i) => (
                <tr key={o.targetId || i}>
                  <td style={tdStyle}>{o.targetId}</td>
                  <td style={tdStyle}>{o.matchedKeyword}</td>
                  <td style={tdStyle}>{o.snippet}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function BulkMetaTab() {
  const [rows, setRows] = React.useState<Array<{ collection: string; id: string; metaTitle: string; metaDescription: string; noIndex: boolean }>>([
    { collection: 'posts', id: '', metaTitle: '', metaDescription: '', noIndex: false },
  ]);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const update = (idx: number, patch: Partial<{ collection: string; id: string; metaTitle: string; metaDescription: string; noIndex: boolean }>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const saveAll = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const entries = rows
        .filter((r) => r.id.trim())
        .slice(0, 100)
        .map((r) => ({
          collection: r.collection.trim() || 'posts',
          id: r.id.trim(),
          metaTitle: r.metaTitle || undefined,
          metaDescription: r.metaDescription || undefined,
          noIndex: r.noIndex,
        }));
      if (entries.length === 0) {
        setError('Add at least one entry ID to save.');
        setSaving(false);
        return;
      }
      const data = await callSeoApi('/_emdash/api/seo/v1/meta', {
        method: 'PATCH',
        body: JSON.stringify({ entries }),
      });
      if (typeof data.error === 'string') {
        setError(data.error);
      } else {
        const results = Array.isArray(data.results) ? data.results : [];
        const failed = results.filter((r: { success?: boolean }) => !r.success).length;
        setMessage(failed === 0 ? `Saved ${results.length} entr${results.length === 1 ? 'y' : 'ies'}.` : `Saved with ${failed} failure(s).`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setSaving(false);
  };

  return (
    <div style={{ maxWidth: 840 }}>
      <div style={{ ...subtle, marginBottom: '0.75rem' }}>Edit titles, descriptions, and noindex flags across entries, then save all at once (max 100).</div>
      <table style={tableStyle}>
        <thead>
          <tr><th style={thStyle}>Collection</th><th style={thStyle}>ID</th><th style={thStyle}>Meta Title</th><th style={thStyle}>Meta Description</th><th style={thStyle}>Noindex</th><th style={thStyle}></th></tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td style={tdStyle}><input type="text" value={row.collection} onChange={(e) => update(i, { collection: e.target.value })} style={{ ...inputStyle, minWidth: 80 }} /></td>
              <td style={tdStyle}><input type="text" value={row.id} onChange={(e) => update(i, { id: e.target.value })} placeholder="post-1" style={{ ...inputStyle, minWidth: 80 }} /></td>
              <td style={tdStyle}><input type="text" value={row.metaTitle} onChange={(e) => update(i, { metaTitle: e.target.value })} style={{ ...inputStyle, minWidth: 120 }} /></td>
              <td style={tdStyle}><input type="text" value={row.metaDescription} onChange={(e) => update(i, { metaDescription: e.target.value })} style={{ ...inputStyle, minWidth: 140 }} /></td>
              <td style={tdStyle}><input type="checkbox" checked={row.noIndex} onChange={(e) => update(i, { noIndex: e.target.checked })} /></td>
              <td style={tdStyle}><button type="button" onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))} style={btnGhostStyle}>Remove</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
        <button type="button" onClick={() => setRows((prev) => [...prev, { collection: 'posts', id: '', metaTitle: '', metaDescription: '', noIndex: false }])} style={btnGhostStyle}>Add Row</button>
        <button type="button" onClick={saveAll} disabled={saving} style={btnStyle}>{saving ? 'Saving...' : 'Save All'}</button>
      </div>
      {message && <div style={{ ...subtle, marginTop: '0.5rem' }}>{message}</div>}
      {error && <div style={{ ...subtle, color: 'var(--text-color-kumo-danger, #f87171)', marginTop: '0.5rem' }}>{error}</div>}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '0.375rem 0.875rem', borderRadius: 6, background: 'var(--color-kumo-brand, #f6821f)',
  color: 'var(--color-kumo-contrast, #ffffff)', border: 'none', cursor: 'pointer',
  fontWeight: 600, fontSize: '0.8125rem',
};

const btnGhostStyle: React.CSSProperties = {
  padding: '0.375rem 0.875rem', borderRadius: 6, background: 'transparent',
  color: 'var(--text-color-kumo-default, #ededed)',
  border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.2))',
  cursor: 'pointer', fontSize: '0.8125rem',
};

const inputStyle: React.CSSProperties = {
  flex: 1, padding: '0.375rem 0.625rem', borderRadius: 6,
  border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))',
  background: 'var(--color-kumo-control, #1a1a1a)',
  color: 'var(--text-color-kumo-default, #ededed)', fontSize: '0.8125rem',
};
