/**
 * Image Alt Text Accessibility & SEO Auditor for @emdash/plugin-seo
 * Pure TypeScript, zero external dependencies, Cloudflare Workers Free Tier compatible (< 1ms CPU).
 * Parses HTML <img> tags and Markdown images, detecting:
 * - alt_missing: No alt attribute present
 * - alt_empty: alt="" without decorative indicators
 * - alt_filename: Alt text is a filename or camera default (e.g. .jpg, .png, IMG_1234)
 * - alt_redundant: Starts with "image of", "photo of", "picture of"
 * - alt_length: Suboptimal length (< 5 chars or > 125 chars)
 * - alt_kw_stuffing: Repeated target keyword within alt text
 * - Decorative images: Correctly identifies role="presentation", role="none", aria-hidden="true"
 */

import type { AltAuditReport, ImageAltAuditItem, AltIssueType } from '../types.js';

export interface AltAuditorOptions {
  targetKeywords?: string[];
}

/**
 * Escapes regex special characters.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Tests if an alt string looks like a raw filename or camera default name.
 */
function isFilenameAlt(alt: string): boolean {
  const trimmed = alt.trim();
  if (!trimmed) return false;

  // File extension check (e.g. photo.jpg, banner.webp, diagram.PNG)
  if (/\.(?:jpe?g|png|webp|gif|svg|avif|bmp|tiff)$/i.test(trimmed)) {
    return true;
  }

  // Camera / screenshot prefixes with numbers or underscores (e.g. IMG_1234, DSC0023, SCREENSHOT_2026)
  if (/^(?:IMG|DSC|PHOTO|IMAGE|PIC|SCREENSHOT)[-_]?\d+/i.test(trimmed)) {
    return true;
  }

  // Filename-like slug with underscores or hyphens and numbers only (e.g. img_2026_09)
  if (/^[a-zA-Z0-9_-]+\.(?:jpe?g|png|webp|gif|svg)$/i.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Tests if an alt string starts with redundant prefixes like "image of", "photo of", etc.
 */
function isRedundantAlt(alt: string): boolean {
  const trimmed = alt.trim();
  return /^(?:(?:an?|the)\s+)?(?:image|photo|picture|graphic|icon|illustration)\s+of\b/i.test(trimmed);
}

/**
 * Tests if target keywords appear multiple times in the alt text (keyword stuffing).
 */
function hasKeywordStuffing(alt: string, targetKeywords: string[]): boolean {
  const lowerAlt = alt.toLowerCase();

  for (const kw of targetKeywords) {
    const cleanKw = kw.trim().toLowerCase();
    if (cleanKw.length < 3) continue;

    const pattern = new RegExp(`\\b${escapeRegex(cleanKw)}\\b`, 'gi');
    const matches = lowerAlt.match(pattern);
    if (matches && matches.length >= 2) {
      return true;
    }
  }

  return false;
}

interface RawParsedImage {
  src: string;
  hasAlt: boolean;
  alt: string;
  isDecorative: boolean;
}

/**
 * Parses both HTML <img> tags and Markdown images from content.
 */
function extractImagesFromContent(content: string): RawParsedImage[] {
  const images: RawParsedImage[] = [];
  if (!content || content.trim().length === 0) {
    return images;
  }

  // 1. Extract HTML <img ...> tags
  const htmlImgRegex = /<img\s+([^>]*?)>/gi;
  let match: RegExpExecArray | null;

  while ((match = htmlImgRegex.exec(content)) !== null) {
    const attrs = match[1];

    // Extract src
    const srcMatch = attrs.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const src = srcMatch ? srcMatch[1] ?? srcMatch[2] ?? srcMatch[3] ?? '' : '';

    // Extract alt attribute
    const hasAltAttr = /\balt\b/i.test(attrs);
    let altValue = '';
    if (hasAltAttr) {
      const altMatch = attrs.match(/\balt\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
      if (altMatch) {
        altValue = altMatch[1] ?? altMatch[2] ?? altMatch[3] ?? '';
      }
    }

    // Check decorative indicators
    const isPresentation = /\brole\s*=\s*["'](?:presentation|none)["']/i.test(attrs);
    const isAriaHidden = /\baria-hidden\s*=\s*["']true["']/i.test(attrs) || /\baria-hidden\b/i.test(attrs);
    const isDecorative = isPresentation || isAriaHidden;

    images.push({
      src,
      hasAlt: hasAltAttr,
      alt: altValue,
      isDecorative,
    });
  }

  // 2. Extract Markdown images: ![alt](url)
  const mdImgRegex = /!\[([^\]]*?)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
  while ((match = mdImgRegex.exec(content)) !== null) {
    const alt = match[1];
    const src = match[2];

    images.push({
      src,
      hasAlt: true,
      alt,
      isDecorative: false,
    });
  }

  return images;
}

/**
 * Audits all images in HTML / Markdown content according to accessibility and SEO rules.
 */
export function auditImageAlts(content: string, options: AltAuditorOptions = {}): AltAuditReport {
  const targetKeywords = (options.targetKeywords || []).filter(Boolean);
  const rawImages = extractImagesFromContent(content);

  const items: ImageAltAuditItem[] = [];
  let missingCount = 0;
  let emptyCount = 0;
  let decorativeCount = 0;
  let goodCount = 0;
  let warningCount = 0;
  let criticalCount = 0;

  for (const img of rawImages) {
    const issues: AltIssueType[] = [];
    const suggestions: string[] = [];
    const trimmedAlt = img.alt.trim();
    const charCount = trimmedAlt.length;

    if (img.isDecorative) {
      decorativeCount++;
    }

    // 1. Missing alt attribute completely
    if (!img.hasAlt) {
      issues.push('alt_missing');
      suggestions.push('Add an alt attribute describing the image for accessibility and search engines.');
      missingCount++;
    }
    // 2. Empty alt text without decorative indicator
    else if (charCount === 0 && !img.isDecorative) {
      issues.push('alt_empty');
      suggestions.push('Provide descriptive alt text or mark decorative images with role="presentation".');
      emptyCount++;
    }
    // If not missing or non-decorative empty, evaluate content rules
    else if (charCount > 0 && !img.isDecorative) {
      // 3. Filename as alt text
      if (isFilenameAlt(trimmedAlt)) {
        issues.push('alt_filename');
        suggestions.push('Replace filename with human-readable description of what the image shows.');
      }

      // 4. Redundant prefixes ("image of", "photo of")
      if (isRedundantAlt(trimmedAlt)) {
        issues.push('alt_redundant');
        suggestions.push('Remove redundant prefix ("image of", "photo of") and describe the subject directly.');
      }

      // 5. Length checks (< 5 or > 125 chars)
      if (charCount < 5) {
        issues.push('alt_length');
        suggestions.push('Alt text is too short (< 5 characters). Expand with meaningful context.');
      } else if (charCount > 125) {
        issues.push('alt_length');
        suggestions.push('Alt text is too long (> 125 characters). Keep alt text concise and move lengthy explanations to page copy.');
      }

      // 6. Keyword stuffing
      if (targetKeywords.length > 0 && hasKeywordStuffing(trimmedAlt, targetKeywords)) {
        issues.push('alt_kw_stuffing');
        suggestions.push('Avoid repeating target keywords in image alt text. Describe visual content naturally.');
      }
    }

    // Determine status
    let status: ImageAltAuditItem['status'];
    if (issues.includes('alt_missing') || issues.includes('alt_empty') || issues.includes('alt_kw_stuffing')) {
      status = 'critical';
      criticalCount++;
    } else if (issues.length > 0) {
      status = 'warning';
      warningCount++;
    } else {
      status = 'good';
      goodCount++;
    }

    items.push({
      src: img.src,
      alt: img.alt,
      charCount,
      isDecorative: img.isDecorative,
      issues,
      suggestions,
      status,
    });
  }

  // Calculate overall score (0-100)
  const totalImages = items.length;
  let score = 100;
  if (totalImages > 0) {
    const rawScore = Math.round((goodCount * 100 + warningCount * 50) / totalImages);
    score = Math.max(0, Math.min(100, rawScore));
  }

  // Summary issues list
  const summaryIssues: string[] = [];
  if (missingCount > 0) {
    summaryIssues.push(`${missingCount} image(s) are completely missing an alt attribute.`);
  }
  if (emptyCount > 0) {
    summaryIssues.push(`${emptyCount} image(s) have empty alt text without being marked decorative.`);
  }
  const filenameIssuesCount = items.filter((i) => i.issues.includes('alt_filename')).length;
  if (filenameIssuesCount > 0) {
    summaryIssues.push(`${filenameIssuesCount} image(s) use filenames as alt text.`);
  }
  const redundantIssuesCount = items.filter((i) => i.issues.includes('alt_redundant')).length;
  if (redundantIssuesCount > 0) {
    summaryIssues.push(`${redundantIssuesCount} image(s) contain redundant prefixes (e.g. "image of").`);
  }
  const lengthIssuesCount = items.filter((i) => i.issues.includes('alt_length')).length;
  if (lengthIssuesCount > 0) {
    summaryIssues.push(`${lengthIssuesCount} image(s) have suboptimal alt text length (< 5 or > 125 characters).`);
  }
  const stuffingIssuesCount = items.filter((i) => i.issues.includes('alt_kw_stuffing')).length;
  if (stuffingIssuesCount > 0) {
    summaryIssues.push(`${stuffingIssuesCount} image(s) exhibit keyword stuffing.`);
  }

  return {
    score,
    totalImages,
    missingAltCount: missingCount,
    emptyAltCount: emptyCount,
    decorativeCount,
    goodCount,
    warningCount,
    criticalCount,
    images: items,
    issues: summaryIssues,
  };
}
