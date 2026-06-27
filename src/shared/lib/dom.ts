/**
 * Проверяет, находится ли фокус в редактируемом текстовом элементе
 * (input, textarea, contenteditable). Нужно, чтобы глобальные хоткеи
 * не перехватывали ввод текста.
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea') {
    return true;
  }

  if (target.isContentEditable) {
    return true;
  }

  return false;
}
