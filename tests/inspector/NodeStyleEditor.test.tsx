import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, render, screen, within, fireEvent } from '@testing-library/react';
import { NodeStyleEditor } from '../../src/features/inspector/components/NodeStyleEditor';
import { useMindMapStore } from '../../src/store/mindMapStore';
import { useUIStore } from '../../src/store/uiStore';
import type { MindNodeData } from '../../src/domain/mind-map';

vi.mock('../../src/shared/lib/fonts', () => ({
  FALLBACK_FONTS: ['Inter', 'Georgia'],
  listSystemFonts: () => Promise.resolve(['Inter', 'Georgia']),
}));

function sectionHeaders(): HTMLElement[] {
  return screen.getAllByRole('button').filter((el) => el.hasAttribute('aria-controls'));
}

function sectionTitles(): string[] {
  return sectionHeaders().map(
    (h) => h.querySelector('[class*="collapsibleTitle"]')?.textContent?.trim() ?? '',
  );
}

async function renderEditor(data?: Partial<MindNodeData>): Promise<{
  nodeId: string;
  rerender: (next?: Partial<MindNodeData>) => void;
}> {
  const root = useMindMapStore.getState().getRootNode()!;
  const merged: MindNodeData = { ...root.data, ...data };
  let view!: ReturnType<typeof render>;
  await act(async () => {
    view = render(<NodeStyleEditor nodeId={root.id} data={merged} />);
    await Promise.resolve();
  });
  return {
    nodeId: root.id,
    rerender: (next) => {
      const latest = useMindMapStore.getState().nodes.find((n) => n.id === root.id)!;
      view.rerender(
        <NodeStyleEditor nodeId={root.id} data={{ ...latest.data, ...data, ...next }} />,
      );
    },
  };
}

beforeEach(() => {
  useMindMapStore.getState().resetDocument();
  useUIStore.setState({ locale: 'ru' });
});

describe('NodeStyleEditor — section hierarchy', () => {
  it('renders three sections in order: appearance, text, connection points', async () => {
    await renderEditor();

    expect(sectionHeaders().map((h) => h.getAttribute('aria-expanded'))).toEqual([
      'true',
      'true',
      'false',
    ]);
    expect(sectionTitles()).toEqual(['Внешний вид', 'Текст', 'Точки соединения']);
  });

  it('opens appearance and text by default; connection points stay collapsed', async () => {
    await renderEditor();

    const [appearance, text, handles] = sectionHeaders();
    expect(appearance).toHaveAttribute('aria-expanded', 'true');
    expect(text).toHaveAttribute('aria-expanded', 'true');
    expect(handles).toHaveAttribute('aria-expanded', 'false');

    expect(screen.getByRole('radiogroup', { name: 'Форма' })).toBeInTheDocument();
    expect(screen.getByLabelText('Шрифт')).toBeInTheDocument();
    expect(screen.queryByLabelText('Верхняя точка')).not.toBeInTheDocument();
  });

  it('reveals handle controls after expanding connection points', async () => {
    await renderEditor();

    fireEvent.click(sectionHeaders()[2]!);

    expect(sectionHeaders()[2]).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('Верхняя точка')).toBeInTheDocument();
    expect(screen.getByLabelText('Правая точка')).toBeInTheDocument();
    expect(screen.getByLabelText('Нижняя точка')).toBeInTheDocument();
    expect(screen.getByLabelText('Левая точка')).toBeInTheDocument();
  });

  it('keeps shape and font controls working', async () => {
    const { nodeId } = await renderEditor();

    const shapeGroup = screen.getByRole('radiogroup', { name: 'Форма' });
    fireEvent.click(within(shapeGroup).getByRole('radio', { name: 'Ромб' }));
    expect(useMindMapStore.getState().nodes.find((n) => n.id === nodeId)?.data.style?.shape).toBe(
      'diamond',
    );

    fireEvent.change(screen.getByLabelText('Шрифт'), { target: { value: 'Georgia' } });
    expect(
      useMindMapStore.getState().nodes.find((n) => n.id === nodeId)?.data.style?.fontFamily,
    ).toBe('Georgia');
  });

  it('exposes a labeled custom color control in the palette', async () => {
    await renderEditor();

    fireEvent.click(screen.getByRole('button', { name: 'Цвет фона' }));

    expect(screen.getByLabelText('Свой цвет')).toBeInTheDocument();
    expect(screen.getByText('Свой цвет')).toBeInTheDocument();
    expect(screen.getByLabelText('Цвет фона: HEX')).toBeInTheDocument();
  });

  it('applies a typed hex as a custom fill color', async () => {
    const { nodeId } = await renderEditor();

    fireEvent.change(screen.getByLabelText('Цвет фона: HEX'), { target: { value: '#ff00aa' } });

    expect(
      useMindMapStore.getState().nodes.find((n) => n.id === nodeId)?.data.style?.backgroundColor,
    ).toBe('#ff00aa');
  });

  it('disables border color and width when border style is none', async () => {
    const { nodeId, rerender } = await renderEditor({ style: { borderPattern: 'none' } });

    expect(screen.getByRole('button', { name: 'Цвет границы' })).toBeDisabled();
    expect(screen.getByLabelText('Толщина границы')).toBeDisabled();

    const styleGroup = screen.getByRole('radiogroup', { name: 'Стиль границы' });
    fireEvent.click(within(styleGroup).getByRole('radio', { name: 'Сплошная' }));
    // solid — дефолт, setNodeStyle прунит поле → undefined
    expect(
      useMindMapStore.getState().nodes.find((n) => n.id === nodeId)?.data.style?.borderPattern,
    ).toBeUndefined();

    const latest = useMindMapStore.getState().nodes.find((n) => n.id === nodeId)!;
    rerender({ style: latest.data.style });
    expect(screen.getByRole('button', { name: 'Цвет границы' })).not.toBeDisabled();
    expect(screen.getByLabelText('Толщина границы')).not.toBeDisabled();
  });
});
