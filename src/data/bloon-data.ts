// ============================================================
// bloon-data.ts — Bloon type definitions (BTD6-inspired)
// ============================================================

export type BloonTypeId =
  | 'red' | 'blue' | 'green' | 'yellow' | 'pink'
  | 'black' | 'white' | 'zebra' | 'purple' | 'lead' | 'ceramic'
  | 'moab' | 'bfb' | 'zomg' | 'bad';

export interface BloonConfig {
  id: BloonTypeId;
  name: string;
  layerHP: number;          // hits to pop this layer
  speed: number;            // pixels per second (base)
  children: BloonTypeId[];  // spawned when this layer pops
  rbe: number;              // Red Bloon Equivalent (total lives lost if leaked)
  radius: number;           // collision & render radius
  color: string;            // primary fill color
  strokeColor: string;      // outline color
  highlightColor: string;   // sheen/gloss highlight
  isMOAB: boolean;          // is a blimp-class bloon
  immuneExplosive: boolean;
  immuneFreeze: boolean;
}

export const BLOON_DATA: Record<BloonTypeId, BloonConfig> = {
  red: {
    id: 'red', name: 'Red Bloon',
    layerHP: 1, speed: 55, children: [], rbe: 1,
    radius: 10, color: '#e74c3c', strokeColor: '#c0392b', highlightColor: '#ff7675',
    isMOAB: false, immuneExplosive: false, immuneFreeze: false,
  },
  blue: {
    id: 'blue', name: 'Blue Bloon',
    layerHP: 1, speed: 75, children: ['red'], rbe: 2,
    radius: 10, color: '#3498db', strokeColor: '#2980b9', highlightColor: '#74b9ff',
    isMOAB: false, immuneExplosive: false, immuneFreeze: false,
  },
  green: {
    id: 'green', name: 'Green Bloon',
    layerHP: 1, speed: 95, children: ['blue'], rbe: 3,
    radius: 10, color: '#2ecc71', strokeColor: '#27ae60', highlightColor: '#55efc4',
    isMOAB: false, immuneExplosive: false, immuneFreeze: false,
  },
  yellow: {
    id: 'yellow', name: 'Yellow Bloon',
    layerHP: 1, speed: 155, children: ['green'], rbe: 4,
    radius: 10, color: '#f1c40f', strokeColor: '#f39c12', highlightColor: '#ffeaa7',
    isMOAB: false, immuneExplosive: false, immuneFreeze: false,
  },
  pink: {
    id: 'pink', name: 'Pink Bloon',
    layerHP: 1, speed: 175, children: ['yellow'], rbe: 5,
    radius: 10, color: '#e84393', strokeColor: '#d63384', highlightColor: '#fd79a8',
    isMOAB: false, immuneExplosive: false, immuneFreeze: false,
  },
  black: {
    id: 'black', name: 'Black Bloon',
    layerHP: 1, speed: 95, children: ['pink', 'pink'], rbe: 11,
    radius: 11, color: '#2d3436', strokeColor: '#1a1a2e', highlightColor: '#636e72',
    isMOAB: false, immuneExplosive: true, immuneFreeze: false,
  },
  white: {
    id: 'white', name: 'White Bloon',
    layerHP: 1, speed: 105, children: ['yellow', 'yellow'], rbe: 11,
    radius: 11, color: '#ecf0f1', strokeColor: '#bdc3c7', highlightColor: '#ffffff',
    isMOAB: false, immuneExplosive: false, immuneFreeze: true,
  },
  zebra: {
    id: 'zebra', name: 'Zebra Bloon',
    layerHP: 1, speed: 110, children: ['black', 'white'], rbe: 11,
    radius: 11, color: '#ecf0f1', strokeColor: '#2d3436', highlightColor: '#ffffff',
    isMOAB: false, immuneExplosive: false, immuneFreeze: false,
  },
  purple: {
    id: 'purple', name: 'Purple Bloon',
    layerHP: 1, speed: 190, children: ['pink'], rbe: 6,
    radius: 11, color: '#8e44ad', strokeColor: '#5b2c6f', highlightColor: '#d7bde2',
    isMOAB: false, immuneExplosive: false, immuneFreeze: false,
  },
  lead: {
    id: 'lead', name: 'Lead Bloon',
    layerHP: 2, speed: 45, children: ['black', 'black'], rbe: 23,
    radius: 12, color: '#566573', strokeColor: '#273746', highlightColor: '#aab7b8',
    isMOAB: false, immuneExplosive: false, immuneFreeze: false,
  },
  ceramic: {
    id: 'ceramic', name: 'Ceramic Bloon',
    layerHP: 10, speed: 130, children: ['black', 'white'], rbe: 33,
    radius: 13, color: '#e17055', strokeColor: '#d35400', highlightColor: '#fab1a0',
    isMOAB: false, immuneExplosive: false, immuneFreeze: false,
  },
  moab: {
    id: 'moab', name: 'M.O.A.B.',
    layerHP: 200, speed: 45, children: ['ceramic', 'ceramic', 'ceramic', 'ceramic'], rbe: 332,
    radius: 28, color: '#0984e3', strokeColor: '#074a8a', highlightColor: '#74b9ff',
    isMOAB: true, immuneExplosive: false, immuneFreeze: true,
  },
  bfb: {
    id: 'bfb', name: 'B.F.B.', layerHP: 750, speed: 28,
    children: ['moab', 'moab', 'moab', 'moab'], rbe: 1665,
    radius: 38, color: '#c0392b', strokeColor: '#641e16', highlightColor: '#f1948a',
    isMOAB: true, immuneExplosive: false, immuneFreeze: true,
  },
  zomg: {
    id: 'zomg', name: 'Z.O.M.G.', layerHP: 3000, speed: 18,
    children: ['bfb', 'bfb', 'bfb', 'bfb'], rbe: 5550,
    radius: 48, color: '#17202a', strokeColor: '#000000', highlightColor: '#566573',
    isMOAB: true, immuneExplosive: false, immuneFreeze: true,
  },
  bad: {
    id: 'bad', name: 'B.A.D.', layerHP: 20000, speed: 12,
    children: ['zomg', 'zomg'], rbe: 20000,
    radius: 62, color: '#8e44ad', strokeColor: '#4a235a', highlightColor: '#d2b4de',
    isMOAB: true, immuneExplosive: false, immuneFreeze: true,
  },
};

/** Base speed used for speed multiplier display */
export const BASE_BLOON_SPEED = 55;
