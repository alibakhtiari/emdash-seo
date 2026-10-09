import type { SeoPluginOptions, EntrySeoMetadata } from '../../types.js';
import { handlePageMetadata } from '../../engine/metadata-handler.js';
import { jsonResponse, extractMetaParams, parseRequestBody } from './helpers.js';
import { requireSeoCapFor } from '../../engine/auth.js';

export async function handleSeoMetaGet(ctx: any, options: SeoPluginOptions): Promise<Response> {
  const { collection, id } = extractMetaParams(ctx);

  if (!collection || !id) {
    return jsonResponse(
      { error: 'Missing required route parameters: collection and id' },
      400
    );
  }

  let entry: any = null;

  if (ctx?.content?.get) {
    try {
      entry = await ctx.content.get(collection, id);
    } catch {
      // Ignore error, treat as not found
    }
  } else if (Array.isArray(ctx?.entries)) {
    entry = ctx.entries.find(
      (e: any) =>
        (e.id === id || e._id === id) &&
        (!e.collection || e.collection === collection)
    );
  }

  if (!entry) {
    return jsonResponse(
      { error: `Entry not found: ${collection}/${id}` },
      404
    );
  }

  const rawSeo: EntrySeoMetadata = entry.data?.seo || entry.seo || {
    focusKeywords: [],
    noIndex: false,
    noFollow: false,
  };

  const slug = entry.slug || entry.data?.slug || id;
  const siteUrl = options.siteUrl.replace(/\/+$/, '');

  const contributions = await handlePageMetadata(
    {
      page: {
        url: `${siteUrl}/${slug.replace(/^\/+/, '')}`,
        path: `/${slug.replace(/^\/+/, '')}`,
        title: rawSeo.metaTitle || entry.title || entry.data?.title || options.siteName,
        description: rawSeo.metaDescription || entry.data?.description || '',
        canonical: rawSeo.canonicalUrl,
        siteName: options.siteName,
        kind: 'content',
        seo: rawSeo,
        content: {
          id,
          collection,
          slug,
          data: entry.data || {},
        },
        articleMeta: {
          publishedTime: entry.createdAt || entry.publishedAt,
          modifiedTime: entry.updatedAt,
          author: entry.data?.author || entry.author,
        },
      },
    },
    ctx,
    options
  );

  const jsonLdContrib = contributions.find((c) => c.kind === 'jsonld') as any;

  return jsonResponse({
    success: true,
    collection,
    id,
    seo: rawSeo,
    head: contributions,
    schemaGraph: jsonLdContrib?.graph || null,
  });
}

export interface BulkMetaEntry {
  collection?: string;
  id: string;
  metaTitle?: string;
  metaDescription?: string;
  noIndex?: boolean;
  seo?: Partial<EntrySeoMetadata>;
}

const MAX_BULK_ENTRIES = 100;

/**
 * Bulk PATCH: { entries: [{ collection?, id, metaTitle?, metaDescription?, noIndex?, seo? }] }
 * Capped at 100 entries. Reuses handleSeoMetaPut per entry.
 */
