import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { RadialItem, BagelConfig } from '../types';
import { BagelStateManager, MenuStatus, MenuState } from '../core/state';
import { CanvasRenderer } from '../renderer/canvas';
import { InputController } from '../core/input';
import { BagelTheme, DEFAULT_THEME } from '../types/theme';

interface BagelMenuProps {
  items: RadialItem[];
  config: BagelConfig;
  theme?: Partial<BagelTheme>;
  onSelect?: (path: RadialItem[]) => void;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  width?: number;
  height?: number;
  debug?: boolean;
}

export const BagelMenu: React.FC<BagelMenuProps> = ({
  items,
  config,
  theme,
  onSelect,
  isOpen,
  onClose,
  className,
  width = 300,
  height = 300,
  debug = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Refs to hold instances to prevent recreation
  const stateManagerRef = useRef<BagelStateManager | null>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const inputControllerRef = useRef<InputController | null>(null);

  // Expose some state for accessibility / debug if needed
  const [menuStatus, setMenuStatus] = useState<MenuStatus>(MenuStatus.CLOSED);

  // Initialize Engine
  useLayoutEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // Create State Manager
    const stateManager = new BagelStateManager();
    stateManagerRef.current = stateManager;

    // Create Renderer
    const renderer = new CanvasRenderer(
      canvasRef.current,
      stateManager,
      items,
      config
    );
    if (debug) renderer.setDebug(true);
    rendererRef.current = renderer;
    renderer.start();

    // Create Input Controller
    const inputController = new InputController(
      canvasRef.current,
      stateManager,
      renderer,
      config,
      items
    );
    inputControllerRef.current = inputController;

    // Subscribe to state changes
    const unsubscribe = stateManager.subscribe((state: MenuState) => {
      setMenuStatus(state.status);
      
      // Handle closing if state goes to CLOSED (e.g. from Esc key or internal logic)
      if (state.status === MenuStatus.CLOSED && isOpen) {
          // If internal state closes, we should notify parent or sync?
          // The prop 'isOpen' controls visibility. 
          // If we want two-way binding, we need onClose to be called when internal state closes.
          // BUT, if internal state closes, does it wait for parent?
          // Let's say we request close.
          onClose();
      }

      if (state.selection && onSelect) {
         // Logic to trigger onSelect handled by InputController, 
         // but if we want to ensure it passes through here or double check:
         // InputController calls item.action/item.onSelect.
         // If we want a global handler, we can rely on InputController calling it if we pass it down?
         // InputController currently doesn't know about global onSelect.
         // Let's patch InputController logic or just rely on state.selection change here?
         // State selection is indices. We need items.
         // Reconstructing path here is safer for global handler.
         const pathItems: RadialItem[] = [];
         let currentList = items;
         for (const idx of state.selection) {
            const item = currentList[idx];
            if (item) {
                pathItems.push(item);
                currentList = item.children || [];
            } else {
                break;
            }
         }
         onSelect(pathItems);
      }
    });
    
    // Resize Observer
    const resizeObserver = new ResizeObserver(() => {
        renderer.resize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      unsubscribe();
      resizeObserver.disconnect();
      inputController.destroy();
      renderer.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Sync Props
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.updateConfig(config);
      rendererRef.current.updateItems(items);
      rendererRef.current.setDebug(debug);
    }
    if (inputControllerRef.current) {
      inputControllerRef.current.updateConfig(config);
      inputControllerRef.current.updateItems(items);
    }
  }, [config, items, debug]);

  // Sync Open State
  useEffect(() => {
      if (stateManagerRef.current) {
          const currentStatus = stateManagerRef.current.getState().status;
          if (isOpen && currentStatus === MenuStatus.CLOSED) {
              stateManagerRef.current.setStatus(MenuStatus.OPEN);
          } else if (!isOpen && currentStatus !== MenuStatus.CLOSED) {
              stateManagerRef.current.setStatus(MenuStatus.CLOSED);
              stateManagerRef.current.reset();
          }
      }
  }, [isOpen]);

  // Construct Theme Styles
  const themeStyles = {
    ...DEFAULT_THEME,
    ...theme
  } as React.CSSProperties;

  // Render Portal if open (or always render but hide?)
  // If we want to animate out, we need to keep it mounted.
  // For now, simple conditional rendering or visibility toggling.
  // Requirement: "Manage the Open/Closed state." "Use a Portal."
  
  if (!isOpen && menuStatus === MenuStatus.CLOSED) return null;

  return createPortal(
    <div 
      ref={containerRef} 
      className={`bagel-menu-overlay ${className || ''}`}
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        pointerEvents: isOpen ? 'auto' : 'none', // Allow clicks through if closing/animating?
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...themeStyles // Apply CSS variables
      }}
    >
      {/* Container for Canvas to size it */}
      <div style={{ width, height, position: 'relative' }}>
          <canvas 
            ref={canvasRef}
            style={{ 
              display: 'block', 
              width: '100%', 
              height: '100%' 
            }}
          />
      </div>

      {/* Hidden A11y Tree */}
      <nav 
        aria-label="Radial Navigation" 
        style={{ 
            position: 'absolute', 
            width: 1, 
            height: 1, 
            overflow: 'hidden', 
            clip: 'rect(0,0,0,0)' 
        }}
      >
        <ul role="menu" aria-expanded={isOpen}>
             {/* Recursive list generation could go here for screen readers */}
             {items.map((item, idx) => (
                 <li key={item.id} role="menuitem">
                     {item.label}
                 </li>
             ))}
        </ul>
      </nav>
    </div>,
    document.body
  );
};
