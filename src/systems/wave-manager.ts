// ============================================================
// wave-manager.ts — Wave/round definitions & spawning
// ============================================================

import { BloonTypeId } from '../data/bloon-data';
import { Bloon } from '../entities/bloon';

interface SpawnGroup {
  type: BloonTypeId;
  count: number;
  spacing: number; // seconds between spawns in this group
  delay: number;   // seconds delay from round start
}

type RoundDef = SpawnGroup[];

export type DifficultyId = 'relaxed' | 'standard' | 'nightmare';

export const DIFFICULTY_DATA: Record<DifficultyId, {
  name: string;
  bloonSpeed: number;
  bloonCount: number;
  startingCash: number;
  startingLives: number;
}> = {
  relaxed: { name: 'Gartenlauf', bloonSpeed: 0.82, bloonCount: 0.8, startingCash: 850, startingLives: 150 },
  standard: { name: 'Grenzland', bloonSpeed: 1, bloonCount: 1, startingCash: 650, startingLives: 100 },
  nightmare: { name: 'Sturmfront', bloonSpeed: 1.28, bloonCount: 1.3, startingCash: 500, startingLives: 75 },
};

// 30 rounds of escalating difficulty
const ROUNDS: RoundDef[] = [
  // Round 1: intro reds
  [{ type: 'red', count: 15, spacing: 0.6, delay: 0 }],
  // Round 2: more reds
  [{ type: 'red', count: 25, spacing: 0.45, delay: 0 }],
  // Round 3: blues arrive
  [{ type: 'red', count: 10, spacing: 0.5, delay: 0 },
   { type: 'blue', count: 5, spacing: 0.8, delay: 3 }],
  // Round 4
  [{ type: 'blue', count: 15, spacing: 0.5, delay: 0 },
   { type: 'red', count: 15, spacing: 0.35, delay: 2 }],
  // Round 5: greens
  [{ type: 'blue', count: 10, spacing: 0.5, delay: 0 },
    { type: 'green', count: 5, spacing: 0.8, delay: 3 },
    { type: 'zebra', count: 4, spacing: 0.8, delay: 5 }],
  // Round 7
  [{ type: 'green', count: 12, spacing: 0.55, delay: 0 },
   { type: 'blue', count: 12, spacing: 0.4, delay: 2 }],
  // Round 8
  [{ type: 'red', count: 30, spacing: 0.2, delay: 0 },
   { type: 'green', count: 8, spacing: 0.6, delay: 1 }],
  // Round 9: yellows
  [{ type: 'green', count: 15, spacing: 0.45, delay: 0 },
   { type: 'yellow', count: 5, spacing: 0.8, delay: 3 }],
  // Round 10
  [{ type: 'yellow', count: 10, spacing: 0.55, delay: 0 },
   { type: 'green', count: 15, spacing: 0.35, delay: 2 }],
  // Round 11: first swarm
  [{ type: 'blue', count: 40, spacing: 0.15, delay: 0 },
   { type: 'yellow', count: 8, spacing: 0.6, delay: 2 }],
  // Round 12: pinks
  [{ type: 'pink', count: 6, spacing: 0.8, delay: 0 },
   { type: 'yellow', count: 15, spacing: 0.4, delay: 2 }],
  // Round 13
  [{ type: 'green', count: 25, spacing: 0.25, delay: 0 },
   { type: 'pink', count: 10, spacing: 0.6, delay: 3 }],
  // Round 14: speed rush
  [{ type: 'yellow', count: 20, spacing: 0.3, delay: 0 },
   { type: 'pink', count: 12, spacing: 0.45, delay: 2 }],
  // Round 15
  [{ type: 'red', count: 50, spacing: 0.1, delay: 0 },
   { type: 'pink', count: 8, spacing: 0.55, delay: 1 },
   { type: 'green', count: 20, spacing: 0.3, delay: 3 }],
  // Round 16: blacks
  [{ type: 'black', count: 4, spacing: 1.2, delay: 0 },
   { type: 'pink', count: 15, spacing: 0.4, delay: 2 }],
  // Round 17
  [{ type: 'yellow', count: 30, spacing: 0.2, delay: 0 },
   { type: 'black', count: 6, spacing: 0.8, delay: 2 }],
  // Round 18: whites
  [{ type: 'white', count: 6, spacing: 0.9, delay: 0 },
   { type: 'black', count: 6, spacing: 0.9, delay: 3 }],
  // Round 19: mixed rush
  [{ type: 'pink', count: 20, spacing: 0.25, delay: 0 },
   { type: 'black', count: 8, spacing: 0.7, delay: 2 },
   { type: 'white', count: 8, spacing: 0.7, delay: 4 }],
  // Round 20
  [{ type: 'green', count: 40, spacing: 0.12, delay: 0 },
   { type: 'yellow', count: 25, spacing: 0.2, delay: 1 }],
  // Round 21: big mixed wave
  [{ type: 'black', count: 10, spacing: 0.55, delay: 0 },
   { type: 'white', count: 10, spacing: 0.55, delay: 2 },
   { type: 'pink', count: 20, spacing: 0.25, delay: 4 }],
  // Round 22: ceramics arrive
  [{ type: 'ceramic', count: 2, spacing: 2.0, delay: 0 },
   { type: 'black', count: 12, spacing: 0.5, delay: 1 }],
  // Round 22
  [{ type: 'ceramic', count: 3, spacing: 1.5, delay: 0 },
   { type: 'pink', count: 25, spacing: 0.2, delay: 2 }],
  // Round 23
  [{ type: 'yellow', count: 50, spacing: 0.1, delay: 0 },
   { type: 'ceramic', count: 4, spacing: 1.2, delay: 2 }],
  // Round 24
  [{ type: 'ceramic', count: 5, spacing: 1.0, delay: 0 },
   { type: 'black', count: 15, spacing: 0.35, delay: 2 },
   { type: 'white', count: 15, spacing: 0.35, delay: 4 }],
  // Round 25: ceramic rush
  [{ type: 'ceramic', count: 8, spacing: 0.8, delay: 0 },
   { type: 'pink', count: 30, spacing: 0.15, delay: 2 }],
  // Round 26
  [{ type: 'ceramic', count: 6, spacing: 0.9, delay: 0 },
   { type: 'black', count: 20, spacing: 0.3, delay: 2 },
   { type: 'white', count: 20, spacing: 0.3, delay: 4 }],
  // Round 27: huge wave
  [{ type: 'ceramic', count: 10, spacing: 0.7, delay: 0 },
   { type: 'yellow', count: 60, spacing: 0.08, delay: 2 }],
  // Round 28
  [{ type: 'ceramic', count: 12, spacing: 0.6, delay: 0 },
   { type: 'black', count: 25, spacing: 0.2, delay: 3 }],
  // Round 29: pre-boss
  [{ type: 'ceramic', count: 15, spacing: 0.5, delay: 0 },
   { type: 'pink', count: 40, spacing: 0.1, delay: 2 },
   { type: 'white', count: 20, spacing: 0.25, delay: 5 }],
  // Round 30: MOAB BOSS
  [{ type: 'bfb', count: 1, spacing: 1, delay: 0 },
   { type: 'ceramic', count: 6, spacing: 1.0, delay: 3 }],
];

