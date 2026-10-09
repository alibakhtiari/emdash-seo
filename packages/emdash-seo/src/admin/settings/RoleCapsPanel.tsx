import * as React from 'react';
import { apiFetch } from '../settings-page.js';
import { parseApiResponse } from 'emdash/plugin-utils';
import type { SeoManageModule } from '../../engine/auth.js';

const MODULES: Array<{ id: SeoManageModule; label: string }> = [
  { id: 'redirects', label: 'Redirects' },
  { id: 'audit', label: 'Site Audit' },
  { id: 'meta', label: 'Meta & Bulk Editor' },
  { id: 'indexnow', label: 'IndexNow' },
  { id: 'links', label: 'Link Opportunities' },
];

/**
 * Role × module capability matrix. Admins always manage everything;
 * editor toggles persist as `seo_role_caps` JSON via settings/save and are
 * enforced by requireSeoCapFor() in mutating route handlers.
 */
export function RoleCapsPanel() {
  const [caps, setCaps] = React.useState<Record<string, boolean> | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    apiFetch('settings')
      .then(async (res) => {
        const data = await parseApiResponse<{ settings: Record<string, string> }>(res);
        let parsed: Record<string, boolean> | null = null;
        try {
          const raw = data.settings?.seo_role_caps;
          if (raw) {
            const obj = JSON.parse(raw);
            if (obj?.editor && typeof obj.editor === 'object') parsed = obj.editor;
          }
        } catch {
          // Fall through to all-enabled defaults
        }
        if (!cancelled) {
          setCaps(Object.fromEntries(MODULES.map((m) => [m.id, parsed?.[m.id] ?? true])));
        }
      })
      .catch(() => {
        if (!cancelled) setCaps(Object.fromEntries(MODULES.map((m) => [m.id, true])));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    if (!caps) return;
    setSaving(true);
    setMessage(null);
    try {
      await apiFetch('settings/save', { settings: { seo_role_caps: JSON.stringify({ editor: caps }) } });
      setMessage('Role capabilities saved.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
    setSaving(false);
  };

  if (!caps) {
    return <div style={{ fontSize: '0.8125rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>Loading roles…</div>;
  }

  const cell: React.CSSProperties = { padding: '0.375rem 0.75rem', borderTop: '1px solid var(--color-kumo-line, rgba(255,255,255,0.1))', fontSize: '0.8125rem' };
  return (
    <div>
      <table style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--text-color-kumo-subtle, #a0a0a0)', fontSize: '0.75rem' }}>
            <th style={cell}>Module</th>
            <th style={cell}>Admin</th>
            <th style={cell}>Editor</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={cell}>Settings (always admin-only)</td>
            <td style={cell}><input type="checkbox" checked disabled aria-label="Admin settings always allowed" /></td>
            <td style={cell}><input type="checkbox" checked={false} disabled aria-label="Editor settings never allowed" /></td>
          </tr>
          {MODULES.map((m) => (
            <tr key={m.id}>
              <td style={cell}>{m.label}</td>
              <td style={cell}><input type="checkbox" checked disabled aria-label={`Admin ${m.label} always allowed`} /></td>
              <td style={cell}>
                <input
                  type="checkbox"
                  checked={caps[m.id] !== false}
                  onChange={(e) => setCaps((p) => (p ? { ...p, [m.id]: e.target.checked } : p))}
                  aria-label={`Editor ${m.label} allowed`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button type="button" onClick={() => void save()} disabled={saving} style={{ padding: '0.375rem 0.875rem', borderRadius: 6, background: 'var(--color-kumo-brand, #f6821f)', color: 'var(--color-kumo-contrast, #ffffff)', border: 'none', cursor: 'pointer' }}>
          {saving ? 'Saving…' : 'Save Roles'}
        </button>
        {message && <span style={{ fontSize: '0.8125rem' }}>{message}</span>}
      </div>
    </div>
  );
}
