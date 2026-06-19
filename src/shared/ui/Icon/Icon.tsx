import type { CSSProperties } from 'react';

export type IconName =
  | 'plus'
  | 'plus-sibling'
  | 'trash'
  | 'edit'
  | 'palette'
  | 'chevron-down'
  | 'file'
  | 'folder-open'
  | 'save'
  | 'undo'
  | 'redo'
  | 'layout'
  // Иконки из шага 1/4, оставим для совместимости в будущем
  | 'zoomIn'
  | 'zoomOut'
  | 'fitView'
  | 'rootCenter'
  | 'layoutLR'
  | 'layoutTB'
  | 'layoutRadial'
  | 'theme'
  | 'home'
  | 'info';

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

// Пути иконок (24x24 viewBox, stroke-based, в стиле Lucide/Feather)
const ICON_PATHS: Record<IconName, React.JSX.Element> = {
  plus: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  'plus-sibling': (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  trash: (
    <>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </>
  ),
  edit: (
    <>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </>
  ),
  palette: (
    <>
      <circle cx="13.5" cy="6.5" r=".5" />
      <circle cx="17.5" cy="10.5" r=".5" />
      <circle cx="8.5" cy="7.5" r=".5" />
      <circle cx="6.5" cy="12.5" r=".5" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
    </>
  ),
  'chevron-down': <polyline points="6 9 12 15 18 9" />,
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </>
  ),
  'folder-open': (
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  ),
  save: (
    <>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </>
  ),
  undo: <path d="M3 7v6h6M3 13a9 9 0 1 0 3-7.7L3 8" />,
  redo: <path d="M21 7v6h-6M21 13a9 9 0 1 1-3-7.7L21 8" />,
  layout: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </>
  ),
  zoomIn: (
    <>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </>
  ),
  zoomOut: (
    <>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </>
  ),
  fitView: (
    <>
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <polyline points="21 15 21 21 15 21" />
      <polyline points="3 9 3 3 9 3" />
    </>
  ),
  rootCenter: (
    <>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  layoutLR: (
    <>
      <rect x="3" y="10" width="4" height="4" rx="1" />
      <rect x="17" y="5" width="4" height="4" rx="1" />
      <rect x="17" y="15" width="4" height="4" rx="1" />
      <path d="M7 12h5" />
      <path d="M12 7v10" />
      <path d="M12 7h5" />
      <path d="M12 17h5" />
    </>
  ),
  layoutTB: (
    <>
      <rect x="10" y="3" width="4" height="4" rx="1" />
      <rect x="5" y="17" width="4" height="4" rx="1" />
      <rect x="15" y="17" width="4" height="4" rx="1" />
      <path d="M12 7v5" />
      <path d="M7 12h10" />
      <path d="M7 12v5" />
      <path d="M17 12v5" />
    </>
  ),
  layoutRadial: (
    <>
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="4" r="2" />
      <circle cx="12" cy="20" r="2" />
      <circle cx="4" cy="12" r="2" />
      <circle cx="20" cy="12" r="2" />
      <line x1="12" y1="7" x2="12" y2="10" />
      <line x1="12" y1="14" x2="12" y2="17" />
      <line x1="6" y1="12" x2="9" y2="12" />
      <line x1="15" y1="12" x2="18" y2="12" />
    </>
  ),
  theme: (
    <>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </>
  ),
  home: (
    <>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </>
  ),
};

export function Icon({
  name,
  size = 18,
  className,
  style,
}: IconProps): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}
