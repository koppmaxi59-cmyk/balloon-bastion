// ============================================================
// collision.ts — Projectile ↔ Bloon collision detection
// ============================================================

import { Bloon } from '../entities/bloon';
import { Projectile } from '../entities/projectile';
import { distSq } from '../utils/math';

export interface CollisionResult {
  poppedBloons: Bloon[];
  earnedCash: number;
  newBloons: Bloon[];
}

/**
 * Process all projectile-bloon collisions.
 * Handles pierce, splash damage, and child spawning.
 */
export function processCollisions(
  projectiles: Projectile[],
  bloons: Bloon[]
): CollisionResult {
  let earnedCash = 0;
  const newBloons: Bloon[] = [];
  const poppedBloons: Bloon[] = [];

  for (const proj of projectiles) {
    if (!proj.alive) continue;

    for (const bloon of bloons) {
      if (!bloon.alive) continue;
      if (proj.piercedIds.has(bloon.id)) continue;

      const hitRadius = bloon.radius + 5; // projectile radius ~5
      const d = distSq({ x: proj.x, y: proj.y }, { x: bloon.x, y: bloon.y });

      if (d <= hitRadius * hitRadius) {
        // Direct hit
        proj.piercedIds.add(bloon.id);
        const children = bloon.takeDamage(proj.damage, proj.damageType);

        if (!bloon.alive) {
          poppedBloons.push(bloon);
          earnedCash += 1; // $1 per pop
        }

        // Spawn children
        for (const child of children) {
          newBloons.push(child);
        }

        // Freeze effect
        if (proj.freezeDuration > 0) {
          bloon.freeze(proj.freezeDuration);
        }

        // Splash damage
        if (proj.splashRadius > 0) {
          const splashResult = applySplashDamage(
            proj, bloon, bloons, proj.splashRadius, proj.damage, proj.damageType
          );
          earnedCash += splashResult.earnedCash;
          newBloons.push(...splashResult.newBloons);
          poppedBloons.push(...splashResult.poppedBloons);
        }

        proj.pierce--;
        if (proj.pierce <= 0) {
          proj.alive = false;
          break;
        }
      }
    }
  }

  return { poppedBloons, earnedCash, newBloons };
}

function applySplashDamage(
  proj: Projectile,
  hitBloon: Bloon,
  allBloons: Bloon[],
  radius: number,
  damage: number,
  damageType: Projectile['damageType']
): CollisionResult {
  let earnedCash = 0;
  const newBloons: Bloon[] = [];
  const poppedBloons: Bloon[] = [];
  const radiusSq = radius * radius;

  for (const bloon of allBloons) {
    if (!bloon.alive || bloon.id === hitBloon.id) continue;
    if (proj.piercedIds.has(bloon.id)) continue;

    const d = distSq({ x: hitBloon.x, y: hitBloon.y }, { x: bloon.x, y: bloon.y });
    if (d <= radiusSq) {
      proj.piercedIds.add(bloon.id);
      const children = bloon.takeDamage(damage, damageType);

      if (!bloon.alive) {
        poppedBloons.push(bloon);
        earnedCash += 1;
      }

      newBloons.push(...children);
    }
  }

  return { poppedBloons, earnedCash, newBloons };
}
