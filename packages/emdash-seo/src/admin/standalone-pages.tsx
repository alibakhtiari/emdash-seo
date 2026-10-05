import * as React from 'react';
import { LiveSentenceHighlighter } from '../components/LiveSentenceHighlighter.js';
import { ImageAltAuditorWidget } from '../components/ImageAltAuditorWidget.js';

export function ReadabilityAdminPage() {
  const [content, setContent] = React.useState(
    'Our hot water extraction and steam cleaning process removes deep stains, pet odors, and allergens. Drying time is under 2 hours. Eco-friendly and fully insured with transparent pricing and guarantee. Additionally, we utilize advanced methods that were implemented by our certified specialists.'
  );
  return (
    <div style={{ maxWidth: 840, padding: '1.5rem 0' }}>
      <LiveSentenceHighlighter content={content} onContentChange={setContent} />
    </div>
  );
}

export function ImageAltAuditorAdminPage() {
  const [content, setContent] = React.useState(
    '<p>Professional eco-friendly cleaning services across London.</p>\n<img src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80" alt="Professional technician cleaning carpet with steam extraction equipment" />\n<img src="/images/IMG_5021.jpg" alt="photo of rug" />\n<img src="/images/banner.png" />'
  );
  return (
    <div style={{ maxWidth: 840, padding: '1.5rem 0' }}>
      <ImageAltAuditorWidget content={content} onContentChange={setContent} />
    </div>
  );
}
