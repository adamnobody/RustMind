import React from 'react';
import { useHotkeys } from '../../shared/hooks/useHotkeys';
import { HOTKEYS } from '../../shared/lib/constants';

interface KeyboardProviderProps {
  children: React.ReactNode;
  onSave?: () => void;
  onOpen?: () => void;
  onNew?: () => void;
}

export const KeyboardProvider: React.FC<KeyboardProviderProps> = ({
  children,
  onSave,
  onOpen,
  onNew,
}) => {
  useHotkeys(HOTKEYS.save, () => {
    onSave?.();
  });

  useHotkeys(HOTKEYS.open, () => {
    onOpen?.();
  });

  useHotkeys(HOTKEYS.newMap, () => {
    onNew?.();
  });

  return <>{children}</>;
};
