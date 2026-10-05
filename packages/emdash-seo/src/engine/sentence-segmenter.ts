import {
  ABBREVIATIONS_NO_TERMINATE,
  IRREGULAR_PAST_PARTICIPLES,
  NON_PARTICIPLES_ENDING_IN_ED,
} from './readability-dictionaries.js';

/**
 * Escapes regex special characters.
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Tests whether a word token is a past participle.
 */
export function isPastParticiple(word: string): boolean {
  const lower = word.toLowerCase();
  if (IRREGULAR_PAST_PARTICIPLES.has(lower)) {
    return true;
  }
  if (lower.endsWith('ed') && lower.length > 3 && !NON_PARTICIPLES_ENDING_IN_ED.has(lower)) {
    return true;
  }
  return false;
}

/**
 * Extracts raw sentences with exact startIndex and endIndex offsets in original text.
 * Correctly preserves offsets even when abbreviations containing periods are present.
 */
export function segmentSentences(
  text: string
): { text: string; startIndex: number; endIndex: number }[] {
  const sentences: { text: string; startIndex: number; endIndex: number }[] = [];
  if (!text || text.trim().length === 0) {
    return sentences;
  }

  // Mask HTML tags with spaces of identical length so character offsets are strictly preserved
  const masked = text.replace(/<[^>]*>/g, (tag) => ' '.repeat(tag.length));
  const len = masked.length;
  let i = 0;

  while (i < len) {
    // Skip leading whitespace
    while (i < len && /\s/.test(masked[i])) {
      i++;
    }
    if (i >= len) break;

    const sentenceStart = i;
    let sentenceEnd = -1;

    while (i < len) {
      const ch = masked[i];

      // Check for paragraph break (two consecutive newlines)
      if (ch === '\n') {
        const remaining = masked.slice(i);
        const doubleNewlineMatch = remaining.match(/^\n\s*\n/);
        if (doubleNewlineMatch) {
          sentenceEnd = i;
          i += doubleNewlineMatch[0].length;
          break;
        }
      }

      // Check for terminal punctuation: ! or ?
      if (ch === '!' || ch === '?') {
        let punctEnd = i + 1;
        while (punctEnd < len && (masked[punctEnd] === '!' || masked[punctEnd] === '?')) {
          punctEnd++;
        }
        while (punctEnd < len && /["'”’)\]]/.test(masked[punctEnd])) {
          punctEnd++;
        }
        if (punctEnd >= len || /\s/.test(masked[punctEnd])) {
          sentenceEnd = punctEnd;
          i = punctEnd;
          break;
        }
        i = punctEnd;
        continue;
      }

      // Check for period: .
      if (ch === '.') {
        // Decimal numbers (e.g. 3.14)
        if (i > 0 && /\d/.test(masked[i - 1]) && i + 1 < len && /\d/.test(masked[i + 1])) {
          i++;
          continue;
        }

        // Ellipsis (e.g. ... or ..)
        if (i + 1 < len && masked[i + 1] === '.') {
          let dotEnd = i + 1;
          while (dotEnd < len && masked[dotEnd] === '.') {
            dotEnd++;
          }
          while (dotEnd < len && /["'”’)\]]/.test(masked[dotEnd])) {
            dotEnd++;
          }
          if (
            dotEnd >= len ||
            (/\s/.test(masked[dotEnd]) && dotEnd + 1 < len && /[A-Z]/.test(masked[dotEnd + 1]))
          ) {
            sentenceEnd = dotEnd;
            i = dotEnd;
            break;
          }
          i = dotEnd;
          continue;
        }

        // Check if preceded by an abbreviation
        const sliceBefore = masked.slice(sentenceStart, i);
        const lastWordMatch = sliceBefore.match(/([a-zA-Z]+(?:\.[a-zA-Z]+)*)$/);
        const lastWord = lastWordMatch ? lastWordMatch[1].toLowerCase() : '';

        // Single letter initial (e.g. "J. K." or "A.")
        const isSingleInitial = /^[a-zA-Z]$/.test(lastWord);
        // Multi-part abbreviation like "u.s" or "e.g"
        const isAbbrev = ABBREVIATIONS_NO_TERMINATE.has(lastWord) || isSingleInitial;

        if (isAbbrev) {
          // If followed immediately by double newline, allow sentence break
          if (i + 1 < len && /^\s*\n\s*\n/.test(masked.slice(i + 1))) {
            let punctEnd = i + 1;
            while (punctEnd < len && /["'”’)\]]/.test(masked[punctEnd])) {
              punctEnd++;
            }
            sentenceEnd = punctEnd;
            i = punctEnd;
            break;
          }
          i++;
          continue;
        }

        // Potential sentence boundary
        let punctEnd = i + 1;
        while (punctEnd < len && /["'”’)\]]/.test(masked[punctEnd])) {
          punctEnd++;
        }

        if (punctEnd >= len || /\s/.test(masked[punctEnd])) {
          sentenceEnd = punctEnd;
          i = punctEnd;
          break;
        }
      }

      i++;
    }

    if (sentenceEnd === -1) {
      sentenceEnd = i;
    }

    // Trim trailing whitespace from the sentence boundary
    while (sentenceEnd > sentenceStart && /\s/.test(text[sentenceEnd - 1])) {
      sentenceEnd--;
    }

    if (sentenceEnd > sentenceStart) {
      const sentenceText = text.slice(sentenceStart, sentenceEnd);
      sentences.push({
        text: sentenceText,
        startIndex: sentenceStart,
        endIndex: sentenceEnd,
      });
    }
  }

  return sentences;
}

/**
 * Passive voice detector
 * Flags auxiliary forms of 'to be' + optional adverb(s) + past participle.
 */
export function detectPassiveVoice(
  text: string
): { isPassive: boolean; phrases: string[] } {
  const passivePhrases: string[] = [];

  // Auxiliary forms of 'to be' (including contractions)
  const auxRegex = /\b(am|is|are|was|were|be|been|being|'m|'s|'re)\s+((?:[a-zA-Z]+ly|not|never|also|already|always|often|currently|widely|properly|well|thoroughly)\s+)*([a-zA-Z]+)\b/gi;

  let match: RegExpExecArray | null;
  while ((match = auxRegex.exec(text)) !== null) {
    const fullPhrase = match[0];
    const candidateParticiple = match[3];

    if (isPastParticiple(candidateParticiple)) {
      passivePhrases.push(fullPhrase.trim());
    }
  }

  return {
    isPassive: passivePhrases.length > 0,
    phrases: passivePhrases,
  };
}
