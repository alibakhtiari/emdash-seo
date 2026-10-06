import { apiFetch as baseFetch, parseApiResponse } from 'emdash/plugin-utils';
import * as React from 'react';
import { IconCheck } from '../icons.js';

export interface CollectionItem {
  id: string;
  slug: string;
  label: string;
  fields?: Record<string, { slug: string; widget?: string; type?: string }>;
  hasSeoField?: boolean;
}

export function ContentTypesIntegrationPanel() {
  const [collections, setCollections] = React.useState<CollectionItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [processing, setProcessing] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  const fetchCollections = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await baseFetch('/_emdash/api/manifest');
      if (res.ok) {
        const manifest = await parseApiResponse<{
          collections?: Record<string, {
            id?: string;
            labelSingular?: string;
            label?: string;
            fields?: Record<string, { widget?: string; type?: string; slug?: string }>;
          }>;
        }>(res);
        if (manifest.collections) {
          const list: CollectionItem[] = Object.entries(manifest.collections).map(([slug, col]) => {
            const colFields = col.fields || {};
            const hasSeoField = Boolean(
              colFields.focus_keyword ||
              colFields.seo ||
              colFields.seo_suite ||
              Object.values(colFields).some((f) => f?.widget?.startsWith('emdash-seo:'))
            );
            return {
              id: col.id || slug,
              slug,
              label: col.labelSingular || col.label || slug,
              fields: colFields as Record<string, { slug: string; widget?: string; type?: string }>,
              hasSeoField,
            };
          });
          setCollections(list);
          setLoading(false);
          return;
        }
      }
    } catch {
      // Fallback: query schema collections directly
    }

    try {
      const res2 = await baseFetch('/_emdash/api/schema/collections');
      if (res2.ok) {
        const data = await parseApiResponse<{ items?: Array<{ id?: string; slug: string; label?: string }> }>(res2);
        const list: CollectionItem[] = (data.items || []).map((col) => ({
          id: col.id || col.slug,
          slug: col.slug,
          label: col.label || col.slug,
          hasSeoField: true,
        }));
        setCollections(list);
      }
    } catch {
      // Fallback defaults
      setCollections([
        { id: 'posts', slug: 'posts', label: 'Blog Guides', hasSeoField: true },
        { id: 'pages', slug: 'pages', label: 'Pages', hasSeoField: true },
        { id: 'services', slug: 'services', label: 'Cleaning Services', hasSeoField: true },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const enableForCollection = async (slug: string) => {
    setProcessing(slug);
    setStatusMessage(null);
    try {
      const res = await baseFetch(`/_emdash/api/schema/collections/${slug}/fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: 'focus_keyword',
          label: 'Focus Keyword',
          type: 'string',
          widget: 'emdash-seo:focus-keyword',
          searchable: true,
        }),
      });

      if (res.ok) {
        setStatusMessage(`Successfully enabled SEO & Readability Suite on ${slug}`);
        setCollections((prev) =>
          prev.map((c) => (c.slug === slug ? { ...c, hasSeoField: true } : c))
        );
      } else {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        setStatusMessage(`Notice: ${err?.message || 'Field already configured or schema up-to-date'}`);
        setCollections((prev) =>
          prev.map((c) => (c.slug === slug ? { ...c, hasSeoField: true } : c))
        );
      }
    } catch (e) {
      setStatusMessage(`Error: ${String(e)}`);
    } finally {
      setProcessing(null);
    }
  };

  const enableForAll = async () => {
    setProcessing('all');
    setStatusMessage(null);
    for (const c of collections) {
      await enableForCollection(c.slug);
    }
    setProcessing(null);
    setStatusMessage('All content types updated with SEO & Readability Suite field.');
  };

  if (loading) {
    return <div style={{ fontSize: '0.8125rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>Loading content types...</div>;
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        padding: '0.875rem',
        borderRadius: 8,
        background: 'var(--color-kumo-surface, #141414)',
        border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.12))',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-color-kumo-default, #ededed)' }}>
          Active Collections ({collections.length})
        </span>
        <button
          type="button"
          onClick={enableForAll}
          disabled={processing !== null}
          style={{
            padding: '0.375rem 0.75rem',
            borderRadius: 4,
            border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.2))',
            background: 'var(--color-kumo-control, #2a2a2a)',
            color: 'var(--text-color-kumo-strong, #ffffff)',
            fontSize: '0.75rem',
            cursor: processing ? 'wait' : 'pointer',
            fontWeight: 500,
          }}
        >
          {processing === 'all' ? 'Enabling...' : 'Enable on All Content Types'}
        </button>
      </div>

      {statusMessage && (
        <div style={{ fontSize: '0.75rem', color: '#4ade80', padding: '0.25rem 0' }}>
          {statusMessage}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {collections.map((c) => (
          <div
            key={c.slug}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.5rem 0.75rem',
              borderRadius: 6,
              background: 'var(--color-kumo-control, #1a1a1a)',
              border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.08))',
            }}
          >
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-color-kumo-strong, #ffffff)' }}>
                {c.label}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>
                Collection: <code>{c.slug}</code>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {c.hasSeoField ? (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.6875rem',
                    color: '#4ade80',
                    background: 'rgba(34, 197, 94, 0.12)',
                    padding: '0.2rem 0.5rem',
                    borderRadius: 4,
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                  }}
                >
                  <IconCheck size={11} color="#4ade80" />
                  <span>Live Suite Active</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => enableForCollection(c.slug)}
                  disabled={processing === c.slug}
                  style={{
                    padding: '0.25rem 0.625rem',
                    borderRadius: 4,
                    border: 'none',
                    background: 'var(--color-kumo-brand, #f6821f)',
                    color: '#ffffff',
                    fontSize: '0.6875rem',
                    cursor: processing === c.slug ? 'wait' : 'pointer',
                    fontWeight: 500,
                  }}
                >
                  {processing === c.slug ? 'Enabling...' : '+ Add SEO Suite'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
