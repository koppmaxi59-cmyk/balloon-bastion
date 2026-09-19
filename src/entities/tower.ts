// ============================================================
// tower.ts — Tower entity with targeting, shooting, upgrades
// ============================================================

import { TowerTypeId, TowerConfig, TOWER_DATA, TargetMode, SELL_REFUND_RATE } from '../data/tower-data';
import { Bloon } from './bloon';
import { Projectile } from './projectile';
import { distSq } from '../utils/math';

let nextTowerId = 0;

export class Tower {
  id: number;
  type: TowerTypeId;
  config: TowerConfig;
  x: number;
  y: number;
  targeting: TargetMode = 'first';

  // Live stats (modified by upgrades)
  range: number;
  damage: number;
  attackCooldown: number;
  pierce: number;
  splashRadius: number;
  projectileSpeed: number;
  freezeDuration: number;

  // State
  cooldownTimer = 0;
  totalInvested: number;
  /** Upgrade tiers purchased: [pathA tier, pathB tier] (0-3) */
  upgradeTiers: [number, number, number] = [0, 0, 0];
  selected = false;
  angle = 0; // facing angle for rendering

  constructor(type: TowerTypeId, x: number, y: number) {
    this.id = nextTowerId++;
    this.type = type;
    this.config = TOWER_DATA[type];
    this.x = x;
    this.y = y;

    // Copy base stats
    this.range = this.config.range;
    this.damage = this.config.damage;
    this.attackCooldown = this.config.attackCooldown;
    this.pierce = this.config.pierce;
    this.splashRadius = this.config.splashRadius;
    this.projectileSpeed = this.config.projectileSpeed;
    this.freezeDuration = this.config.freezeDuration;
    this.totalInvested = this.config.cost;
  }

  get sellValue(): number {
    return Math.floor(this.totalInvested * SELL_REFUND_RATE);
  }

  /** Get next available upgrade for a path (0 or 1), or null if maxed */
  getNextUpgrade(pathIndex: 0 | 1 | 2) {
    const tier = this.upgradeTiers[pathIndex];
    const upgrades = this.config.upgrades[pathIndex];
    if (tier >= upgrades.length) return null;
    return upgrades[tier];
  }

  canUpgrade(pathIndex: 0 | 1 | 2): boolean {
    const upgrade = this.getNextUpgrade(pathIndex);
    if (!upgrade) return false;
    const otherPath = this.upgradeTiers.reduce((sum, tier, index) => index === pathIndex ? sum : sum + tier, 0);
    return this.upgradeTiers[pathIndex] < 3 && this.upgradeTiers[pathIndex] + otherPath < 5;
  }

  /** Purchase and apply an upgrade */
  applyUpgrade(pathIndex: 0 | 1 | 2): boolean {
    if (!this.canUpgrade(pathIndex)) return false;
    const upgrade = this.getNextUpgrade(pathIndex);
    if (!upgrade) return false;

    const mods = upgrade.statMods;
    if (mods.damageAdd) this.damage += mods.damageAdd;
    if (mods.rangeAdd) this.range += mods.rangeAdd;
    if (mods.cooldownMul) this.attackCooldown *= mods.cooldownMul;
    if (mods.pierceAdd) this.pierce += mods.pierceAdd;
    if (mods.splashRadiusAdd) this.splashRadius += mods.splashRadiusAdd;
    if (mods.projectileSpeedAdd) this.projectileSpeed += mods.projectileSpeedAdd;

    this.totalInvested += upgrade.cost;
    this.upgradeTiers[pathIndex]++;
    return true;
  }

  /** Find the best target bloon in range */
  findTarget(bloons: Bloon[]): Bloon | null {
    const rangeSq = this.range * this.range;
    const inRange: Bloon[] = [];

    for (const b of bloons) {
      if (!b.alive) continue;
      const d = distSq({ x: this.x, y: this.y }, { x: b.x, y: b.y });
      if (d <= rangeSq) inRange.push(b);
    }

    if (inRange.length === 0) return null;

    switch (this.targeting) {
      case 'first':
        return inRange.reduce((best, b) =>
          b.distanceTraveled > best.distanceTraveled ? b : best
        );
      case 'last':
        return inRange.reduce((best, b) =>
          b.distanceTraveled < best.distanceTraveled ? b : best
        );
      case 'strong':
        return inRange.reduce((best, b) => {
          if (b.rbe !== best.rbe) return b.rbe > best.rbe ? b : best;
          return b.distanceTraveled > best.distanceTraveled ? b : best;
        });
      case 'close':
        return inRange.reduce((best, b) => {
          const db = distSq({ x: this.x, y: this.y }, { x: b.x, y: b.y });
          const dbest = distSq({ x: this.x, y: this.y }, { x: best.x, y: best.y });
          return db < dbest ? b : best;
        });
    }
  }

  /**
   * Update tower: cooldown tick, find target, shoot.
   * Returns new projectiles to add to the game.
   */
  update(dt: number, bloons: Bloon[]): Projectile[] {
    this.cooldownTimer -= dt;
    if (this.cooldownTimer > 0) return [];

    const target = this.findTarget(bloons);
    if (!target) return [];

    this.cooldownTimer = this.attackCooldown;

    // Face target
    this.angle = Math.atan2(target.y - this.y, target.x - this.x);

    // Ice monkey: special area freeze (no projectile)
    if (this.type === 'ice') {
      return this.shootIce(bloons);
    }

    // Tack shooter: 8 projectiles in all directions
    if (this.type === 'tack') {
      return this.shootTack();
    }

    // Standard single projectile
    return [
      new Projectile({
        x: this.x,
        y: this.y,
        target,
        speed: this.projectileSpeed,
        damage: this.damage,
        pierce: this.pierce,
        splashRadius: this.splashRadius,
        damageType: this.config.damageType,
      }),
    ];
  }

  private shootTack(): Projectile[] {
    const projs: Projectile[] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      projs.push(
        new Projectile({
          x: this.x,
          y: this.y,
          target: null,
          speed: this.projectileSpeed,
          damage: this.damage,
          pierce: this.pierce,
          splashRadius: 0,
          damageType: this.config.damageType,
          fixedAngle: angle,
        })
      );
    }
    return projs;
  }

  private shootIce(bloons: Bloon[]): Projectile[] {
    const rangeSq = this.range * this.range;
    for (const b of bloons) {
      if (!b.alive) continue;
      const d = distSq({ x: this.x, y: this.y }, { x: b.x, y: b.y });
      if (d <= rangeSq) {
        b.freeze(this.freezeDuration);
        if (this.damage > 0) {
          b.takeDamage(this.damage, 'freeze');
        }
      }
    }
    return []; // Ice doesn't create projectiles
  }
}
