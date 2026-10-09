import type { SeoPluginOptions } from '../types.js';
import { renderSitemap, renderSitemapIndex, renderSitemapCollection, renderSitemapXsl } from './sitemap.js';
import { renderRobotsAsync } from './robots.js';
import { renderLlmsTxtAsync, renderLlmsFullTxtAsync, generateLlmsTxtBody } from './llms-txt.js';
import { renderSchemaMap, listPublishedSchemaUrls } from './schema-map.js';
import { handleFuzzyRedirects } from './api-fuzzy-redirects.js';
import { handleRunAudit, handleGetAudit } from './api-audit.js';
import {
  handleStatelessAnalyze,
  handleV1AuditRun,
  handleV1AuditLatest,
  handleV1Redirects,
  handleV1404s,
} from './api-v1.js';
import { handleLinkOpportunities } from './api-v1/links.js';
import { handleSeoMetaGet, handleSeoMetaPut, handleSeoMetaPatch } from './api-v1/meta.js';
import { requireSeoCap } from '../engine/auth.js';
import {
  getOrCreateIndexNowKey,
  submitToIndexNow,
  getIndexNowKeyFileContent,
  renderIndexNowKeyFile,
  INDEXNOW_ENDPOINT,
} from '../engine/indexnow.js';

export function createPluginRoutes(options: SeoPluginOptions): Record<string, any> {
  // Modular feature flags with backward-compatible fallback to legacy enable* flags
  const modSitemaps = options.modules?.sitemaps ?? options.enableSitemap ?? true;
  const modRobots = options.modules?.robots ?? options.enableRobots ?? true;
  const modRedirects = options.modules?.redirects ?? options.enableRedirects ?? true;
  const modLlmsTxt = options.modules?.llmsTxt ?? options.enableLlmsTxt ?? true;
  const modSchemaMap = options.modules?.schemaMap ?? options.enableSchemaMap ?? true;
  const modIndexNow = options.modules?.indexNow ?? options.enableIndexNow ?? false;
  const modAuditApi = options.modules?.auditApi ?? true;
  const modFuzzy = options.modules?.fuzzyRedirects ?? true;

  const routes: Record<string, any> = {};

  const registerRoute = (
    path: string,
    handler: (ctx: any) => Promise<any>,
    meta: { public?: boolean; permission?: string } = {}
  ) => {
    const routeObj: any = async (ctx: any) => handler(ctx);
    routeObj.handler = handler;
    routeObj.public = meta.public ?? false;
    if (meta.permission) routeObj.permission = meta.permission;

    const clean = path.replace(/^\/+/, '');
    routes[clean] = routeObj;
    routes[`/${clean}`] = routeObj;
  };

  if (modSitemaps) {
    registerRoute('sitemap.xml', async (ctx: any) => renderSitemap(ctx, options), { public: true });
    registerRoute('sitemap_index.xml', async (ctx: any) => renderSitemap(ctx, options), { public: true });
    registerRoute('sitemap-index.xml', async (ctx: any) => renderSitemapIndex(ctx, options), { public: true });
    registerRoute('sitemap.xsl', async () => renderSitemapXsl(), { public: true });
    for (const col of ['services', 'posts', 'pages']) {
      registerRoute(`sitemap-${col}.xml`, async (ctx: any) => renderSitemapCollection(ctx, options, col), {
        public: true,
      });
    }
  }

  if (modRobots) {
    registerRoute('robots.txt', async (ctx: any) => renderRobotsAsync(ctx, options), { public: true });
  }

  if (modLlmsTxt) {
    registerRoute('llms.txt', async (ctx: any) => renderLlmsTxtAsync(ctx, options), { public: true });
    registerRoute('llms-full.txt', async (ctx: any) => renderLlmsFullTxtAsync(ctx, options), { public: true });
    registerRoute('llms/txt', async (ctx: any) => {
      const body = await generateLlmsTxtBody(ctx, options);
      return { enabled: true, body };
    }, { public: true });
  }

  if (modSchemaMap) {
    registerRoute('schemamap.xml', async (ctx: any) => renderSchemaMap(ctx, options), { public: true });
    registerRoute('_emdash/api/seo/schema-map', async (ctx: any) => renderSchemaMap(ctx, options), { public: true });
    registerRoute('schema/map', async (ctx: any) => {
      const items = await listPublishedSchemaUrls(ctx, options);
      return { items };
    }, { public: true });
  }

  if (modFuzzy) {
    registerRoute('_emdash/api/seo/fuzzy-redirects', async (ctx: any) => handleFuzzyRedirects(ctx, options));
  }

  if (modIndexNow) {
    registerRoute('_emdash/api/seo/indexnow/key', async (ctx: any) => {
      const key = await getOrCreateIndexNowKey(ctx?.kv, options.indexnowKey);
      return new Response(JSON.stringify({ key, endpoint: INDEXNOW_ENDPOINT, keyFile: getIndexNowKeyFileContent(key) }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }, { public: true });
    registerRoute('_emdash/api/seo/indexnow/submit', async (ctx: any) => {
      const req = ctx?.request || ctx?.req;
      const body = ctx?.input || (await req?.json?.().catch(() => ({}))) || {};
      const urls = body.urls || [];
      const host = body.host || new URL(options.siteUrl).hostname;
      const key = await getOrCreateIndexNowKey(ctx?.kv, options.indexnowKey);
      const res = await submitToIndexNow({ host, key, urls });
      return new Response(JSON.stringify(res), {
        status: res.ok ? 200 : 502,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    registerRoute('indexnow/key', async (ctx: any) => {
      const key = await getOrCreateIndexNowKey(ctx?.kv, options.indexnowKey);
      return { key, keyFile: getIndexNowKeyFileContent(key) };
    }, { public: true });
    // Spec key-file route (public by design: Bing/Yandex must fetch it).
    registerRoute('_emdash/api/seo/indexnow/key.txt', async (ctx: any) => {
      const key = await getOrCreateIndexNowKey(ctx?.kv, options.indexnowKey);
      return renderIndexNowKeyFile(key);
    }, { public: true });
  }

  if (modAuditApi) {
    registerRoute('_emdash/api/seo/audit', async (ctx: any) => handleRunAudit(ctx));
    registerRoute('_emdash/api/seo/audit/latest', async (ctx: any) => handleGetAudit(ctx));
    registerRoute('_emdash/api/seo/v1/audit/run', async (ctx: any) => handleV1AuditRun(ctx, options));
    registerRoute('_emdash/api/seo/v1/audit/latest', async (ctx: any) => handleV1AuditLatest(ctx, options));
  }

  // Unified Typed REST API v1 routes
  registerRoute('_emdash/api/seo/v1/analyze', async (ctx: any) => handleStatelessAnalyze(ctx, options));
  registerRoute('_emdash/api/seo/v1/links/opportunities', async (ctx: any) => handleLinkOpportunities(ctx, options));
  registerRoute('_emdash/api/seo/v1/meta', async (ctx: any) => {
    const req = ctx?.request || ctx?.req;
    const method = (req?.method || ctx?.method || 'GET').toUpperCase();
    if (method === 'PUT') return handleSeoMetaPut(ctx, options);
    if (method === 'PATCH') return handleSeoMetaPatch(ctx, options);
    return handleSeoMetaGet(ctx, options);
  });
  if (modRedirects) {
    registerRoute('_emdash/api/seo/v1/redirects', async (ctx: any) => handleV1Redirects(ctx, options));
    registerRoute('_emdash/api/seo/v1/404s', async (ctx: any) => handleV1404s(ctx, options));
  }

  // Native EmDash Plugin Settings Routes
  registerRoute('settings', async (ctx: any) => {
    const settings: Record<string, string> = {};
    try {
      if (ctx?.settings?.list) {
        const entries = await ctx.settings.list();
        for (const { key, value } of entries) {
          settings[key] = typeof value === 'string' ? value : String(value);
        }
      } else if (ctx?.kv?.list) {
        const entries = (await ctx.kv.list('settings:')) || [];
        for (const { key, value } of entries) {
          const k = key.replace('settings:', '');
          settings[k] = typeof value === 'string' ? value : String(value);
        }
      }
    } catch {
      // Fallback
    }
    return { settings };
  });

  registerRoute('settings/save', async (ctx: any) => {
    const denied = requireSeoCap(ctx);
    if (denied) {
      return new Response(JSON.stringify({ error: 'Forbidden: seo:manage capability required.' }), {
        status: denied.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const body = ctx?.input || (await ctx?.request?.json?.().catch(() => ({}))) || {};
    const settings = body.settings || {};
    try {
      if (ctx?.settings?.set) {
        for (const [key, value] of Object.entries(settings)) {
          await ctx.settings.set(key, value);
        }
      } else if (ctx?.kv?.set) {
        for (const [key, value] of Object.entries(settings)) {
          await ctx.kv.set(`settings:${key}`, value);
        }
      }
    } catch {
      // Fallback
    }
    return { ok: true };
  });

  return routes;
}
