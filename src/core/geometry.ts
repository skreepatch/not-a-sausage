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

    // r = innerRadius + depth * ringWidth + offset
    // depth = floor((r - innerRadius) / ringWidth)
    const depth = Math.floor((r - innerRadius) / ringWidth);

    return depth;
}

/**
 * Calculates the item index based on angle and item count.
 * Assumes items are distributed evenly around the circle.
 * Handles startAngle (rotation of the menu).
 */
export function getIndexFromAngle(theta: number, itemCount: number, startAngle: number = -Math.PI / 2): number {
    if (itemCount === 0) return -1;

    const sliceAngle = TWO_PI / itemCount;

    // Handles any degree of rotation (positive or negative) in one line
    // Normalize theta relative to startAngle
    const adjustedTheta = ((theta - startAngle) % TWO_PI + TWO_PI) % TWO_PI;

    return Math.floor(adjustedTheta / sliceAngle) % itemCount;
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
    // If itemsCount is provided, we can calculate the index.
    const index = itemsCount > 0
        ? getIndexFromAngle(theta, itemsCount, config.startAngle)
        : -1;

    return { depth, index, r, theta };
}
