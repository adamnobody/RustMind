import type { LayoutStrategy } from './types';
import { withPositions } from './shared';

const ITERATIONS = 200;
const IDEAL_DIST = 240; // целевая длина ребра / дистанция отталкивания
const INITIAL_RADIUS = 320;

/**
 * Сеть взаимосвязей: force-directed (Фрухтерман–Рейнгольд, детерминированный —
 * без Math.random: стартовые позиции по кругу от индекса). Ноды отталкиваются,
 * рёбра притягивают, циклы разрешены, связи любые.
 */
export const networkStrategy: LayoutStrategy = {
  kind: 'network',
  nodeConstraint: 'soft',
  edgeConstraint: 'any',
  positionMode: 'stored',
  edgeRouting: 'radial',
  blockedReasonKey: 'constraint.free',
  canConnect: () => true,
  layout: (nodes, edges) => {
    const n = nodes.length;
    if (n === 0) return nodes;
    if (n === 1) return withPositions(nodes, new Map([[nodes[0].id, { x: 0, y: 0 }]]));

    // Детерминированный старт: равномерно по кругу (золотой угол против
    // симметричных вырождений, когда соседние по индексу узлы связаны).
    const index = new Map(nodes.map((node, i) => [node.id, i]));
    const px = new Float64Array(n);
    const py = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const angle = i * 2.399963229728653; // золотой угол в радианах
      const r = INITIAL_RADIUS * Math.sqrt((i + 1) / n);
      px[i] = r * Math.cos(angle);
      py[i] = r * Math.sin(angle);
    }

    const pairs: Array<[number, number]> = [];
    for (const e of edges) {
      const s = index.get(e.source);
      const t = index.get(e.target);
      if (s !== undefined && t !== undefined && s !== t) pairs.push([s, t]);
    }

    const k = IDEAL_DIST;
    const dx = new Float64Array(n);
    const dy = new Float64Array(n);
    for (let iter = 0; iter < ITERATIONS; iter++) {
      dx.fill(0);
      dy.fill(0);
      // Отталкивание всех пар: F = k² / d.
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          let vx = px[i] - px[j];
          let vy = py[i] - py[j];
          let d = Math.hypot(vx, vy);
          if (d < 0.01) {
            // Совпавшие точки разводим детерминированно по индексу.
            vx = Math.cos(i);
            vy = Math.sin(j);
            d = 0.01;
          }
          const f = (k * k) / d / d;
          dx[i] += vx * f;
          dy[i] += vy * f;
          dx[j] -= vx * f;
          dy[j] -= vy * f;
        }
      }
      // Притяжение по рёбрам: F = d / k.
      for (const [s, t] of pairs) {
        const vx = px[s] - px[t];
        const vy = py[s] - py[t];
        const d = Math.max(Math.hypot(vx, vy), 0.01);
        const f = d / k;
        dx[s] -= (vx / d) * f * d * 0.5;
        dy[s] -= (vy / d) * f * d * 0.5;
        dx[t] += (vx / d) * f * d * 0.5;
        dy[t] += (vy / d) * f * d * 0.5;
      }
      // Охлаждение: шаг убывает линейно.
      const temp = (IDEAL_DIST / 2) * (1 - iter / ITERATIONS) + 1;
      for (let i = 0; i < n; i++) {
        const d = Math.max(Math.hypot(dx[i], dy[i]), 0.01);
        px[i] += (dx[i] / d) * Math.min(d, temp);
        py[i] += (dy[i] / d) * Math.min(d, temp);
      }
    }

    const positions = new Map<string, { x: number; y: number }>();
    nodes.forEach((node, i) => {
      positions.set(node.id, { x: Math.round(px[i]), y: Math.round(py[i]) });
    });
    return withPositions(nodes, positions);
  },
};
