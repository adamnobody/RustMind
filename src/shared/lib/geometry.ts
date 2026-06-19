import { Position } from '../types/common';

/**
 * Calculates a point on a curve or a distance between two points.
 */
export function getDistance(p1: Position, p2: Position): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}
