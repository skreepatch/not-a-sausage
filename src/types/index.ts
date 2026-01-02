export interface RadialItem {
    id: string;
    label: string;
    icon?: string; // or ReactNode if specific to React, but keeping it generic for now
    children?: RadialItem[];
    action?: () => void;
    // Pass the full path so the app knows the context of the selection
    onSelect?: (path: RadialItem[]) => void;
    // Optional custom data
    data?: any;
}

export interface BagelConfig {
    innerRadius: number;
    ringWidth: number;
    gap?: number; // Gap between rings/slices in pixels
    startAngle?: number; // Default to -PI/2 (12 o'clock)
    deadZoneRadius?: number; // Center area that ignores input
}

export interface Point {
    x: number;
    y: number;
}

export interface PolarPoint {
    r: number;
    theta: number; // in radians, normalized to [0, 2PI]
}

export interface HitTestResult {
    depth: number; // 0 for first ring, 1 for nested, etc. -1 if dead zone or outside
    index: number; // Index of the item in that ring
    item?: RadialItem; // The actual item found
}
