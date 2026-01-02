/**
 * Glow effect utilities for performance-optimized visual effects
 */

export interface GlowConfig {
  centerX: number;
  centerY: number;
  radius: number;
  color: string;
  intensity?: number; // 0-1, default 0.6
}

/**
 * Creates a radial gradient for glow effect
 */
export function createGlowGradient(
  ctx: CanvasRenderingContext2D,
  config: GlowConfig
): CanvasGradient {
  const { centerX, centerY, radius, color, intensity = 0.6 } = config;
  
  const gradient = ctx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, radius
  );
  
  // Extract alpha from color if it's rgba
  const alphaMatch = color.match(/rgba?\([^)]+\)/);
  let baseAlpha = 1;
  if (alphaMatch) {
    const alphaStr = alphaMatch[0].match(/[\d.]+$/)?.[0];
    if (alphaStr) baseAlpha = parseFloat(alphaStr);
  }
  
  // More gradual fade with additional color stops to avoid "ball" effect
  gradient.addColorStop(0, color.replace(/[\d.]+\)$/, `${baseAlpha * intensity})`));
  gradient.addColorStop(0.3, color.replace(/[\d.]+\)$/, `${baseAlpha * intensity * 0.8})`));
  gradient.addColorStop(0.6, color.replace(/[\d.]+\)$/, `${baseAlpha * intensity * 0.5})`));
  gradient.addColorStop(0.8, color.replace(/[\d.]+\)$/, `${baseAlpha * intensity * 0.2})`));
  gradient.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
  
  return gradient;
}

/**
 * Draws layered strokes for glow effect (more performant than shadowBlur)
 */
export function drawLayeredGlow(
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  color: string,
  layers: number = 3
): void {
  ctx.save();
  
  for (let i = layers; i > 0; i--) {
    const opacity = (i / layers) * 0.4; // Reduced from 0.6 to 0.4 for lighter effect
    const width = i * 1; // Reduced from i * 2 to i * 1 (1px, 2px, 3px instead of 2px, 4px, 6px)
    
    // Extract and modify alpha
    let strokeColor = color;
    if (color.includes('rgba')) {
      strokeColor = color.replace(/[\d.]+\)$/, `${opacity})`);
    } else if (color.startsWith('#')) {
      // Convert hex to rgba
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      strokeColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = width;
    ctx.stroke(path);
  }
  
  ctx.restore();
}

/**
 * Creates a pulsing opacity value based on time
 */
export function getPulsingOpacity(baseOpacity: number = 0.6, time: number): number {
  const pulse = 0.3 * Math.sin(time * 0.005);
  return Math.max(0, Math.min(1, baseOpacity + pulse));
}

