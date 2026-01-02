import { BagelConfig, Point, PolarPoint } from '../types';

export const TWO_PI = Math.PI * 2;

/**
 * Converts Cartesian coordinates (x, y) to Polar coordinates (r, theta).
 * Assumes (0,0) is the center of the menu.
 */
export function cartesianToPolar(x: number, y: number): PolarPoint {
    const r = Math.sqrt(x * x + y * y);
    let theta = Math.atan2(y, x);

    // Normalize theta to [0, 2PI]
    if (theta < 0) {
        theta += TWO_PI;
    }

    return { r, theta };
}

/**
 * Calculates the depth (ring index) based on radius and config.
 * Returns -1 if inside dead zone or outside max range (if applicable).
 */
export function getDepth(r: number, config: BagelConfig): number {
    const { innerRadius, ringWidth, deadZoneRadius = 0 } = config;

    if (r < deadZoneRadius) {
        return -1; // Inside dead zone
    }

    if (r < innerRadius) {
        return -1; // Between dead zone and first ring (if any gap) or just treated as dead
    }

    const safeRingWidth = Math.max(1, ringWidth);

    // r = innerRadius + depth * ringWidth + offset
    // depth = floor((r - innerRadius) / ringWidth)
    const depth = Math.floor((r - innerRadius) / safeRingWidth);

    // Debug Log
    // console.log(`[Geometry] r:${r}, inner:${innerRadius}, width:${ringWidth} -> depth:${depth}`);

    return depth;
}

/**
 * Calculates the item index based on angle and item count.
 * Assumes items are distributed evenly around the circle.
 * Handles startAngle (rotation of the menu).
 */
export function getIndexFromAngle(theta: number, itemCount: number, startAngle: number = -Math.PI / 2, gapAngle: number = 0): number {
  if (itemCount === 0) return -1;
  
  const sliceAngle = TWO_PI / itemCount;
  
  // Normalize theta relative to startAngle
  let adjustedTheta = ((theta - startAngle) % TWO_PI + TWO_PI) % TWO_PI;
  
  // Calculate raw index
  const index = Math.floor(adjustedTheta / sliceAngle);
  
  // Check if inside gap
  // The gap is usually centered around the slice boundary, or at the start/end?
  // Our renderer draws: startTheta = startAngle + index * sliceAngle + gapAngle / 2;
  // So the slice starts AFTER the half-gap.
  // We need to check if we are in the "padding" zone of the slice.
  
  const sliceStart = index * sliceAngle;
  const relativeTheta = adjustedTheta - sliceStart;
  
  // If we are in the first half-gap OR the last half-gap of the allocated slot
  // Effective Slice covers: [gapAngle/2, sliceAngle - gapAngle/2]
  
  if (relativeTheta < gapAngle / 2 || relativeTheta > (sliceAngle - gapAngle / 2)) {
      return -1; // Inside Gap
  }
  
  return index % itemCount;
}

/**
 * Comprehensive hit test.
 * Requires knowledge of how many items are in the target ring.
 * @param point - The point relative to the center of the menu.
 * @param config - Menu configuration.
 * @param itemsCount - How many items are in the ring corresponding to the point's depth. 
 *                     If undefined/null, only depth is returned reliably.
 */
export function hitTest(
  point: Point, 
  config: BagelConfig, 
  itemsCount: number = 0
): { depth: number; index: number; r: number; theta: number } {
  const { r, theta } = cartesianToPolar(point.x, point.y);
  
  // 1. Check Dead Zone
  if (config.deadZoneRadius && r < config.deadZoneRadius) {
    return { depth: -1, index: -1, r, theta };
  }
  
  // 2. Calculate Depth
  const depth = getDepth(r, config);
  
  if (depth < 0) {
     return { depth: -1, index: -1, r, theta };
  }

  // 3. Calculate Index
  let index = -1;
  if (itemsCount > 0) {
      // Calculate angular gap if pixel gap is provided
      // r varies by depth... we should use the inner radius of the current ring for gap calc to be safe
      const rInner = config.innerRadius + depth * config.ringWidth;
      const gapAngle = config.gap && config.gap > 0 ? (config.gap / rInner) : 0;
      
      index = getIndexFromAngle(theta, itemsCount, config.startAngle, gapAngle);
  }
    
  return { depth, index, r, theta };
}
