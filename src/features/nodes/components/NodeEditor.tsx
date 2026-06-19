import { useEffect } from 'react';
import clsx from 'clsx';
import styles from './NodeEditor.module.css';

interface NodeEditorProps {
  value: string;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onChange: (value: string) => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function NodeEditor({
  value,
  textareaRef,
  onChange,
  onBlur,
  onKeyDown,
}: NodeEditorProps): React.JSX.Element {
  // Авто-высота textarea под контент
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [value, textareaRef]);

  return (
    <textarea
      ref={textareaRef}
      className={clsx(styles.editor, 'nodrag')}
      value={value}
      rows={1}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      // Критично: блокируем драг узла и панорамирование холста при работе в поле
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    />
  );
}
