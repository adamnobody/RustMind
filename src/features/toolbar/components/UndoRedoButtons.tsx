import React from 'react';

export const UndoRedoButtons: React.FC = () => {
  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      <button disabled>Undo</button>
      <button disabled>Redo</button>
    </div>
  );
};
