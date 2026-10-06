import type { AltIssueType } from '../types.js';

/**
 * Replaces the alt attribute of the N-th image in the content string,
 * supporting both HTML <img ...> tags and Markdown ![alt](url) syntax.
 */
export function updateAltInContent(
  content: string,
  imageIndex: number,
  newAlt: string
): string {
  if (!content) return content;

  // Pattern matching HTML <img> tags OR Markdown ![alt](url) images
  // Group 1: HTML img, Group 2: Markdown img alt, Group 3: Markdown img url
  const combinedRegex = /(<img\s+[^>]*?>)|(!\[(.*?)\]\(([^)\s]+(?:\s+["'][^"']*["'])?)\))/gi;

  let currentIndex = 0;
  return content.replace(combinedRegex, (match, htmlTag, _mdTag, _mdAlt, mdRest) => {
    if (currentIndex === imageIndex) {
      currentIndex++;

      if (htmlTag) {
        // Handle HTML <img>
        const hasAltAttr = /\balt\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i.test(match);
        const safeAlt = newAlt.replace(/"/g, '&quot;');

        if (hasAltAttr) {
          // Replace existing alt attribute
          return match.replace(
            /\balt\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i,
            `alt="${safeAlt}"`
          );
        } else {
          // Insert alt attribute before closing >
          return match.replace(
            /<img\s+/i,
            `<img alt="${safeAlt}" `
          );
        }
      } else {
        // Handle Markdown ![alt](url)
        return `![${newAlt}](${mdRest})`;
      }
    }

    currentIndex++;
    return match;
  });
}

/**
 * Maps status to user-friendly label and color schema.
 */
export function getAltStatusBadge(status: 'good' | 'warning' | 'critical'): {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: string;
} {
  switch (status) {
    case 'good':
      return {
        label: 'Good',
        color: 'var(--text-color-kumo-success, #4ade80)',
        bg: 'var(--color-kumo-success-tint, rgba(34, 197, 94, 0.12))',
        border: 'var(--color-kumo-success-tint, rgba(34, 197, 94, 0.3))',
        icon: 'check',
      };
    case 'warning':
      return {
        label: 'Warning',
        color: 'var(--text-color-kumo-warning, #fbbf24)',
        bg: 'var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.12))',
        border: 'var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.3))',
        icon: 'warning',
      };
    case 'critical':
      return {
        label: 'Missing / Critical',
        color: 'var(--text-color-kumo-danger, #f87171)',
        bg: 'var(--color-kumo-danger-tint, rgba(239, 68, 68, 0.12))',
        border: 'var(--color-kumo-danger-tint, rgba(239, 68, 68, 0.3))',
        icon: 'critical',
      };
  }
}

/**
 * Returns progress bar color based on alt text character count (target: 5-125 chars).
 */
export function getAltProgressColor(charCount: number): string {
  if (charCount === 0) return '#ef4444';
  if (charCount > 125) return '#f59e0b';
  if (charCount < 5) return '#f59e0b';
  return '#10b981';
}

/**
 * Formats issue types into human-friendly explanations.
 */
export function formatAltIssueLabel(issue: AltIssueType): string {
  switch (issue) {
    case 'alt_missing':
      return 'Missing alt attribute';
    case 'alt_empty':
      return 'Empty alt text';
    case 'alt_filename':
      return 'Filename used as alt text';
    case 'alt_redundant':
      return 'Starts with "image of" / "photo of"';
    case 'alt_length':
      return 'Suboptimal length (< 5 or > 125 chars)';
    case 'alt_kw_stuffing':
      return 'Target keyword stuffing';
    default:
      return issue;
  }
}
