/**
 * DOM Extractor for EmDash Content Editor
 * Reads live editor content (title, excerpt, body, images) from the browser DOM
 * during drafting on /content/[collection]/new or /content/[collection]/[id].
 */

export interface EditorDomSnapshot {
  title: string;
  excerpt: string;
  content: string;
  headings: string[];
  images: Array<{ src: string; alt: string }>;
}

export function extractEditorDomSnapshot(): EditorDomSnapshot {
  if (typeof document === 'undefined') {
    return {
      title: '',
      excerpt: '',
      content: '',
      headings: [],
      images: [],
    };
  }

  // 1. Extract Title
  const titleEl = document.querySelector<HTMLInputElement>(
    '#field-title, input[name="title"], [data-field-name="title"] input'
  );
  const title = (titleEl?.value || '').trim();

  // 2. Extract Excerpt
  const excerptEl = document.querySelector<HTMLTextAreaElement | HTMLInputElement>(
    '#field-excerpt, textarea[name="excerpt"], [data-field-name="excerpt"] textarea'
  );
  const excerpt = (excerptEl?.value || '').trim();

  // 3. Extract Content from TipTap / ProseMirror / PortableText editor
  const editorEl = document.querySelector<HTMLElement>(
    '.tiptap, .ProseMirror, #field-content .ProseMirror, [data-field-name="content"] .ProseMirror, textarea#field-content'
  );

  let content = '';
  const headings: string[] = [];
  const images: Array<{ src: string; alt: string }> = [];

  if (editorEl) {
    if (typeof HTMLTextAreaElement !== 'undefined' && editorEl instanceof HTMLTextAreaElement) {
      content = editorEl.value;
    } else {
      content = editorEl.innerText || editorEl.textContent || (editorEl as any).value || '';

      // Extract headings
      const headingEls = editorEl.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headingEls.forEach((h) => {
        const text = (h.textContent || '').trim();
        if (text) headings.push(text);
      });

      // Extract images inside the content editor
      const imgEls = editorEl.querySelectorAll<HTMLImageElement>('img');
      imgEls.forEach((img) => {
        const src = img.getAttribute('src') || '';
        const alt = img.getAttribute('alt') || '';
        if (src) {
          images.push({ src, alt });
        }
      });
    }
  }

  // Also check for featured image or media uploads in the document
  const featuredImgEl = document.querySelector<HTMLImageElement>(
    '#field-featured_image img, [data-field-name="featured_image"] img'
  );
  if (featuredImgEl) {
    const src = featuredImgEl.getAttribute('src') || '';
    const alt = featuredImgEl.getAttribute('alt') || '';
    if (src && !images.some((img) => img.src === src)) {
      images.push({ src, alt });
    }
  }

  return {
    title,
    excerpt,
    content,
    headings,
    images,
  };
}

/**
 * Updates alt attribute of an image in the TipTap / ProseMirror editor DOM.
 */
export function updateDomImageAlt(src: string, newAlt: string): boolean {
  if (typeof document === 'undefined') return false;

  const editorEl = document.querySelector<HTMLElement>('.tiptap, .ProseMirror');
  if (!editorEl) return false;

  const targetImgs = editorEl.querySelectorAll<HTMLImageElement>('img');
  let updated = false;

  targetImgs.forEach((img) => {
    if (img.getAttribute('src') === src || img.src === src) {
      img.setAttribute('alt', newAlt);
      img.alt = newAlt;
      updated = true;
    }
  });

  if (updated) {
    // Dispatch input event to notify TipTap/ProseMirror of state change
    editorEl.dispatchEvent(new Event('input', { bubbles: true }));
  }

  return updated;
}
