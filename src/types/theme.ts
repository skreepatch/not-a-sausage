export interface BagelTheme {
  '--bagel-bg-active': string;
  '--bagel-bg-inactive': string;
  '--bagel-text-color': string;
  '--bagel-glow-color': string;
  '--bagel-font-family': string;
  '--bagel-cursor-color': string;
}

export const DEFAULT_THEME: BagelTheme = {
  '--bagel-bg-active': 'rgba(100, 149, 237, 0.8)',
  '--bagel-bg-inactive': 'rgba(50, 50, 50, 0.6)',
  '--bagel-text-color': '#ffffff',
  '--bagel-glow-color': 'rgba(100, 149, 237, 0.6)',
  '--bagel-font-family': 'sans-serif',
  '--bagel-cursor-color': 'rgba(255, 0, 0, 0.5)',
};

export const MODERN_NEON_THEME: BagelTheme = {
  '--bagel-bg-active': 'rgba(0, 255, 255, 0.6)',
  '--bagel-bg-inactive': 'rgba(20, 20, 30, 0.7)',
  '--bagel-text-color': '#00ffff',
  '--bagel-glow-color': 'rgba(0, 255, 255, 0.8)',
  '--bagel-font-family': "'Rajdhani', sans-serif",
  '--bagel-cursor-color': '#ff00ff',
};

export const GLASS_THEME: BagelTheme = {
  '--bagel-bg-active': 'rgba(255, 255, 255, 0.3)',
  '--bagel-bg-inactive': 'rgba(255, 255, 255, 0.1)',
  '--bagel-text-color': '#ffffff',
  '--bagel-glow-color': 'rgba(255, 255, 255, 0.5)',
  '--bagel-font-family': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  '--bagel-cursor-color': 'rgba(255, 255, 255, 0.8)',
};

