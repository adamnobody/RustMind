import { Background, BackgroundVariant } from '@xyflow/react';
import { useUIStore, type BackgroundPattern } from '../../../store/uiStore';

/**
 * Базовый цвет паттерна по теме (RGB-каналы). Яркость из настроек становится
 * альфой. Считаем итоговый rgb() в JS: SVG-атрибуты паттерна ReactFlow не
 * умеют разворачивать var(), поэтому CSS-переменной здесь не обойтись.
 */
const GRID_RGB: Record<'dark' | 'light', string> = {
  dark: '148 163 184',
  light: '100 116 139',
};

const PATTERN_CONFIG: Record<
  BackgroundPattern,
  { variant: BackgroundVariant; gap: number; size?: number }
> = {
  dots: { variant: BackgroundVariant.Dots, gap: 20, size: 1.2 },
  lines: { variant: BackgroundVariant.Lines, gap: 28 },
  cross: { variant: BackgroundVariant.Cross, gap: 28, size: 5 },
};

export function CanvasBackground(): React.JSX.Element {
  const theme = useUIStore((s) => s.theme);
  const pattern = useUIStore((s) => s.settings.backgroundPattern);
  const brightness = useUIStore((s) => s.settings.backgroundBrightness);

  const cfg = PATTERN_CONFIG[pattern] ?? PATTERN_CONFIG.dots;
  const alpha = Math.min(100, Math.max(0, brightness)) / 100;

  return (
    <Background
      variant={cfg.variant}
      gap={cfg.gap}
      size={cfg.size}
      color={`rgb(${GRID_RGB[theme]} / ${alpha})`}
    />
  );
}
