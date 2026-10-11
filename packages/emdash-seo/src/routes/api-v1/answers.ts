import type { SeoPluginOptions } from '../../types.js';
import { jsonResponse, parseRequestBody } from './helpers.js';
import { extractAutoFaqs, extractAutoHowTo, extractSpeakableText } from '../../engine/geo-aeo-analyzer.js';
import { cosineSimilarity, getWorkersAiEmbeddings } from '../../engine/semantic-analyzer.js';

/** Host-injected text embedder (e.g. Workers AI). Absent on free tier. */
type EmbedTexts = (texts: string[]) => Promise<number[][]>;

/**
 * Pick the best FAQ answer for q. Vector re-rank when the host provides
 * embeddings (ctx.embedTexts or ctx.env.AI via the bge-small bridge),
 * lexical token-overlap otherwise. Same 0.3 floor either way; null below it.
 */
export async function pickDirectAnswer(
  ctx: any,
  q: string,
  faqs: Array<{ question: string; answer: string }>
): Promise<string | null> {
  const embedder: EmbedTexts | null =
    typeof ctx?.embedTexts === 'function'
      ? ctx.embedTexts
      : ctx?.env?.AI
        ? (texts: string[]) => Promise.all(texts.map((t) => getWorkersAiEmbeddings(t, ctx.env)))
        : null;
  if (embedder) {
    try {
      const vectors = await embedder([q, ...faqs.map((f) => f.question)]);
      const qVec = vectors[0] || [];
      let best: { answer: string; sim: number } | null = null;
      for (let i = 0; i < faqs.length; i++) {
        const sim = cosineSimilarity(qVec, vectors[i + 1] || []);
        if (!best || sim > best.sim) best = { answer: faqs[i].answer, sim };
      }
      if (best && best.sim >= 0.3) return best.answer;
      return null;
    } catch {
      // Fall through to lexical ranking
    }
  }
  const qTokens = q.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  let best: { answer: string; ratio: number } | null = null;
  for (const f of faqs) {
    const hTokens = f.question.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    const denom = Math.min(qTokens.length, hTokens.length);
    const overlap = denom === 0 ? 0 : qTokens.filter((t) => hTokens.some((h) => h.includes(t) || t.includes(h))).length / denom;
    if (!best || overlap > best.ratio) best = { answer: f.answer, ratio: overlap };
  }
  return best && best.ratio >= 0.3 ? best.answer : null;
}

/**
 * GET /_emdash/api/seo/v1/answers?q=…&collection=&id=
 * Structured Answers API for RAG/LLM clients: direct answer, FAQs, HowTo
 * steps, and citing URLs for one entry (or raw contentHtml POST). No equivalent
 * in RankMath/Yoast. Read-only, public-safe (published content only).
 */
export async function handleSeoAnswers(ctx: any, options: SeoPluginOptions): Promise<Response> {
  const req = ctx?.request || ctx?.req;
  const url = req?.url ? new URL(req.url, 'http://localhost') : null;
  const body = req?.method && req.method !== 'GET' ? await parseRequestBody(ctx).catch(() => ({})) : {};
  const q: string = (url?.searchParams.get('q') || (body as any)?.q || '').trim();
  const collection = url?.searchParams.get('collection') || (body as any)?.collection;
  const id = url?.searchParams.get('id') || (body as any)?.id;

  let title = '';
  let slug = '';
  let contentHtml = (body as any)?.contentHtml || (body as any)?.content || '';
  let canonical = '';

  if ((!contentHtml || !title) && ctx?.content?.get && collection && id) {
    try {
      const entry: any = await ctx.content.get(collection, id);
      if (entry) {
        // Public endpoint: never disclose non-published entries.
        const status = entry.status || entry.data?.status;
        if (status && status !== 'published') {
          return jsonResponse({ error: 'Entry not found.' }, 404);
        }
        const data = entry.data || {};
        title = data.title || entry.title || '';
        slug = entry.slug || data.slug || String(id);
        if (!contentHtml) contentHtml = typeof data.content === 'string' ? data.content : '';
        canonical = data.seo?.canonicalUrl || '';
      }
    } catch {
      // Fall through to param-only mode
    }
  }
  if (!contentHtml && !q) {
    return jsonResponse({ error: 'Provide q and collection/id, or POST contentHtml.' }, 400);
  }

  const siteUrl = options.siteUrl.replace(/\/+$/, '');
  const pageUrl = canonical || (slug ? `${siteUrl}/${String(slug).replace(/^\/+/, '')}` : siteUrl);
  const faqs = extractAutoFaqs(contentHtml || '').slice(0, 5);
  const howTo = extractAutoHowTo(contentHtml || '').slice(0, 10);
  const speakable = extractSpeakableText(contentHtml || '', '') || null;
  // Confidence floor: never return a confidently-wrong direct answer.
  // Below 30% question-token overlap, directAnswer is null (speakable stands alone).
  // When the host provides ctx.embedTexts (e.g. Workers AI bge-small), vector
  // similarity re-ranks first at the same floor; lexical is the fallback.
  let directAnswer: string | null = speakable;
  if (faqs.length > 0 && q) {
    directAnswer = await pickDirectAnswer(ctx, q, faqs);
  }

  return jsonResponse({
    success: true,
    q: q || null,
    url: pageUrl,
    directAnswer: directAnswer || null,
    speakable: speakable || null,
    faqs,
    howToSteps: howTo,
    cites: [pageUrl],
  });
}
