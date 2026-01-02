import { Point } from '../types';

export enum MenuStatus {
    CLOSED = 'CLOSED',
    OPEN = 'OPEN',           // Open and stationary (waiting for click/interaction)
    GLIDING = 'GLIDING',     // User is dragging/marking
    ANIMATING_OUT = 'ANIMATING_OUT' // Optional, for visual polish
}

export interface MenuState {
    status: MenuStatus;
    activePath: number[]; // Indices of the currently highlighted path, e.g., [1, 3] -> Ring 0 Item 1 -> Ring 1 Item 3
    // cursorPosition removed to avoid high-frequency updates triggering react re-renders. 
    // It should be handled by the input controller/renderer directly.
    selection: number[] | null; // Final selection when confirmed
}

export type StateListener = (state: MenuState) => void;

export class BagelStateManager {
    private state: MenuState;
    private listeners: Set<StateListener> = new Set();

    constructor() {
        this.state = {
            status: MenuStatus.CLOSED,
            activePath: [],
            selection: null,
        };
    }

    public getState(): Readonly<MenuState> {
        return this.state;
    }

    public subscribe(listener: StateListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        this.listeners.forEach(listener => listener(this.state));
    }

    public setStatus(status: MenuStatus) {
        if (this.state.status !== status) {
            this.state.status = status;
            this.notify();
        }
    }

    public setActivePath(path: number[]) {
        // Basic array equality check to avoid unnecessary updates
        if (this.state.activePath.length === path.length &&
            this.state.activePath.every((v, i) => v === path[i])) {
            return;
        }
        this.state.activePath = [...path];
        this.notify();
    }

    public setSelection(path: number[] | null) {
        this.state.selection = path;
        this.notify();
    }

    public reset() {
        this.state = {
            status: MenuStatus.CLOSED,
            activePath: [],
            selection: null
        };
        this.notify();
    }
}
