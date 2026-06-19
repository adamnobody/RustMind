import React from 'react';

export const LayoutSwitcher: React.FC = () => {
  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      <button>LR</button>
      <button>TB</button>
    </div>
  );
};
