const MARK_STYLE = 'background:#fef08a;border-radius:2px;padding:0 1px;';

interface TextSegment {
  node: Text;
  start: number;
  end: number;
}

function dashVariants(phrase: string): string[] {
  const trimmed = phrase.trim();
  const withoutTrailingPunct = trimmed.replace(/[,:;.]\s*$/, '');
  const enDash = trimmed.replace(/[\u2014\u2212-]/g, '\u2013');
  const hyphen = trimmed.replace(/[\u2013\u2014\u2212–]/g, '-');
  return [...new Set([trimmed, withoutTrailingPunct, enDash, hyphen].filter(Boolean))];
}

function findPhrasePosition(fullText: string, phrase: string): { start: number; length: number } | null {
  for (const variant of dashVariants(phrase)) {
    const idx = fullText.indexOf(variant);
    if (idx !== -1) return { start: idx, length: variant.length };
  }

  const lower = fullText.toLowerCase();
  const phraseLower = phrase.trim().toLowerCase();
  const idx = lower.indexOf(phraseLower);
  if (idx !== -1) return { start: idx, length: phrase.trim().length };

  if (phraseLower.length > 20) {
    const partial = phraseLower.slice(0, 20);
    const partialIdx = lower.indexOf(partial);
    if (partialIdx !== -1) return { start: partialIdx, length: partial.length };
  }

  return null;
}

function collectTextSegments(root: HTMLElement, skipIndices: Set<number>): { segments: TextSegment[]; fullText: string } {
  const segments: TextSegment[] = [];
  let fullText = '';

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const mark = (node.parentElement as HTMLElement)?.closest('mark[data-comment-highlight]');
      if (mark) {
        const idx = Number(mark.getAttribute('data-comment-index'));
        if (!skipIndices.has(idx)) return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let current: Node | null;
  while ((current = walker.nextNode())) {
    const textNode = current as Text;
    const content = textNode.textContent ?? '';
    const start = fullText.length;
    fullText += content;
    segments.push({ node: textNode, start, end: start + content.length });
  }

  return { segments, fullText };
}

function wrapOffsetRange(
  root: HTMLElement,
  start: number,
  end: number,
  commentIndex: number,
  skipIndices: Set<number>,
): boolean {
  const { segments } = collectTextSegments(root, skipIndices);
  const startSeg = segments.find((s) => start >= s.start && start < s.end);
  const endSeg = segments.find((s) => end > s.start && end <= s.end);
  if (!startSeg || !endSeg) return false;

  try {
    const range = document.createRange();
    range.setStart(startSeg.node, start - startSeg.start);
    range.setEnd(endSeg.node, end - endSeg.start);
    const mark = document.createElement('mark');
    mark.setAttribute('data-comment-highlight', 'true');
    mark.setAttribute('data-comment-index', String(commentIndex));
    mark.style.cssText = MARK_STYLE;
    range.surroundContents(mark);
    return true;
  } catch {
    return false;
  }
}

/** Apply yellow highlights for saved comment selections (cross-node + dash tolerant). */
export function applyCommentHighlights(
  root: HTMLElement,
  phrases: { text: string; index: number }[],
  skipIndices: Set<number>,
): void {
  root.querySelectorAll('mark[data-comment-highlight]').forEach((m) => {
    const idx = Number(m.getAttribute('data-comment-index'));
    if (skipIndices.has(idx)) return;
    const parent = m.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(m.textContent ?? ''), m);
      parent.normalize();
    }
  });

  for (const { text, index } of phrases) {
    if (!text || skipIndices.has(index)) continue;

    const { fullText } = collectTextSegments(root, skipIndices);
    const pos = findPhrasePosition(fullText, text);
    if (!pos) continue;

    wrapOffsetRange(root, pos.start, pos.start + pos.length, index, skipIndices);
  }
}
