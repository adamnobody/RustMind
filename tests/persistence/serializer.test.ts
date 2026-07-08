import { describe, it, expect, beforeEach } from 'vitest';
import { serializeMindMap, deserializeMindMap } from '../../src/features/persistence/serializer';
import { useMindMapStore } from '../../src/store/mindMapStore';
import type { AppNode, AppEdge, ProjectSettings } from '../../src/store/types';
import type { SerializedMindMap } from '../../src/features/persistence/schema';
import { FILE_VERSION } from '../../src/features/persistence/schema';

const defaultProjectSettings: ProjectSettings = { handleVisibility: 'dashed' };

const makeNode = (id: string, isRoot = false): AppNode => ({
  id,
  type: 'mindNode',
  position: { x: 0, y: 0 },
  data: { label: `Node ${id}`, isRoot },
});

const makeEdge = (source: string, target: string): AppEdge => ({
  id: `edge_${source}__${target}`,
  source,
  target,
});

describe('serializer round-trip', () => {
  it('сериализует и восстанавливает узлы и рёбра', () => {
    const nodes: AppNode[] = [makeNode('root', true), makeNode('child1'), makeNode('child2')];
    const edges: AppEdge[] = [makeEdge('root', 'child1'), makeEdge('root', 'child2')];

    const serialized = serializeMindMap('Test Map', 'hierarchy', nodes, edges, defaultProjectSettings);
    const restored = deserializeMindMap(serialized);

    expect(restored.nodes).toHaveLength(3);
    expect(restored.edges).toHaveLength(2);
    expect(restored.documentName).toBe('Test Map');
    expect(restored.layoutType).toBe('hierarchy');

    for (let i = 0; i < nodes.length; i++) {
      expect(restored.nodes[i].id).toBe(nodes[i].id);
      expect(restored.nodes[i].data.label).toBe(nodes[i].data.label);
      expect(restored.nodes[i].data.isRoot).toBe(nodes[i].data.isRoot);
      expect(restored.nodes[i].type).toBe('mindNode');
    }
    for (let i = 0; i < edges.length; i++) {
      expect(restored.edges[i].id).toBe(edges[i].id);
      expect(restored.edges[i].source).toBe(edges[i].source);
      expect(restored.edges[i].target).toBe(edges[i].target);
    }
  });

  it('сохраняет createdAt при повторной сериализации', () => {
    const nodes: AppNode[] = [makeNode('root', true)];
    const first = serializeMindMap('Doc', 'tree-TB', nodes, [], defaultProjectSettings);
    const second = serializeMindMap('Doc', 'tree-TB', nodes, [], defaultProjectSettings, first.createdAt);

    expect(second.createdAt).toBe(first.createdAt);
    expect(second.version).toBe(FILE_VERSION);
  });

  it('coerceLayoutType заменяет неизвестный тип на hierarchy (дефолт)', () => {
    const nodes: AppNode[] = [makeNode('root', true)];
    const serialized = serializeMindMap('Doc', 'unknown-layout', nodes, [], defaultProjectSettings);
    const restored = deserializeMindMap(serialized);
    expect(restored.layoutType).toBe('hierarchy');
  });

  it('миграция legacy layoutType: tree-LR/tree-TB → hierarchy, radial → tree, упразднённые → hierarchy', () => {
    const nodes: AppNode[] = [makeNode('root', true)];
    const expectations: Array<[string, string]> = [
      ['tree-LR', 'hierarchy'],
      ['tree-TB', 'hierarchy'],
      ['radial', 'tree'],
      ['block', 'hierarchy'],
      ['bridge', 'hierarchy'],
      ['multiflow', 'hierarchy'],
      ['dialogue', 'hierarchy'],
      ['flowchart', 'hierarchy'],
    ];
    for (const [legacy, expected] of expectations) {
      const serialized = serializeMindMap('Doc', legacy, nodes, [], defaultProjectSettings);
      expect(deserializeMindMap(serialized).layoutType).toBe(expected);
    }
  });

  it('новые LayoutKind переживают round-trip как есть', () => {
    const nodes: AppNode[] = [makeNode('root', true)];
    for (const kind of ['hierarchy', 'fishbone', 'tree', 'bubble', 'network', 'free']) {
      const serialized = serializeMindMap('Doc', kind, nodes, [], defaultProjectSettings);
      expect(deserializeMindMap(serialized).layoutType).toBe(kind);
    }
  });

  it('handleOffsets переживают round-trip; отсутствие — не материализуется', () => {
    const withOffsets = makeNode('n1');
    withOffsets.data.handleOffsets = { top: 15, left: 90 };
    const without = makeNode('n2');

    const serialized = serializeMindMap(
      'Doc',
      'tree-LR',
      [withOffsets, without],
      [],
      defaultProjectSettings,
    );
    // JSON-цикл — как при реальном сохранении на диск (undefined-ключи выпадают).
    const restored = deserializeMindMap(
      JSON.parse(JSON.stringify(serialized)) as SerializedMindMap,
    );

    expect(restored.nodes[0].data.handleOffsets).toEqual({ top: 15, left: 90 });
    expect(restored.nodes[1].data.handleOffsets).toBeUndefined();
  });

  it('round-trip через store: loadDocument восстанавливает состояние', () => {
    const store = useMindMapStore.getState();
    store.resetDocument();

    const rootId = store.getRootNode()!.id;
    const childId = store.addChildNode(rootId)!;
    useMindMapStore.getState().updateNodeLabel(childId, 'Дочерний узел');

    const state = useMindMapStore.getState();
    const serialized = serializeMindMap(
      state.documentName,
      state.layoutType,
      state.nodes,
      state.edges,
      state.projectSettings,
    );
    const payload = deserializeMindMap(serialized);

    store.resetDocument();
    useMindMapStore.getState().loadDocument(payload);

    const restoredState = useMindMapStore.getState();
    expect(restoredState.nodes).toHaveLength(2);
    expect(restoredState.edges).toHaveLength(1);
    expect(restoredState.isDirty).toBe(false);

    const restoredChild = restoredState.nodes.find((n) => n.id === childId);
    expect(restoredChild?.data.label).toBe('Дочерний узел');
  });
});

