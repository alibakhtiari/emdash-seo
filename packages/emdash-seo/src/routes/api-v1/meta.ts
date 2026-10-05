import type { SeoPluginOptions, EntrySeoMetadata } from '../../types.js';
import { handlePageMetadata } from '../../engine/metadata-handler.js';
import { jsonResponse, extractMetaParams, parseRequestBody } from './helpers.js';

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

export async function handleSeoMetaPut(ctx: any, options: SeoPluginOptions): Promise<Response> {
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
