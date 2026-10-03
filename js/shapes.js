export const POINT_COUNT = 2400;

const TAU = Math.PI * 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const GRID_SIDE = Math.ceil(Math.sqrt(POINT_COUNT));

// Small seeded PRNG (mulberry32) so the cloud looks the same on every load.
function createRandom(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSeeds(count, seed = 7) {
  const random = createRandom(seed);
  return Array.from({ length: count }, (_, i) => ({
    i,
    u: (i + 0.5) / count,
    a: random(),
    b: random(),
    c: random(),
  }));
}

// Every shape maps a point seed and a time to a position inside a unit sphere.

function sphere(s, t, out) {
  const y = 1 - 2 * s.u;
  const ring = Math.sqrt(1 - y * y);
  const angle = s.i * GOLDEN_ANGLE;
  const r = 1 + 0.025 * Math.sin(t * 1.4 + y * 5);
  out[0] = Math.cos(angle) * ring * r;
  out[1] = y * r;
  out[2] = Math.sin(angle) * ring * r;
}

function knot(s, t, out) {
  const phi = (s.u + t * 0.012) * TAU;
  const r = 2 + Math.cos(3 * phi);
  const tube = 0.34 * Math.cbrt(s.a);
  const theta = s.b * TAU;
  const z = s.c * 2 - 1;
  const ring = Math.sqrt(1 - z * z);
  out[0] = (r * Math.cos(2 * phi) + tube * ring * Math.cos(theta)) / 3.1;
  out[1] = (r * Math.sin(2 * phi) + tube * ring * Math.sin(theta)) / 3.1;
  out[2] = (Math.sin(3 * phi) + tube * z) / 3.1;
}

function wave(s, t, out) {
  const x = ((s.i % GRID_SIDE) / (GRID_SIDE - 1)) * 2 - 1;
  const z = (Math.floor(s.i / GRID_SIDE) / (GRID_SIDE - 1)) * 2 - 1;
  const d = Math.hypot(x, z);
  const y = 0.16 * Math.sin(3 * x + t) * Math.cos(3 * z + t * 0.8) + 0.07 * Math.sin(d * 9 - t * 2);
  out[0] = x;
  out[1] = y;
  out[2] = z;
}

function galaxy(s, t, out) {
  const r = 0.06 + Math.pow(s.u, 0.8) + (s.c - 0.5) * 0.06;
  const arm = (s.i % 3) * (TAU / 3);
  const spread = (s.a - 0.5) * 1.1 * (1 - r * 0.5);
  const angle = arm + r * 3.4 + spread + (t * 0.22) / (0.35 + r);
  out[0] = Math.cos(angle) * r;
  out[1] = (s.b - 0.5) * 0.14 * (1.1 - r);
  out[2] = Math.sin(angle) * r;
}

function bloom(s, t, out) {
  const y = 1 - 2 * s.u;
  const ring = Math.sqrt(1 - y * y);
  const azimuth = s.i * GOLDEN_ANGLE;
  const polar = Math.acos(y);
  const r =
    0.8 + 0.22 * Math.sin(4 * polar) * Math.sin(3 * azimuth + t * 0.7) + 0.03 * Math.sin(t * 1.3);
  out[0] = Math.cos(azimuth) * ring * r;
  out[1] = y * r;
  out[2] = Math.sin(azimuth) * ring * r;
}

// notes: the chord played for each form, in Hz (one frequency per voice).
export const shapes = [
  {
    id: 'sphere',
    tilt: -0.3,
    colors: ['#f6efe4', '#8aa4ff'],
    notes: [110.0, 164.81, 246.94, 329.63],
    position: sphere,
  },
  {
    id: 'knot',
    tilt: 0.25,
    colors: ['#ffc078', '#ff5c8a'],
    notes: [98.0, 146.83, 220.0, 293.66],
    position: knot,
  },
  {
    id: 'wave',
    tilt: -0.6,
    colors: ['#86e3ff', '#5468ff'],
    notes: [87.31, 130.81, 196.0, 261.63],
    position: wave,
  },
  {
    id: 'galaxy',
    tilt: -0.95,
    colors: ['#ffe6c2', '#a77bff'],
    notes: [82.41, 123.47, 185.0, 246.94],
    position: galaxy,
  },
  {
    id: 'bloom',
    tilt: -0.3,
    colors: ['#ffd59a', '#ff7aa8'],
    notes: [110.0, 164.81, 220.0, 277.18],
    position: bloom,
  },
];
