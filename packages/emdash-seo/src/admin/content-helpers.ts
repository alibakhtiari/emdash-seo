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

export const SCHEMA_TYPE_OPTIONS = [
  { value: 'auto', label: 'Auto (Inferred)' },
  { value: 'Article', label: 'Standard Article' },
  { value: 'BlogPosting', label: 'Blog Post' },
  { value: 'TechArticle', label: 'Technical Article / Guide' },
  { value: 'NewsArticle', label: 'News Article' },
  { value: 'Service', label: 'Service / Offering' },
  { value: 'HowTo', label: 'How-To Instruction' },
  { value: 'FAQPage', label: 'FAQ Page' },
  { value: 'AboutPage', label: 'About Page' },
  { value: 'ContactPage', label: 'Contact Page' },
];

export function inferSchemaType(title?: string, slug?: string, collection?: string, text?: string): string {
  const t = `${title || ''} ${slug || ''} ${text ? text.slice(0, 200) : ''}`.toLowerCase();
  if (t.includes('about')) return 'AboutPage';
  if (t.includes('contact')) return 'ContactPage';
  if (t.includes('service') || t.includes('clean') || t.includes('repair') || t.includes('treatment') || t.includes('maintenance')) return 'Service';
  if (t.includes('how to') || t.includes('howto') || t.includes('guide') || t.includes('tutorial')) return 'HowTo';
  if (t.includes('faq') || t.includes('questions')) return 'FAQPage';
  if (collection === 'posts' || (slug && slug.startsWith('blog/')) || t.includes('blog')) return 'BlogPosting';
  if (t.includes('case-study') || t.includes('technical') || t.includes('architecture')) return 'TechArticle';
  return 'Article';
}

