export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
  children?: TocItem[];
}

export interface TocExtractionResult {
  toc: TocItem[];
  htmlWithAnchors: string;
}

/**
 * Slugifies text for URL anchor IDs
 */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]*>?/gm, '') // Strip any nested tags
    .replace(/[^\w\s-]/g, '')   // Remove punctuation
    .trim()
    .replace(/\s+/g, '-');      // Replace spaces with hyphens
}

/**
 * Automatically extracts H2 and H3 headings from content,
 * assigns anchor IDs if missing, and constructs a hierarchical Table of Contents.
 */
export function extractTableOfContents(contentHtml: string): TocExtractionResult {
  const toc: TocItem[] = [];
  const seenSlugs = new Map<string, number>();

  const headingRegex = /<(h[23])([^>]*)>([\s\S]*?)<\/\1>/gi;

  let currentH2: TocItem | null = null;

  const htmlWithAnchors = contentHtml.replace(headingRegex, (match, tag, attrs, innerHtml) => {
    const level = tag.toLowerCase() === 'h2' ? 2 : 3;
    const cleanText = innerHtml.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();

    // Check if heading already has an id attribute
    const idMatch = attrs.match(/id=["']([^"']+)["']/i);
    let anchorId = idMatch ? idMatch[1] : '';

    if (!anchorId) {
      let baseSlug = slugifyHeading(cleanText) || `section-${toc.length + 1}`;
      const count = seenSlugs.get(baseSlug) || 0;
      seenSlugs.set(baseSlug, count + 1);
      anchorId = count > 0 ? `${baseSlug}-${count}` : baseSlug;

      attrs = `${attrs} id="${anchorId}"`;
    }

    const item: TocItem = {
      id: anchorId,
      text: cleanText,
      level,
    };

    if (level === 2) {
      currentH2 = item;
      currentH2.children = [];
      toc.push(item);
    } else if (level === 3) {
      if (currentH2) {
        currentH2.children = currentH2.children || [];
        currentH2.children.push(item);
      } else {
        toc.push(item);
      }
    }

    return `<${tag}${attrs}>${innerHtml}</${tag}>`;
  });

  return {
    toc,
    htmlWithAnchors,
  };
}
