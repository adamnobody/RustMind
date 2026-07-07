import { useCallback } from 'react';
import clsx from 'clsx';
import { useMindMapStore } from '../../../store/mindMapStore';
import { useUIStore } from '../../../store/uiStore';
import { Icon, type IconName } from '../../../shared/ui/Icon/Icon';
import { useT, type TranslationKey } from '../../../shared/i18n';
import type { HandleVisibility } from '../../../store/types';
import { LAYOUT_KINDS, type LayoutKind } from '../../layout/engines/layoutTypes';
import { MenuBar, type MenuDef } from './MenuBar';
import styles from './AppToolbar.module.css';

/** Локализованные названия раскладок для переключателя. */
const LAYOUT_LABEL_KEYS: Record<LayoutKind, TranslationKey> = {
  free: 'layout.free',
  hierarchy: 'layout.hierarchy',
  block: 'layout.block',
  fishbone: 'layout.fishbone',
  network: 'layout.network',
  bubble: 'layout.bubble',
  bridge: 'layout.bridge',
  multiflow: 'layout.multiflow',
  dialogue: 'layout.dialogue',
  tree: 'layout.tree',
  flowchart: 'layout.flowchart',
};

interface AppToolbarProps {
  onNew?: () => void;
  onOpen?: () => Promise<void>;
  onSave?: () => Promise<void>;
  onSaveAs?: () => Promise<void>;
  onHome?: () => void;
}

interface ToolTileProps {
  icon: IconName;
  label: string;
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
}

/** Крупная плитка панели инструментов: иконка сверху, подпись снизу. */
function ToolTile({ icon, label, title, onClick, disabled, active }: ToolTileProps): React.JSX.Element {
  return (
    <button
      type="button"
      className={clsx(styles.tile, active && styles.tileActive)}
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon name={icon} size={20} />
      <span className={styles.tileLabel}>{label}</span>
    </button>
  );
}

