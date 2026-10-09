import { apiFetch as baseFetch, parseApiResponse } from 'emdash/plugin-utils';
import * as React from 'react';
import { rankCandidates, type RankedMatch } from './engine/fuzzy-matcher.js';

const CORE_API = '/_emdash/api';

interface NotFoundSummary {
  path: string;
  count: number;
  lastSeen: string;
  topReferrer: string | null;
}

interface SchemaMapEntry {
  url: string;
  collection: string;
  updatedAt: string;
}

interface Suggestion {
  entry: NotFoundSummary;
  matches: RankedMatch[];
  chosen: string;
  created: boolean;
  error: string | null;
  saving: boolean;
}

async function fetchNotFoundSummary(): Promise<NotFoundSummary[]> {
  try {
    const res = await baseFetch(`${CORE_API}/redirects/404s/summary?limit=100`, {
      method: 'GET',
    });
    const data = await parseApiResponse<{ items: NotFoundSummary[] }>(res);
    return data.items ?? [];
  } catch {
    return [];
  }
}

async function fetchSchemaMap(): Promise<SchemaMapEntry[]> {
  // Try both plugin route and public /schemamap.xml / api endpoint
  try {
    const res = await baseFetch(`${CORE_API}/seo/schema-map`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await parseApiResponse<{ items: SchemaMapEntry[] }>(res);
      if (data?.items) return data.items;
    }
  } catch {
    // Fallback below
  }

  try {
    const res = await baseFetch(`${CORE_API}/plugins/emdash-seo/schema/map`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const data = await parseApiResponse<{ items: SchemaMapEntry[] }>(res);
    return data.items ?? [];
  } catch {
    return [];
  }
}

async function createRedirect(source: string, destination: string): Promise<void> {
  const res = await baseFetch(`${CORE_API}/redirects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source,
      destination,
      type: 301,
      enabled: true,
      groupName: 'seo-fuzzy-suggester',
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Redirect create failed (${res.status}): ${text}`);
  }
}

const V1_REDIRECTS = '/_emdash/api/seo/v1/redirects';

interface RedirectRow {
  id?: string;
  pattern?: string;
  from?: string;
  destination?: string;
  to?: string;
  comparison?: string;
  matchType?: string;
  statusCode?: number;
  status?: string;
}

async function fetchRedirectRules(): Promise<RedirectRow[]> {
  const res = await baseFetch(`${V1_REDIRECTS}?page=1&limit=100`, { method: 'GET' });
  const data = await parseApiResponse<{ items: RedirectRow[] }>(res);
  return data.items ?? [];
}

