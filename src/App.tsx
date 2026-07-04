import { useCallback, useState } from 'react';
import { HomeScreen } from './app/routes/HomeScreen';
import { EditorScreen } from './app/routes/EditorScreen';
import { useMindMapStore } from './store/mindMapStore';
import { translate } from './shared/i18n';
import './styles/global.css';

type Screen = 'home' | 'editor';

export function App(): React.JSX.Element {
  const [screen, setScreen] = useState<Screen>('home');

  const enterEditor = useCallback(() => setScreen('editor'), []);

  const goHome = useCallback(() => {
    const { isDirty } = useMindMapStore.getState();
    if (isDirty && !window.confirm(translate('dialog.unsavedHome'))) {
      return;
    }
    // Сбрасываем брошенный документ, чтобы устаревший isDirty не «просочился»
    // в следующую сессию редактора (guard закрытия окна смотрит на него).
    useMindMapStore.getState().resetDocument();
    setScreen('home');
  }, []);

  return screen === 'home' ? (
    <HomeScreen onEnterEditor={enterEditor} />
  ) : (
    <EditorScreen onGoHome={goHome} />
  );
}

export default App;