export function AppToolbar({
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onHome,
}: AppToolbarProps): React.JSX.Element {
  const documentName = useMindMapStore((s) => s.documentName);
  const isDirty = useMindMapStore((s) => s.isDirty);
  const layoutType = useMindMapStore((s) => s.layoutType);
  const setLayoutType = useMindMapStore((s) => s.setLayoutType);
  const applyAutoLayoutManual = useMindMapStore((s) => s.applyAutoLayoutManual);
  const undo = useMindMapStore((s) => s.undo);
  const redo = useMindMapStore((s) => s.redo);
  const canUndo = useMindMapStore((s) => s.canUndo);
  const canRedo = useMindMapStore((s) => s.canRedo);
  const projectSettings = useMindMapStore((s) => s.projectSettings);
  const setProjectSettings = useMindMapStore((s) => s.setProjectSettings);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const openSettings = useUIStore((s) => s.openSettings);
  const triggerFitView = useUIStore((s) => s.triggerFitView);
  const inspectorOpen = useUIStore((s) => s.inspectorOpen);
  const toggleInspector = useUIStore((s) => s.toggleInspector);
  const settings = useUIStore((s) => s.settings);
  const setCanvasOption = useUIStore((s) => s.setCanvasOption);
  const t = useT();

  // «Перестроить раскладку»: форс-пересборка текущего типа — способ вернуть
  // форму после ручного растаскивания узлов (nodeConstraint мягкий).
  const handleAutoLayout = useCallback(() => {
    applyAutoLayoutManual();
    setTimeout(triggerFitView, 50);
  }, [applyAutoLayoutManual, triggerFitView]);

  // Смена типа раскладки = пересборка по правилам нового типа (setLayoutType
  // сам вызывает applyAutoLayout); данные нод и рёбер не теряются.
  const handleLayoutKindChange = useCallback(
    (kind: LayoutKind) => {
      setLayoutType(kind);
      setTimeout(triggerFitView, 50);
    },
    [setLayoutType, triggerFitView],
  );

  const menus: MenuDef[] = [
    {
      id: 'file',
      label: t('menu.file'),
      items: [
        { kind: 'action', label: t('tile.new'), hotkey: 'Ctrl+N', onSelect: () => onNew?.() },
        { kind: 'action', label: t('tile.open'), hotkey: 'Ctrl+O', onSelect: () => void onOpen?.() },
        { kind: 'action', label: t('tile.save'), hotkey: 'Ctrl+S', onSelect: () => void onSave?.() },
        {
          kind: 'action',
          label: t('mi.saveAs'),
          hotkey: 'Ctrl+Shift+S',
          onSelect: () => void onSaveAs?.(),
        },
        ...(onHome
          ? ([{ kind: 'separator' }, { kind: 'action', label: t('mi.home'), onSelect: onHome }] as const)
          : []),
      ],
    },
    {
      id: 'edit',
      label: t('menu.edit'),
      items: [
        { kind: 'action', label: t('mi.undo'), hotkey: 'Ctrl+Z', disabled: !canUndo, onSelect: undo },
        {
          kind: 'action',
          label: t('mi.redo'),
          hotkey: 'Ctrl+Shift+Z',
          disabled: !canRedo,
          onSelect: redo,
        },
        { kind: 'separator' },
        { kind: 'action', label: t('mi.autoLayout'), hotkey: 'L', onSelect: handleAutoLayout },
      ],
    },
    {
      id: 'view',
      label: t('menu.view'),
      items: [
        { kind: 'checkbox', label: t('mi.stylePanel'), checked: inspectorOpen, onSelect: toggleInspector },
        { kind: 'separator' },
        {
          kind: 'checkbox',
          label: t('mi.grid'),
          checked: settings.showGrid,
          onSelect: () => setCanvasOption('showGrid', !settings.showGrid),
        },
        {
          kind: 'checkbox',
          label: t('mi.minimap'),
          checked: settings.showMiniMap,
          onSelect: () => setCanvasOption('showMiniMap', !settings.showMiniMap),
        },
        {
          kind: 'checkbox',
          label: t('mi.controls'),
          checked: settings.showControls,
          onSelect: () => setCanvasOption('showControls', !settings.showControls),
        },
      ],
    },
    { id: 'settings', label: t('menu.settings'), onSelect: openSettings },
  ];

  return (
    <header className={styles.toolbar}>
      {/* Строка 1 — классический меню-бар */}
      <div className={styles.menuRow}>
        <div className={styles.brand}>
          <div className={styles.logo} aria-hidden="true">
            R
          </div>
          <div className={styles.document}>
            <span className={styles.appName}>RustMind</span>
            <span className={styles.documentName}>
              {isDirty ? '● ' : ''}
              {documentName}
            </span>
          </div>
        </div>

        <MenuBar menus={menus} />

        <div className={styles.spacer} />

        <button
          type="button"
          className={styles.themeBtn}
          onClick={toggleTheme}
          title={theme === 'dark' ? t('toolbar.lightTheme') : t('toolbar.darkTheme')}
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
          <span>{t('menu.theme')}</span>
        </button>
      </div>

      {/* Строка 2 — цветные плитки-иконки */}
      <div className={styles.tileRow}>
        <ToolTile icon="file" label={t('tile.new')} title={t('toolbar.new')} onClick={onNew} />
        <ToolTile
          icon="folder-open"
          label={t('tile.open')}
          title={t('toolbar.open')}
          onClick={() => void onOpen?.()}
        />
        <ToolTile
          icon="save"
          label={t('tile.save')}
          title={t('toolbar.save')}
          onClick={() => void onSave?.()}
        />

        <span className={styles.tileSep} aria-hidden="true" />

        <ToolTile
          icon="undo"
          label={t('tile.undo')}
          title={t('toolbar.undo')}
          onClick={undo}
          disabled={!canUndo}
        />
        <ToolTile
          icon="redo"
          label={t('tile.redo')}
          title={t('toolbar.redo')}
          onClick={redo}
          disabled={!canRedo}
        />

        <span className={styles.tileSep} aria-hidden="true" />

        <ToolTile
          icon="layout"
          label={t('tile.rebuild')}
          title={t('toolbar.rebuildLayout')}
          onClick={handleAutoLayout}
        />

        <select
          className={styles.handleVisSelect}
          value={layoutType}
          title={t('toolbar.layoutKind')}
          aria-label={t('toolbar.layoutKind')}
          onChange={(e) => handleLayoutKindChange(e.target.value as LayoutKind)}
        >
          {LAYOUT_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {t(LAYOUT_LABEL_KEYS[kind])}
            </option>
          ))}
        </select>

        <span className={styles.tileSep} aria-hidden="true" />

        <ToolTile
          icon="panel"
          label={t('tile.panel')}
          title={t('toolbar.stylePanel')}
          onClick={toggleInspector}
          active={inspectorOpen}
        />

        <select
          className={styles.handleVisSelect}
          value={projectSettings.handleVisibility}
          title={t('toolbar.handleVisibility')}
          onChange={(e) =>
            setProjectSettings({ handleVisibility: e.target.value as HandleVisibility })
          }
        >
          <option value="hidden">{t('toolbar.handlesHidden')}</option>
          <option value="dashed">{t('toolbar.handlesDashed')}</option>
          <option value="always">{t('toolbar.handlesAlways')}</option>
        </select>
      </div>
    </header>
  );
}