async function createRedirectRule(input: { pattern: string; destination: string; statusCode: number; comparison: string }): Promise<void> {
  const res = await baseFetch(V1_REDIRECTS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Create failed (${res.status}): ${await res.text()}`);
}

async function updateRedirectRule(id: string, patch: Partial<RedirectRow>): Promise<void> {
  const res = await baseFetch(V1_REDIRECTS, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...patch }),
  });
  if (!res.ok) throw new Error(`Update failed (${res.status}): ${await res.text()}`);
}

async function deleteRedirectRule(id: string): Promise<void> {
  const res = await baseFetch(`${V1_REDIRECTS}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Delete failed (${res.status}): ${await res.text()}`);
}

export function RedirectsAdminPage() {
  const [rules, setRules] = React.useState<RedirectRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [pattern, setPattern] = React.useState('');
  const [destination, setDestination] = React.useState('');
  const [isRegex, setIsRegex] = React.useState(false);
  const [statusCode, setStatusCode] = React.useState(301);
  const [editing, setEditing] = React.useState<Record<string, string>>({});

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRules(await fetchRedirectRules());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    if (!pattern.trim() || !destination.trim()) return;
    setError(null);
    try {
      await createRedirectRule({
        pattern: pattern.trim(),
        destination: destination.trim(),
        statusCode,
        comparison: isRegex ? 'regex' : 'exact',
      });
      setPattern(''); setDestination(''); setIsRegex(false); setStatusCode(301);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSave = async (row: RedirectRow) => {
    if (!row.id) return;
    setError(null);
    try {
      const patch: Partial<RedirectRow> = {};
      if (editing[row.id] !== undefined) patch.destination = editing[row.id];
      await updateRedirectRule(row.id, patch);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDelete = async (row: RedirectRow) => {
    if (!row.id) return;
    setError(null);
    try {
      await deleteRedirectRule(row.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div style={{ maxWidth: 820, padding: '1.5rem 0', color: 'var(--text-color-kumo-default, #ededed)' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-color-kumo-strong, #ffffff)' }}>
        Redirects
      </h2>
      {error && (
        <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', borderRadius: 6, marginBottom: '1rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input type="text" value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="/old-path or ^/old-(.*)" style={{ ...inputStyle, flex: 2, minWidth: 180 }} />
        <input type="text" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="/new-path or /new-$1" style={{ ...inputStyle, flex: 2, minWidth: 180 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem' }}>
          <input type="checkbox" checked={isRegex} onChange={(e) => setIsRegex(e.target.checked)} /> regex
        </label>
        <select value={statusCode} onChange={(e) => setStatusCode(Number(e.target.value))} style={inputStyle} aria-label="Status code">
          {[301, 302, 307, 308, 410].map((s) => (<option key={s} value={s}>{s}</option>))}
        </select>
        <button onClick={() => void handleCreate()} style={primaryButtonStyle}>Add redirect</button>
      </div>
      {loading ? (
        <div style={{ fontSize: '0.875rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>Loading…</div>
      ) : rules.length === 0 ? (
        <div style={{ fontSize: '0.875rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>No redirects yet.</div>
      ) : (
        <table style={{ width: '100%', fontSize: '0.8125rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>
              <th>Pattern</th>
              <th>Destination</th>
              <th>Status</th>
              <th>Match</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rules.map((row) => {
              const pat = row.pattern || row.from || '';
              const dest = row.destination || row.to || '';
              const match = row.comparison || row.matchType || 'exact';
              return (
                <tr key={row.id || pat} style={{ borderTop: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))' }}>
                  <td><span style={codeStyle}>{pat}</span></td>
                  <td>
                    <input
                      type="text"
                      value={editing[row.id || ''] ?? dest}
                      onChange={(e) => row.id && setEditing((p) => ({ ...p, [row.id as string]: e.target.value }))}
                      style={{ ...inputStyle, minWidth: 160 }}
                    />
                  </td>
                  <td>{row.statusCode || 301} · {row.status || 'active'}</td>
                  <td>{match === 'regex' ? 'regex' : match}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button onClick={() => void handleSave(row)} style={{ ...primaryButtonStyle, marginRight: 6 }}>Save</button>
                    <button
                      onClick={() => void handleDelete(row)}
                      style={{ padding: '0.375rem 0.75rem', borderRadius: 6, background: 'transparent', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)', cursor: 'pointer', fontSize: '0.8125rem' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function urlToPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

const rowStyle: React.CSSProperties = {
  border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))',
  borderRadius: 8,
  padding: '1rem',
  marginBottom: '0.75rem',
  background: 'var(--color-kumo-recessed, #141414)',
  color: 'var(--text-color-kumo-default, #ededed)',
};

const codeStyle: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '0.8125rem',
  background: 'var(--color-kumo-control, #1a1a1a)',
  color: 'var(--text-color-kumo-strong, #ffffff)',
  border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))',
  padding: '2px 6px',
  borderRadius: 4,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.375rem 0.5rem',
  borderRadius: 6,
  border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))',
  background: 'var(--color-kumo-control, #1a1a1a)',
  color: 'var(--text-color-kumo-default, #ededed)',
  fontSize: '0.8125rem',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  boxSizing: 'border-box',
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '0.375rem 0.875rem',
  borderRadius: 6,
  background: 'var(--color-kumo-brand, #f6821f)',
  color: 'var(--color-kumo-contrast, #ffffff)',
  border: 'none',
  cursor: 'pointer',
  fontSize: '0.8125rem',
  fontWeight: 600,
};

export function FuzzyRedirectsPage() {
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([]);
  const [minScore, setMinScore] = React.useState(0.5);

  const load = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [log, map] = await Promise.all([fetchNotFoundSummary(), fetchSchemaMap()]);
      const candidatePaths = map.map((m) => urlToPath(m.url));
      const next: Suggestion[] = log.map((entry) => {
        const matches = rankCandidates(entry.path, candidatePaths, { limit: 3, minScore });
        return {
          entry,
          matches,
          chosen: matches[0]?.candidate ?? '',
          created: false,
          error: null,
          saving: false,
        };
      });
      setSuggestions(next);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [minScore]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const updateRow = (index: number, patch: Partial<Suggestion>) => {
    setSuggestions((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const handleCreate = async (index: number) => {
    const row = suggestions[index];
    if (!row || !row.chosen) return;
    updateRow(index, { saving: true, error: null });
    try {
      await createRedirect(row.entry.path, row.chosen);
      updateRow(index, { saving: false, created: true });
    } catch (err) {
      updateRow(index, {
        saving: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const visible = suggestions.filter((s) => !s.created);

  return (
    <div style={{ maxWidth: 820, padding: '1.5rem 0', color: 'var(--text-color-kumo-default, #ededed)' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-color-kumo-strong, #ffffff)' }}>
        Fuzzy Redirects
      </h1>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)', marginBottom: '1.5rem' }}>
        Reviews 404 error logs, pairs missing URLs with closest matching published pages, and lets
        you one-click create 301 redirects to preserve SEO equity.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: '1rem' }}>
        <label style={{ fontSize: '0.8125rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>
          Minimum match score: <strong style={{ color: 'var(--text-color-kumo-strong, #ffffff)' }}>{minScore.toFixed(2)}</strong>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={minScore}
            onChange={(e) => setMinScore(parseFloat(e.target.value))}
            style={{ marginLeft: 8, verticalAlign: 'middle' }}
          />
        </label>
        <button
          onClick={() => void load()}
          disabled={loading}
          style={{
            padding: '0.375rem 0.75rem',
            borderRadius: 6,
            background: 'var(--color-kumo-control, #1a1a1a)',
            color: 'var(--text-color-kumo-default, #ededed)',
            border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))',
            cursor: loading ? 'wait' : 'pointer',
            fontSize: '0.8125rem',
          }}
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {loadError && (
        <div style={{ padding: '0.75rem', background: 'var(--color-kumo-danger-tint, rgba(239, 68, 68, 0.15))', color: 'var(--text-color-kumo-danger, #f87171)', border: '1px solid var(--color-kumo-danger-tint, rgba(239, 68, 68, 0.3))', borderRadius: 6, marginBottom: '1rem', fontSize: '0.875rem' }}>
          Failed to load: {loadError}
        </div>
      )}

      {!loading && !loadError && suggestions.length === 0 && (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-color-kumo-subtle, #a0a0a0)', background: 'var(--color-kumo-recessed, #141414)', borderRadius: 6, border: '1px dashed var(--color-kumo-line, rgba(255, 255, 255, 0.15))', fontSize: '0.875rem' }}>
          No 404s logged yet.
        </div>
      )}

      {!loading && !loadError && suggestions.length > 0 && visible.length === 0 && (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-color-kumo-success, #4ade80)', background: 'var(--color-kumo-success-tint, rgba(34, 197, 94, 0.12))', borderRadius: 6, border: '1px solid var(--color-kumo-success-tint, rgba(34, 197, 94, 0.3))', fontSize: '0.875rem' }}>
          All suggestions resolved — no remaining 404s to redirect.
        </div>
      )}

      {visible.map((row) => {
        const index = suggestions.indexOf(row);
        return (
          <div key={row.entry.path} style={rowStyle}>
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={codeStyle}>{row.entry.path}</span>
              <span style={{ marginLeft: 12, fontSize: '0.75rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>
                {row.entry.count} hit{row.entry.count === 1 ? '' : 's'}
                {row.entry.topReferrer ? ` · from ${row.entry.topReferrer}` : ''}
              </span>
            </div>

            {row.matches.length === 0 ? (
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-color-kumo-placeholder, #666)', fontStyle: 'italic' }}>
                No matches above threshold. Enter a destination manually if known.
              </div>
            ) : (
              <div style={{ marginBottom: '0.5rem' }}>
                {row.matches.map((m) => (
                  <label
                    key={m.candidate}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: '0.8125rem' }}
                  >
                    <input
                      type="radio"
                      name={`dest-${index}`}
                      checked={row.chosen === m.candidate}
                      onChange={() => updateRow(index, { chosen: m.candidate })}
                    />
                    <span style={codeStyle}>{m.candidate}</span>
                    <span style={{ color: 'var(--text-color-kumo-subtle, #a0a0a0)', fontSize: '0.75rem' }}>
                      score {m.score.toFixed(2)}
                    </span>
                  </label>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: '0.5rem' }}>
              <input
                type="text"
                value={row.chosen}
                onChange={(e) => updateRow(index, { chosen: e.target.value })}
                placeholder="/destination/path"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={() => void handleCreate(index)}
                disabled={row.saving || !row.chosen}
                style={{ ...primaryButtonStyle, cursor: row.saving ? 'wait' : row.chosen ? 'pointer' : 'not-allowed', opacity: row.chosen ? 1 : 0.5 }}
              >
                {row.saving ? 'Creating…' : 'Create redirect'}
              </button>
            </div>

            {row.error && (
              <div style={{ marginTop: 6, fontSize: '0.75rem', color: '#dc2626' }}>
                {row.error}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
