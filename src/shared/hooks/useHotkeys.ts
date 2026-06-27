import { useEffect, useRef } from 'react';

type HotkeyCallback = (keyboardEvent: KeyboardEvent) => void;

export function useHotkeys(keys: string, callback: HotkeyCallback) {
  const callbackRef = useRef<HotkeyCallback>(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Split allowed hotkeys by comma (e.g. "delete, backspace")
      const hotkeyComboList = keys
        .toLowerCase()
        .split(',')
        .map((s) => s.trim());

      for (const hotkeyCombo of hotkeyComboList) {
        const parts = hotkeyCombo.split('+');
        const key = parts[parts.length - 1];
        const hasMod = parts.includes('mod');
        const hasCtrl = parts.includes('ctrl') || hasMod;
        const hasShift = parts.includes('shift');
        const hasAlt = parts.includes('alt');

        // Check modifiers
        const isModPressed = hasCtrl
          ? event.ctrlKey || event.metaKey
          : !event.ctrlKey && !event.metaKey;
        const isShiftPressed = hasShift ? event.shiftKey : !event.shiftKey;
        const isAltPressed = hasAlt ? event.altKey : !event.altKey;

        // Check core key
        let isKeyMatch = false;
        const eventKey = event.key.toLowerCase();

        if (key === 'ctrl' || key === 'control') isKeyMatch = event.key === 'Control';
        else if (key === 'shift') isKeyMatch = event.key === 'Shift';
        else if (key === 'alt') isKeyMatch = event.key === 'Alt';
        else if (key === 'enter') isKeyMatch = event.key === 'Enter';
        else if (key === 'tab') isKeyMatch = event.key === 'Tab';
        else if (key === 'escape' || key === 'esc') isKeyMatch = event.key === 'Escape';
        else if (key === 'delete' || key === 'del') isKeyMatch = event.key === 'Delete';
        else if (key === 'backspace') isKeyMatch = event.key === 'Backspace';
        // Для буквенных хоткеев сверяем ещё и по физической клавише (event.code):
        // при кириллице event.key = 'ы'/'я'/…, а event.code остаётся 'KeyS'/'KeyZ'/…
        else if (/^[a-z]$/.test(key)) isKeyMatch = eventKey === key || event.code === `Key${key.toUpperCase()}`;
        else isKeyMatch = eventKey === key;

        if (isKeyMatch && isModPressed && isShiftPressed && isAltPressed) {
          event.preventDefault();
          callbackRef.current(event);
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [keys]);
}
