import type { CSSProperties } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';
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

export function MindEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}: EdgeProps): React.JSX.Element {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const style = { ...DEFAULT_EDGE_STYLE, ...(data as MindEdgeData | undefined)?.style };

  // Подсветка выделения — здесь, а не в CSS: BaseEdge пишет stroke инлайном,
  // и правило вида `.selected .react-flow__edge-path` его не перебило бы.
  const stroke = selected ? 'var(--rm-accent)' : style.strokeColor;
  const strokeWidth = selected ? style.strokeWidth + 0.5 : style.strokeWidth;

  const markerStartId = `rm-arrow-s-${id}`;
  const markerEndId = `rm-arrow-e-${id}`;
  const { sourceArrow, targetArrow } = style;

  const pathStyle: CSSProperties = {
    stroke,
    strokeWidth,
    strokeDasharray: dashArrayFor(style.linePattern, style.strokeWidth),
    strokeLinecap: style.linePattern === 'dotted' ? 'round' : undefined,
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
      {style.label !== undefined && style.label !== '' && (
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
      )}
    </>
  );
}
