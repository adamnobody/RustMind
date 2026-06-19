import React from 'react';

export const TopBar: React.FC = () => {
  return (
    <div
      style={{
        height: '50px',
        background: '#eee',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
      }}
    >
      <h1>RustMind TopBar</h1>
    </div>
  );
};
