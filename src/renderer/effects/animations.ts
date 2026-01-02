/**
 * Animation and easing utilities
 */

export type EasingFunction = (t: number) => number;

/**
 * Linear easing (no easing)
 */
export function linear(t: number): number {
  return t;
}

/**
 * Ease in-out cubic
 */
export function easeInOut(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Ease out cubic
 */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Ease in-out cubic (smoother for state transitions)
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Spring easing (bouncy feel)
 */
export function spring(t: number): number {
  return 1 - Math.cos(t * Math.PI * 0.5) * (1 - t);
}

/**
 * Animation state
 */
export interface Animation {
  startValue: number;
  endValue: number;
  duration: number;
  startTime: number;
  easing: EasingFunction;
  onUpdate?: (value: number) => void;
  onComplete?: () => void;
}

/**
 * Animation manager
 */
export class AnimationManager {
  private animations: Map<string, Animation> = new Map();
  private currentTime: number = 0;

  /**
   * Start an animation
   */
  animate(
    id: string,
    startValue: number,
    endValue: number,
    duration: number,
    easing: EasingFunction = easeOutCubic,
    onUpdate?: (value: number) => void,
    onComplete?: () => void
  ): void {
    this.animations.set(id, {
      startValue,
      endValue,
      duration,
      startTime: this.currentTime,
      easing,
      onUpdate,
      onComplete,
    });
  }

  /**
   * Update all animations (call each frame)
   */
  update(currentTime: number): void {
    this.currentTime = currentTime;
    const toRemove: string[] = [];

    this.animations.forEach((anim, id) => {
      const elapsed = currentTime - anim.startTime;
      const progress = Math.min(elapsed / anim.duration, 1);
      const eased = anim.easing(progress);
      const value = anim.startValue + (anim.endValue - anim.startValue) * eased;

      if (anim.onUpdate) {
        anim.onUpdate(value);
      }

      if (progress >= 1) {
        if (anim.onComplete) {
          anim.onComplete();
        }
        toRemove.push(id);
      }
    });

    toRemove.forEach(id => this.animations.delete(id));
  }

  /**
   * Get current value of an animation
   */
  getValue(id: string): number | null {
    const anim = this.animations.get(id);
    if (!anim) return null;

    const elapsed = this.currentTime - anim.startTime;
    const progress = Math.min(elapsed / anim.duration, 1);
    const eased = anim.easing(progress);
    return anim.startValue + (anim.endValue - anim.startValue) * eased;
  }

  /**
   * Check if animation is active
   */
  isActive(id: string): boolean {
    return this.animations.has(id);
  }

  /**
   * Stop an animation
   */
  stop(id: string): void {
    this.animations.delete(id);
  }

  /**
   * Clear all animations
   */
  clear(): void {
    this.animations.clear();
  }
}

