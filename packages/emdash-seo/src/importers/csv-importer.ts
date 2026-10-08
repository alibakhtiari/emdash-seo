import type { EntrySeoMetadata } from '../types.js';

export interface SeoCsvRow {
  url: string;
  seo: EntrySeoMetadata;
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      cells.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells.map((c) => c.trim());
}

function pick(record: Record<string, string>, ...aliases: string[]): string {
  for (const a of aliases) {
    if (record[a] !== undefined && record[a] !== '') return record[a];
  }
  return '';
}

function isOffFlag(v: string): boolean {
  const s = v.trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on' || s === 'noindex';
}

/**
 * Parses a generic SEO CSV export (Rank Math / Yoast / Screaming Frog style)
 * into URL-keyed EntrySeoMetadata rows. Zero dependencies.
 */
export function parseSeoCsv(csv: string): SeoCsvRow[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[\s_-]+/g, ''));
  const rows: SeoCsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const record: Record<string, string> = {};
    headers.forEach((h, idx) => {
      record[h] = cells[idx] ?? '';
    });

    const url = pick(record, 'url', 'address', 'loc', 'slug', 'path');
    if (!url) continue;

    const kwRaw = pick(record, 'focuskeywords', 'keywords', 'focuskeyword', 'targetkeyword', 'targetkeywords', 'keyword');
    const focusKeywords = kwRaw
      ? kwRaw.split(/[,;|]/).map((k) => k.trim()).filter(Boolean)
      : [];

    const metaTitle = pick(record, 'metatitle', 'title', 'seotitle') || undefined;
    const metaDescription = pick(record, 'metadescription', 'description', 'seodescription') || undefined;
    const canonicalUrl = pick(record, 'canonicalurl', 'canonical') || undefined;

    rows.push({
      url,
      seo: {
        metaTitle,
        metaDescription,
        canonicalUrl,
        focusKeywords,
        noIndex: isOffFlag(pick(record, 'noindex', 'robotsnoindex')),
        noFollow: isOffFlag(pick(record, 'nofollow', 'robotsnofollow')),
        ogTitle: pick(record, 'ogtitle') || undefined,
        ogDescription: pick(record, 'ogdescription') || undefined,
        ogImage: pick(record, 'ogimage') || undefined,
      },
    });
  }

  return rows;
}
