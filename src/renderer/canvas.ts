import { BagelConfig, Point, RadialItem } from '../types';
import { BagelStateManager, MenuState, MenuStatus } from '../core/state';
import { cartesianToPolar, TWO_PI } from '../core/geometry';
// Removed gradient/blur imports - using plain solid colors now
import { AnimationManager, easeOutCubic, easeInOutCubic, spring } from './effects/animations';
import { ParticleEmitter } from './effects/particles';

export class CanvasRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private stateManager: BagelStateManager;
    private config: BagelConfig;
    private rootItems: RadialItem[];

    private rafId: number | null = null;
    private paths: Map<string, Path2D> = new Map();
    private isDirty: boolean = true;
    private debug: boolean = false;

    // Cache for last known state to detect changes
    private lastCursor: Point | null = null;
    private lastState: MenuState | null = null;
    private lastFrameTime: number = 0;

    // Effects
    private animationManager: AnimationManager;
    private particleEmitter: ParticleEmitter;

    // Ring visibility animations (per depth)
    private ringOpacities: Map<number, number> = new Map(); // depth -> opacity
    private ringScales: Map<number, number> = new Map(); // depth -> scale

    // Debounce timers for ring animations to prevent flickering
    private ringAnimationTimers: Map<number, number> = new Map(); // depth -> timer ID
    private readonly RING_ANIMATION_DELAY = 50; // ms delay before triggering ring animations

    // State transition tracking
    private itemStates: Map<string, boolean> = new Map(); // Track active state: `${depth}-${index}`
    private itemColors: Map<string, string> = new Map(); // Track current animated color: `${depth}-${index}`

    // Tree-based color system
    private treeColors: Map<number, string> = new Map(); // Track color per parent tree: parentIndex -> color
    private readonly COLOR_PALETTE = [
        'rgba(59, 130, 246, 0.8)',   // Blue
        'rgba(34, 197, 94, 0.8)',    // Green
        'rgba(168, 85, 247, 0.8)',   // Purple
        'rgba(249, 115, 22, 0.8)',   // Orange
        'rgba(20, 184, 166, 0.8)',   // Teal
        'rgba(236, 72, 153, 0.8)',   // Pink
        'rgba(239, 68, 68, 0.8)',    // Red
        'rgba(251, 191, 36, 0.8)',   // Yellow
    ];

    constructor(
        canvas: HTMLCanvasElement,
        stateManager: BagelStateManager,
        items: RadialItem[],
        config: BagelConfig
    ) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.stateManager = stateManager;
        this.rootItems = items;
        this.config = config;

        // Handle high DPI
        this.setupResolution();

        // Listen to state changes
        this.stateManager.subscribe(() => {
            this.isDirty = true;
        });

        // Initialize effects
        this.animationManager = new AnimationManager();
        this.particleEmitter = new ParticleEmitter();

        // Initial path generation
        console.log('[Renderer] Initializing CanvasRenderer...');
        this.recalculatePaths();
    }

    public setDebug(enabled: boolean) {
        this.debug = enabled;
        this.isDirty = true;
    }

    public updateConfig(newConfig: BagelConfig) {
        this.config = newConfig;
        this.recalculatePaths();
        this.treeColors.clear(); // Clear tree colors on config change
        this.isDirty = true;
    }

    public updateItems(newItems: RadialItem[]) {
        this.rootItems = newItems;
        this.recalculatePaths();
        this.treeColors.clear(); // Clear tree colors when items change
        this.isDirty = true;
    }

    /**
     * Updates the cursor position for rendering.
     * This is separate from the StateManager to avoid React thrashing.
     */
    public updateCursor(point: Point | null) {
        this.lastCursor = point;
        this.isDirty = true;
    }

    public start() {
        console.log('[Renderer] Start called. RAF ID:', this.rafId);
        if (!this.rafId) {
            this.loop();
        }
    }

    public stop() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        // Clear any pending ring animation timers
        this.ringAnimationTimers.forEach((timerId) => {
            clearTimeout(timerId);
        });
        this.ringAnimationTimers.clear();
    }

    public resize() {
        this.setupResolution();
        this.isDirty = true;
    }

    private setupResolution() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();

        // Set actual size in memory (scaled to account for extra pixel density)
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;

        // Normalize coordinate system to use css pixels
        this.ctx.setTransform(dpr, 0, 0, dpr, rect.width * dpr / 2, rect.height * dpr / 2);
    }

    private loop = (currentTime: number = 0) => {
        const deltaTime = currentTime - this.lastFrameTime || 16;
        this.lastFrameTime = currentTime;

        // Update animations
        this.animationManager.update(currentTime);

        // Update particles
        this.particleEmitter.update(deltaTime);

        // Check for state changes that trigger animations/particles
        const state = this.stateManager.getState();

        // Handle initial state or state changes
        if (!this.lastState || this.lastState.status !== state.status ||
            JSON.stringify(this.lastState.activePath) !== JSON.stringify(state.activePath)) {

            // When opening from closed, animate first ring
            if (state.status === MenuStatus.OPEN && (!this.lastState || this.lastState.status === MenuStatus.CLOSED)) {
                // Animate first ring (depth 0) appearing
                this.animateRingAppearance(0);
            }

            // When closing, hide all rings except dead zone
            if (state.status === MenuStatus.CLOSED && this.lastState && this.lastState.status !== MenuStatus.CLOSED) {
                // Hide all rings
                for (let d = 0; d < 10; d++) {
                    if (this.ringOpacities.has(d)) {
                        this.animateRingDisappearance(d);
                    }
                }
            }

            // When activePath changes, animate new rings appearing (with delay to prevent flickering)
            if (state.status === MenuStatus.OPEN || state.status === MenuStatus.GLIDING) {
                const currentMaxDepth = state.activePath.length;
                const lastMaxDepth = this.lastState ? this.lastState.activePath.length : -1;

                // Clear any pending timers
                this.ringAnimationTimers.forEach((timerId) => {
                    clearTimeout(timerId);
                });
                this.ringAnimationTimers.clear();

                // Animate new rings appearing (with delay)
                for (let d = 0; d <= currentMaxDepth; d++) {
                    if (d > lastMaxDepth) {
                        // New ring to show - add delay to prevent flickering
                        const timerId = window.setTimeout(() => {
                            this.animateRingAppearance(d);
                            this.ringAnimationTimers.delete(d);
                        }, this.RING_ANIMATION_DELAY);
                        this.ringAnimationTimers.set(d, timerId);
                    }
                }

                // Hide rings that are no longer needed (immediate, no delay for closing)
                for (let d = currentMaxDepth + 1; d < 10; d++) {
                    if (this.ringOpacities.has(d) && this.ringOpacities.get(d)! > 0) {
                        // Cancel any pending appearance animation
                        const pendingTimer = this.ringAnimationTimers.get(d);
                        if (pendingTimer) {
                            clearTimeout(pendingTimer);
                            this.ringAnimationTimers.delete(d);
                        }
                        this.animateRingDisappearance(d);
                    }
                }
            }

            // Selection pulse and particles
            if (state.activePath.length > 0 && this.lastState &&
                JSON.stringify(state.activePath) !== JSON.stringify(this.lastState.activePath)) {
                // Pulse animation
                const depth = state.activePath.length - 1;
                const index = state.activePath[depth];
                this.triggerSelectionPulse(depth, index);

                // Spawn particles at active slice center
                this.spawnParticlesAtActiveSlice(depth, index, state);
            }
        }
        this.lastState = { ...state };

        // Always render if there are animations or particles
        // Check if any color transitions are active
        const hasColorAnimations = Array.from(this.itemColors.keys()).some(key => {
            const animationId = `color-${key}`;
            return this.animationManager.isActive(animationId);
        });

        // Check if any ring animations are active
        const hasRingAnimations = Array.from(this.ringOpacities.keys()).some(depth => {
            return this.animationManager.isActive(`ring-${depth}`) ||
                this.animationManager.isActive(`ring-scale-${depth}`);
        });

        if (this.isDirty || hasRingAnimations ||
            this.particleEmitter.getCount() > 0 ||
            hasColorAnimations) {
            this.render();
            this.isDirty = false;
        }
        this.rafId = requestAnimationFrame(this.loop);
    };

    private recalculatePaths() {
        this.paths.clear();
        console.log('[Renderer] Recalculating paths for', this.rootItems.length, 'items');
        // Recursively calculate paths for all reachable items
        // For simplicity in Phase 2, we'll just calculate paths for visible rings based on potentially expanding logic.
        // Or simpler: Just calculate paths for the root and let 'render' handle logic?
        // Optimization: Only calculate paths needed.
        // But for "gliding", we might want pre-calc.

        // Let's implement a recursive path generator that walks the tree.
        this.generatePathsRecursive(this.rootItems, 0);
    }

    private generatePathsRecursive(items: RadialItem[], depth: number) {
        if (!items || items.length === 0) return;
        if (depth > 10) {
            console.warn('[Renderer] Max recursion depth reached in generatePathsRecursive');
            return;
        }

        const { innerRadius, ringWidth, startAngle = -Math.PI / 2, gap = 0 } = this.config;
        const count = items.length;
        const sliceAngle = TWO_PI / count;

        // Calculate ring bounds with pixel gaps (radial gaps between circles)
        // Use gap directly in pixels without scaling
        let rInner = innerRadius;
        for (let d = 0; d < depth; d++) {
            rInner += ringWidth + (gap || 0); // Use gap directly in pixels
        }

        const rOuter = rInner + ringWidth;

        // Calculate slice gap angle from pixel gap
        // Use middle radius for more accurate straight gap calculation
        // gapAngle = gap / rMid (converts pixel gap to angular gap at middle of ring)
        // This creates a straight gap (same pixel width at inner and outer radius)
        const gapPixels = gap || 0;
        const rMid = (rInner + rOuter) / 2; // Middle radius of the ring
        const gapAngle = gapPixels > 0 ? (gapPixels / rMid) : 0;
        const effectiveSliceAngle = sliceAngle - gapAngle;

        items.forEach((_item, index) => {
            const startTheta = startAngle + index * sliceAngle + gapAngle / 2;
            const endTheta = startTheta + effectiveSliceAngle;

            const path = new Path2D();
            path.arc(0, 0, rOuter, startTheta, endTheta, false);
            path.arc(0, 0, rInner, endTheta, startTheta, true); // Draw inner arc in reverse to close shape
            path.closePath();

            // Key: depth-index (e.g., "0-1", "1-3")
            // Note: This unique ID strategy needs to be consistent. 
            // We need a way to look up the path for a specific item during render.
            // Using a composite key of depth and index within that ring is good for drawing.
            // BUT, during recursion for children, we need to know the parent's context if we want to key by "global" ID?
            // Actually, for drawing, we just need to know "at depth D, draw item I's path". 
            // But items change based on parent.

            // Let's store paths attached to the item ID if possible, or use a deterministic key based on the tree traversal.
            // Since we need to look it up during render traversal, let's use the item ID if available, otherwise generated key.
            this.paths.set(`${depth}-${index}`, path); // This key is reused for different sub-menus at same depth. Only works if we regenerate on path change.

            // We are caching "shapes", but since shapes depend on the count of items in the ring,
            // and that count depends on the specific parent... 
            // The "0-1" key is ambiguous if we have multiple potential Ring 0s (not possible) or Ring 1s (possible).
            // However, at any given render frame, there is only ONE active path of rings.
            // So caching by depth-index is fine IF we re-calculate paths when the active item structure changes?
            // Actually, it's better to just cache by (depth, count, index).
            // Or just re-generate paths for the active view? 
            // Given the requirement "Store these in a Map/Cache", let's assume we cache based on specific item configuration.

            // Better key: `${depth}-${count}-${index}`
            // This way, if we switch from a menu of 4 items to 8 items at depth 1, we use different cache keys.
            this.paths.set(`${depth}-${count}-${index}`, path);

            // Pre-calculate children? 
            // We don't know which children will be shown until runtime.
            // We can lazily generate or generate all. Generating all might be expensive for deep trees.
            // For now, let's just generate the root. The render loop will handle on-the-fly generation if needed or we update this.
            // Actually, standard optimization: cache by `${depth}-${itemCount}-${index}`.
        });
    }

    /**
     * Trigger selection pulse animation
     */
    private triggerSelectionPulse(depth: number, index: number): void {
        const pulseId = `pulse-${depth}-${index}`;
        this.animationManager.animate(
            pulseId,
            1.0,
            1.05,
            50,
            easeOutCubic,
            undefined,
            () => {
                // Pulse back
                this.animationManager.animate(
                    pulseId,
                    1.05,
                    1.0,
                    50,
                    easeOutCubic
                );
            }
        );
    }

    /**
     * Interpolate between two RGBA colors
     */
    private interpolateColor(color1: string, color2: string, t: number): string {
        const rgba1 = this.parseRGBA(color1);
        const rgba2 = this.parseRGBA(color2);

        if (!rgba1 || !rgba2) return color1;

        const r = Math.round(rgba1.r + (rgba2.r - rgba1.r) * t);
        const g = Math.round(rgba1.g + (rgba2.g - rgba1.g) * t);
        const b = Math.round(rgba1.b + (rgba2.b - rgba1.b) * t);
        const a = rgba1.a + (rgba2.a - rgba1.a) * t;

        return `rgba(${r}, ${g}, ${b}, ${a})`;
    }

    /**
     * Parse RGBA color string to object
     */
    private parseRGBA(color: string): { r: number; g: number; b: number; a: number } | null {
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (!match) return null;

        return {
            r: parseInt(match[1]),
            g: parseInt(match[2]),
            b: parseInt(match[3]),
            a: match[4] ? parseFloat(match[4]) : 1
        };
    }

    /**
     * Animate item state transition (active/inactive)
     */
    private animateItemState(itemKey: string, wasActive: boolean, isActive: boolean, _depth: number, treeColor: string): void {
        // Use tree color for active, lightened tree color for inactive
        const startColor = wasActive ? treeColor : this.lightenColor(treeColor, 0.3);
        const endColor = isActive ? treeColor : this.lightenColor(treeColor, 0.3);

        // Get current color if animation is in progress, otherwise use start color
        const currentColor = this.itemColors.get(itemKey) || startColor;

        // Initialize current color if not set
        if (!this.itemColors.has(itemKey)) {
            this.itemColors.set(itemKey, currentColor);
        }

        const animationId = `color-${itemKey}`;
        // Use smoother easing and longer duration for active state transitions
        this.animationManager.animate(
            animationId,
            0,
            1,
            200, // Increased from 120ms to 200ms for smoother transitions
            easeInOutCubic, // Use easeInOutCubic for smoother state transitions
            (value) => {
                const interpolated = this.interpolateColor(currentColor, endColor, value);
                this.itemColors.set(itemKey, interpolated);
                this.isDirty = true;
            }
        );
    }

    /**
     * Spawn particles at the center of the active slice
     */
    private spawnParticlesAtActiveSlice(depth: number, index: number, state: MenuState): void {
        const { innerRadius, ringWidth, startAngle = -Math.PI / 2 } = this.config;

        // Find the items at this depth
        let currentItems = this.rootItems;
        for (let d = 0; d < depth; d++) {
            const parentIndex = state.activePath[d];
            currentItems = currentItems[parentIndex]?.children || [];
        }

        if (currentItems.length === 0) return;

        const itemCount = currentItems.length;
        const sliceAngle = TWO_PI / itemCount;
        const rMid = innerRadius + depth * ringWidth + ringWidth / 2;
        const thetaMid = startAngle + index * sliceAngle + sliceAngle / 2;

        const centerX = Math.cos(thetaMid) * rMid;
        const centerY = Math.sin(thetaMid) * rMid;

        const glowColor = this.getThemeColor('--bagel-glow-color', 'rgba(100, 149, 237, 0.6)');
        this.particleEmitter.emit(centerX, centerY, glowColor, 8, 2);
    }

    private render() {
        const { width, height } = this.canvas;

        // Cache Theme Colors once per frame
        const theme = {
            bgActive: this.getThemeColor('--bagel-bg-active', 'rgba(100, 149, 237, 0.8)'),
            bgInactive: this.getThemeColor('--bagel-bg-inactive', 'rgba(50, 50, 50, 0.6)'),
            text: this.getThemeColor('--bagel-text-color', '#ffffff'),
            glow: this.getThemeColor('--bagel-glow-color', 'rgba(100, 149, 237, 0.6)'),
            font: this.getThemeColor('--bagel-font-family', 'sans-serif'),
            cursor: this.getThemeColor('--bagel-cursor-color', 'rgba(255, 0, 0, 0.5)'),
            borderColor: this.getThemeColor('--bagel-border-color', 'rgba(255, 255, 255, 0.2)'),
        };

        try {
            // Clear the canvas efficiently using the current transform (centered)
            // Reset transform to identity to clear everything reliably
            this.ctx.save();
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            this.ctx.clearRect(0, 0, width, height);
            this.ctx.restore();

            const state = this.stateManager.getState();

            // Always render (menu is always visible)
            // Apply global scale and opacity
            this.ctx.save();
            this.ctx.globalAlpha = 1.0;
            this.ctx.scale(1.0, 1.0);

            // 0. Render Particles (background layer)
            this.particleEmitter.render(this.ctx);

            // 1. Render Rings
            this.renderRings(state, theme);

            // 2. Render Cursor Line (if gliding)
            if (state.status === MenuStatus.GLIDING && this.lastCursor) {
                this.renderCursorLine(theme);
            }

            // 3. Render Center Info
            this.renderCenter(state, theme);

            this.ctx.restore();

            // 4. Debug Overlays (outside transform)
            if (this.debug) {
                this.ctx.save();
                this.ctx.globalAlpha = 1;
                this.renderDebugInfo(state);
                this.ctx.restore();
            }
        } catch (e) {
            console.error('[Renderer] Critical Error in Render Loop:', e);
            this.stop(); // Stop loop to prevent browser hang
        }
    }

    private renderRings(state: MenuState, theme: any) {
        // When closed, only show dead zone (no rings)
        if (state.status === MenuStatus.CLOSED) {
            this.renderDeadZone(theme);
            return;
        }

        // When open, show rings based on activePath with animations
        let currentItems = this.rootItems;
        let depth = 0;
        let parentItem: RadialItem | null = null;

        // Draw Root Ring (depth 0) - always visible when open
        const ring0Opacity = this.ringOpacities.get(0) ?? 0;
        const ring0Scale = this.ringScales.get(0) ?? 0;
        if (ring0Opacity > 0) {
            this.ctx.save();
            this.ctx.globalAlpha = ring0Opacity;
            this.ctx.scale(ring0Scale, ring0Scale);
            this.drawRing(currentItems, depth, state, theme, parentItem);
            this.ctx.restore();
        }

        // Draw Nested Rings based on activePath
        for (const activeIndex of state.activePath) {
            const selectedItem = currentItems[activeIndex];
            if (selectedItem && selectedItem.children && selectedItem.children.length > 0) {
                depth++;
                parentItem = selectedItem;
                currentItems = selectedItem.children;

                const ringOpacity = this.ringOpacities.get(depth) ?? 0;
                const ringScale = this.ringScales.get(depth) ?? 0;
                if (ringOpacity > 0) {
                    this.ctx.save();
                    this.ctx.globalAlpha = ringOpacity;
                    this.ctx.scale(ringScale, ringScale);
                    this.drawRing(currentItems, depth, state, theme, parentItem);
                    this.ctx.restore();
                }
            } else {
                break;
            }
        }
    }

    private renderDeadZone(theme: any) {
        const { innerRadius, deadZoneRadius = 0 } = this.config;
        const radius = deadZoneRadius || innerRadius * 0.3; // Default to 30% of innerRadius if not set

        this.ctx.save();
        this.ctx.fillStyle = theme.bgInactive || 'rgba(50, 50, 50, 0.6)';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius, 0, TWO_PI);
        this.ctx.fill();
        this.ctx.strokeStyle = theme.borderColor || 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        this.ctx.restore();
    }

    private animateRingAppearance(depth: number) {
        const animationId = `ring-${depth}`;
        const scaleId = `ring-scale-${depth}`;

        // Animate opacity from 0 to 1 (smoother, longer duration)
        this.animationManager.animate(
            animationId,
            0,
            1,
            300, // Increased from 250ms to 300ms
            easeOutCubic,
            (value) => {
                this.ringOpacities.set(depth, value);
                this.isDirty = true;
            }
        );

        // Animate scale from 0.8 to 1.0 (smoother, longer duration)
        this.animationManager.animate(
            scaleId,
            0.8,
            1.0,
            300, // Increased from 250ms to 300ms
            spring,
            (value) => {
                this.ringScales.set(depth, value);
                this.isDirty = true;
            }
        );
    }

    private animateRingDisappearance(depth: number) {
        const animationId = `ring-${depth}`;
        const scaleId = `ring-scale-${depth}`;
        const currentOpacity = this.ringOpacities.get(depth) ?? 1;
        const currentScale = this.ringScales.get(depth) ?? 1;

        // Animate opacity to 0 (smoother closing animation)
        this.animationManager.animate(
            animationId,
            currentOpacity,
            0,
            200, // Increased from 150ms to 200ms for smoother closing
            easeOutCubic,
            (value) => {
                this.ringOpacities.set(depth, value);
                this.isDirty = true;
            }
        );

        // Animate scale to 0.8 (smoother closing animation)
        this.animationManager.animate(
            scaleId,
            currentScale,
            0.8,
            200, // Increased from 150ms to 200ms for smoother closing
            easeOutCubic,
            (value) => {
                this.ringScales.set(depth, value);
                this.isDirty = true;
            }
        );
    }

    private getThemeColor(variable: string, fallback: string): string {
        const style = getComputedStyle(this.canvas);
        return style.getPropertyValue(variable).trim() || fallback;
    }

    /**
     * Get color from palette based on index (wraps around if index exceeds palette size)
     */
    private getColorFromPalette(index: number): string {
        return this.COLOR_PALETTE[index % this.COLOR_PALETTE.length];
    }

    /**
     * Lighten a color by a factor (0-1, where 1 is fully lightened to white)
     */
    private lightenColor(color: string, factor: number): string {
        const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (!rgbaMatch) return color;

        const r = parseInt(rgbaMatch[1]);
        const g = parseInt(rgbaMatch[2]);
        const b = parseInt(rgbaMatch[3]);
        const alpha = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;

        const newR = Math.min(255, Math.round(r + (255 - r) * factor));
        const newG = Math.min(255, Math.round(g + (255 - g) * factor));
        const newB = Math.min(255, Math.round(b + (255 - b) * factor));

        return `rgba(${newR}, ${newG}, ${newB}, ${alpha})`;
    }

    /**
     * Get tree color for an item based on its depth and parent
     * Each menu tree (parent and all its children) gets its own distinct color
     * Priority: item.color > parent.color > palette-based tree color
     */
    private getTreeColor(depth: number, parentIndex: number | null, itemIndex: number, state: MenuState, item: RadialItem, parentItem: RadialItem | null): string {
        // Priority 1: Item has explicit color
        if (item.color) {
            return item.color;
        }

        // Priority 2: For children, check if parent has color
        if (depth > 0 && parentItem && parentItem.color) {
            // Use parent's color (lightened based on depth)
            return this.lightenColor(parentItem.color, depth * 0.15);
        }

        // Priority 3: Fall back to palette-based tree color system
        if (depth === 0) {
            // Root level: assign color from palette based on item index
            if (!this.treeColors.has(itemIndex)) {
                const paletteColor = this.getColorFromPalette(itemIndex);
                this.treeColors.set(itemIndex, paletteColor);
            }
            return this.treeColors.get(itemIndex)!;
        } else {
            // Child level: use parent's tree color
            const parentIdx = parentIndex !== null ? parentIndex : (state.activePath[depth - 1] ?? 0);

            // Ensure parent color is assigned
            if (!this.treeColors.has(parentIdx)) {
                const paletteColor = this.getColorFromPalette(parentIdx);
                this.treeColors.set(parentIdx, paletteColor);
            }

            const parentColor = this.treeColors.get(parentIdx)!;
            // Lighten based on depth (deeper = lighter)
            return this.lightenColor(parentColor, depth * 0.15);
        }
    }

    private drawRing(items: RadialItem[], depth: number, state: MenuState, theme: any, parentItem: RadialItem | null = null) {
        const itemCount = items.length;

        // Check if we have paths for this configuration, if not generate them
        // (Lazy generation strategy to handle dynamic sub-menus)
        if (!this.paths.has(`${depth}-${itemCount}-0`)) {
            this.generatePathsRecursive(items, depth);
        }

        const activeIndexAtDepth = state.activePath[depth];

        // Use theme object instead of calling getThemeColor multiple times
        const fontString = `12px ${theme.font}`;

        items.forEach((item, index) => {
            const pathKey = `${depth}-${itemCount}-${index}`;
            const path = this.paths.get(pathKey);

            if (!path) return;

            const isActive = index === activeIndexAtDepth;
            const itemKey = `${depth}-${index}`;

            // Determine parent index for tree color calculation
            const parentIndex = depth > 0 ? (state.activePath[depth - 1] ?? null) : null;

            // Get tree color for this item (checks item.color first, then parent.color, then palette)
            const treeColor = this.getTreeColor(depth, parentIndex, index, state, item, parentItem);

            // For inactive items, lighten the tree color
            const baseColor = isActive ? treeColor : this.lightenColor(treeColor, 0.3);

            // Detect state changes and trigger animations
            const wasActive = this.itemStates.get(itemKey) || false;
            if (wasActive !== isActive) {
                this.itemStates.set(itemKey, isActive);
                this.animateItemState(itemKey, wasActive, isActive, depth, treeColor);
            }

            this.ctx.save();

            // Get pulse scale for selection animation
            const pulseId = `pulse-${depth}-${index}`;
            const pulseScale = this.animationManager.getValue(pulseId) || 1.0;

            if (isActive) {
                // Apply pulse scale transform
                if (pulseScale !== 1.0) {
                    this.ctx.save();
                    // Calculate center of slice for scaling
                    const { innerRadius, ringWidth, startAngle = -Math.PI / 2 } = this.config;
                    const sliceAngle = TWO_PI / itemCount;
                    const rMid = innerRadius + depth * ringWidth + ringWidth / 2;
                    const thetaMid = startAngle + index * sliceAngle + sliceAngle / 2;
                    const centerX = Math.cos(thetaMid) * rMid;
                    const centerY = Math.sin(thetaMid) * rMid;
                    this.ctx.translate(centerX, centerY);
                    this.ctx.scale(pulseScale, pulseScale);
                    this.ctx.translate(-centerX, -centerY);
                }

                // Use plain solid color (no gradient/blur)
                // Get animated color or use tree color
                let fillColor = this.itemColors.get(itemKey) || treeColor;

                this.ctx.fillStyle = fillColor;
                this.ctx.fill(path);

                if (pulseScale !== 1.0) {
                    this.ctx.restore();
                }
            } else {
                // Get animated color or use lightened tree color
                let inactiveColor = this.itemColors.get(itemKey);
                if (!inactiveColor) {
                    inactiveColor = baseColor;
                    this.itemColors.set(itemKey, inactiveColor);
                }
                this.ctx.fillStyle = inactiveColor;
                this.ctx.fill(path);
            }

            // Standard stroke with theme border color (reduced weight for lighter appearance)
            this.ctx.strokeStyle = theme.borderColor || 'rgba(255, 255, 255, 0.2)';
            this.ctx.lineWidth = 0.5; // Reduced from 1 to 0.5 for lighter borders
            this.ctx.stroke(path);

            // Draw Label
            this.drawLabel(item, depth, index, itemCount, isActive, theme, fontString);

            this.ctx.restore();
        });
    }

    private drawLabel(item: RadialItem, depth: number, index: number, itemCount: number, isActive: boolean, theme: any, font: string) {
        const { innerRadius, ringWidth, startAngle = -Math.PI / 2 } = this.config;
        const sliceAngle = TWO_PI / itemCount;

        const rInner = innerRadius + depth * ringWidth;
        const rOuter = rInner + ringWidth;
        const rMid = (rInner + rOuter) / 2;

        const thetaMid = startAngle + index * sliceAngle + sliceAngle / 2;

        const x = Math.cos(thetaMid) * rMid;
        const y = Math.sin(thetaMid) * rMid;

        // Enhanced typography for active items
        if (isActive) {
            this.ctx.font = `600 ${font}`; // Bold for active
            this.ctx.fillStyle = '#ffffff';
            // Text shadow for readability
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            this.ctx.shadowBlur = 2;
        } else {
            this.ctx.font = `400 ${font}`; // Normal weight for inactive
            this.ctx.fillStyle = theme.text;
            this.ctx.shadowBlur = 0;
        }

        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.letterSpacing = isActive ? '0.5px' : '0px';

        const maxLabelWidth = ringWidth * 0.8;
        this.ctx.fillText(item.label, x, y, maxLabelWidth);

        // Reset shadow
        this.ctx.shadowBlur = 0;
    }

    private renderCursorLine(theme: any) {
        if (!this.lastCursor) return;

        // ...

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(this.lastCursor.x, this.lastCursor.y);
        this.ctx.strokeStyle = theme.cursor;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.restore();
    }

    private renderCenter(state: MenuState, _theme: any) {
        // Draw something in the dead zone
        this.ctx.save();
        this.ctx.fillStyle = '#333';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.config.deadZoneRadius || 20, 0, TWO_PI);
        this.ctx.fill();

        // Breadcrumb or Logo
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '10px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Simple breadcrumb logic
        const text = state.activePath.length > 0 ? '>' : 'MENU';
        this.ctx.fillText(text, 0, 0);

        this.ctx.restore();
    }

    private renderDebugInfo(state: MenuState) {
        if (!this.lastCursor) return;

        const { x, y } = this.lastCursor;
        const { r, theta } = cartesianToPolar(x, y);

        this.ctx.save();

        // Draw Cursor Line always in debug
        if (state.status !== MenuStatus.GLIDING) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(x, y);
            this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
            this.ctx.setLineDash([2, 2]);
            this.ctx.stroke();
        }

        // Draw Info Text
        this.ctx.fillStyle = '#ffff00';
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';

        const textX = x + 10;
        const textY = y + 10;

        this.ctx.fillText(`r: ${r.toFixed(1)}`, textX, textY);
        this.ctx.fillText(`θ: ${theta.toFixed(2)}`, textX, textY + 12);
        this.ctx.fillText(`x,y: ${x.toFixed(0)},${y.toFixed(0)}`, textX, textY + 24);

        // Draw Pointer Dot
        this.ctx.beginPath();
        this.ctx.arc(x, y, 3, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ff00ff';
        this.ctx.fill();

        // Highlight hit boxes (re-stroke paths with red)
        // We iterate current paths
        this.paths.forEach((path) => {
            this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.1)';
            this.ctx.lineWidth = 1;
            this.ctx.stroke(path);
        });

        this.ctx.restore();
    }
}

