import type { AuditSnapshot, RedirectRule } from '../../types.js';
import type { NotFoundEntry } from './types.js';

export let latestV1AuditSnapshot: AuditSnapshot | null = null;

export function setLatestV1AuditSnapshot(snapshot: AuditSnapshot | null): void {
  latestV1AuditSnapshot = snapshot;
}

export interface AuditHistoryPoint {
  at: string;
  healthScore: number;
  totalPages: number;
  critical: number;
  warning: number;
}

export const AUDIT_HISTORY_KV_KEY = 'seo:audit:history';
const AUDIT_HISTORY_MAX = 30;

let auditHistory: AuditHistoryPoint[] = [];

function toHistoryPoint(snapshot: AuditSnapshot): AuditHistoryPoint {
  return {
    at: snapshot.completedAt || snapshot.startedAt || new Date().toISOString(),
    healthScore: snapshot.healthScore,
    totalPages: snapshot.totalPages,
    critical: snapshot.issuesCritical,
    warning: snapshot.issuesWarning,
  };
}

/** Append a snapshot to the capped history (memory + KV, best-effort). */
export async function appendAuditHistory(ctx: any, snapshot: AuditSnapshot): Promise<void> {
  const point = toHistoryPoint(snapshot);
  auditHistory.push(point);
  if (auditHistory.length > AUDIT_HISTORY_MAX) auditHistory = auditHistory.slice(-AUDIT_HISTORY_MAX);
  try {
    await ctx?.kv?.set?.(AUDIT_HISTORY_KV_KEY, auditHistory);
  } catch {
    // Memory fallback already updated
  }
}

/** Load history newest-last (memory first, KV fallback). */
export async function getAuditHistory(ctx: any): Promise<AuditHistoryPoint[]> {
  if (auditHistory.length > 0) return [...auditHistory];
  try {
    const raw = await ctx?.kv?.get?.(AUDIT_HISTORY_KV_KEY);
    const items = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(items)) {
      auditHistory = items.slice(-AUDIT_HISTORY_MAX);
      return [...auditHistory];
    }
  } catch {
    // Fall through empty
  }
  return [];
}

export let v1RedirectRules: RedirectRule[] = [];

export let v1NotFoundLogs: NotFoundEntry[] = [];

export function resetApiV1State(): void {
  latestV1AuditSnapshot = null;
  auditHistory = [];
  v1RedirectRules = [];
  v1NotFoundLogs = [];
}

export const MAX_404_ENTRIES = 1000;

export const V1_REDIRECTS_KV_KEY = 'seo:v1:redirects';
export const V1_404S_KV_KEY = 'seo:v1:404s';

type KvLike = {
  get(key: string): Promise<any>;
  set(key: string, val: any): Promise<any>;
};

function readKv(ctx: any): KvLike | null {
  const kv = ctx?.kv;
  if (kv && typeof kv.get === 'function' && typeof kv.set === 'function') return kv as KvLike;
  return null;
}

async function loadArrayKey(ctx: any, key: string): Promise<any[] | null> {
  const kv = readKv(ctx);
  if (!kv) return null;
  try {
    const raw = await kv.get(key);
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Fall through to memory fallback
  }
  return null;
}

async function saveArrayKey(ctx: any, key: string, value: any[]): Promise<void> {
  const kv = readKv(ctx);
  if (!kv) return;
  try {
    await kv.set(key, value);
  } catch {
    // Memory fallback already holds the data
  }
}

// The EmDash host exposes ctx.redirects (RedirectAccess): list() returns
// PaginatedResult {items}, never a bare array. Prefer it as source of truth;
// KV snapshot second; module memory last (dev/test fallback).
function hostRedirectAccess(ctx: any): any | null {
  const r = ctx?.redirects;
  return r && typeof r.list === 'function' ? r : null;
}

// Map a host RedirectInfo row onto the plugin RedirectRule shape.
// Extra host fields (_rev for conditional writes, hits, group) ride along.
export function fromHostRedirect(info: any): RedirectRule {
  const comparison = info?.isPattern ? 'regex' : 'exact';
  return {
    id: String(info?.id ?? ''),
    pattern: info?.source ?? '',
    from: info?.source ?? '',
    destination: info?.destination ?? '',
    to: info?.destination ?? '',
    comparison,
    matchType: comparison,
    statusCode: Number(info?.type ?? 301),
    status: info?.enabled === false ? 'inactive' : 'active',
    hitCount: typeof info?.hits === 'number' ? info.hits : undefined,
    ...(info?.groupName ? { groupName: info.groupName } : {}),
    ...(info?.auto ? { auto: true } : {}),
  } as RedirectRule;
}

