import type { AppNode, AppEdge, LoadDocumentPayload } from '../../store/types';
import type { LayoutKind } from '../layout/engines/layoutTypes';
import type { Locale } from '../../shared/i18n/locales';
import { MIND_NODE_TYPE } from '../nodes/types';
import { DEFAULT_TREE_EDGE_HANDLES } from '../edges/types';
import { generateNodeId, generateEdgeId } from '../../shared/lib/id';
import { NODE_COLORS } from '../../shared/lib/constants';

/** Локализованная строка. Контент шаблонов держим здесь, а не в общем словаре. */
type Loc = Record<Locale, string>;
const L = (ru: string, en: string, de: string, fr: string): Loc => ({ ru, en, de, fr });

interface TplNode {
  label: Loc;
  children?: TplNode[];
}

export interface TemplateDef {
  id: string;
  title: Loc;
  layoutType: LayoutKind;
  root: TplNode;
}

const leaf = (label: Loc): TplNode => ({ label });

export const TEMPLATES: TemplateDef[] = [
  {
    id: 'swot',
    title: L('SWOT-анализ', 'SWOT analysis', 'SWOT-Analyse', 'Analyse SWOT'),
    layoutType: 'both',
    root: {
      label: L('SWOT', 'SWOT', 'SWOT', 'SWOT'),
      children: [
        leaf(L('Сильные стороны', 'Strengths', 'Stärken', 'Forces')),
        leaf(L('Слабые стороны', 'Weaknesses', 'Schwächen', 'Faiblesses')),
        leaf(L('Возможности', 'Opportunities', 'Chancen', 'Opportunités')),
        leaf(L('Угрозы', 'Threats', 'Risiken', 'Menaces')),
      ],
    },
  },
  {
    id: 'weekly',
    title: L('План на неделю', 'Weekly plan', 'Wochenplan', 'Plan de la semaine'),
    layoutType: 'right',
    root: {
      label: L('Неделя', 'Week', 'Woche', 'Semaine'),
      children: [
        leaf(L('Понедельник', 'Monday', 'Montag', 'Lundi')),
        leaf(L('Вторник', 'Tuesday', 'Dienstag', 'Mardi')),
        leaf(L('Среда', 'Wednesday', 'Mittwoch', 'Mercredi')),
        leaf(L('Четверг', 'Thursday', 'Donnerstag', 'Jeudi')),
        leaf(L('Пятница', 'Friday', 'Freitag', 'Vendredi')),
      ],
    },
  },
  {
    id: 'project',
    title: L('План проекта', 'Project plan', 'Projektplan', 'Plan de projet'),
    layoutType: 'hierarchy',
    root: {
      label: L('Проект', 'Project', 'Projekt', 'Projet'),
      children: [
        leaf(L('Цели', 'Goals', 'Ziele', 'Objectifs')),
        {
          label: L('Задачи', 'Tasks', 'Aufgaben', 'Tâches'),
          children: [
            leaf(L('Задача 1', 'Task 1', 'Aufgabe 1', 'Tâche 1')),
            leaf(L('Задача 2', 'Task 2', 'Aufgabe 2', 'Tâche 2')),
          ],
        },
        leaf(L('Сроки', 'Timeline', 'Zeitplan', 'Échéancier')),
        leaf(L('Команда', 'Team', 'Team', 'Équipe')),
      ],
    },
  },
  {
    id: 'brainstorm',
    title: L('Мозговой штурм', 'Brainstorm', 'Brainstorming', 'Remue-méninges'),
    layoutType: 'both',
    root: {
      label: L('Тема', 'Topic', 'Thema', 'Sujet'),
      children: [
        leaf(L('Идея 1', 'Idea 1', 'Idee 1', 'Idée 1')),
        leaf(L('Идея 2', 'Idea 2', 'Idee 2', 'Idée 2')),
        leaf(L('Идея 3', 'Idea 3', 'Idee 3', 'Idée 3')),
      ],
    },
  },
];

/** Развернуть дерево шаблона в узлы/рёбра с генерацией id и порядком сиблингов. */
export function buildTemplate(def: TemplateDef, locale: Locale): LoadDocumentPayload {
  const nodes: AppNode[] = [];
  const edges: AppEdge[] = [];

  const walk = (tpl: TplNode, parentId: string | null, order: number): void => {
    const id = generateNodeId();
    const isRoot = parentId === null;
    nodes.push({
      id,
      type: MIND_NODE_TYPE,
      position: { x: 0, y: 0 }, // loadDocument пересчитает позиции по раскладке
      data: {
        label: tpl.label[locale],
        order,
        ...(isRoot ? { isRoot: true, color: NODE_COLORS.root } : {}),
      },
    });
    if (parentId) {
      edges.push({
        id: generateEdgeId(parentId, id),
        source: parentId,
        target: id,
        type: 'mindEdge',
        sourceHandle: DEFAULT_TREE_EDGE_HANDLES.sourceHandle,
        targetHandle: DEFAULT_TREE_EDGE_HANDLES.targetHandle,
        data: { kind: 'tree' },
      });
    }
    (tpl.children ?? []).forEach((child, i) => walk(child, id, i));
  };

  walk(def.root, null, 0);
  return { documentName: def.title[locale], layoutType: def.layoutType, nodes, edges };
}
