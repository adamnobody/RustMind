import { useId, useState } from 'react';
import clsx from 'clsx';
import { Icon } from '../../../shared/ui/Icon/Icon';
import { useT } from '../../../shared/i18n';
import styles from './Inspector.module.css';

/**
 * Small, inspector-local form controls. Deliberately not promoted to shared/ui:
 * they encode inspector conventions (overridable value + reset affordance) and
 * the visual system of the «Node Style Panel» handoff design, which only applies
 * inside the style panel.
 *
 * Каждое поле по умолчанию рисует собственную секцию (padding 20/22 + нижний
 * разделитель) — так устроен прототип рёбер. `inGroup` выключает обёртку для
 * полей внутри CollapsibleSection (панель узла).
 */

function FieldFrame({
  label,
  inGroup,
  disabled,
  children,
}: {
  label?: string;
  inGroup?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  if (inGroup === true) {
    return (
      <div
        className={clsx(styles.fieldStack, disabled === true && styles.fieldDisabled)}
        aria-disabled={disabled === true ? true : undefined}
      >
        {label !== undefined && <span className={styles.fieldLabel}>{label}</span>}
        {children}
      </div>
    );
  }
  return <Section caption={label}>{children}</Section>;
}

/** Палитра прототипа — единственный источник быстрых цветов панели. */
export const INSPECTOR_PALETTE = [
  '#e0576f',
  '#ff8c50',
  '#f5c451',
  '#35ff87',
  '#3dd7b0',
  '#5fd4ff',
  '#4c7cff',
  '#b28cff',
  '#ff6fae',
  '#eef4f7',
  '#8a97a3',
  '#0b0e12',
] as const;

interface SectionProps {
  /** Капслок-заголовок секции; без него секция — только рамка с отступами. */
  caption?: string;
  children: React.ReactNode;
}

export function Section({ caption, children }: SectionProps): React.JSX.Element {
  return (
    <div className={styles.section}>
      {caption !== undefined && <span className={styles.sectionCaption}>{caption}</span>}
      {children}
    </div>
  );
}

/** Разделитель-заголовок группы полей (прототип: «◆ Точки соединения»). */
export function GroupHeading({ title }: { title: string }): React.JSX.Element {
  return (
    <div className={styles.groupHeading}>
      <span className={styles.groupHeadingMark} aria-hidden="true">
        ◆
      </span>
      <h3 className={styles.groupHeadingText}>{title}</h3>
      <span className={styles.groupHeadingRule} aria-hidden="true" />
    </div>
  );
}

export function GroupBody({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <div className={styles.groupBody}>{children}</div>;
}

/** Сворачиваемая секция панели узла (заголовок + тело). Состояние только в памяти. */
export function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  return (
    <section className={styles.collapsible}>
      <button
        type="button"
        className={styles.collapsibleHeader}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.groupHeadingMark} aria-hidden="true">
          ◆
        </span>
        <span className={styles.collapsibleTitle}>{title}</span>
        <span
          className={clsx(styles.collapsibleChevron, open && styles.collapsibleChevronOpen)}
          aria-hidden="true"
        >
          <Icon name="chevron-down" size={14} />
        </span>
      </button>
      {open ? (
        <div id={panelId} className={styles.collapsibleBody} role="region" aria-label={title}>
          {children}
        </div>
      ) : null}
    </section>
  );
}

/** Вложенная подгруппа внутри секции (например «Граница»). */
export function FieldSubgroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className={styles.fieldSubgroup}>
      <span className={styles.fieldSubgroupTitle}>{title}</span>
      <div className={styles.fieldSubgroupBody}>{children}</div>
    </div>
  );
}

interface SegOption<T extends string> {
  value: T;
  /** Содержимое кнопки: текст или маленькая SVG-схема варианта. */
  label: React.ReactNode;
  /** Доступное имя и подсказка, когда label — не текст. */
  title?: string;
}

