import clsx from 'clsx';
import { Icon } from '../../../shared/ui/Icon/Icon';
import { useT } from '../../../shared/i18n';
import styles from './Inspector.module.css';

/**
 * Small, inspector-local form controls. Deliberately not promoted to shared/ui:
 * they encode inspector conventions (overridable value + reset affordance) that
 * only make sense for the style panel. The shared SegmentedControl is hardcoded
 * to 3 columns, so SegField rolls its own N-column grid.
 */

interface SegOption<T extends string> {
  value: T;
  label: string;
}

interface SegFieldProps<T extends string> {
  label: string;
  value: T;
  options: SegOption<T>[];
  onChange: (value: T) => void;
}

export function SegField<T extends string>({
  label,
  value,
  options,
  onChange,
}: SegFieldProps<T>): React.JSX.Element {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <div
        className={styles.segment}
        role="radiogroup"
        aria-label={label}
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={option.value === value}
            className={clsx(styles.segmentItem, option.value === value && styles.segmentActive)}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface ColorFieldProps {
  label: string;
  /** The active override, or undefined when the node falls back to the theme default. */
  value: string | undefined;
  /** Hex shown in the picker when there is no override (a sensible starting point). */
  fallback: string;
  onChange: (hex: string) => void;
  onReset: () => void;
}

export function ColorField({
  label,
  value,
  fallback,
  onChange,
  onReset,
}: ColorFieldProps): React.JSX.Element {
  const t = useT();
  const overridden = value !== undefined;
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <div className={styles.colorRow}>
        <span className={clsx(styles.swatch, !overridden && styles.swatchDefault)}>
          <input
            type="color"
            className={styles.colorInput}
            value={value ?? fallback}
            aria-label={label}
            onChange={(e) => onChange(e.target.value)}
          />
        </span>
        <span className={styles.colorValue}>{overridden ? value : t('field.default')}</span>
        <button
          type="button"
          className={styles.resetButton}
          aria-label={t('field.reset', { label: label.toLowerCase() })}
          disabled={!overridden}
          onClick={onReset}
        >
          <Icon name="x" size={14} />
        </button>
      </div>
    </div>
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
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <input
        type="text"
        className={styles.textInput}
        value={value}
        placeholder={placeholder}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

interface FontFieldProps {
  label: string;
  /** Активное переопределение; undefined = наследуемый шрифт приложения. */
  value: string | undefined;
  fonts: string[];
  onChange: (font: string | undefined) => void;
}

export function FontField({
  label,
  value,
  fonts,
  onChange,
}: FontFieldProps): React.JSX.Element {
  const t = useT();
  // Шрифт из открытого файла может отсутствовать в системе — показываем его
  // в списке, чтобы select не «терял» значение.
  const options = value !== undefined && !fonts.includes(value) ? [value, ...fonts] : fonts;
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <select
        className={styles.select}
        value={value ?? ''}
        aria-label={label}
        style={value !== undefined ? { fontFamily: `"${value}"` } : undefined}
        onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value)}
      >
        <option value="">{t('field.defaultOption')}</option>
        {options.map((font) => (
          <option key={font} value={font} style={{ fontFamily: `"${font}"` }}>
            {font}
          </option>
        ))}
      </select>
    </div>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}

export function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: NumberFieldProps): React.JSX.Element {
  return (
    <div className={styles.field}>
      <div className={styles.fieldHeader}>
        <span className={styles.fieldLabel}>{label}</span>
        <span className={styles.fieldValue}>
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        className={styles.range}
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
