// ============================================================
// maps.ts — Map path definitions
// ============================================================

import { Vec2, vec2, buildPathData, PathData } from '../utils/math';

export interface GameMap {
  name: string;
  path: PathData;
  /** Grid-size for tower placement snapping */
  gridSize: number;
  /** Canvas dimensions this map is designed for */
  width: number;
  height: number;
  /** Background color (grass) */
  bgColor: string;
  /** Path/road color */
  pathColor: string;
  pathWidth: number;
}

// ========== MAP 1: Spiral ==========
function createSpiralPath(w: number, h: number): Vec2[] {
  const cx = w * 0.5;
  const cy = h * 0.5;
  const margin = 60;

  return [
    // Entry from bottom-left
    vec2(-20, h - 120),
    vec2(margin + 40, h - 120),
    // Go right along bottom
    vec2(w - margin - 40, h - 120),
    // Up right side
    vec2(w - margin - 40, margin + 40),
    // Left along top
    vec2(margin + 120, margin + 40),
    // Down left side (inner)
    vec2(margin + 120, h - 200),
    // Right inner bottom
    vec2(w - margin - 120, h - 200),
    // Up inner right
    vec2(w - margin - 120, margin + 120),
    // Left inner top
    vec2(margin + 200, margin + 120),
    // Down to center
    vec2(margin + 200, cy + 30),
    // Right to center
    vec2(cx + 60, cy + 30),
    // Up to center-top
    vec2(cx + 60, cy - 40),
    // Exit right
    vec2(w + 20, cy - 40),
  ];
}

// ========== MAP 2: S-Curve ==========
function createSCurvePath(w: number, h: number): Vec2[] {
  const margin = 80;
  return [
    vec2(-20, 100),
    vec2(margin, 100),
    vec2(w - margin, 100),
    vec2(w - margin, h * 0.38),
    vec2(margin, h * 0.38),
    vec2(margin, h * 0.62),
    vec2(w - margin, h * 0.62),
    vec2(w - margin, h - 100),
    vec2(margin, h - 100),
    vec2(-20, h - 100),
  ];
}

// ========== MAP 3: Figure-8 / Infinity ==========
function createFigure8Path(w: number, h: number): Vec2[] {
  const cx = w * 0.5;
  const cy = h * 0.5;
  const rx = w * 0.3;
  const ry = h * 0.3;
  const points: Vec2[] = [];

  // Create a figure-8 using parametric equations
  const steps = 40;
  // Entry
  points.push(vec2(-20, cy));
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const x = cx + rx * Math.sin(t);
    const y = cy + ry * Math.sin(2 * t) * 0.6;
    points.push(vec2(x, y));
  }
  // Exit
  points.push(vec2(w + 20, cy));

  return points;
}

const MAP_W = 900;
const MAP_H = 600;

export const MAPS: GameMap[] = [
  {
    name: 'Spirale',
    path: buildPathData(createSpiralPath(MAP_W, MAP_H)),
    gridSize: 40,
    width: MAP_W,
    height: MAP_H,
    bgColor: '#4a7c59',
    pathColor: '#c4a265',
    pathWidth: 38,
  },
  {
    name: 'S-Kurve',
    path: buildPathData(createSCurvePath(MAP_W, MAP_H)),
    gridSize: 40,
    width: MAP_W,
    height: MAP_H,
    bgColor: '#4a7c59',
    pathColor: '#c4a265',
    pathWidth: 38,
  },
  {
    name: 'Unendlich',
    path: buildPathData(createFigure8Path(MAP_W, MAP_H)),
    gridSize: 40,
    width: MAP_W,
    height: MAP_H,
    bgColor: '#4a7c59',
    pathColor: '#c4a265',
    pathWidth: 38,
  },
];

MAPS.push(
  { ...MAPS[0], name: 'Sonnenpass', bgColor: '#5b8c5a', pathColor: '#d5b26c' },
  { ...MAPS[1], name: 'Küstenlinie', bgColor: '#3f7f78', pathColor: '#d8b477' },
  { ...MAPS[2], name: 'Kristallgarten', bgColor: '#527d8a', pathColor: '#ceb47a' },
);

export const DEFAULT_MAP = MAPS[0]; // Spirale
