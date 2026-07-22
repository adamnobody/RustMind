import { describe, it, expect, beforeEach } from 'vitest';
import { useMindMapStore } from '../../src/store/mindMapStore';
import { serializeMindMap, deserializeMindMap } from '../../src/features/persistence/serializer';
import type { SerializedMindMap } from '../../src/features/persistence/schema';
import { FILE_VERSION } from '../../src/features/persistence/schema';
import { DEFAULT_EDGE_STYLE, type EdgeStyle } from '../../src/features/edges/types';
import type { AppNode, AppEdge, ProjectSettings } from '../../src/store/types';

const settings: ProjectSettings = { handleVisibility: 'dashed' };

/** Документ из корня и одного потомка; возвращает id структурного ребра. */
function seedDocument(): string {
  const store = useMindMapStore.getState();
  const rootId = store.getRootNode()!.id;
  store.addChildNode(rootId);
  return useMindMapStore.getState().edges[0].id;
}

function styleOf(edgeId: string): EdgeStyle | undefined {
  return useMindMapStore.getState().edges.find((e) => e.id === edgeId)?.data?.style;
}

describe('routing в store: dirty, history, прунинг', () => {
  beforeEach(() => {
    useMindMapStore.getState().resetDocument();
  });

  it('смена геометрии делает документ грязным и сохраняется в style', () => {
    const edgeId = seedDocument();
    useMindMapStore.getState().markSaved();
    expect(useMindMapStore.getState().isDirty).toBe(false);

    useMindMapStore.getState().setEdgeStyle(edgeId, { routing: 'orthogonal' });

    expect(styleOf(edgeId)?.routing).toBe('orthogonal');
    expect(useMindMapStore.getState().isDirty).toBe(true);
  });

  it("'auto' вырезается как дефолт, а не хранится лишним значением", () => {
    const edgeId = seedDocument();
    useMindMapStore.getState().setEdgeStyle(edgeId, { routing: 'auto' });
    expect(styleOf(edgeId)?.routing).toBeUndefined();

    // И возврат к auto после явного выбора тоже вычищает поле.
    useMindMapStore.getState().setEdgeStyle(edgeId, { routing: 'step' });
    expect(styleOf(edgeId)?.routing).toBe('step');
    useMindMapStore.getState().setEdgeStyle(edgeId, { routing: 'auto' });
    expect(styleOf(edgeId)?.routing).toBeUndefined();
    expect(DEFAULT_EDGE_STYLE.routing).toBe('auto');
  });

  it('undo/redo полностью восстанавливает выбранную геометрию', () => {
    const edgeId = seedDocument();
    useMindMapStore.getState().setEdgeStyle(edgeId, { routing: 'smoothstep' });
    expect(styleOf(edgeId)?.routing).toBe('smoothstep');

    useMindMapStore.getState().undo();
    expect(styleOf(edgeId)?.routing).toBeUndefined();

    useMindMapStore.getState().redo();
    expect(styleOf(edgeId)?.routing).toBe('smoothstep');
  });

  it('серия быстрых правок одного ребра коалесится в одну запись истории', () => {
    const edgeId = seedDocument();
    const store = useMindMapStore.getState();
    store.setEdgeStyle(edgeId, { routing: 'straight' });
    store.setEdgeStyle(edgeId, { routing: 'bezier' });
    store.setEdgeStyle(edgeId, { routing: 'step' });
    expect(styleOf(edgeId)?.routing).toBe('step');

    useMindMapStore.getState().undo();
    // Одна отмена возвращает к состоянию ДО всей серии.
    expect(styleOf(edgeId)?.routing).toBeUndefined();
  });

  it('выбор геометрии не меняет структуру, порядок и позиции узлов', () => {
    const edgeId = seedDocument();
    const before = useMindMapStore.getState();
    const nodesBefore = JSON.stringify(before.nodes);
    const edgeEndpoints = before.edges.map((e) => `${e.source}->${e.target}`);

    useMindMapStore.getState().setEdgeStyle(edgeId, { routing: 'orthogonal' });

    const after = useMindMapStore.getState();
    expect(JSON.stringify(after.nodes)).toBe(nodesBefore);
    expect(after.edges.map((e) => `${e.source}->${e.target}`)).toEqual(edgeEndpoints);
  });

  it('прочие поля стиля переживают смену геометрии', () => {
    const edgeId = seedDocument();
    const store = useMindMapStore.getState();
    store.setEdgeStyle(edgeId, { label: 'подпись', targetArrow: 'filled', taper: true, strokeWidth: 4 });
    useMindMapStore.getState().setEdgeStyle(edgeId, { routing: 'step' });

    expect(styleOf(edgeId)).toMatchObject({
      label: 'подпись',
      targetArrow: 'filled',
      taper: true,
      strokeWidth: 4,
      routing: 'step',
    });
  });
});

describe('routing в persistence', () => {
  const nodes: AppNode[] = [
    { id: 'root', type: 'mindNode', position: { x: 0, y: 0 }, data: { label: 'R', isRoot: true } },
    { id: 'a', type: 'mindNode', position: { x: 0, y: 0 }, data: { label: 'A' } },
  ];

  const edgeWith = (style: EdgeStyle): AppEdge[] => [
    { id: 'e1', source: 'root', target: 'a', data: { kind: 'tree', style } },
  ];

  it('явная геометрия переживает serialize/deserialize round trip', () => {
    const serialized = serializeMindMap(
      'Doc',
      'org',
      nodes,
      edgeWith({ routing: 'orthogonal', targetArrow: 'filled', label: 'x' }),
      settings,
    );
    expect(serialized.edges[0].data?.style?.routing).toBe('orthogonal');

    const restored = deserializeMindMap(serialized);
    expect(restored.edges[0].data?.style).toMatchObject({
      routing: 'orthogonal',
      targetArrow: 'filled',
      label: 'x',
    });
  });

  it("'auto' не пишется в файл (прунинг против дефолта)", () => {
    const serialized = serializeMindMap('Doc', 'org', nodes, edgeWith({ routing: 'auto' }), settings);
    expect(serialized.edges[0].data?.style).toBeUndefined();
  });

  it('старый документ без поля читается как auto и не теряет остальной стиль', () => {
    const legacy: SerializedMindMap = {
      version: FILE_VERSION,
      documentName: 'Legacy',
      layoutType: 'hierarchy',
      nodes: [
        { id: 'root', position: { x: 0, y: 0 }, data: { label: 'R', isRoot: true } },
        { id: 'a', position: { x: 0, y: 0 }, data: { label: 'A' } },
      ],
      // Ребро без kind (legacy) и без routing — должно остаться tree и получить auto.
      edges: [
        {
          id: 'e1',
          source: 'root',
          target: 'a',
          data: { style: { linePattern: 'dashed', strokeColor: '#abcdef', taper: true } },
        },
      ],
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2020-01-01T00:00:00.000Z',
    };

    const restored = deserializeMindMap(legacy);
    const style = restored.edges[0].data?.style;
    expect(style?.routing).toBeUndefined();
    expect({ ...DEFAULT_EDGE_STYLE, ...style }.routing).toBe('auto');
    expect(style).toMatchObject({ linePattern: 'dashed', strokeColor: '#abcdef', taper: true });
    expect(restored.edges[0].data?.kind).toBe('tree'); // миграция legacy-рёбер цела
  });
});
