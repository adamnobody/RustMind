import React from 'react';

interface HomeScreenProps {
  onCreateNew: () => void;
  onOpenFile?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onCreateNew }) => {
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>RustMind</h1>
      <p>Редактор интеллект-карт, схем и блок-схем</p>
      <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button onClick={onCreateNew}>Создать новую карту</button>
        <button>Открыть файл</button>
      </div>
    </div>
  );
};