interface SegFieldProps<T extends string> {
  label: string;
  value: T;
  options: SegOption<T>[];
  /** Число колонок сетки; по умолчанию — все варианты в один ряд. */
  columns?: number;
  /** Пониженная высота кнопок (прототип: ряд «Начертание»). */
  compact?: boolean;
  inGroup?: boolean;
  disabled?: boolean;
  onChange: (value: T) => void;
}

export function SegField<T extends string>({
  label,
  value,
  options,
  columns,
  compact,
  inGroup,
  disabled,
  onChange,
}: SegFieldProps<T>): React.JSX.Element {
  return (
    <FieldFrame label={label} inGroup={inGroup} disabled={disabled}>
      <div
        className={styles.segment}
        role="radiogroup"
        aria-label={label}
        style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={option.value === value}
            aria-label={option.title}
            title={option.title}
            disabled={disabled === true}
            className={clsx(
              styles.segmentItem,
              compact === true && styles.segmentItemCompact,
              option.value === value && styles.segmentActive,
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </FieldFrame>
  );
}

interface ToggleGroupItem {
  key: string;
  label: React.ReactNode;
  title: string;
  active: boolean;
  onToggle: () => void;
}

/** Ряд независимых переключателей в оболочке сегмента (B / I / U). */
export function ToggleGroupField({
  label,
  items,
  inGroup,
}: {
  label: string;
  items: ToggleGroupItem[];
  inGroup?: boolean;
}): React.JSX.Element {
  return (
    <FieldFrame label={label} inGroup={inGroup}>
      <div
        className={styles.segment}
        role="group"
        aria-label={label}
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={item.active}
            aria-label={item.title}
            title={item.title}
            className={clsx(
              styles.segmentItem,
              styles.segmentItemCompact,
              item.active && styles.segmentActive,
            )}
            onClick={item.onToggle}
          >
            {item.label}
          </button>
        ))}
      </div>
    </FieldFrame>
  );
}

interface ColorFieldProps {
  label: string;
  /** The active override, or undefined when the element falls back to the theme default. */
  value: string | undefined;
  /** Hex shown in the picker when there is no override (a sensible starting point). */
  fallback: string;
  inGroup?: boolean;
  disabled?: boolean;
  onChange: (hex: string) => void;
  onReset: () => void;
}

export function ColorField({
  label,
  value,
  fallback,
  inGroup,
  disabled,
  onChange,
  onReset,
}: ColorFieldProps): React.JSX.Element {
  const t = useT();
  const [open, setOpen] = useState(false);
  const paletteId = useId();
  const overridden = value !== undefined;
  const current = value ?? fallback;
  const resetLabel = t('field.reset', { label: label.toLowerCase() });
  const paletteOpen = open && disabled !== true;

  return (
    <FieldFrame label={label} inGroup={inGroup} disabled={disabled}>
      <div className={styles.colorRow}>
        <button
          type="button"
          className={clsx(styles.colorChip, paletteOpen && styles.colorChipOpen)}
          style={{ background: current }}
          aria-label={label}
          aria-expanded={paletteOpen}
          aria-controls={paletteOpen ? paletteId : undefined}
          disabled={disabled === true}
          onClick={() => setOpen((v) => !v)}
        />
        <span className={clsx(styles.colorValue, !overridden && styles.colorValueDefault)}>
          {overridden ? current.toUpperCase() : t('field.default')}
        </span>
        <button
          type="button"
          className={styles.resetButton}
          aria-label={resetLabel}
          title={resetLabel}
          disabled={!overridden || disabled === true}
          onClick={() => {
            onReset();
            setOpen(false);
          }}
        >
          <Icon name="x" size={12} />
        </button>
      </div>

      {paletteOpen && (
        <div
          id={paletteId}
          className={styles.palette}
          role="group"
          aria-label={label}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
          }}
        >
          <button
            type="button"
            className={clsx(styles.paletteAuto, !overridden && styles.paletteAutoActive)}
            aria-pressed={!overridden}
            onClick={() => {
              onReset();
              setOpen(false);
            }}
          >
            {t('field.auto')}
          </button>
          {INSPECTOR_PALETTE.map((hex) => (
            <button
              key={hex}
              type="button"
              className={clsx(styles.swatch, value === hex && styles.swatchActive)}
              // color задаёт и обводку выбранного (currentColor), и саму заливку
              style={{ background: hex, color: hex }}
              aria-label={hex}
              aria-pressed={value === hex}
              onClick={() => {
                onChange(hex);
                setOpen(false);
              }}
            />
          ))}
          {/* Произвольный цвет — нативная пипетка в том же чипе палитры. */}
          <span className={clsx(styles.swatch, styles.swatchCustom)} title={t('field.customColor')}>
            <input
              type="color"
              className={styles.colorInput}
              value={current}
              aria-label={t('field.customColor')}
              onChange={(e) => onChange(e.target.value)}
            />
          </span>
        </div>
      )}
    </FieldFrame>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

