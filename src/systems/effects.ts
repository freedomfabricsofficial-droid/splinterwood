// Lightweight particle/effect system.
// We keep this outside React's tree because particles change every frame —
// running 60 React rerenders per second would tank performance.
//
// Architecture:
//  - Particles are pushed into _particles[]
//  - <ParticleLayer/> mounts a <canvas> that draws them at ~60fps via rAF
//  - Any system code (engine, click handlers) can call spawnX() helpers

export type ParticleKind = 'sawdust' | 'spark' | 'coin' | 'inksplat' | 'leaf' | 'star';

interface Particle {
  kind: ParticleKind;
  x: number; y: number;
  vx: number; vy: number;
  life: number;       // seconds remaining
  maxLife: number;
  size: number;
  rotation: number;
  rotSpeed: number;
  color: string;
  text?: string;      // for "+N coin" floaters
}

interface Floater {
  x: number; y: number;
  vy: number;
  life: number;
  maxLife: number;
  text: string;
  color: string;
}

const _particles: Particle[] = [];
const _floaters: Floater[] = [];

export function getParticles(): Particle[] { return _particles; }
export function getFloaters(): Floater[] { return _floaters; }

// ---------- Spawners ----------

export function spawnSawdust(x: number, y: number, count = 18): void {
  for (let i = 0; i < count; i++) {
    _particles.push({
      kind: 'sawdust',
      x: x + (Math.random() - 0.5) * 14,
      y: y + (Math.random() - 0.5) * 10,
      vx: (Math.random() - 0.5) * 160,
      vy: -80 - Math.random() * 120,
      life: 0.8 + Math.random() * 0.5,
      maxLife: 1.3,
      size: 3 + Math.random() * 5,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 8,
      color: ['#c4a370', '#a07a23', '#8a5d36', '#d4b888', '#6b4d2a'][Math.floor(Math.random() * 5)],
    });
  }
}

export function spawnSparks(x: number, y: number, count = 22): void {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 100 + Math.random() * 220;
    _particles.push({
      kind: 'spark',
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 60,
      life: 0.45 + Math.random() * 0.35,
      maxLife: 0.8,
      size: 1.5 + Math.random() * 3,
      rotation: 0,
      rotSpeed: 0,
      color: ['#ffcf40', '#ff8a30', '#fff4d8', '#ffaa20'][Math.floor(Math.random() * 4)],
    });
  }
}

export function spawnCoinBurst(x: number, y: number, count = 6): void {
  for (let i = 0; i < count; i++) {
    _particles.push({
      kind: 'coin',
      x, y,
      vx: (Math.random() - 0.5) * 120,
      vy: -80 - Math.random() * 80,
      life: 0.8 + Math.random() * 0.4,
      maxLife: 1.2,
      size: 5,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 12,
      color: '#c89a30',
    });
  }
}

export function spawnInkSplat(x: number, y: number, count = 14): void {
  for (let i = 0; i < count; i++) {
    _particles.push({
      kind: 'inksplat',
      x, y,
      vx: (Math.random() - 0.5) * 140,
      vy: -30 - Math.random() * 80,
      life: 0.45 + Math.random() * 0.3,
      maxLife: 0.75,
      size: 2.5 + Math.random() * 4,
      rotation: 0,
      rotSpeed: 0,
      color: '#2b1d10',
    });
  }
}

// Confetti — bursts of colored squares in many hues. Used for celebrations
// like hiring a helper.
const CONFETTI_COLORS = ['#a07a23', '#8a1a1a', '#3d5a2b', '#3a6090', '#b87020', '#6a4ea0', '#c4922e'];
export function spawnConfetti(x: number, y: number, count = 60): void {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i / count) + (Math.random() - 0.5) * 0.6;
    const speed = 180 + Math.random() * 220;
    _particles.push({
      kind: 'coin', // reuse coin kind for the renderer; color is what matters
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 120,
      life: 1.4 + Math.random() * 0.6,
      maxLife: 2.0,
      size: 3 + Math.random() * 3,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 18,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    });
  }
}

export function spawnLevelUp(x: number, y: number): void {
  for (let i = 0; i < 18; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
    const speed = 80 + Math.random() * 120;
    _particles.push({
      kind: 'star',
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.9 + Math.random() * 0.4,
      maxLife: 1.3,
      size: 2 + Math.random() * 3,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 8,
      color: ['#a07a23', '#c89a30', '#fff4d8', '#3d5a2b'][Math.floor(Math.random() * 4)],
    });
  }
}

// Floating "+N coin" style text
export function spawnFloater(x: number, y: number, text: string, color = '#a07a23'): void {
  _floaters.push({
    x, y,
    vy: -40,
    life: 1.2,
    maxLife: 1.2,
    text,
    color,
  });
}

// ---------- Tick ----------

export function tickParticles(dt: number): void {
  for (let i = _particles.length - 1; i >= 0; i--) {
    const p = _particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 220 * dt; // gravity
    p.vx *= 0.96;     // drag
    p.rotation += p.rotSpeed * dt;
    p.life -= dt;
    if (p.life <= 0) _particles.splice(i, 1);
  }
  for (let i = _floaters.length - 1; i >= 0; i--) {
    const f = _floaters[i];
    f.y += f.vy * dt;
    f.vy *= 0.96;
    f.life -= dt;
    if (f.life <= 0) _floaters.splice(i, 1);
  }
}

// ---------- Draw ----------

export function drawParticles(ctx: CanvasRenderingContext2D): void {
  for (const p of _particles) {
    const alpha = Math.min(1, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);

    if (p.kind === 'coin') {
      // Sketched coin: filled circle with $ stroke
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#5a3f24';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (p.kind === 'spark') {
      // Tiny line streak
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-p.size * 2, 0);
      ctx.lineTo(p.size * 2, 0);
      ctx.stroke();
    } else if (p.kind === 'star') {
      // 4-point star
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(0, -p.size * 1.5);
      ctx.lineTo(p.size * 0.5, -p.size * 0.5);
      ctx.lineTo(p.size * 1.5, 0);
      ctx.lineTo(p.size * 0.5, p.size * 0.5);
      ctx.lineTo(0, p.size * 1.5);
      ctx.lineTo(-p.size * 0.5, p.size * 0.5);
      ctx.lineTo(-p.size * 1.5, 0);
      ctx.lineTo(-p.size * 0.5, -p.size * 0.5);
      ctx.closePath();
      ctx.fill();
    } else {
      // sawdust / leaf / inksplat: small rect
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

export function drawFloaters(ctx: CanvasRenderingContext2D): void {
  ctx.font = 'bold 14px "Special Elite", monospace';
  ctx.textAlign = 'center';
  for (const f of _floaters) {
    const alpha = Math.min(1, f.life / f.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = f.color;
    ctx.strokeStyle = '#fff4d8';
    ctx.lineWidth = 3;
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}
