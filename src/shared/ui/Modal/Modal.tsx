import React from 'react';
import classes from './Modal.module.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className={classes.overlay} onClick={onClose}>
      <div className={classes.modal} onClick={(e) => e.stopPropagation()}>
        <div className={classes.header}>
          <h3 className={classes.title}>{title}</h3>
          <button className={classes.closeButton} onClick={onClose}>
            &times;
          </button>
        </div>
        <div className={classes.body}>{children}</div>
      </div>
    </div>
  );
};
