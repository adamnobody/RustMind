import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGlobalHotkeys } from '../../src/features/canvas/hooks/useGlobalHotkeys';
import { useMindMapStore } from '../../src/store/mindMapStore';
import { useUIStore } from '../../src/store/uiStore';

function pressKeyL(target: EventTarget = window, init: KeyboardEventInit = {}): void {
  target.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'l',
      code: 'KeyL',
      bubbles: true,
      cancelable: true,
      ...init,
    }),
  );
}

/** Ставит раскладку напрямую (без запуска layout-алгоритмов) и возвращает шпион на applyAutoLayoutManual. */
function spyOnAutoLayout(layoutType: 'network' | 'hierarchy'): ReturnType<typeof vi.fn> {
  useMindMapStore.setState({ layoutType });
  const spy = vi
    .spyOn(useMindMapStore.getState(), 'applyAutoLayoutManual')
    .mockImplementation(() => {});
  return spy;
}

describe('useGlobalHotkeys — L (авто-раскладка)', () => {
  beforeEach(() => {
    useMindMapStore.getState().resetDocument();
    useUIStore.setState({ selectedNodeId: null, editingNodeId: null, _fitViewFn: null });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('network: L вызывает applyAutoLayoutManual и планирует fitView', () => {
    const spy = spyOnAutoLayout('network');
    const fitView = vi.fn();
    useUIStore.setState({ _fitViewFn: fitView });
    renderHook(() => useGlobalHotkeys());

    pressKeyL();

    expect(spy).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60);
    expect(fitView).toHaveBeenCalledTimes(1);
  });

  it('derived-раскладка (hierarchy): L не запускает авто-раскладку', () => {
    const spy = spyOnAutoLayout('hierarchy');
    renderHook(() => useGlobalHotkeys());

    pressKeyL();

    expect(spy).not.toHaveBeenCalled();
  });

  it('не срабатывает с модификаторами (Ctrl+L)', () => {
    const spy = spyOnAutoLayout('network');
    renderHook(() => useGlobalHotkeys());

    pressKeyL(window, { ctrlKey: true });

    expect(spy).not.toHaveBeenCalled();
  });

  it('не срабатывает при вводе в input/textarea', () => {
    const spy = spyOnAutoLayout('network');
    renderHook(() => useGlobalHotkeys());
    const input = document.createElement('input');
    document.body.appendChild(input);

    pressKeyL(input);

    expect(spy).not.toHaveBeenCalled();
    input.remove();
  });

  it('не срабатывает во время инлайн-редактирования узла', () => {
    const spy = spyOnAutoLayout('network');
    useUIStore.setState({ editingNodeId: 'some-node' });
    renderHook(() => useGlobalHotkeys());

    pressKeyL();

    expect(spy).not.toHaveBeenCalled();
  });
});
