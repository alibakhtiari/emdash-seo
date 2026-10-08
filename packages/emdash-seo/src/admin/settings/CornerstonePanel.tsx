import * as React from 'react';
import { IconStar } from '../icons.js';

interface CornerstoneEntry {
  id: string;
  title: string;
  slug: string;
}

/**
 * Lists cornerstone (pillar) entries via the host content API when available,
 * otherwise renders a placeholder count so the dashboard slot stays useful.
 */
export function CornerstonePanel({ fallbackCount }: { fallbackCount?: string }) {
  const [entries, setEntries] = React.useState<CornerstoneEntry[] | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const host = window as unknown as {
          emdash?: {
            content?: {
              list(col: string, opts?: Record<string, unknown>): Promise<{
                items?: Array<{
                  id?: unknown;
                  title?: unknown;
                  slug?: unknown;
                  data?: { title?: unknown; slug?: unknown; cornerstone?: unknown; seo?: { cornerstone?: unknown } };
                }>;
              }>;
            };
          };
        };
        const contentApi = host?.emdash?.content;
        if (!contentApi?.list) return;
        const found: CornerstoneEntry[] = [];
        for (const col of ['posts', 'services', 'pages']) {
          try {
            const res = await contentApi.list(col, { limit: 100, where: { status: 'published' } });
            for (const item of res?.items || []) {
              if (item?.data?.cornerstone || item?.data?.seo?.cornerstone) {
                found.push({
                  id: String(item.id),
                  title: String(item.title || item.data?.title || item.id),
                  slug: String(item.slug || item.data?.slug || ''),
                });
              }
            }
          } catch {
            // Ignore per-collection errors
          }
        }
        if (!cancelled) setEntries(found);
      } catch {
        // Host content API unavailable; keep placeholder
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (entries === null) {
    return (
      <div style={{ fontSize: '0.8125rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>
        Cornerstone tracking is enabled{fallbackCount ? ` — ${fallbackCount} pillar entries` : ''}.{' '}
        <a href="/_emdash/admin/content/posts" style={{ color: 'var(--color-kumo-brand, #f6821f)', textDecoration: 'none', fontWeight: 500 }}>
          View cornerstone content
        </a>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div style={{ fontSize: '0.8125rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>
        No cornerstone entries yet. Flag pillar posts in the editor to list them here.
      </div>
    );
  }

  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      {entries.map((e) => (
        <li
          key={e.id}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem',
            padding: '0.375rem 0.625rem', borderRadius: 6,
            background: 'var(--color-kumo-recessed, #141414)',
            border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))',
          }}
        >
          <IconStar size={12} color="#facc15" />
          <span style={{ fontWeight: 600, color: 'var(--text-color-kumo-strong, #ffffff)' }}>{e.title}</span>
          <span style={{ color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>/{e.slug}</span>
        </li>
      ))}
    </ul>
  );
}
