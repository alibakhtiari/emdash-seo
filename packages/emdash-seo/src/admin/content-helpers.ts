export interface ContentEditorPanelProps {
  collection?: string;
  entry?: {
    id?: string;
    data?: Record<string, unknown>;
    seo?: {
      title?: string | null;
      description?: string | null;
      canonicalUrl?: string | null;
      noIndex?: boolean | null;
      ogImage?: string | null;
      [key: string]: unknown;
    };
    slug?: string;
    locale?: string;
    publishedAt?: string | null;
    [key: string]: unknown;
  };
  locale?: string;
}

export function extractTextFromContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!content) return '';
  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (!block || typeof block !== 'object') return '';
        if (block._type === 'block' && Array.isArray(block.children)) {
          return block.children
            .map((span: { text?: string }) => (typeof span?.text === 'string' ? span.text : ''))
            .join('');
        }
        if (typeof block.text === 'string') return block.text;
        return '';
      })
      .filter(Boolean)
      .join('\n\n');
  }
  return '';
}

export function extractAllImagesFromContent(content: unknown, data?: Record<string, unknown>): string {
  const parts: string[] = [];

  if (data?.featured_image && typeof data.featured_image === 'string') {
    const featuredAlt = typeof data.featured_image_alt === 'string' ? data.featured_image_alt : '';
    parts.push(`<img src="${data.featured_image}" alt="${featuredAlt}" />`);
  }

  if (Array.isArray(content)) {
    for (const block of content) {
      if (block && typeof block === 'object') {
        if (block._type === 'image') {
          const alt = block.alt !== undefined ? String(block.alt) : '';
          const url = block.url || block.asset?.url || '/media/image.jpg';
          parts.push(`<img src="${url}" alt="${alt}" />`);
        } else if (block._type === 'block' && Array.isArray(block.children)) {
          for (const span of block.children) {
            if (typeof span?.text === 'string' && (span.text.includes('<img') || span.text.includes('!['))) {
              parts.push(span.text);
            }
          }
        }
      }
    }
  } else if (typeof content === 'string') {
    parts.push(content);
  }

  return parts.join('\n');
}
