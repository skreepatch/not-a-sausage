import { BagelConfig, Point, RadialItem } from '../types';
import { BagelStateManager, MenuStatus } from './state';
import { hitTest, cartesianToPolar } from './geometry';
import { CanvasRenderer } from '../renderer/canvas';

export class InputController {
    private canvas: HTMLCanvasElement;
    private stateManager: BagelStateManager;
    private renderer: CanvasRenderer;
    private config: BagelConfig;
    private rootItems: RadialItem[];

    private holdTimer: number | null = null;
    private holdStartPosition: Point | null = null;
    private readonly HOLD_THRESHOLD = 200; // ms
    private readonly MOVEMENT_BUFFER = 10; // px

    constructor(
        canvas: HTMLCanvasElement,
        stateManager: BagelStateManager,
        renderer: CanvasRenderer,
        config: BagelConfig,
        items: RadialItem[]
    ) {
        this.canvas = canvas;
        this.stateManager = stateManager;
        this.renderer = renderer;
        this.config = config;
        this.rootItems = items;

        this.setupListeners();

        // Prevent default browser touch actions (scrolling/zooming)
        this.canvas.style.touchAction = 'none';
        this.canvas.style.userSelect = 'none';
    }

    public updateConfig(newConfig: BagelConfig) {
        this.config = newConfig;
    }

    public updateItems(newItems: RadialItem[]) {
        this.rootItems = newItems;
    }

    public destroy() {
        this.removeListeners();
        if (this.holdTimer) {
            window.clearTimeout(this.holdTimer);
        }
    }

    private setupListeners() {
        this.canvas.addEventListener('pointerdown', this.onPointerDown);
        this.canvas.addEventListener('pointermove', this.onPointerMove);
        this.canvas.addEventListener('pointerup', this.onPointerUp);
        this.canvas.addEventListener('pointercancel', this.onPointerUp); // Treat cancel like up
        window.addEventListener('keydown', this.onKeyDown);
    }

    private removeListeners() {
        this.canvas.removeEventListener('pointerdown', this.onPointerDown);
        this.canvas.removeEventListener('pointermove', this.onPointerMove);
        this.canvas.removeEventListener('pointerup', this.onPointerUp);
        this.canvas.removeEventListener('pointercancel', this.onPointerUp);
        window.removeEventListener('keydown', this.onKeyDown);
    }

    /**
     * Converts pointer event to center-relative coordinates.
     */
    private getRelativePoint(event: PointerEvent): Point {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left - rect.width / 2;
        const y = event.clientY - rect.top - rect.height / 2;
        return { x, y };
    }

    private onPointerDown = (event: PointerEvent) => {
        // Only handle primary pointer
        if (!event.isPrimary) return;

        this.canvas.setPointerCapture(event.pointerId);

        const point = this.getRelativePoint(event);
        this.holdStartPosition = point;

        // Determine initial hit
        // If we are closed, we might want to open? Or assumes we are already open?
        // PRD implies menu might be invoked here or is already visible.
        // Assuming "Bagel" is a radial menu that appears or is interactive.
        // If Status is CLOSED, maybe we don't interact unless this is the trigger?
        // Let's assume the controller manages an OPEN menu, or opens it.
        // If CLOSED, we can open it at the center?
        // For now, let's assume we are interacting with an existing/visible component.

        if (this.stateManager.getState().status === MenuStatus.CLOSED) {
            this.stateManager.setStatus(MenuStatus.OPEN);
        }

        // Start Hold Timer for Glide Mode
        this.holdTimer = window.setTimeout(() => {
            this.stateManager.setStatus(MenuStatus.GLIDING);
            // Trigger initial vibration for entering glide mode
            if (navigator.vibrate) navigator.vibrate(20);
        }, this.HOLD_THRESHOLD);

        // Update renderer cursor immediately
        this.renderer.updateCursor(point);
    };

    private onPointerMove = (event: PointerEvent) => {
        const point = this.getRelativePoint(event);
        this.renderer.updateCursor(point);

        const state = this.stateManager.getState();

        // Check movement buffer for hold timer
        if (this.holdTimer && this.holdStartPosition) {
            const dx = point.x - this.holdStartPosition.x;
            const dy = point.y - this.holdStartPosition.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > this.MOVEMENT_BUFFER) {
                // Moved too much before threshold, cancel hold, treating as normal interaction (drag/swipe?)
                // Or if we move significant amount, maybe we enter GLIDING immediately?
                // User requirements: "If timer completes ... set to GLIDING".
                // Implicit: If moved before timer, maybe it's just a tap-drag or we cancel the specific "Hold" trigger?
                // Actually, for a radial menu, dragging IS gliding.
                // Let's say if we move significantly, we just enter gliding mode early to be responsive.
                window.clearTimeout(this.holdTimer);
                this.holdTimer = null;
                if (state.status !== MenuStatus.GLIDING) {
                    this.stateManager.setStatus(MenuStatus.GLIDING);
                }
            }
        }