describe('style and projectSettings', () => {
  it('нода без style загружается без ошибок, data.style === undefined', () => {
    const nodes = [makeNode('root', true)]; // нет поля style
    const serialized = serializeMindMap('Doc', 'tree-LR', nodes, [], defaultProjectSettings);
    const restored = deserializeMindMap(serialized);
    expect(restored.nodes[0].data.style).toBeUndefined();
  });

  it('NodeStyle переживает round-trip', () => {
    const nodeWithStyle: AppNode = {
      ...makeNode('root', true),
      data: {
        label: 'Root',
        isRoot: true,
        style: { shape: 'ellipse', borderWidth: 3, borderPattern: 'dashed' },
      },
    };
    const serialized = serializeMindMap('Doc', 'tree-LR', [nodeWithStyle], [], defaultProjectSettings);
    const restored = deserializeMindMap(serialized);
    expect(restored.nodes[0].data.style).toEqual({
      shape: 'ellipse',
      borderWidth: 3,
      borderPattern: 'dashed',
    });
  });

  it('borderPattern равный дефолту (solid) НЕ пишется в файл', () => {
    const node: AppNode = {
      ...makeNode('root', true),
      data: { label: 'Root', isRoot: true, style: { borderPattern: 'solid' } },
    };
    const serialized = serializeMindMap('Doc', 'tree-LR', [node], [], defaultProjectSettings);
    expect(serialized.nodes[0].data.style).toBeUndefined();
  });

  it('дефолтный borderPattern вычищается, не-дефолтные поля остаются', () => {
    const node: AppNode = {
      ...makeNode('root', true),
      data: { label: 'Root', isRoot: true, style: { borderPattern: 'solid', shape: 'diamond' } },
    };
    const serialized = serializeMindMap('Doc', 'tree-LR', [node], [], defaultProjectSettings);
    expect(serialized.nodes[0].data.style).toEqual({ shape: 'diamond' });
  });

  it("borderPattern: 'none' (не дефолт) сериализуется и читается", () => {
    const node: AppNode = {
      ...makeNode('root', true),
      data: { label: 'Root', isRoot: true, style: { borderPattern: 'none' } },
    };
    const serialized = serializeMindMap('Doc', 'tree-LR', [node], [], defaultProjectSettings);
    expect(serialized.nodes[0].data.style).toEqual({ borderPattern: 'none' });
    const restored = deserializeMindMap(serialized);
    expect(restored.nodes[0].data.style).toEqual({ borderPattern: 'none' });
  });

  it('после JSON-записи у застиленного-в-дефолт узла НЕТ ключа style (ни {}, ни undefined)', () => {
    const node: AppNode = {
      ...makeNode('root', true),
      data: { label: 'Root', isRoot: true, style: { borderPattern: 'solid' } }, // = дефолт
    };
    const serialized = serializeMindMap('Doc', 'tree-LR', [node], [], defaultProjectSettings);
    // Имитируем фактическую запись на диск (fileService: JSON.stringify).
    const onDisk = JSON.parse(JSON.stringify(serialized)) as {
      nodes: { data: Record<string, unknown> }[];
    };
    expect('style' in onDisk.nodes[0].data).toBe(false);
  });

  it('sourceHandle/targetHandle ребра переживают round-trip', () => {
    const nodes = [makeNode('a', true), makeNode('b')];
    const edgeWithHandles: AppEdge = {
      id: 'e1',
      source: 'a',
      target: 'b',
      sourceHandle: 'right',
      targetHandle: 'top',
    };
    const serialized = serializeMindMap('Doc', 'tree-LR', nodes, [edgeWithHandles], defaultProjectSettings);
    const restored = deserializeMindMap(serialized);
    expect(restored.edges[0].sourceHandle).toBe('right');
    expect(restored.edges[0].targetHandle).toBe('top');
  });

  it('миграция: структурное ребро без kind → tree + дефолтные хэндлы (LR=right/left)', () => {
    const nodes = [makeNode('a', true), makeNode('b')];
    const edge = makeEdge('a', 'b'); // нет ни kind, ни хэндлов — как в старом файле
    const serialized = serializeMindMap('Doc', 'tree-LR', nodes, [edge], defaultProjectSettings);
    const restored = deserializeMindMap(serialized);
    expect(restored.edges[0].data?.kind).toBe('tree');
    expect(restored.edges[0].sourceHandle).toBe('right');
    expect(restored.edges[0].targetHandle).toBe('left');
  });

  it('backfill фиксирован (right/left) и НЕ зависит от layoutType (даже TB)', () => {
    const nodes = [makeNode('a', true), makeNode('b')];
    const serialized = serializeMindMap('Doc', 'tree-TB', nodes, [makeEdge('a', 'b')], defaultProjectSettings);
    const restored = deserializeMindMap(serialized);
    expect(restored.edges[0].sourceHandle).toBe('right');
    expect(restored.edges[0].targetHandle).toBe('left');
  });

  it('free-ребро переживает round-trip и НЕ получает backfill хэндлов', () => {
    const nodes = [makeNode('a', true), makeNode('b')];
    const freeEdge: AppEdge = {
      id: 'e1',
      source: 'a',
      target: 'b',
      sourceHandle: 'bottom',
      targetHandle: 'right',
      data: { kind: 'free' },
    };
    const serialized = serializeMindMap('Doc', 'tree-LR', nodes, [freeEdge], defaultProjectSettings);
    const restored = deserializeMindMap(serialized);
    // b не связан с корнем ни одним structural-ребром — normalizeStructure
    // дотягивает синтетическое tree-ребро a→b; ищем по id, а не [0], т.к.
    // порядок рёбер после нормализации не гарантирован.
    const restoredFree = restored.edges.find((e) => e.id === 'e1')!;
    expect(restoredFree.data?.kind).toBe('free');
    expect(restoredFree.sourceHandle).toBe('bottom');
    expect(restoredFree.targetHandle).toBe('right');
  });

  it('projectSettings.handleVisibility переживает round-trip', () => {
    const nodes = [makeNode('root', true)];
    const serialized = serializeMindMap('Doc', 'tree-LR', nodes, [], { handleVisibility: 'always' });
    const restored = deserializeMindMap(serialized);
    expect(restored.projectSettings?.handleVisibility).toBe('always');
  });

  it('старый файл без projectSettings: handleVisibility = DEFAULT (dashed)', () => {
    const nodes = [makeNode('root', true)];
    const serialized = serializeMindMap('Doc', 'tree-LR', nodes, [], defaultProjectSettings);
    // Эмулируем старый файл без projectSettings
    const oldFormat: SerializedMindMap = { ...serialized, projectSettings: undefined };
    const restored = deserializeMindMap(oldFormat);
    expect(restored.projectSettings?.handleVisibility).toBe('dashed');
  });

  it('неизвестное значение handleVisibility в файле: fallback на dashed', () => {
    const nodes = [makeNode('root', true)];
    const serialized = serializeMindMap('Doc', 'tree-LR', nodes, [], defaultProjectSettings);
    const badFormat: SerializedMindMap = {
      ...serialized,
      projectSettings: { handleVisibility: 'fancy-unknown' },
    };
    const restored = deserializeMindMap(badFormat);
    expect(restored.projectSettings?.handleVisibility).toBe('dashed');
  });

  it('EdgeStyle переживает round-trip', () => {
    const nodes = [makeNode('root', true), makeNode('child')];
    const styledEdge: AppEdge = {
      id: 'e1',
      source: 'root',
      target: 'child',
      sourceHandle: 'right',
      targetHandle: 'left',
      data: {
        kind: 'tree',
        style: { linePattern: 'dashed', strokeWidth: 3, sourceArrow: 'filled', label: 'connects to' },
      },
    };
    const serialized = serializeMindMap('Doc', 'tree-LR', nodes, [styledEdge], defaultProjectSettings);
    const restored = deserializeMindMap(serialized);
    expect(restored.edges[0].data?.style).toEqual({
      linePattern: 'dashed',
      strokeWidth: 3,
      sourceArrow: 'filled',
      label: 'connects to',
    });
  });

  it('EdgeStyle: новые стрелки (dot/diamond) и taper переживают round-trip', () => {
    const nodes = [makeNode('a', true), makeNode('b')];
    const edge: AppEdge = {
      id: 'e1',
      source: 'a',
      target: 'b',
      data: {
        kind: 'free',
        style: { sourceArrow: 'dot', targetArrow: 'diamond', taper: true },
      },
    };
    const serialized = serializeMindMap('Doc', 'hierarchy', nodes, [edge], defaultProjectSettings);
    // JSON-цикл — как при реальной записи на диск.
    const restored = deserializeMindMap(
      JSON.parse(JSON.stringify(serialized)) as SerializedMindMap,
    );
    // b получает синтетическое structural-ребро от normalizeStructure — ищем
    // по id, порядок рёбер после нормализации не гарантирован.
    expect(restored.edges.find((e) => e.id === 'e1')!.data?.style).toEqual({
      sourceArrow: 'dot',
      targetArrow: 'diamond',
      taper: true,
    });
  });

  it('EdgeStyle: taper=false (дефолт) НЕ пишется в файл', () => {
    const nodes = [makeNode('a', true), makeNode('b')];
    const edge: AppEdge = {
      id: 'e1',
      source: 'a',
      target: 'b',
      data: { kind: 'free', style: { taper: false, sourceArrow: 'dot' } },
    };
    const serialized = serializeMindMap('Doc', 'hierarchy', nodes, [edge], defaultProjectSettings);
    expect(serialized.edges[0].data?.style).toEqual({ sourceArrow: 'dot' });
  });

  it('EdgeStyle: стиль текста ребра (labelFontSize/labelColor) переживает round-trip', () => {
    const nodes = [makeNode('a', true), makeNode('b')];
    const edge: AppEdge = {
      id: 'e1',
      source: 'a',
      target: 'b',
      data: { kind: 'tree', style: { label: 'привет', labelFontSize: 16, labelColor: '#abcdef' } },
    };
    const serialized = serializeMindMap('Doc', 'tree-LR', nodes, [edge], defaultProjectSettings);
    const restored = deserializeMindMap(serialized);
    expect(restored.edges[0].data?.style).toEqual({
      label: 'привет',
      labelFontSize: 16,
      labelColor: '#abcdef',
    });
  });

  it('EdgeStyle: поля, равные дефолту, НЕ пишутся (strip по DEFAULT_EDGE_STYLE)', () => {
    const nodes = [makeNode('a', true), makeNode('b')];
    const edge: AppEdge = {
      id: 'e1',
      source: 'a',
      target: 'b',
      data: {
        kind: 'tree',
        // Все значения = дефолтам: ничего не должно записаться.
        style: {
          linePattern: 'solid',
          strokeWidth: 2,
          strokeColor: 'var(--rm-edge)',
          sourceArrow: 'none',
          targetArrow: 'none',
          labelFontSize: 12,
          labelColor: 'var(--rm-text)',
        },
      },
    };
    const serialized = serializeMindMap('Doc', 'tree-LR', nodes, [edge], defaultProjectSettings);
    expect(serialized.edges[0].data?.style).toBeUndefined();
  });

  it('EdgeStyle: дефолтные поля вычищаются, label (без дефолта) и не-дефолты остаются', () => {
    const nodes = [makeNode('a', true), makeNode('b')];
    const edge: AppEdge = {
      id: 'e1',
      source: 'a',
      target: 'b',
      data: {
        kind: 'tree',
        // strokeWidth=2 и sourceArrow='none' — дефолт; label и dashed — нет.
        style: { strokeWidth: 2, sourceArrow: 'none', linePattern: 'dashed', label: 'x' },
      },
    };
    const serialized = serializeMindMap('Doc', 'tree-LR', nodes, [edge], defaultProjectSettings);
    expect(serialized.edges[0].data?.style).toEqual({ linePattern: 'dashed', label: 'x' });
  });

  it('label сохраняется, даже когда ВСЕ остальные поля = дефолту (prune не трогает label)', () => {
    // DEFAULT_EDGE_STYLE НЕ содержит label → prune не может срезать его по дефолту.
    const nodes = [makeNode('a', true), makeNode('b')];
    const edge: AppEdge = {
      id: 'e1',
      source: 'a',
      target: 'b',
      data: {
        kind: 'tree',
        style: {
          linePattern: 'solid',
          strokeWidth: 2,
          strokeColor: 'var(--rm-edge)',
          sourceArrow: 'none',
          targetArrow: 'none',
          labelFontSize: 12,
          labelColor: 'var(--rm-text)',
          label: 'keep',
        },
      },
    };
    const serialized = serializeMindMap('Doc', 'tree-LR', nodes, [edge], defaultProjectSettings);
    expect(serialized.edges[0].data?.style).toEqual({ label: 'keep' });
  });

  it("пустой label: '' пишется как есть (у label нет дефолта; prune режет только undefined/дефолт)", () => {
    const nodes = [makeNode('a', true), makeNode('b')];
    const edge: AppEdge = {
      id: 'e1',
      source: 'a',
      target: 'b',
      data: { kind: 'tree', style: { label: '', strokeWidth: 2 } }, // strokeWidth=2 = дефолт → срежется
    };
    const serialized = serializeMindMap('Doc', 'tree-LR', nodes, [edge], defaultProjectSettings);
    expect(serialized.edges[0].data?.style).toEqual({ label: '' });
  });

  it('после JSON-записи у ребра со всеми-дефолтными полями НЕТ ключа style (edge-путь if не пишет {})', () => {
    const nodes = [makeNode('a', true), makeNode('b')];
    const edge: AppEdge = {
      id: 'e1',
      source: 'a',
      target: 'b',
      data: {
        kind: 'tree',
        style: {
          linePattern: 'solid',
          strokeWidth: 2,
          strokeColor: 'var(--rm-edge)',
          sourceArrow: 'none',
          targetArrow: 'none',
          labelFontSize: 12,
          labelColor: 'var(--rm-text)',
        },
      },
    };
    const serialized = serializeMindMap('Doc', 'tree-LR', nodes, [edge], defaultProjectSettings);
    // Имитируем реальную запись на диск (fileService: JSON.stringify).
    const onDisk = JSON.parse(JSON.stringify(serialized)) as {
      edges: { data: Record<string, unknown> }[];
    };
    expect('style' in onDisk.edges[0].data).toBe(false);
    // data ребра существует (kind), но без пустого style: {}.
    expect(onDisk.edges[0].data).toEqual({ kind: 'tree' });
  });

  it('NodeStyle с shape/textColor/fontFamily переживает round-trip', () => {
    const nodeWithStyle: AppNode = {
      ...makeNode('root', true),
      data: {
        label: 'Root',
        isRoot: true,
        style: { shape: 'diamond', textColor: '#ff0000', fontFamily: 'Monospace' },
      },
    };
    const serialized = serializeMindMap('Doc', 'tree-LR', [nodeWithStyle], [], defaultProjectSettings);
    const restored = deserializeMindMap(serialized);
    expect(restored.nodes[0].data.style).toEqual({
      shape: 'diamond',
      textColor: '#ff0000',
      fontFamily: 'Monospace',
    });
  });

  it('NodeStyle с shape/textColor/fontFamily = undefined не пишется в файл', () => {
    const nodeWithAllUndefined: AppNode = {
      ...makeNode('root', true),
      data: {
        label: 'Root',
        isRoot: true,
        style: { shape: undefined, textColor: undefined, fontFamily: undefined },
      },
    };
    const serialized = serializeMindMap('Doc', 'tree-LR', [nodeWithAllUndefined], [], defaultProjectSettings);
    expect(serialized.nodes[0].data.style).toBeUndefined();
  });

  it('пустой NodeStyle не записывается в файл', () => {
    const nodeWithEmptyStyle: AppNode = {
      ...makeNode('root', true),
      data: { label: 'Root', isRoot: true, style: {} },
    };
    const serialized = serializeMindMap('Doc', 'tree-LR', [nodeWithEmptyStyle], [], defaultProjectSettings);
    expect(serialized.nodes[0].data.style).toBeUndefined();
  });

  it('NodeStyle с undefined-полями не раздувает файл', () => {
    const nodeWithPartialStyle: AppNode = {
      ...makeNode('root', true),
      data: { label: 'Root', isRoot: true, style: { shape: undefined, borderWidth: 3 } },
    };
    const serialized = serializeMindMap('Doc', 'tree-LR', [nodeWithPartialStyle], [], defaultProjectSettings);
    expect(serialized.nodes[0].data.style).toEqual({ borderWidth: 3 });
  });

  it('edge без style не раздувает данные', () => {
    const nodes = [makeNode('a', true), makeNode('b')];
    const edge: AppEdge = { id: 'e1', source: 'a', target: 'b', data: { kind: 'tree' } };
    const serialized = serializeMindMap('Doc', 'tree-LR', nodes, [edge], defaultProjectSettings);
    expect(serialized.edges[0].data?.style).toBeUndefined();
  });

  it('версия файла соответствует FILE_VERSION', () => {
    const nodes = [makeNode('root', true)];
    const serialized = serializeMindMap('Doc', 'tree-LR', nodes, [], defaultProjectSettings);
    expect(serialized.version).toBe(FILE_VERSION);
  });

  it('старый файл (version 1, без NodeStyle/EdgeStyle) открывается без ошибок', () => {
    const oldFile: SerializedMindMap = {
      version: 1,
      documentName: 'Old Doc',
      layoutType: 'tree-LR',
      nodes: [{ id: 'root', position: { x: 0, y: 0 }, data: { label: 'Root', isRoot: true } }],
      edges: [],
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };
    const restored = deserializeMindMap(oldFile);
    expect(restored.documentName).toBe('Old Doc');
    expect(restored.nodes[0].data.style).toBeUndefined();
    expect(restored.edges).toHaveLength(0);
  });

  it('старый файл (version 1) с рёбрами открывается: kind=tree, backfill хэндлов', () => {
    const oldFile: SerializedMindMap = {
      version: 1,
      documentName: 'Old With Edges',
      layoutType: 'tree-LR',
      nodes: [
        { id: 'root', position: { x: 0, y: 0 }, data: { label: 'Root', isRoot: true } },
        { id: 'child', position: { x: 200, y: 0 }, data: { label: 'Child' } },
      ],
      edges: [{ id: 'e1', source: 'root', target: 'child' }],
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };
    const restored = deserializeMindMap(oldFile);
    expect(restored.edges[0].data?.kind).toBe('tree');
    expect(restored.edges[0].data?.style).toBeUndefined();
    expect(restored.edges[0].sourceHandle).toBe('right');
    expect(restored.edges[0].targetHandle).toBe('left');
  });

  it('ребро: kind + оба хэндла + style выживают round-trip одновременно', () => {
    // free-ребро: kind не coerce-ится, хэндлы не получают backfill, style — полный
    const nodes = [makeNode('a', true), makeNode('b')];
    const edge: AppEdge = {
      id: 'e1',
      source: 'a',
      target: 'b',
      sourceHandle: 'bottom',
      targetHandle: 'top',
      data: {
        kind: 'free',
        style: { linePattern: 'dotted', strokeWidth: 4, targetArrow: 'open', label: 'assoc' },
      },
    };
    const serialized = serializeMindMap('Doc', 'tree-LR', nodes, [edge], defaultProjectSettings);
    const restored = deserializeMindMap(serialized);
    // b не связан с корнем ни одним structural-ребром — normalizeStructure
    // дотягивает синтетическое tree-ребро a→b; ищем исходное по id.
    const restoredEdge = restored.edges.find((e) => e.id === 'e1')!;
    expect(restoredEdge.data?.kind).toBe('free');
    expect(restoredEdge.sourceHandle).toBe('bottom');
    expect(restoredEdge.targetHandle).toBe('top');
    expect(restoredEdge.data?.style).toEqual({
      linePattern: 'dotted',
      strokeWidth: 4,
      targetArrow: 'open',
      label: 'assoc',
    });
  });
});

