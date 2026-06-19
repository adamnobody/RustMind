import React from 'react';
import clsx from 'clsx';
import classes from './Button.module.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'secondary',
  size = 'md',
  ...props
}) => {
  return (
    <button className={clsx(classes.button, classes[variant], classes[size], className)} {...props}>
      {children}
    </button>
  );
};
