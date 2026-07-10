import type { CSSProperties } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  useInternalNode,
  type EdgeProps,
  type InternalNode,
} from '@xyflow/react';
import { useMindMapStore } from '../../../store/mindMapStore';
import { useUIStore } from '../../../store/uiStore';
import { getLayoutStrategy } from '../../layout/strategies/registry';
import { DEFAULT_NODE_SIZE, ROOT_NODE_SIZE } from '../../../shared/lib/constants';
import {
  routeEdge,
  routeFixed,
  type CubicControls,
  type Point,
  type PortSide,
  type Rect,
} from '../lib/routing';
import {
  DEFAULT_EDGE_STYLE,
  type EdgeArrowType,
  type EdgeLinePattern,
  type MindEdgeData,
} from '../types';
import styles from './MindEdge.module.css';

/**
 * Каждое ребро объявляет собственные <marker> в <defs> с id, производным от id
 * ребра: маркеры зависят от цвета/выделения конкретного ребра, поэтому общие
 * дефы на канвас не годятся — два ребра разных цветов конфликтовали бы за один
 * маркер. orient="auto-start-reverse" позволяет одному маркеру обслуживать оба
 * конца: на markerStart браузер сам разворачивает его наружу.
 */
function ArrowMarker({
  id,
  type,
  color,
}: {
  id: string;
  type: Exclude<EdgeArrowType, 'none'>;
  color: string;
}): React.JSX.Element {
  return (
    <marker
      id={id}
      viewBox="0 0 10 10"
      refX={8.5}
      refY={5}
      markerWidth={5}
      markerHeight={5}
      markerUnits="strokeWidth"
      orient="auto-start-reverse"
    >
      {type === 'filled' ? (
        <path d="M 1 1.5 L 9 5 L 1 8.5 z" fill={color} />
      ) : type === 'dot' ? (
        <circle cx="5" cy="5" r="3.4" fill={color} />
      ) : type === 'diamond' ? (
        <path d="M 5 1.2 L 8.8 5 L 5 8.8 L 1.2 5 z" fill={color} />
      ) : (
        <polyline
          points="1.5,1.5 8.5,5 1.5,8.5"
          fill="none"
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </marker>
  );
}

/** dasharray для паттерна; для dotted круглые точки даёт round linecap + нулевой штрих. */
function dashArrayFor(pattern: EdgeLinePattern, strokeWidth: number): string | undefined {
  switch (pattern) {
    case 'dashed':
      return '9 6';
    case 'dotted':
      return `0.1 ${Math.max(6, strokeWidth * 3)}`;
    default:
      return undefined;
  }
}

/**
 * Прямоугольник ноды в координатах потока. Fallback, если нода ещё не
 * измерена/не найдена: нулевой rect в точке хэндла (portToward выродится в
 * саму точку — ребро рисуется от неё, как раньше).
 */
function nodeRect(node: InternalNode | undefined, fx: number, fy: number): Rect {
  if (!node) return { x: fx, y: fy, width: 0, height: 0 };
  const fallback = node.data?.isRoot ? ROOT_NODE_SIZE : DEFAULT_NODE_SIZE;
  const width = node.measured?.width ?? fallback.width;
  const height = node.measured?.height ?? fallback.height;
  return { x: node.internals.positionAbsolute.x, y: node.internals.positionAbsolute.y, width, height };
}

/**
 * «Клин» сужения: сэмплируем ТУ ЖЕ кубическую Безье, что нарисована путём
 * (для straight контрольные точки лежат на прямой), и строим замкнутый контур
 * с шириной от полной у истока до ~15% у цели. Возвращает d для <path fill>.
 */
function taperedPathD(sp: Point, c: CubicControls, tp: Point, width: number): string {
  const SAMPLES = 24;
  const left: string[] = [];
  const right: string[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const mt = 1 - t;
    // Точка и производная кубической Безье.
    const x = mt ** 3 * sp.x + 3 * mt ** 2 * t * c.c1x + 3 * mt * t ** 2 * c.c2x + t ** 3 * tp.x;
    const y = mt ** 3 * sp.y + 3 * mt ** 2 * t * c.c1y + 3 * mt * t ** 2 * c.c2y + t ** 3 * tp.y;
    const dx = 3 * mt ** 2 * (c.c1x - sp.x) + 6 * mt * t * (c.c2x - c.c1x) + 3 * t ** 2 * (tp.x - c.c2x);
    const dy = 3 * mt ** 2 * (c.c1y - sp.y) + 6 * mt * t * (c.c2y - c.c1y) + 3 * t ** 2 * (tp.y - c.c2y);
    const len = Math.hypot(dx, dy) || 1;
    // Нормаль к касательной; полуширина линейно сужается к цели.
    const half = (width * (1 - 0.85 * t)) / 2 + 0.3;
    const nx = (-dy / len) * half;
    const ny = (dx / len) * half;
    left.push(`${(x + nx).toFixed(2)},${(y + ny).toFixed(2)}`);
    right.push(`${(x - nx).toFixed(2)},${(y - ny).toFixed(2)}`);
  }
  return `M ${left.join(' L ')} L ${right.reverse().join(' L ')} Z`;
}

export function MindEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  selected,
  data,
}: EdgeProps): React.JSX.Element {
  // Роутинг объявляет стратегия раскладки (только рендер, данные не трогаем):
  // 'fixed' — порт берётся с реального хэндла ребра как есть (для free, где
  // позиция ноды не связана со стороной подключения); остальные режимы
  // выбирают порт динамически по взаимному положению нод.
  const routing = useMindMapStore((s) => getLayoutStrategy(s.layoutType).edgeRouting);
  const editing = useUIStore((s) => s.editingEdgeId === id);
  const setEditingEdgeId = useUIStore((s) => s.setEditingEdgeId);

  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  const routed =
    routing === 'fixed'
      ? routeFixed(
          { x: sourceX, y: sourceY, side: sourcePosition as PortSide },
          { x: targetX, y: targetY, side: targetPosition as PortSide },
        )
      : routeEdge(
          nodeRect(sourceNode, sourceX, sourceY),
          nodeRect(targetNode, targetX, targetY),
          routing,
        );
  const { path: edgePath, labelX, labelY } = routed;

  const edgeData = data as MindEdgeData | undefined;
  const style = { ...DEFAULT_EDGE_STYLE, ...edgeData?.style };
  const invalid = edgeData?.invalid === true;

  // Подсветка выделения — здесь, а не в CSS: BaseEdge пишет stroke инлайном,
  // и правило вида `.selected .react-flow__edge-path` его не перебило бы.
  // Невалидное для текущей раскладки ребро — приглушённое, цветом опасности.
  const stroke = selected
    ? 'var(--rm-accent)'
    : invalid
      ? 'var(--rm-danger, #dc2626)'
      : style.strokeColor;
  const strokeWidth = selected ? style.strokeWidth + 0.5 : style.strokeWidth;

  const markerStartId = `rm-arrow-s-${id}`;
  const markerEndId = `rm-arrow-e-${id}`;
  const { sourceArrow, targetArrow } = style;

  // Сужение реализовано заливкой-«клином» поверх невидимого базового пути
  // (он остаётся для интеракции и маркеров); в ортогональном режиме taper
  // неприменим — там путь ломаный (curve отсутствует), рисуем обычный штрих.
  const taper = style.taper && routed.curve !== undefined;

  const pathStyle: CSSProperties = {
    stroke: taper ? 'transparent' : stroke,
    strokeWidth,
    strokeDasharray: taper ? undefined : dashArrayFor(style.linePattern, style.strokeWidth),
    strokeLinecap: style.linePattern === 'dotted' ? 'round' : undefined,
    opacity: invalid ? 0.55 : undefined,
  };

  const commitLabel = (value: string): void => {
    useMindMapStore.getState().setEdgeStyle(id, { label: value === '' ? undefined : value });
    setEditingEdgeId(null);
  };

  return (
    <>
      {(sourceArrow !== 'none' || targetArrow !== 'none') && (
        <defs>
          {sourceArrow !== 'none' && (
            <ArrowMarker id={markerStartId} type={sourceArrow} color={stroke} />
          )}
          {targetArrow !== 'none' && (
            <ArrowMarker id={markerEndId} type={targetArrow} color={stroke} />
          )}
        </defs>
      )}
      <BaseEdge
        path={edgePath}
        markerStart={sourceArrow !== 'none' ? `url(#${markerStartId})` : undefined}
        markerEnd={targetArrow !== 'none' ? `url(#${markerEndId})` : undefined}
        style={pathStyle}
      />
      {taper && routed.curve && (
        <path
          d={taperedPathD(routed.source, routed.curve, routed.target, strokeWidth)}
          fill={stroke}
          opacity={invalid ? 0.55 : undefined}
          style={{ pointerEvents: 'none' }}
        />
      )}
      {invalid && !taper && (
        // Поверх обычного штриха — пунктирная «штриховка» как маркер нарушения,
        // даже если сам паттерн ребра solid.
        <path
          d={edgePath}
          fill="none"
          stroke="var(--rm-canvas-bg, #fff)"
          strokeWidth={Math.max(1, strokeWidth - 1)}
          strokeDasharray="4 8"
          style={{ pointerEvents: 'none' }}
        />
      )}
      {editing ? (
        <EdgeLabelRenderer>
          <input
            className={styles.labelInput}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              fontSize: style.labelFontSize,
            }}
            defaultValue={style.label ?? ''}
            autoFocus
            // nodrag/nopan — классы RF: не таскать канвас при выделении текста.
            data-testid="edge-label-input"
            onBlur={(e) => commitLabel(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') commitLabel((e.target as HTMLInputElement).value);
              if (e.key === 'Escape') setEditingEdgeId(null);
            }}
          />
        </EdgeLabelRenderer>
      ) : (
        style.label !== undefined &&
        style.label !== '' && (
          <EdgeLabelRenderer>
            {/* pointer-events: none — клики проходят сквозь подпись к самому ребру
              (interactionWidth), так что подпись не мешает выделению. */}
            <div
              className={styles.label}
              style={{
                transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                fontSize: style.labelFontSize,
                color: style.labelColor,
              }}
            >
              {style.label}
            </div>
          </EdgeLabelRenderer>
        )
      )}
    </>
  );
}
