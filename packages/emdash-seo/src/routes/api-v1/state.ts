import type { AuditSnapshot, RedirectRule } from '../../types.js';
import type { NotFoundEntry } from './types.js';

export let latestV1AuditSnapshot: AuditSnapshot | null = null;

export function setLatestV1AuditSnapshot(snapshot: AuditSnapshot | null): void {
  latestV1AuditSnapshot = snapshot;
}

export let v1RedirectRules: RedirectRule[] = [
  {
    id: 'redir-default-1',
    pattern: '/legacy-carpet-care',
    from: '/legacy-carpet-care',
    destination: '/services/carpet-cleaning',
    to: '/services/carpet-cleaning',
    comparison: 'exact',
    matchType: 'exact',
    statusCode: 301,
    status: 'active',
  },
];

export let v1NotFoundLogs: NotFoundEntry[] = [
  {
    path: '/old-price-list',
    count: 42,
    lastSeen: new Date().toISOString(),
    topReferrer: 'https://www.google.com/',
  },
  {
    path: '/services/steam-dry-clean',
    count: 24,
    lastSeen: new Date().toISOString(),
    topReferrer: 'https://bing.com/',
  },
  {
    path: '/contact-us-2024',
    count: 8,
    lastSeen: new Date().toISOString(),
    topReferrer: null,
  },
];

export function resetApiV1State(): void {
  latestV1AuditSnapshot = null;
  v1RedirectRules = [
    {
      id: 'redir-default-1',
      pattern: '/legacy-carpet-care',
      from: '/legacy-carpet-care',
      destination: '/services/carpet-cleaning',
      to: '/services/carpet-cleaning',
      comparison: 'exact',
      matchType: 'exact',
      statusCode: 301,
      status: 'active',
    },
  ];
  v1NotFoundLogs = [
    {
      path: '/old-price-list',
      count: 42,
      lastSeen: new Date().toISOString(),
      topReferrer: 'https://www.google.com/',
    },
  ];
}

export const MAX_404_ENTRIES = 1000;

export function record404Hit(path: string, referrer: string | null = null): void {
  const normPath = path.startsWith('/') ? path : `/${path}`;
  const existing = v1NotFoundLogs.find((entry) => entry.path === normPath);
  if (existing) {
    existing.count += 1;
    existing.lastSeen = new Date().toISOString();
    if (referrer && !existing.topReferrer) {
      existing.topReferrer = referrer;
    }
  } else {
    v1NotFoundLogs.push({
      path: normPath,
      count: 1,
      lastSeen: new Date().toISOString(),
      topReferrer: referrer,
    });
    if (v1NotFoundLogs.length > MAX_404_ENTRIES) {
      v1NotFoundLogs.sort((a, b) => b.count - a.count);
      v1NotFoundLogs.length = MAX_404_ENTRIES;
    }
  }
}

export function prune404Logs(retentionDays = 30): number {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  const initialCount = v1NotFoundLogs.length;
  v1NotFoundLogs = v1NotFoundLogs.filter((entry) => entry.lastSeen >= cutoff);
  return initialCount - v1NotFoundLogs.length;
}