export function toHostCreateInput(rule: RedirectRule): Record<string, any> {
  return {
    source: rule.pattern || (rule as any).from,
    destination: rule.destination ?? (rule as any).to,
    type: Number(rule.statusCode ?? 301),
    enabled: (rule.status || 'active') !== 'inactive',
  };
}

// Load persisted redirect rules into the module store when KV is available.
// Falls back to the in-memory array (and ctx.redirects when provided).
export async function loadRedirectRules(ctx?: any): Promise<RedirectRule[]> {
  if (Array.isArray(ctx?.redirects)) return ctx.redirects;
  const host = hostRedirectAccess(ctx);
  if (host) {
    try {
      const collected: RedirectRule[] = [];
      let cursor: string | undefined;
      for (let page = 0; page < 5; page++) {
        const res = await host.list({ limit: 100, ...(cursor ? { cursor } : {}) });
        const items = Array.isArray(res) ? res : res?.items;
        if (!Array.isArray(items) || items.length === 0) break;
        for (const info of items) collected.push(fromHostRedirect(info));
        cursor = (res as any)?.cursor;
        if (!(res as any)?.hasMore || !cursor) break;
      }
      return collected;
    } catch {
      // Fall through to KV/memory
    }
  }
  const persisted = await loadArrayKey(ctx, V1_REDIRECTS_KV_KEY);
  if (persisted) {
    v1RedirectRules = persisted as RedirectRule[];
    return v1RedirectRules;
  }
  return v1RedirectRules;
}

// Persist the module store to KV when available. Memory always holds the data.
export async function persistRedirectRules(ctx?: any): Promise<void> {
  await saveArrayKey(ctx, V1_REDIRECTS_KV_KEY, v1RedirectRules);
}

// Load persisted 404 logs into the module store when KV is available.
export async function load404Logs(ctx?: any): Promise<NotFoundEntry[]> {
  if (Array.isArray(ctx?.notFoundLog)) return ctx.notFoundLog;
  const persisted = await loadArrayKey(ctx, V1_404S_KV_KEY);
  if (persisted) {
    v1NotFoundLogs = persisted as NotFoundEntry[];
    return v1NotFoundLogs;
  }
  if (ctx?.redirects?.get404s) {
    try {
      const dbLogs = await ctx.redirects.get404s();
      if (Array.isArray(dbLogs)) return dbLogs;
    } catch {
      // Fall through to memory fallback
    }
  }
  return v1NotFoundLogs;
}

// Persist the module 404 store to KV when available.
export async function persist404Logs(ctx?: any): Promise<void> {
  await saveArrayKey(ctx, V1_404S_KV_KEY, v1NotFoundLogs);
}

// Bump the hit counter for the rule that served a redirect.
export function recordRedirectHit(rule: RedirectRule | null | undefined): void {
  if (!rule) return;
  const entry = rule as RedirectRule & { hitCount?: number };
  entry.hitCount = typeof entry.hitCount === 'number' ? entry.hitCount + 1 : 1;
}

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

// Record a 404 hit and persist to KV when available. Never throws.
export async function record404HitPersistent(
  ctx: any,
  path: string,
  referrer: string | null = null
): Promise<void> {
  record404Hit(path, referrer);
  try {
    await persist404Logs(ctx);
  } catch {
    // Memory fallback already updated
  }
}

// Record a redirect hit on the matched rule and persist to KV when available.
export async function recordRedirectHitPersistent(ctx: any, rule: RedirectRule | null | undefined): Promise<void> {
  recordRedirectHit(rule);
  try {
    await persistRedirectRules(ctx);
  } catch {
    // Memory fallback already updated
  }
}

export function prune404Logs(retentionDays = 30): number {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  const initialCount = v1NotFoundLogs.length;
  v1NotFoundLogs = v1NotFoundLogs.filter((entry) => entry.lastSeen >= cutoff);
  return initialCount - v1NotFoundLogs.length;
}