        if (state.status === MenuStatus.GLIDING || state.status === MenuStatus.OPEN) {
            this.handleHitTest(point);
        }
    };

    private onPointerUp = (event: PointerEvent) => {
        const point = this.getRelativePoint(event);
        this.renderer.updateCursor(null); // Clear cursor

        if (this.holdTimer) {
            window.clearTimeout(this.holdTimer);
            this.holdTimer = null;
        }

        const state = this.stateManager.getState();
        this.canvas.releasePointerCapture(event.pointerId);

        // Finalize selection
        if (state.status === MenuStatus.GLIDING || state.status === MenuStatus.OPEN) {
            // If we are gliding, the last active path is our potential selection.
            // But we need to verify we released OVER the item, or if we released outside?
            // "Glide Logic: While gliding, the activePath updates in real-time."
            // "Glide Release: ... If a Leaf item ... emit select."

            // We should do one final hit test to be sure
            const hit = this.resolveHit(point);

            if (hit && hit.item) {
                // Check if leaf
                if (!hit.item.children || hit.item.children.length === 0) {
                    this.confirmSelection(state.activePath);
                } else {
                    // Drill down (expand path) - already handled by hover updating activePath
                    // But maybe we want to keep it open?
                    // If it's a "tap" on a parent, maybe we just leave it open at that depth?
                    // If it's a "glide release" on a parent, maybe we assume they wanted to go deeper but stopped?
                    // Standard behavior: Release on parent -> stay open or do nothing?
                    // Requirement: "If an item has children, 'Drill Down' by expanding the path."
                    // Since we update activePath on hover, we are already drilled down.
                    // So we just need to decide if we close or not.
                    // If leaf -> select and close.
                    // If parent -> maybe keep open?
                }
            } else {
                // Tapped outside or deadzone?
                // "Close the menu if the center was tapped or an empty area was released."
                if (hit && hit.depth === -1) {
                    this.stateManager.setStatus(MenuStatus.CLOSED);
                    this.stateManager.reset();
                }
            }

            // Reset status to OPEN if we didn't close, so we exit GLIDING?
            if (this.stateManager.getState().status !== MenuStatus.CLOSED) {
                this.stateManager.setStatus(MenuStatus.OPEN);
            }
        }
    };

    private onKeyDown = (event: KeyboardEvent) => {
        const state = this.stateManager.getState();
        if (state.status === MenuStatus.CLOSED) return;

        // Simple keyboard navigation
        // Arrow Up/Down: Change Depth (if possible?) -> Actually Left/Right is better for rotation in ring
        // Arrow Left/Right: Rotate index in current ring
        // Enter: Select
        // Esc: Close

        if (event.key === 'Escape') {
            this.stateManager.setStatus(MenuStatus.CLOSED);
            this.stateManager.reset();
            return;
        }

        const currentPath = [...state.activePath];
        const currentDepth = currentPath.length > 0 ? currentPath.length - 1 : 0; // The ring we are "focused" on

        // Determine items at current depth
        let itemsAtDepth = this.rootItems;
        for (let i = 0; i < currentDepth; i++) {
            itemsAtDepth = itemsAtDepth[currentPath[i]]?.children || [];
        }

        const count = itemsAtDepth.length;
        let currentIndex = currentPath[currentDepth] !== undefined ? currentPath[currentDepth] : -1;

        if (event.key === 'ArrowRight') {
            event.preventDefault();
            currentIndex = (currentIndex + 1) % count;
            currentPath[currentDepth] = currentIndex;
            this.stateManager.setActivePath(currentPath);
        } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            currentIndex = (currentIndex - 1 + count) % count;
            currentPath[currentDepth] = currentIndex;
            this.stateManager.setActivePath(currentPath);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            // Go out a level?
            if (currentPath.length > 0) {
                currentPath.pop();
                this.stateManager.setActivePath(currentPath);
            }
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            // Go in a level if selected item has children
            if (currentIndex !== -1 && itemsAtDepth[currentIndex]?.children?.length) {
                // Select first child
                currentPath.push(0);
                this.stateManager.setActivePath(currentPath);
            }
        } else if (event.key === 'Enter') {
            event.preventDefault();
            if (currentIndex !== -1) {
                const item = itemsAtDepth[currentIndex];
                if (!item.children || item.children.length === 0) {
                    this.confirmSelection(currentPath);
                }
            }
        }
    };

    /**
     * Helper to perform hit test against current state logic
     */
    private resolveHit(point: Point) {
        const { r, theta } = cartesianToPolar(point.x, point.y);
        const targetDepth = hitTest(point, this.config).depth; // First get depth blindly

        if (targetDepth === -1) return { depth: -1, index: -1, item: null };

        // Iterative Path Resolution (Fix for "Stale Path" edge case)
        // Instead of relying on state.activePath, we rebuild the path from the root
        // up to the target depth based on the current pointer angle.
        // This assumes the user's angle applies to all rings, which is standard for radial menus.

        let currentItems = this.rootItems;
        // We only need to resolve up to targetDepth. 
        // BUT we need to check if we can actually GET to targetDepth.
        // i.e., does the item at depth 0 actually have children?

        // However, radial menus are sector-based.
        // The angle theta dictates the selection at EVERY depth simultaneously if alignment is consistent.
        // If sectors are aligned (parent 0 covers same angle as child 0..N), we can walk down.

        // Let's assume standard alignment: child sectors are contained within parent sector
        // OR standard radial menu: child ring is independent? 
        // Usually, child ring depends on parent selection.
        // So we must find what WOULD be selected at depth 0, then depth 1, etc.

        let resolvedIndex = -1;
        let resolvedItem: RadialItem | null = null;

        // We must walk from 0 to targetDepth
        for (let d = 0; d <= targetDepth; d++) {
            if (!currentItems || currentItems.length === 0) {
                // Path ends before target depth
                return { depth: d - 1, index: -1, item: null };
            }

            const { index } = hitTest(point, this.config, currentItems.length);

            if (index === -1) {
                return { depth: d, index: -1, item: null };
            }

            const item = currentItems[index];

            if (d === targetDepth) {
                resolvedIndex = index;
                resolvedItem = item;
            } else {
                // Prepare for next iteration
                currentItems = item.children || [];
            }
        }

        return { depth: targetDepth, index: resolvedIndex, item: resolvedItem };
    }

    private handleHitTest(point: Point) {
        const hit = this.resolveHit(point);

        if (hit.index !== -1 && hit.depth !== -1) {
            const state = this.stateManager.getState();

            // Construct new path
            // Preserve path up to depth, update at depth, truncate after
            const newPath = [...state.activePath];

            // If we jumped to a new ring (e.g. 0 -> 1), ensure we have a valid parent
            // resolveHit handles walking, so if we got a hit, the path to depth-1 is valid.
            newPath[hit.depth] = hit.index;
            // Truncate any deeper selections as we have switched branch or are currently at this leaf
            const finalPath = newPath.slice(0, hit.depth + 1);

            // Check if changed
            const pathChanged = finalPath.length !== state.activePath.length ||
                finalPath.some((v, i) => v !== state.activePath[i]);

            if (pathChanged) {
                this.stateManager.setActivePath(finalPath);
                if (navigator.vibrate) navigator.vibrate(10);
            }
        } else {
            // If we hit dead zone, maybe clear selection?
            if (hit.depth === -1) {
                // Optionally clear path if we go back to center?
                // Or keep it as "last known"?
                // If we go to center, we might want to clear path to show "root" state.
                if (this.stateManager.getState().activePath.length > 0) {
                    this.stateManager.setActivePath([]);
                    // vibrate?
                }
            }
        }
    }

    private confirmSelection(pathIndices: number[]) {
        // Reconstruct items from indices
        const pathItems: RadialItem[] = [];
        let currentList = this.rootItems;
        for (const idx of pathIndices) {
            const item = currentList[idx];
            if (item) {
                pathItems.push(item);
                currentList = item.children || [];
            } else {
                break;
            }
        }

        this.stateManager.setSelection(pathIndices);
        this.stateManager.setStatus(MenuStatus.CLOSED);
        this.stateManager.reset(); // Reset internal state after closing

        const lastItem = pathItems[pathItems.length - 1];

        // Trigger callback
        if (lastItem) {
            if (lastItem.action) lastItem.action();
            if (lastItem.onSelect) lastItem.onSelect(pathItems);
        }
    }
}

