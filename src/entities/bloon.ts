// ============================================================
// bloon.ts — Bloon entity with layer system & path movement
// ============================================================

import { BloonTypeId, BloonConfig, BLOON_DATA } from '../data/bloon-data';
import { PathData, getPositionOnPath, Vec2 } from '../utils/math';

let nextBloonId = 0;

export class Bloon {
  id: number;
  type: BloonTypeId;
  config: BloonConfig;
  hp: number;
  x = 0;
  y = 0;
  angle = 0;
  distanceTraveled: number;
  speed: number;
  alive = true;
  leaked = false;
  frozen = false;
  freezeTimer = 0;

  constructor(type: BloonTypeId, distanceTraveled = 0) {
    this.id = nextBloonId++;
    this.type = type;
    this.config = BLOON_DATA[type];
    this.hp = this.config.layerHP;
    this.speed = this.config.speed;
    this.distanceTraveled = distanceTraveled;
  }

  get rbe(): number {
    return this.config.rbe;
  }

  get radius(): number {
    return this.config.radius;
  }

  get isMOAB(): boolean {
    return this.config.isMOAB;
  }

  /** Update position along path */
  update(dt: number, path: PathData): void {
    // Handle freeze
    if (this.frozen) {
      this.freezeTimer -= dt;
      if (this.freezeTimer <= 0) {
        this.frozen = false;
        this.freezeTimer = 0;
      }
      return; // don't move while frozen
    }

    this.distanceTraveled += this.speed * dt;

    const result = getPositionOnPath(path, this.distanceTraveled);
    this.x = result.pos.x;
    this.y = result.pos.y;
    this.angle = result.angle;

    // Check if leaked
    if (this.distanceTraveled >= path.totalLength) {
      this.leaked = true;
      this.alive = false;
    }
  }

  /** Apply freeze effect */
  freeze(duration: number): void {
    if (this.config.immuneFreeze || this.isMOAB) return;
    this.frozen = true;
    this.freezeTimer = Math.max(this.freezeTimer, duration);
  }

  /**
   * Take damage. Returns list of child bloons to spawn.
   * @returns Array of new Bloon instances (children), or empty if just HP reduced.
   */
  takeDamage(amount: number, damageType: 'sharp' | 'explosive' | 'freeze' | 'energy'): Bloon[] {
    // Check immunities
    if (damageType === 'explosive' && this.config.immuneExplosive) return [];

    this.hp -= amount;

    if (this.hp <= 0) {
      this.alive = false;
      // Spawn children at same position
      return this.config.children.map(childType => {
        const child = new Bloon(childType, this.distanceTraveled);
        child.x = this.x;
        child.y = this.y;
        child.angle = this.angle;
        return child;
      });
    }

    return [];
  }
}
