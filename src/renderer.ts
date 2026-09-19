// ============================================================
// renderer.ts — Canvas rendering: map, bloons, towers, FX
// ============================================================

import { GameMap } from '../data/maps';
import { Bloon } from '../entities/bloon';
import { Tower } from '../entities/tower';
import { Projectile } from '../entities/projectile';
import { PathData, getPositionOnPath, dist } from '../utils/math';
import { TOWER_DATA, TowerTypeId } from './data/tower-data';

/** Particle for pop/explosion effects */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  radius: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }

  get width() { return this.canvas.width; }
  get height() { return this.canvas.height; }

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  // ==================== MAP ====================

  drawMap(map: GameMap) {
    const ctx = this.ctx;

    // Grass background
    ctx.fillStyle = map.bgColor;
    ctx.fillRect(0, 0, this.width, this.height);

    // Grass texture (subtle dots)
    ctx.fillStyle = 'rgba(0,0,0,0.03)';
    for (let i = 0; i < 300; i++) {
      const x = (i * 137.5) % this.width;
      const y = (i * 97.3) % this.height;
      ctx.fillRect(x, y, 2, 2);
    }

    // Draw path
    const path = map.path;
    const wp = path.waypoints;

    // Path shadow
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = map.pathWidth + 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(wp[0].x, wp[0].y);
    for (let i = 1; i < wp.length; i++) {
      ctx.lineTo(wp[i].x, wp[i].y);
    }
    ctx.stroke();

    // Path fill
    ctx.strokeStyle = map.pathColor;
    ctx.lineWidth = map.pathWidth;
    ctx.beginPath();
    ctx.moveTo(wp[0].x, wp[0].y);
    for (let i = 1; i < wp.length; i++) {
      ctx.lineTo(wp[i].x, wp[i].y);
    }
    ctx.stroke();

    // Path inner line (subtle)
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = map.pathWidth - 10;
    ctx.beginPath();
    ctx.moveTo(wp[0].x, wp[0].y);
    for (let i = 1; i < wp.length; i++) {
      ctx.lineTo(wp[i].x, wp[i].y);
    }
    ctx.stroke();

    // Path border lines
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = 2;
    // We skip detailed border for simplicity — the shadow gives depth
  }

  // ==================== GRID OVERLAY (when placing) ====================

  drawGridOverlay(map: GameMap) {
    const ctx = this.ctx;
    const gs = map.gridSize;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < this.width; x += gs) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.height; y += gs) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }
  }

  // ==================== BLOONS ====================

  drawBloon(bloon: Bloon) {
    if (!bloon.alive) return;
    const ctx = this.ctx;
    const cfg = bloon.config;
    const r = cfg.radius;

    ctx.save();
    ctx.translate(bloon.x, bloon.y);

    // Frozen overlay
    if (bloon.frozen) {
      ctx.globalAlpha = 0.7;
    }

    if (cfg.isMOAB) {
      this.drawMOAB(bloon);
    } else {
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(2, 3, r, r * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Main balloon body
      ctx.fillStyle = cfg.color;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      // Outline
      ctx.strokeStyle = cfg.strokeColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Highlight / gloss (BTD6 shiny look)
      const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
      grad.addColorStop(0, cfg.highlightColor + 'AA');
      grad.addColorStop(0.5, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      // Small knot at bottom
      ctx.fillStyle = cfg.strokeColor;
      ctx.beginPath();
      ctx.moveTo(-2, r - 1);
      ctx.lineTo(2, r - 1);
      ctx.lineTo(0, r + 4);
      ctx.closePath();
      ctx.fill();

      // Ceramic: show HP bar
      if (cfg.id === 'ceramic' && bloon.hp < cfg.layerHP) {
        const barW = r * 2;
        const barH = 3;
        const pct = bloon.hp / cfg.layerHP;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(-barW / 2, -r - 7, barW, barH);
        ctx.fillStyle = pct > 0.5 ? '#2ecc71' : pct > 0.25 ? '#f39c12' : '#e74c3c';
        ctx.fillRect(-barW / 2, -r - 7, barW * pct, barH);
      }
    }

    // Freeze overlay
    if (bloon.frozen) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#74b9ff';
      ctx.beginPath();
      ctx.arc(0, 0, r + 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawMOAB(bloon: Bloon) {
    const ctx = this.ctx;
    const cfg = bloon.config;
    const r = cfg.radius;

    // MOAB body (blimp shape)
    ctx.fillStyle = cfg.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.6, r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = cfg.strokeColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Highlight
    const grad = ctx.createRadialGradient(-r * 0.4, -r * 0.3, 0, 0, 0, r * 1.2);
    grad.addColorStop(0, cfg.highlightColor + '88');
    grad.addColorStop(0.6, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.6, r, 0, 0, Math.PI * 2);
    ctx.fill();

    // "MOAB" text
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.floor(r * 0.55)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MOAB', 0, 0);

    // HP bar
    const barW = r * 2.5;
    const barH = 5;
    const pct = bloon.hp / cfg.layerHP;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(-barW / 2, -r - 12, barW, barH);
    ctx.fillStyle = pct > 0.5 ? '#2ecc71' : pct > 0.25 ? '#f39c12' : '#e74c3c';
    ctx.fillRect(-barW / 2, -r - 12, barW * pct, barH);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(-barW / 2, -r - 12, barW, barH);
  }

  // ==================== TOWERS ====================

  drawTower(tower: Tower) {
    const ctx = this.ctx;
    const cfg = tower.config;

    ctx.save();
    ctx.translate(tower.x, tower.y);

    // Range circle when selected
    if (tower.selected) {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, tower.range, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.arc(2, 3, 16, 0, Math.PI * 2);
    ctx.fill();

    // Tower base platform
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Tower body
    ctx.save();
    ctx.rotate(tower.angle);
    this.drawTowerBody(tower.type, cfg.color, cfg.accentColor);
    ctx.restore();

    // Upgrade indicator dots
    const totalUpgrades = tower.upgradeTiers[0] + tower.upgradeTiers[1] + tower.upgradeTiers[2];
    if (totalUpgrades > 0) {
      for (let i = 0; i < totalUpgrades; i++) {
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(-8 + i * 6, 20, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  private drawTowerBody(type: TowerTypeId, color: string, accent: string) {
    const ctx = this.ctx;

    switch (type) {
      case 'dart': {
        // Monkey head
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-3, -3, 3.5, 0, Math.PI * 2);
        ctx.arc(3, -3, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(-2, -3, 1.5, 0, Math.PI * 2);
        ctx.arc(4, -3, 1.5, 0, Math.PI * 2);
        ctx.fill();
        // Dart arm pointing right (direction of aim)
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(20, 0);
        ctx.stroke();
        // Dart tip
        ctx.fillStyle = '#ccc';
        ctx.beginPath();
        ctx.moveTo(20, -3);
        ctx.lineTo(24, 0);
        ctx.lineTo(20, 3);
        ctx.closePath();
        ctx.fill();
        break;
      }

      case 'tack': {
        // Circular shooter
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        // Red center
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        // Tack spikes
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 10);
          ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16);
          ctx.stroke();
        }
        break;
      }

      case 'bomb': {
        // Cannon body
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.fill();
        // Cannon barrel
        ctx.fillStyle = '#444';
        ctx.fillRect(4, -5, 18, 10);
        // Barrel tip
        ctx.fillStyle = accent;
        ctx.fillRect(18, -6, 4, 12);
        // Fuse
        ctx.strokeStyle = '#f39c12';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-4, -10);
        ctx.quadraticCurveTo(-8, -16, -2, -16);
        ctx.stroke();
        // Spark
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(-2, -16, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'ice': {
        // Crystal body
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, 13, 0, Math.PI * 2);
        ctx.fill();
        // Snowflake
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * 10, Math.sin(a) * 10);
          ctx.stroke();
        }
        // Center gem
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'super': {
        // Cape (triangle behind)
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.moveTo(-8, 4);
        ctx.lineTo(-16, 14);
        ctx.lineTo(0, 8);
        ctx.closePath();
        ctx.fill();
        // Body
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        // Mask / eyes
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.ellipse(0, -2, 10, 5, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        // Glowing eyes
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(-4, -3, 2.5, 0, Math.PI * 2);
        ctx.arc(4, -3, 2.5, 0, Math.PI * 2);
        ctx.fill();
        // Laser beam hint
        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(10, -1);
        ctx.lineTo(22, -1);
        ctx.stroke();
        ctx.setLineDash([]);
        break;
      }
      default: {
        const emoji = TOWER_DATA[type].emoji;
        const gradient = ctx.createRadialGradient(-5, -7, 1, 0, 0, 17);
        gradient.addColorStop(0, accent);
        gradient.addColorStop(0.35, color);
        gradient.addColorStop(1, '#172238');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff99';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        const techTowers: TowerTypeId[] = ['sub', 'buccaneer', 'ace', 'heli', 'mortar', 'dartling', 'engineer', 'sentinel'];
        const natureTowers: TowerTypeId[] = ['druid', 'farm', 'beast', 'mermonkey', 'ranger'];
        const magicTowers: TowerTypeId[] = ['wizard', 'ninja', 'alchemist', 'chemist'];
        ctx.fillStyle = '#ffffff';
        ctx.font = '15px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, 0, 1);
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (techTowers.includes(type)) {
          ctx.rect(-19, -19, 38, 38);
        } else if (natureTowers.includes(type)) {
          ctx.arc(0, 0, 19, 0, Math.PI * 2);
        } else if (magicTowers.includes(type)) {
          ctx.moveTo(0, -21);
          ctx.lineTo(18, 12);
          ctx.lineTo(-18, 12);
          ctx.closePath();
        } else {
          ctx.arc(0, 0, 19, -0.8, 0.8);
        }
        ctx.stroke();
        break;
      }
    }
  }

  // ==================== TOWER PLACEMENT PREVIEW ====================

  drawPlacementPreview(
    towerType: TowerTypeId,
    x: number, y: number,
    canPlace: boolean
  ) {
    const ctx = this.ctx;
    const cfg = TOWER_DATA[towerType];

    ctx.save();
    ctx.globalAlpha = 0.6;

    // Range circle
    ctx.fillStyle = canPlace ? 'rgba(100,200,100,0.15)' : 'rgba(200,100,100,0.15)';
    ctx.strokeStyle = canPlace ? 'rgba(100,200,100,0.5)' : 'rgba(200,100,100,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, cfg.range, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Tower preview
    ctx.translate(x, y);
    ctx.fillStyle = canPlace ? '#555' : '#833';
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();
    this.drawTowerBody(towerType, cfg.color, cfg.accentColor);

    ctx.restore();
  }

  // ==================== PROJECTILES ====================

  drawProjectile(proj: Projectile) {
    if (!proj.alive) return;
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(proj.x, proj.y);
    const angle = Math.atan2(proj.dirY, proj.dirX);
    ctx.rotate(angle);

    switch (proj.damageType) {
      case 'sharp':
        // Dart / tack
        ctx.fillStyle = '#ccc';
        ctx.beginPath();
        ctx.moveTo(6, 0);
        ctx.lineTo(-3, -2.5);
        ctx.lineTo(-3, 2.5);
        ctx.closePath();
        ctx.fill();
        break;
      case 'explosive':
        // Cannonball
        ctx.fillStyle = '#2d3436';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e17055';
        ctx.beginPath();
        ctx.arc(-1, -2, 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'energy':
        // Laser/energy bolt
        ctx.fillStyle = '#f1c40f';
        ctx.shadowColor = '#f1c40f';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        break;
      default:
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
  }

  // ==================== PARTICLES ====================

  spawnPopParticles(x: number, y: number, color: string, count = 6) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.3,
        maxLife: 0.5,
        color,
        radius: 2 + Math.random() * 3,
      });
    }
  }

  spawnExplosion(x: number, y: number, radius: number) {
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 120;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.2 + Math.random() * 0.4,
        maxLife: 0.5,
        color: Math.random() > 0.5 ? '#f39c12' : '#e74c3c',
        radius: 3 + Math.random() * 5,
      });
    }
  }

  updateAndDrawParticles(dt: number) {
    const ctx = this.ctx;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.vx *= 0.95;
      p.vy *= 0.95;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ==================== GAME OVER / VICTORY ====================

  drawOverlay(text: string, subText: string, color: string) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = color;
    ctx.font = 'bold 52px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, this.width / 2, this.height / 2 - 20);

    ctx.fillStyle = '#ccc';
    ctx.font = '22px sans-serif';
    ctx.fillText(subText, this.width / 2, this.height / 2 + 30);
  }
}
