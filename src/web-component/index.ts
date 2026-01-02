// Optional Web Component Wrapper
import { BagelConfig, RadialItem } from '../types';
import { BagelStateManager, MenuStatus } from '../core/state';
import { CanvasRenderer } from '../renderer/canvas';
import { InputController } from '../core/input';
import { DEFAULT_THEME, BagelTheme } from '../types/theme';

export class BagelMenuElement extends HTMLElement {
  private shadow: ShadowRoot;
  private canvas: HTMLCanvasElement;
  private container: HTMLDivElement;
  
  private stateManager: BagelStateManager;
  private renderer: CanvasRenderer;
  private inputController: InputController;
  
  private _items: RadialItem[] = [];
  private _config: BagelConfig = { innerRadius: 50, ringWidth: 60 }; // Default
  
  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    
    // Create Container
    this.container = document.createElement('div');
    this.container.style.width = '300px';
    this.container.style.height = '300px';
    this.container.style.position = 'relative';
    this.container.style.touchAction = 'none';
    
    // Create Canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'block';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    
    this.container.appendChild(this.canvas);
    this.shadow.appendChild(this.container);
    
    // Apply Default Theme Variables to Host
    Object.entries(DEFAULT_THEME).forEach(([key, value]) => {
        this.style.setProperty(key, value);
    });

    // Initialize Engine
    this.stateManager = new BagelStateManager();
    this.renderer = new CanvasRenderer(this.canvas, this.stateManager, this._items, this._config);
    this.inputController = new InputController(this.canvas, this.stateManager, this.renderer, this._config, this._items);
  }

  connectedCallback() {
    this.renderer.start();
    // Resize Observer
    const resizeObserver = new ResizeObserver(() => {
        this.renderer.resize();
    });
    resizeObserver.observe(this.container);
    
    // Listen for select
    this.stateManager.subscribe((state) => {
        if (state.selection) {
             // Dispatch Custom Event
             this.dispatchEvent(new CustomEvent('bagel-select', {
                 detail: { selection: state.selection } // Indices
             }));
        }
    });
  }

  disconnectedCallback() {
    this.renderer.stop();
    this.inputController.destroy();
  }
  
  set items(value: RadialItem[]) {
      this._items = value;
      this.renderer.updateItems(value);
      this.inputController.updateItems(value);
  }
  
  set config(value: BagelConfig) {
      this._config = value;
      this.renderer.updateConfig(value);
      this.inputController.updateConfig(value);
  }
}

// Register
if (!customElements.get('bagel-menu')) {
    customElements.define('bagel-menu', BagelMenuElement);
}