export class WaveManager {
  difficulty: DifficultyId;
  currentRound = 0; // 0-indexed internally, displayed as +1
  totalRounds = ROUNDS.length;
  roundActive = false;
  endlessMode = false;

  /** Spawn timers for current round */
  private spawnGroups: {
    type: BloonTypeId;
    remaining: number;
    spacing: number;
    timer: number;
    started: boolean;
    startDelay: number;
    delayTimer: number;
  }[] = [];

  private roundTimer = 0;

  constructor(difficulty: DifficultyId = 'standard') {
    this.difficulty = difficulty;
  }

  setDifficulty(difficulty: DifficultyId) {
    this.difficulty = difficulty;
    this.currentRound = 0;
    this.roundActive = false;
    this.spawnGroups = [];
  }

  setEndless(enabled: boolean) {
    this.endlessMode = enabled;
    this.currentRound = 0;
    this.roundActive = false;
  }

  /** Returns true if all rounds completed */
  get allRoundsComplete(): boolean {
    return !this.endlessMode && this.currentRound >= this.totalRounds;
  }

  get displayRound(): number {
    return this.currentRound + 1;
  }

  /** Start the next round */
  startRound(): void {
    if (this.allRoundsComplete) return;

    const roundDef = ROUNDS[this.currentRound % this.totalRounds];
    const endlessScale = this.endlessMode ? 1 + Math.floor(this.currentRound / this.totalRounds) * 0.25 : 1;
    this.spawnGroups = roundDef.map(g => ({
      type: g.type,
      remaining: Math.max(1, Math.ceil(g.count * DIFFICULTY_DATA[this.difficulty].bloonCount * endlessScale)),
      spacing: Math.max(0.08, g.spacing / endlessScale),
      timer: 0,
      started: false,
      startDelay: g.delay,
      delayTimer: g.delay,
    }));

    this.roundActive = true;
    this.roundTimer = 0;
  }

  /**
   * Update spawning. Returns newly spawned bloons.
   * Call with active bloon count to detect round completion.
   */
  update(dt: number, activeBloonCount: number): { spawned: Bloon[]; roundComplete: boolean } {
    if (!this.roundActive) return { spawned: [], roundComplete: false };

    this.roundTimer += dt;
    const spawned: Bloon[] = [];

    let allDone = true;
    for (const group of this.spawnGroups) {
      if (group.remaining <= 0) continue;
      allDone = false;

      // Wait for start delay
      if (!group.started) {
        group.delayTimer -= dt;
        if (group.delayTimer > 0) continue;
        group.started = true;
        group.timer = 0; // spawn first immediately
      }

      group.timer -= dt;
      if (group.timer <= 0) {
        const bloon = new Bloon(group.type, 0);
        bloon.speed *= DIFFICULTY_DATA[this.difficulty].bloonSpeed;
        spawned.push(bloon);
        group.remaining--;
        group.timer += group.spacing;
      }
    }

    // Round complete when all spawned and all bloons gone
    const roundComplete = allDone && activeBloonCount === 0;
    if (roundComplete) {
      this.roundActive = false;
      this.currentRound++;
    }

    return { spawned, roundComplete };
  }
}