describe('isDirty tracking', () => {
  beforeEach(() => {
    useMindMapStore.getState().resetDocument();
  });

  it('isDirty = false после сброса', () => {
    expect(useMindMapStore.getState().isDirty).toBe(false);
  });

  it('isDirty = true после добавления узла', () => {
    const state = useMindMapStore.getState();
    state.addChildNode(state.getRootNode()!.id);
    expect(useMindMapStore.getState().isDirty).toBe(true);
  });

  it('isDirty = true после изменения метки', () => {
    const state = useMindMapStore.getState();
    state.updateNodeLabel(state.getRootNode()!.id, 'Изменено');
    expect(useMindMapStore.getState().isDirty).toBe(true);
  });

  it('isDirty = false после markSaved', () => {
    const state = useMindMapStore.getState();
    state.addChildNode(state.getRootNode()!.id);
    useMindMapStore.getState().markSaved();
    expect(useMindMapStore.getState().isDirty).toBe(false);
  });

  it('isDirty = false после loadDocument', () => {
    const state = useMindMapStore.getState();
    state.addChildNode(state.getRootNode()!.id);

    const payload = {
      documentName: 'Loaded',
      layoutType: 'hierarchy' as const,
      nodes: [makeNode('root', true)],
      edges: [],
    };
    useMindMapStore.getState().loadDocument(payload);
    expect(useMindMapStore.getState().isDirty).toBe(false);
  });

  it('isDirty = true после deleteNode', () => {
    const state = useMindMapStore.getState();
    const childId = state.addChildNode(state.getRootNode()!.id)!;
    useMindMapStore.getState().markSaved();
    useMindMapStore.getState().deleteNode(childId);
    expect(useMindMapStore.getState().isDirty).toBe(true);
  });
});
