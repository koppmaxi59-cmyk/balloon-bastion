// ============================================================
// math.ts — Vector helpers, distance, path interpolation
// ============================================================

export interface Vec2 {
  x: number;
  y: number;
}

export function vec2(x: number, y: number): Vec2 {
  return { x, y };
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

export function length(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

export function normalize(v: Vec2): Vec2 {
  const len = length(v);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function distSq(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVec(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

export function angle(from: Vec2, to: Vec2): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ============================================================
// Path utilities — precompute segment lengths & interpolation
// ============================================================

export interface PathData {
  waypoints: Vec2[];
  segmentLengths: number[];
  cumulativeDistances: number[];
  totalLength: number;
}

export function buildPathData(waypoints: Vec2[]): PathData {
  const segmentLengths: number[] = [];
  const cumulativeDistances: number[] = [0];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const d = dist(waypoints[i], waypoints[i + 1]);
    segmentLengths.push(d);
    cumulativeDistances.push(cumulativeDistances[i] + d);
  }

  return {
    waypoints,
    segmentLengths,
    cumulativeDistances,
    totalLength: cumulativeDistances[cumulativeDistances.length - 1],
  };
}

/** Get position and rotation on path given distance traveled */
export function getPositionOnPath(
  path: PathData,
  distance: number
): { pos: Vec2; angle: number } {
  if (distance <= 0) {
    const a = angle(path.waypoints[0], path.waypoints[1]);
    return { pos: { ...path.waypoints[0] }, angle: a };
  }
  if (distance >= path.totalLength) {
    const last = path.waypoints.length - 1;
    const a = angle(path.waypoints[last - 1], path.waypoints[last]);
    return { pos: { ...path.waypoints[last] }, angle: a };
  }

  // Binary search for segment
  let lo = 0;
  let hi = path.cumulativeDistances.length - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (path.cumulativeDistances[mid] <= distance) lo = mid;
    else hi = mid - 1;
  }

  const segStart = path.cumulativeDistances[lo];
  const segLen = path.segmentLengths[lo];
  const t = segLen > 0 ? (distance - segStart) / segLen : 0;

  const pos = lerpVec(path.waypoints[lo], path.waypoints[lo + 1], t);
  const a = angle(path.waypoints[lo], path.waypoints[lo + 1]);

  return { pos, angle: a };
}
