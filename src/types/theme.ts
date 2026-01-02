export interface BagelTheme {
  '--bagel-bg-active': string;
  '--bagel-bg-inactive': string;
  '--bagel-text-color': string;
  '--bagel-glow-color': string;
  '--bagel-font-family': string;
  '--bagel-cursor-color': string;
  // Semantic color tokens
  '--bagel-accent-primary'?: string;
  '--bagel-accent-secondary'?: string;
  '--bagel-border-color'?: string;
  '--bagel-shadow-color'?: string;
  '--bagel-bg-active-hover'?: string;
  '--bagel-bg-inactive-hover'?: string;
  // Animation properties
  '--bagel-transition-duration'?: string;
  '--bagel-easing-function'?: string;
}

export const GLASS_THEME: BagelTheme = {
  '--bagel-bg-active': 'rgba(255, 255, 255, 0.3)',
  '--bagel-bg-inactive': 'rgba(255, 255, 255, 0.1)',
  '--bagel-text-color': '#ffffff',
  '--bagel-glow-color': 'rgba(255, 255, 255, 0.5)',
  '--bagel-font-family': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  '--bagel-cursor-color': 'rgba(255, 255, 255, 0.8)',
};

// Scenario-Specific Themes

// CREATOR_THEME: Glassmorphism for digital art tools (dark theme)
export const CREATOR_THEME: BagelTheme = {
  '--bagel-bg-active': 'rgba(100, 80, 150, 0.6)',
  '--bagel-bg-inactive': 'rgba(50, 40, 70, 0.4)',
  '--bagel-text-color': '#ffffff',
  '--bagel-glow-color': 'rgba(200, 180, 255, 0.6)',
  '--bagel-font-family': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  '--bagel-cursor-color': 'rgba(200, 180, 255, 0.8)',
  '--bagel-accent-primary': 'rgba(200, 180, 255, 0.8)',
  '--bagel-accent-secondary': 'rgba(255, 200, 230, 0.6)',
  '--bagel-border-color': 'rgba(200, 180, 255, 0.3)',
  '--bagel-shadow-color': 'rgba(0, 0, 0, 0.3)',
  '--bagel-bg-active-hover': 'rgba(120, 100, 170, 0.7)',
  '--bagel-bg-inactive-hover': 'rgba(60, 50, 80, 0.5)',
  '--bagel-transition-duration': '200ms',
  '--bagel-easing-function': 'cubic-bezier(0.4, 0, 0.2, 1)',
};

// COMMUTER_THEME: Mobile-first, high contrast
export const COMMUTER_THEME: BagelTheme = {
  '--bagel-bg-active': 'rgba(59, 130, 246, 0.9)',
  '--bagel-bg-inactive': 'rgba(30, 30, 30, 0.85)',
  '--bagel-text-color': '#ffffff',
  '--bagel-glow-color': 'rgba(59, 130, 246, 0.8)',
  '--bagel-font-family': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  '--bagel-cursor-color': 'rgba(59, 130, 246, 0.9)',
  '--bagel-accent-primary': 'rgba(59, 130, 246, 1)',
  '--bagel-accent-secondary': 'rgba(34, 197, 94, 1)',
  '--bagel-border-color': 'rgba(255, 255, 255, 0.4)',
  '--bagel-shadow-color': 'rgba(0, 0, 0, 0.4)',
  '--bagel-bg-active-hover': 'rgba(59, 130, 246, 1)',
  '--bagel-bg-inactive-hover': 'rgba(50, 50, 50, 0.9)',
  '--bagel-transition-duration': '150ms',
  '--bagel-easing-function': 'cubic-bezier(0.4, 0, 1, 1)',
};

// POWER_USER_THEME: Futuristic, technical
export const POWER_USER_THEME: BagelTheme = {
  '--bagel-bg-active': 'rgba(0, 255, 255, 0.7)',
  '--bagel-bg-inactive': 'rgba(20, 20, 30, 0.8)',
  '--bagel-text-color': '#00ffff',
  '--bagel-glow-color': 'rgba(0, 255, 255, 0.9)',
  '--bagel-font-family': "'Rajdhani', 'Courier New', monospace",
  '--bagel-cursor-color': '#ff00ff',
  '--bagel-accent-primary': 'rgba(0, 255, 255, 1)',
  '--bagel-accent-secondary': 'rgba(255, 0, 255, 1)',
  '--bagel-border-color': 'rgba(0, 255, 255, 0.6)',
  '--bagel-shadow-color': 'rgba(0, 255, 255, 0.3)',
  '--bagel-bg-active-hover': 'rgba(0, 255, 255, 0.85)',
  '--bagel-bg-inactive-hover': 'rgba(30, 30, 40, 0.9)',
  '--bagel-transition-duration': '200ms',
  '--bagel-easing-function': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
};

// Legacy aliases for backward compatibility
export const MODERN_NEON_THEME = POWER_USER_THEME;
export const DEFAULT_THEME: BagelTheme = {
  '--bagel-bg-active': 'rgba(100, 149, 237, 0.8)',
  '--bagel-bg-inactive': 'rgba(50, 50, 50, 0.6)',
  '--bagel-text-color': '#ffffff',
  '--bagel-glow-color': 'rgba(100, 149, 237, 0.6)',
  '--bagel-font-family': 'sans-serif',
  '--bagel-cursor-color': 'rgba(255, 0, 0, 0.5)',
  '--bagel-accent-primary': 'rgba(100, 149, 237, 1)',
  '--bagel-accent-secondary': 'rgba(138, 43, 226, 1)',
  '--bagel-border-color': 'rgba(255, 255, 255, 0.2)',
  '--bagel-shadow-color': 'rgba(0, 0, 0, 0.3)',
  '--bagel-bg-active-hover': 'rgba(100, 149, 237, 0.9)',
  '--bagel-bg-inactive-hover': 'rgba(60, 60, 60, 0.7)',
  '--bagel-transition-duration': '200ms',
  '--bagel-easing-function': 'ease-out',
};

