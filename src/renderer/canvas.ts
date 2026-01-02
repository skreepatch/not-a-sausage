import { BagelConfig, Point, RadialItem } from '../types';
import { BagelStateManager, MenuState, MenuStatus } from '../core/state';
import { cartesianToPolar, TWO_PI } from '../core/geometry';

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
    private lastState: MenuState | null = null;
    private lastCursor: Point | null = null;

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

        // Initial path generation
        this.recalculatePaths();
    }

    public setDebug(enabled: boolean) {
        this.debug = enabled;
        this.isDirty = true;
    }

    public updateConfig(newConfig: BagelConfig) {
        this.config = newConfig;
        this.recalculatePaths();
        this.isDirty = true;
    }

    public updateItems(newItems: RadialItem[]) {
        this.rootItems = newItems;
        this.recalculatePaths();
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
        if (!this.rafId) {
            this.loop();
        }
    }

    public stop() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
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

    private loop = () => {
        if (this.isDirty) {
            this.render();
            this.isDirty = false;
        }
        this.rafId = requestAnimationFrame(this.loop);
    };

    private recalculatePaths() {
        this.paths.clear();
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

        const { innerRadius, ringWidth, startAngle = -Math.PI / 2, gap = 0 } = this.config;
        const count = items.length;
        const sliceAngle = TWO_PI / count;

        // Calculate ring bounds
        const rInner = innerRadius + depth * ringWidth;
        const rOuter = rInner + ringWidth;

        // Gap adjustment (simple angular gap)
        // Gap in pixels roughly translates to angle: angle = arcLength / radius
        // Fixed angular gap for visual consistency or pixel based
        const gapAngle = gap > 0 ? (gap / rInner) : 0;
        const effectiveSliceAngle = sliceAngle - gapAngle;

        items.forEach((item, index) => {
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

    private render() {
        const { width, height } = this.canvas;
        // Clear the canvas efficiently using the current transform (centered)
        // We clear a large enough area to cover the visible canvas
        // Since we translated to center, the top-left is (-width/2, -height/2) in DPR scaled units?
        // Wait, width/height are physical pixels. The context is scaled by DPR.
        // So logical width is width/dpr.
        // To be safe and simple without calculating exact bounds, we can clear a large area.
        // Or use the inverse logic:
        const dpr = window.devicePixelRatio || 1;
        const logicalWidth = width / dpr;
        const logicalHeight = height / dpr;

        this.ctx.clearRect(-logicalWidth / 2, -logicalHeight / 2, logicalWidth, logicalHeight);

        const state = this.stateManager.getState();

        // Don't render if closed
        if (state.status === MenuStatus.CLOSED) return;

        // 1. Render Rings
        this.renderRings(state);

        // 2. Render Cursor Line (if gliding)
        if (state.status === MenuStatus.GLIDING && this.lastCursor) {
            this.renderCursorLine();
        }

        // 3. Render Center Info
        this.renderCenter(state);

        // 4. Debug Overlays
        if (this.debug) {
            this.renderDebugInfo(state);
        }
    }

    private renderRings(state: MenuState) {
        // Traverse the active path to draw relevant rings.
        // Always draw Ring 0 (depth 0).
        // Then draw subsequent rings based on activePath.

        let currentItems = this.rootItems;
        let depth = 0;

        // Draw Root Ring
        this.drawRing(currentItems, depth, state);

        // Draw Nested Rings
        for (const activeIndex of state.activePath) {
            const selectedItem = currentItems[activeIndex];
            if (selectedItem && selectedItem.children && selectedItem.children.length > 0) {
                depth++;
                currentItems = selectedItem.children;
                this.drawRing(currentItems, depth, state);
            } else {
                break; // End of path
            }
        }
    }

    private getThemeColor(variable: string, fallback: string): string {
        const style = getComputedStyle(this.canvas);
        return style.getPropertyValue(variable).trim() || fallback;
    }

    private drawRing(items: RadialItem[], depth: number, state: MenuState) {
        const itemCount = items.length;

        // Check if we have paths for this configuration, if not generate them
        // (Lazy generation strategy to handle dynamic sub-menus)
        if (!this.paths.has(`${depth}-${itemCount}-0`)) {
            this.generatePathsRecursive(items, depth);
        }

        const activeIndexAtDepth = state.activePath[depth];

        const bgActive = this.getThemeColor('--bagel-bg-active', 'rgba(100, 149, 237, 0.8)');
        const bgInactive = this.getThemeColor('--bagel-bg-inactive', 'rgba(50, 50, 50, 0.6)');
        const glowColor = this.getThemeColor('--bagel-glow-color', 'rgba(100, 149, 237, 0.6)');

        items.forEach((item, index) => {
            const pathKey = `${depth}-${itemCount}-${index}`;
            const path = this.paths.get(pathKey);

            if (!path) return;

            const isActive = index === activeIndexAtDepth;
            // Also check if this is the "final" currently hovered item for glow?
            // or if it's just part of the path.
            // Let's say "active" means it's part of the selected path.

            this.ctx.save();

            if (isActive) {
                this.ctx.fillStyle = bgActive;

                // Add "fake" glow if it is the TIP of the active path
                // Using stroke instead of shadowBlur for performance
                if (depth === state.activePath.length - 1 || (depth === state.activePath.length && isActive)) {
                    this.ctx.lineWidth = 4;
                    this.ctx.strokeStyle = glowColor;
                    this.ctx.stroke(path);
                }
            } else {
                this.ctx.fillStyle = bgInactive;
            }

            this.ctx.fill(path);

            // Standard stroke
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            this.ctx.lineWidth = 1;
            this.ctx.stroke(path);

            // Draw Label
            this.drawLabel(item, depth, index, itemCount, isActive);

            this.ctx.restore();
        });
    }

    private drawLabel(item: RadialItem, depth: number, index: number, itemCount: number, isActive: boolean) {
        const { innerRadius, ringWidth, startAngle = -Math.PI / 2 } = this.config;
        const sliceAngle = TWO_PI / itemCount;

        const rInner = innerRadius + depth * ringWidth;
        const rOuter = rInner + ringWidth;
        const rMid = (rInner + rOuter) / 2;

        const thetaMid = startAngle + index * sliceAngle + sliceAngle / 2;

        const x = Math.cos(thetaMid) * rMid;
        const y = Math.sin(thetaMid) * rMid;

        this.ctx.fillStyle = this.getThemeColor('--bagel-text-color', isActive ? '#fff' : '#ccc');
        this.ctx.font = `12px ${this.getThemeColor('--bagel-font-family', 'sans-serif')}`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        const maxLabelWidth = ringWidth * 0.8;
        this.ctx.fillText(item.label, x, y, maxLabelWidth);
    }

    private renderCursorLine() {
        if (!this.lastCursor) return;

        // ...

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(this.lastCursor.x, this.lastCursor.y);
        this.ctx.strokeStyle = this.getThemeColor('--bagel-cursor-color', 'rgba(255, 0, 0, 0.5)');
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.restore();
    }

    private renderCenter(state: MenuState) {
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

