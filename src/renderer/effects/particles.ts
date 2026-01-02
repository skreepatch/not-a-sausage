/**
 * Lightweight particle system for visual feedback
 */

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

/**
 * Particle emitter
 */
export class ParticleEmitter {
  private particles: Particle[] = [];
  private particlePool: Particle[] = [];

  /**
   * Spawn particles at a location
   */
  emit(
    x: number,
    y: number,
    color: string,
    count: number = 8,
    speed: number = 2
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const velocity = speed * (0.5 + Math.random() * 0.5);
      
      const particle = this.getParticle();
      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * velocity;
      particle.vy = Math.sin(angle) * velocity;
      particle.life = 0;
      particle.maxLife = 300 + Math.random() * 200; // 300-500ms
      particle.size = 2 + Math.random() * 2;
      particle.color = color;
      
      this.particles.push(particle);
    }
  }

  /**
   * Update all particles
   */
  update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      // Update position
      p.x += p.vx * (deltaTime / 16); // Normalize to 60fps
      p.y += p.vy * (deltaTime / 16);
      
      // Update life
      p.life += deltaTime;
      
      // Remove dead particles
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        this.returnParticle(p);
      }
    }
  }

  /**
   * Render all particles
   */
  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    
    for (const p of this.particles) {
      const alpha = 1 - (p.life / p.maxLife);
      
      // Extract color and apply alpha
      let color = p.color;
      if (color.includes('rgba')) {
        color = color.replace(/[\d.]+\)$/, `${alpha})`);
      } else if (color.startsWith('#')) {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        color = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }

  /**
   * Get particle from pool or create new
   */
  private getParticle(): Particle {
    if (this.particlePool.length > 0) {
      return this.particlePool.pop()!;
    }
    return {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 0,
      size: 0,
      color: '#ffffff',
    };
  }

  /**
   * Return particle to pool
   */
  private returnParticle(p: Particle): void {
    if (this.particlePool.length < 50) {
      this.particlePool.push(p);
    }
  }

  /**
   * Clear all particles
   */
  clear(): void {
    this.particles.forEach(p => this.returnParticle(p));
    this.particles = [];
  }

  /**
   * Get particle count
   */
  getCount(): number {
    return this.particles.length;
  }
}