export async function handleSeoMetaPatch(ctx: any, options: SeoPluginOptions): Promise<Response> {
  const denied = await requireSeoCapFor(ctx, 'meta');
  if (denied) return jsonResponse({ error: 'Forbidden: seo:manage capability required.' }, denied.status);
  const body = await parseRequestBody(ctx);
  const entries: BulkMetaEntry[] | null = Array.isArray(body?.entries) ? body.entries : null;

  if (!entries) {
    return jsonResponse(
      { error: 'Missing entries array: expected { entries: [{ id, metaTitle?, metaDescription?, noIndex? }] }' },
      400
    );
  }

  if (entries.length > MAX_BULK_ENTRIES) {
    return jsonResponse(
      { error: `Bulk limit exceeded: max ${MAX_BULK_ENTRIES} entries per request` },
      400
    );
  }

  const { collection: defaultCollection } = extractMetaParams(ctx);
  const results: Array<Record<string, unknown>> = [];

  for (const entry of entries.slice(0, MAX_BULK_ENTRIES)) {
    const collection = entry?.collection || defaultCollection;
    const id = entry?.id;
    if (!collection || !id) {
      results.push({ id: id ?? null, success: false, error: 'Each entry requires collection and id' });
      continue;
    }
    const seoPatch: Record<string, unknown> = {
      ...(entry?.seo && typeof entry.seo === 'object' ? entry.seo : {}),
    };
    if (entry.metaTitle !== undefined) seoPatch.metaTitle = entry.metaTitle;
    if (entry.metaDescription !== undefined) seoPatch.metaDescription = entry.metaDescription;
    if (entry.noIndex !== undefined) seoPatch.noIndex = entry.noIndex;
    try {
      const res = await handleSeoMetaPut(
        { ...ctx, params: { collection, id }, input: { seo: seoPatch } },
        options
      );
      const json: any = await res.json();
      if (res.status >= 400) {
        results.push({ collection, id, success: false, error: json.error || `Update failed (${res.status})` });
      } else {
        results.push({ collection, id, success: true, seo: json.seo });
      }
    } catch (err) {
      results.push({ collection, id, success: false, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return jsonResponse({ success: true, count: results.length, results });
}

export async function handleSeoMetaPut(ctx: any, options: SeoPluginOptions): Promise<Response> {
  const denied = await requireSeoCapFor(ctx, 'meta');
  if (denied) return jsonResponse({ error: 'Forbidden: seo:manage capability required.' }, denied.status);
  const { collection, id } = extractMetaParams(ctx);

  if (!collection || !id) {
    return jsonResponse(
      { error: 'Missing required route parameters: collection and id' },
      400
    );
  }

  const body = await parseRequestBody(ctx);
  const newSeoPatch = body.seo !== undefined ? body.seo : body;

  let entry: any = null;
  if (ctx?.content?.get) {
    try {
      entry = await ctx.content.get(collection, id);
    } catch {
      // Ignore
    }
  } else if (Array.isArray(ctx?.entries)) {
    entry = ctx.entries.find(
      (e: any) =>
        (e.id === id || e._id === id) &&
        (!e.collection || e.collection === collection)
    );
  }

  if (!entry && !ctx?.allowCreate) {
    return jsonResponse(
      { error: `Entry not found: ${collection}/${id}` },
      404
    );
  }

  const existingData = entry?.data || {};
  const currentSeo = existingData.seo || entry?.seo || {
    focusKeywords: [],
    noIndex: false,
    noFollow: false,
  };

  const updatedSeo: EntrySeoMetadata = {
    ...currentSeo,
    ...newSeoPatch,
  };

  const updatedData = {
    ...existingData,
    seo: updatedSeo,
  };

  let updatedEntry: any = {
    ...(entry || { id, collection }),
    data: updatedData,
    updatedAt: new Date().toISOString(),
  };

  if (ctx?.content?.update) {
    try {
      updatedEntry = await ctx.content.update(collection, id, { data: updatedData });
    } catch {
      // Fallback to local updatedEntry
    }
  } else if (Array.isArray(ctx?.entries)) {
    const idx = ctx.entries.indexOf(entry);
    if (idx !== -1) {
      ctx.entries[idx] = updatedEntry;
    } else {
      ctx.entries.push(updatedEntry);
    }
  }

  const slug = updatedEntry.slug || updatedEntry.data?.slug || id;
  const siteUrl = options.siteUrl.replace(/\/+$/, '');

  const contributions = await handlePageMetadata(
    {
      page: {
        url: `${siteUrl}/${slug.replace(/^\/+/, '')}`,
        path: `/${slug.replace(/^\/+/, '')}`,
        title: updatedSeo.metaTitle || updatedEntry.title || updatedEntry.data?.title || options.siteName,
        description: updatedSeo.metaDescription || updatedEntry.data?.description || '',
        canonical: updatedSeo.canonicalUrl,
        siteName: options.siteName,
        kind: 'content',
        seo: updatedSeo,
        content: {
          id,
          collection,
          slug,
          data: updatedEntry.data || {},
        },
        articleMeta: {
          publishedTime: updatedEntry.createdAt || updatedEntry.publishedAt,
          modifiedTime: updatedEntry.updatedAt,
          author: updatedEntry.data?.author || updatedEntry.author,
        },
      },
    },
    ctx,
    options
  );

  const jsonLdContrib = contributions.find((c) => c.kind === 'jsonld') as any;

  return jsonResponse({
    success: true,
    collection,
    id,
    seo: updatedSeo,
    head: contributions,
    schemaGraph: jsonLdContrib?.graph || null,
  });
}
