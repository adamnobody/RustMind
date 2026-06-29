import { forwardRef } from 'react';
import clsx from 'clsx';
import { Icon, type IconName } from '../Icon/Icon';
import styles from './IconButton.module.css';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  label: string; // для aria-label и tooltip
  variant?: 'default' | 'danger';
  size?: number;
  /** Toggle/pressed state — adds the active style and exposes aria-pressed. */
  active?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, variant = 'default', size = 18, active, className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={clsx(styles.button, styles[variant], active && styles.active, className)}
      aria-label={label}
      title={label}
      aria-pressed={active}
      {...rest}
    >
      <Icon name={icon} size={size} />
    </button>
  );
});
