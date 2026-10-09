import * as React from 'react';
import type { FaqItem } from '../../types.js';

export interface EditorFaqTabProps {
  faqs: FaqItem[];
  onChange: (faqs: FaqItem[]) => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.375rem 0.5rem', borderRadius: 4,
  border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))',
  background: 'var(--color-kumo-control, #1a1a1a)',
  color: 'var(--text-color-kumo-default, #ededed)',
  fontSize: '0.75rem', fontFamily: 'inherit', boxSizing: 'border-box',
};

/**
 * Minimal manual FAQ editor. Edits flow into data.seo.faqs so the
 * FaqBlock pattern and FAQPage schema pick them up on render.
 */
export function EditorFaqTab({ faqs, onChange }: EditorFaqTabProps) {
  const update = (idx: number, patch: Partial<FaqItem>) => {
    onChange(faqs.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  };

  const remove = (idx: number) => {
    onChange(faqs.filter((_, i) => i !== idx));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {faqs.length === 0 && (
        <div style={{ padding: '0.75rem', borderRadius: 6, background: 'var(--color-kumo-recessed, #141414)', border: '1px dashed var(--color-kumo-line, rgba(255, 255, 255, 0.15))', color: 'var(--text-color-kumo-subtle, #a0a0a0)', textAlign: 'center', fontSize: '0.75rem' }}>
          No FAQs yet. Add question/answer pairs for FAQ schema markup and AI answers.
        </div>
      )}
      {faqs.map((faq, idx) => (
        <div
          key={idx}
          style={{ padding: '0.5rem', borderRadius: 6, background: 'var(--color-kumo-recessed, #141414)', border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))' }}
        >
          <input
            type="text" value={faq.question} onChange={(e) => update(idx, { question: e.target.value })}
            placeholder={`Question ${idx + 1}`} style={{ ...inputStyle, marginBottom: '0.375rem', fontWeight: 600 }}
          />
          <textarea
            value={faq.answer} onChange={(e) => update(idx, { answer: e.target.value })}
            placeholder="Direct answer (1-2 sentences)" rows={2} style={{ ...inputStyle, resize: 'vertical' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
            <button
              type="button" onClick={() => remove(idx)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-color-kumo-danger, #f87171)', cursor: 'pointer', fontSize: '0.6875rem' }}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
      <button
        type="button" onClick={() => onChange([...faqs, { question: '', answer: '' }])}
        style={{
          padding: '0.375rem', borderRadius: 6, border: '1px dashed var(--color-kumo-line, rgba(255, 255, 255, 0.25))',
          background: 'transparent', color: 'var(--text-color-kumo-default, #ededed)', cursor: 'pointer', fontSize: '0.75rem',
        }}
      >
        + Add FAQ
      </button>
    </div>
  );
}
