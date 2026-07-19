import { useCallback } from 'react';
import clsx from 'clsx';
import { useMindMapStore } from '../../../store/mindMapStore';
import { useUIStore } from '../../../store/uiStore';
import { Icon, type IconName } from '../../../shared/ui/Icon/Icon';
import { useT, translate } from '../../../shared/i18n';
import type { HandleVisibility } from '../../../store/types';
import { exportMindMap, type ExportFormat } from '../../persistence/exportImage';
import { LAYOUT_LABEL_KEYS } from '../../layout/lib/layoutLabels';
import { MenuBar, type MenuDef } from './MenuBar';
import styles from './AppToolbar.module.css';

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
  const openLayoutPicker = useUIStore((s) => s.openLayoutPicker);
  const openTemplatePicker = useUIStore((s) => s.openTemplatePicker);
  const toggleSearch = useUIStore((s) => s.toggleSearch);
  const triggerFitView = useUIStore((s) => s.triggerFitView);
  const inspectorOpen = useUIStore((s) => s.inspectorOpen);
  const toggleInspector = useUIStore((s) => s.toggleInspector);
  const settings = useUIStore((s) => s.settings);
  const setCanvasOption = useUIStore((s) => s.setCanvasOption);
  const t = useT();

  // Позиции derived-раскладок всегда пересчитаны из структуры — ручная
  // пересборка нужна только network (форс-симуляция), там нет «правильной»
  // формы, которую можно потерять и вернуть заново.
  const isNetwork = layoutType === 'network';

  // «Перестроить раскладку»: форс-пересборка текущего типа — способ вернуть
  // форму после ручного растаскивания узлов (nodeConstraint мягкий).
  const handleAutoLayout = useCallback(() => {
    applyAutoLayoutManual();
    setTimeout(triggerFitView, 50);
  }, [applyAutoLayoutManual, triggerFitView]);

  const handleExport = useCallback((format: ExportFormat) => {
    void (async () => {
      try {
        await exportMindMap(format);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        window.alert(translate('dialog.error', { message }));
      }
    })();
  }, []);

  const menus: MenuDef[] = [
    {
      id: 'file',
      label: t('menu.file'),
      items: [
        { kind: 'action', label: t('tile.new'), hotkey: 'Ctrl+N', onSelect: () => onNew?.() },
        { kind: 'action', label: t('mi.newFromTemplate'), onSelect: openTemplatePicker },
        { kind: 'action', label: t('tile.open'), hotkey: 'Ctrl+O', onSelect: () => void onOpen?.() },
        { kind: 'action', label: t('tile.save'), hotkey: 'Ctrl+S', onSelect: () => void onSave?.() },
        {
          kind: 'action',
          label: t('mi.saveAs'),
          hotkey: 'Ctrl+Shift+S',
          onSelect: () => void onSaveAs?.(),
        },
        { kind: 'separator' },
        { kind: 'action', label: t('mi.exportPng'), onSelect: () => handleExport('png') },
        { kind: 'action', label: t('mi.exportSvg'), onSelect: () => handleExport('svg') },
        { kind: 'action', label: t('mi.exportPdf'), onSelect: () => handleExport('pdf') },
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
        ...(isNetwork
          ? ([
              { kind: 'separator' },
              { kind: 'action', label: t('mi.autoLayout'), hotkey: 'L', onSelect: handleAutoLayout },
            ] as const)
          : []),
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
        {
          kind: 'checkbox',
          label: t('mi.statuses'),
          checked: settings.showStatuses,
          onSelect: () => setCanvasOption('showStatuses', !settings.showStatuses),
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
        {onHome && (
          <>
            <ToolTile icon="home" label={t('tile.home')} title={t('toolbar.home')} onClick={onHome} />
            <span className={styles.tileSep} aria-hidden="true" />
          </>
        )}
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

        {isNetwork && (
          <ToolTile
            icon="layout"
            label={t('tile.rebuild')}
            title={t('toolbar.rebuildLayout')}
            onClick={handleAutoLayout}
          />
        )}

        <ToolTile
          icon="map"
          label={t(LAYOUT_LABEL_KEYS[layoutType])}
          title={t('toolbar.changeLayoutType')}
          onClick={openLayoutPicker}
        />

        <span className={styles.tileSep} aria-hidden="true" />

        <ToolTile
          icon="search"
          label={t('tile.search')}
          title={t('toolbar.search')}
          onClick={toggleSearch}
        />

        <ToolTile
          icon="panel"
          label={t('tile.panel')}
          title={t('toolbar.stylePanel')}
          onClick={toggleInspector}
          active={inspectorOpen}
        />

        <ToolTile
          icon="check-square"
          label={t('tile.statuses')}
          title={t('toolbar.statuses')}
          onClick={() => setCanvasOption('showStatuses', !settings.showStatuses)}
          active={settings.showStatuses}
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
