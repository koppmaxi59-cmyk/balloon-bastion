// ============================================================
// projectile.ts — Projectile entity
// ============================================================

import { Vec2, dist, normalize, sub, scale, add, distSq } from '../utils/math';
import { DamageType } from '../data/tower-data';
import { Bloon } from './bloon';

let nextProjId = 0;

export class Projectile {
  id: number;
  x: number;
  y: number;
  target: Bloon | null;
  /** Direction if target is null/dead */
  dirX: number;
  dirY: number;
  speed: number;
  damage: number;
  pierce: number;
  piercedIds: Set<number> = new Set();
  splashRadius: number;
  damageType: DamageType;
  alive = true;
  maxTravel: number;
  traveled = 0;
  /** For tack shooter: fires in a fixed direction */
  fixedAngle: number | null;
  freezeDuration: number;

  constructor(opts: {
    x: number;
    y: number;
    target: Bloon | null;
    speed: number;
    damage: number;
    pierce: number;
    splashRadius: number;
    damageType: DamageType;
    fixedAngle?: number;
    freezeDuration?: number;
  }) {
    this.id = nextProjId++;
    this.x = opts.x;
    this.y = opts.y;
    this.target = opts.target;
    this.speed = opts.speed;
    this.damage = opts.damage;
    this.pierce = opts.pierce;
    this.splashRadius = opts.splashRadius;
    this.damageType = opts.damageType;
    this.maxTravel = 500;
    this.fixedAngle = opts.fixedAngle ?? null;
    this.freezeDuration = opts.freezeDuration ?? 0;

    // Compute initial direction
    if (this.fixedAngle !== null) {
      this.dirX = Math.cos(this.fixedAngle);
      this.dirY = Math.sin(this.fixedAngle);
    } else if (this.target && this.target.alive) {
      const d = normalize(sub({ x: this.target.x, y: this.target.y }, { x: this.x, y: this.y }));
      this.dirX = d.x;
      this.dirY = d.y;
    } else {
      this.dirX = 1;
      this.dirY = 0;
    }
  }

  update(dt: number): void {
    // Update direction towards target (homing) if target alive and not fixed
    if (this.fixedAngle === null && this.target && this.target.alive) {
      const d = normalize(sub({ x: this.target.x, y: this.target.y }, { x: this.x, y: this.y }));
      this.dirX = d.x;
      this.dirY = d.y;
    }

    const step = this.speed * dt;
    this.x += this.dirX * step;
    this.y += this.dirY * step;
    this.traveled += step;

    if (this.traveled >= this.maxTravel) {
      this.alive = false;
    }
  }
}