export function TextField({
  label,
  value,
  placeholder,
  onChange,
}: TextFieldProps): React.JSX.Element {
  return (
    <Section caption={label}>
      <input
        type="text"
        className={styles.textInput}
        value={value}
        placeholder={placeholder}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
      />
    </Section>
  );
}

interface FontFieldProps {
  label: string;
  /** Активное переопределение; undefined = наследуемый шрифт приложения. */
  value: string | undefined;
  fonts: string[];
  inGroup?: boolean;
  onChange: (font: string | undefined) => void;
}

/**
 * Список шрифтов — нативный <select>: системных гарнитур могут быть сотни, и
 * встроенные в него клавиатурная навигация, type-ahead и скрытие за пределами
 * окна ценнее, чем кастомный список. Имена в списке — обычным UI-шрифтом:
 * превью каждой гарнитурой делает список нечитаемым (декор, dingbats, контраст).
 */
export function FontField({
  label,
  value,
  fonts,
  inGroup,
  onChange,
}: FontFieldProps): React.JSX.Element {
  const t = useT();
  // Шрифт из открытого файла может отсутствовать в системе — показываем его
  // в списке, чтобы select не «терял» значение.
  const options = value !== undefined && !fonts.includes(value) ? [value, ...fonts] : fonts;
  return (
    <FieldFrame label={label} inGroup={inGroup}>
      <span className={styles.selectWrap}>
        <select
          className={styles.select}
          value={value ?? ''}
          aria-label={label}
          onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value)}
        >
          <option value="">{t('field.defaultOption')}</option>
          {options.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>
        <span className={styles.selectChevron} aria-hidden="true">
          <Icon name="chevron-down" size={16} />
        </span>
      </span>
    </FieldFrame>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  /** Поле внутри группы — без собственной секции и с более плотным слайдером. */
  inGroup?: boolean;
  disabled?: boolean;
  onChange: (value: number) => void;
}

export function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  inGroup,
  disabled,
  onChange,
}: NumberFieldProps): React.JSX.Element {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const body = (
    <>
      <div className={styles.fieldHeader}>
        <span className={styles.fieldLabel}>{label}</span>
        <span className={styles.fieldValue}>
          {value}
          {suffix}
        </span>
      </div>
      <div className={clsx(styles.sliderRow, inGroup === true && styles.sliderRowCompact)}>
        <input
          type="range"
          className={styles.range}
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={label}
          disabled={disabled === true}
          style={{ '--ins-pct': `${pct}%` } as React.CSSProperties}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
    </>
  );
  if (inGroup === true) {
    return (
      <div className={clsx(disabled === true && styles.fieldDisabled)} aria-disabled={disabled === true ? true : undefined}>
        {body}
      </div>
    );
  }
  return <Section>{body}</Section>;
}

interface ToggleFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** Булев параметр в плотности прототипа: подпись слева, пилюля-тумблер справа. */
export function ToggleField({ label, checked, onChange }: ToggleFieldProps): React.JSX.Element {
  return (
    <Section>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={styles.toggleRow}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.fieldLabel}>{label}</span>
        <span className={clsx(styles.toggleTrack, checked && styles.toggleTrackOn)}>
          <span className={styles.toggleKnob} />
        </span>
      </button>
    </Section>
  );
}
