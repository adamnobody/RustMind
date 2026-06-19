import React from 'react';
import classes from './Tooltip.module.css';

interface TooltipProps {
  content: string;
  children: React.ReactElement;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  return (
    <div className={classes.tooltipContainer} data-tooltip={content}>
      {children}
    </div>
  );
};
