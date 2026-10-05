import type { SeoPluginOptions } from '../../types.js';
import { analyzeContent } from '../../engine/content-analyzer.js';
import type { StatelessAnalyzeResponse, TechnicalChecks } from './types.js';
import { jsonResponse, parseRequestBody, computeReadability, extractEntities, detectEntityGaps } from './helpers.js';

export async function handleStatelessAnalyze(ctx: any, options: SeoPluginOptions): Promise<Response> {
  const body = await parseRequestBody(ctx);

  const title = (body.title || '').trim();
  const slug = (body.slug || '').trim();
  const contentHtml = (body.contentHtml || body.content || '').trim();
  const metaDescription = (body.metaDescription || body.description || '').trim();
  const focusKeywords: string[] = Array.isArray(body.focusKeywords)
    ? body.focusKeywords.map((k: any) => String(k))
    : body.focusKeywords
      ? [String(body.focusKeywords)]
      : [];

  if (!title && !contentHtml) {
    return jsonResponse(
      { error: 'Missing required fields: at least title or contentHtml must be provided' },
      400
    );
  }

  const cleanText = contentHtml.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
  const readability = computeReadability(cleanText);

  const h1Matches = contentHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
  const imgMatches = contentHtml.match(/<img[^>]*>/gi) || [];
  const imgWithoutAlt = imgMatches.filter((img: string) => !img.includes('alt=') || /alt=["']\s*["']/i.test(img)).length;

  const technicalChecks: TechnicalChecks = {
    h1Valid: h1Matches.length === 1,
    imagesWithAlt: imgWithoutAlt === 0,
    metaDescriptionLength: metaDescription.length,
    wordCount: cleanText.split(/\s+/).filter(Boolean).length,
  };

  const entitiesDetected = extractEntities(contentHtml, cleanText, focusKeywords);
  const entityGaps = detectEntityGaps(cleanText, focusKeywords, entitiesDetected);

  const analysis = analyzeContent({
    title,
    slug,
    contentHtml,
    focusKeywords,
    metaDescription,
    siteUrl: options.siteUrl,
  });

  const totalTopicEntities = entitiesDetected.length + entityGaps.length;
  const coverageRatio = totalTopicEntities > 0 ? entitiesDetected.length / totalTopicEntities : 1;
  const avgSalience = entitiesDetected.length > 0
    ? entitiesDetected.reduce((acc, e) => acc + e.salienceScore, 0) / entitiesDetected.length
    : 0.5;
  const primaryKwFound = focusKeywords.some((kw: string) =>
    cleanText.toLowerCase().includes(kw.toLowerCase()) || title.toLowerCase().includes(kw.toLowerCase())
  );
  const titleKw = focusKeywords.some((kw: string) => title.toLowerCase().includes(kw.toLowerCase()));
  const slugKw = Boolean(slug && focusKeywords.some((kw: string) => slug.toLowerCase().includes(kw.toLowerCase().replace(/\s+/g, '-'))));

  const rawEci = Math.round(
    coverageRatio * 45 +
    avgSalience * 30 +
    (primaryKwFound ? 10 : 0) +
    (titleKw ? 5 : 0) +
    (slugKw ? 5 : 0) +
    (entitiesDetected.length >= 2 ? 10 : 0)
  );
  const entityCoverageIndex = Math.min(100, Math.max(10, rawEci));

  let grade: StatelessAnalyzeResponse['grade'] = 'Needs Improvement';
  if (entityCoverageIndex >= 80) grade = 'Good';
  else if (entityCoverageIndex >= 60) grade = 'OK';

  const responsePayload: StatelessAnalyzeResponse = {
    entityCoverageIndex,
    grade,
    entitiesDetected,
    entityGaps,
    readability,
    technicalChecks,
    metrics: analysis.metrics,
    recommendations: analysis.recommendations,
  };

  return jsonResponse(responsePayload, 200);
}
