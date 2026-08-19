export function caretViewport(el: HTMLTextAreaElement): { left: number; top: number; height: number } {
  const pos = el.selectionStart;
  const style = window.getComputedStyle(el);
  const mirror = document.createElement('div');
  mirror.setAttribute('aria-hidden', 'true');
  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.wordWrap = 'break-word';
  mirror.style.overflow = 'hidden';
  mirror.style.left = '-9999px';
  mirror.style.top = '0';
  mirror.style.width = `${el.clientWidth}px`;
  mirror.style.font = style.font;
  mirror.style.lineHeight = style.lineHeight;
  mirror.style.letterSpacing = style.letterSpacing;
  mirror.style.padding = style.padding;
  mirror.style.border = style.border;
  mirror.style.boxSizing = style.boxSizing;
  mirror.style.tabSize = style.tabSize;
  mirror.textContent = el.value.slice(0, pos);
  const mark = document.createElement('span');
  mark.textContent = '\u200b';
  mirror.appendChild(mark);
  document.body.appendChild(mirror);
  const box = el.getBoundingClientRect();
  const root = mirror.getBoundingClientRect();
  const at = mark.getBoundingClientRect();
  const height = at.height || Number.parseFloat(style.lineHeight) || 20;
  const left = box.left + (at.left - root.left) - el.scrollLeft;
  const top = box.top + (at.top - root.top) - el.scrollTop;
  mirror.remove();
  return { left, top, height };
}

const GAP = 6;
const PAD = 8;
const MAX_MENU = 240;

/** Клип подсказок: visualViewport ∩ оверлей, минус выступ окна за рабочую область (панель задач). */
export function suggestClipRect(overlay?: DOMRect | null): {
  left: number;
  top: number;
  right: number;
  bottom: number;
} {
  const vv = window.visualViewport;
  const left = vv?.offsetLeft ?? 0;
  const top = vv?.offsetTop ?? 0;
  const right = left + (vv?.width ?? window.innerWidth);
  const availTop = (window.screen as Screen & { availTop?: number }).availTop ?? 0;
  const overlap = Math.max(
    0,
    window.screenY + window.outerHeight - availTop - window.screen.availHeight,
  );
  const bottom = top + (vv?.height ?? window.innerHeight) - overlap;
  if (!overlay) return { left, top, right, bottom };
  return {
    left: Math.max(overlay.left, left),
    top: Math.max(overlay.top, top),
    right: Math.min(overlay.right, right),
    bottom: Math.min(overlay.bottom, bottom),
  };
}

export function placeSuggestMenu(
  caret: { left: number; top: number; height: number },
  menu: { width: number; height: number },
  clip: { left: number; top: number; right: number; bottom: number },
): { left: number; top: number; maxHeight: number } {
  const avail = Math.max(0, clip.bottom - clip.top - PAD * 2);
  const spaceBelow = clip.bottom - (caret.top + caret.height) - GAP - PAD;
  const spaceAbove = caret.top - clip.top - GAP - PAD;
  const openBelow = spaceBelow >= menu.height || spaceBelow >= spaceAbove;
  const maxHeight = Math.min(
    MAX_MENU,
    menu.height,
    Math.max(0, openBelow ? spaceBelow : spaceAbove),
    avail,
  );
  const width = Math.min(menu.width, Math.max(80, clip.right - clip.left - PAD * 2));
  const left = Math.min(
    Math.max(clip.left + PAD, caret.left),
    Math.max(clip.left + PAD, clip.right - width - PAD),
  );
  const top = openBelow ? caret.top + caret.height + GAP : caret.top - GAP - maxHeight;
  return {
    left,
    top: Math.min(Math.max(clip.top + PAD, top), Math.max(clip.top + PAD, clip.bottom - maxHeight - PAD)),
    maxHeight,
  };
}

