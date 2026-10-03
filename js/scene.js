import { POINT_COUNT, createSeeds, shapes } from './shapes.js';

const BACKGROUND = [7, 8, 11];
const COLOR_STEPS = 8;
const DUST_COUNT = 500;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const lerp = (a, b, k) => a + (b - a) * k;
const smoothstep = (edge0, edge1, x) => {
  const k = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return k * k * (3 - 2 * k);
};

const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mixRgb = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));

// Points are drawn in batches that share a color and a size:
// COLOR_STEPS along the shape, times two sizes (regular and sparkle).
function createBatches(seeds) {
  const batches = Array.from({ length: COLOR_STEPS * 2 }, (_, n) => ({
    step: Math.floor(n / 2) / (COLOR_STEPS - 1),
    sparkle: n % 2 === 1,
    indices: [],
  }));
  for (const s of seeds) {
    const step = Math.min(COLOR_STEPS - 1, Math.floor(s.u * COLOR_STEPS));
    batches[step * 2 + (s.c > 0.86 ? 1 : 0)].indices.push(s.i);
  }
  return batches;
}

function createDust(seeds) {
  return seeds.map((s) => {
    const r = 2.4 + s.a * 3.6;
    const y = s.b * 2 - 1;
    const ring = Math.sqrt(1 - y * y);
    const angle = s.c * Math.PI * 2;
    return [Math.cos(angle) * ring * r, y * r, Math.sin(angle) * ring * r];
  });
}

export function createScene(state) {
  const palettes = shapes.map((shape) => shape.colors.map(hexToRgb));
  const seeds = createSeeds(POINT_COUNT);
  const batches = createBatches(seeds);
  const dust = createDust(createSeeds(DUST_COUNT, 42));
  const positions = new Float32Array(POINT_COUNT * 3);
  const from = [0, 0, 0];
  const to = [0, 0, 0];

  const view = { progress: state.progress, x: 0, y: 0, offsetX: 0, offsetY: 0, scale: 1, burst: 0 };
  let time = 0;
  let accent = '';

  return (p) => {
    p.setup = () => {
      p.pixelDensity(Math.min(2, p.displayDensity()));
      p.createCanvas(p.windowWidth, p.windowHeight, p.WEBGL);
      document.body.classList.add('is-ready');
    };

    p.windowResized = () => p.resizeCanvas(p.windowWidth, p.windowHeight);

    p.draw = () => {
      const dt = Math.min(p.deltaTime, 50) / 1000;
      const ease = 1 - Math.exp(-dt * 5);
      time += state.reducedMotion ? 0 : dt;

      updateView(ease, dt);
      const { current, next, k } = morphState();
      state.morph = { current, next, k };
      updatePositions(shapes[current], shapes[next], k);

      const start = mixRgb(palettes[current][0], palettes[next][0], k);
      const end = mixRgb(palettes[current][1], palettes[next][1], k);
      publishAccent(end);

      p.background(...BACKGROUND);
      p.drawingContext.disable(p.drawingContext.DEPTH_TEST);
      p.blendMode(p.ADD);

      p.translate(view.offsetX, view.offsetY);
      p.rotateX(lerp(shapes[current].tilt, shapes[next].tilt, k) + view.y * 0.3);
      p.rotateY(time * 0.15 + view.progress * 0.8 + view.x * 0.6);

      drawDust();
      drawPoints(start, end);
      p.blendMode(p.BLEND);
    };

    function updateView(ease, dt) {
      const wide = p.width >= 900;
      const narrow = p.width < 760;
      view.progress = lerp(view.progress, state.progress, ease);
      view.x = lerp(view.x, state.pointer.x, ease * 0.6);
      view.y = lerp(view.y, state.pointer.y, ease * 0.6);
      view.offsetX = lerp(view.offsetX, wide ? p.width * 0.18 : 0, ease);
      view.offsetY = lerp(view.offsetY, narrow ? -p.height * 0.16 : 0, ease);
      view.scale = Math.min(wide ? p.width * 0.6 : p.width, p.height) * (narrow ? 0.36 : 0.32);

      if (state.burst) {
        view.burst = 1;
        state.burst = false;
      }
      view.burst *= Math.exp(-dt * 2.5);
    }

    function morphState() {
      const last = shapes.length - 1;
      const current = Math.min(Math.floor(view.progress), last);
      const next = Math.min(current + 1, last);
      const k = current === last ? 0 : smoothstep(0.15, 0.85, view.progress - current);
      return { current, next, k };
    }

    function updatePositions(a, b, k) {
      const lift = Math.sin(k * Math.PI) * 0.18;

      for (const s of seeds) {
        a.position(s, time, from);
        if (k > 0) b.position(s, time, to);
        const push =
          1 + lift * (s.c - 0.3) + view.burst * (0.25 + s.a * 0.5) + state.level * (0.05 + s.b * 0.15);
        const o = s.i * 3;
        for (let axis = 0; axis < 3; axis++) {
          positions[o + axis] = (k > 0 ? lerp(from[axis], to[axis], k) : from[axis]) * push;
        }
      }
    }

    function drawDust() {
      const s = view.scale;
      p.strokeWeight(1.2);
      p.stroke(236, 232, 225, 50);
      p.beginShape(p.POINTS);
      for (const [x, y, z] of dust) p.vertex(x * s, y * s, z * s);
      p.endShape();
    }

    function drawPoints(start, end) {
      const s = view.scale;
      for (const batch of batches) {
        const [r, g, b] = mixRgb(start, end, batch.step);
        p.stroke(r, g, b, batch.sparkle ? 255 : 170);
        p.strokeWeight(batch.sparkle ? 3 : 1.8);
        p.beginShape(p.POINTS);
        for (const i of batch.indices) {
          const o = i * 3;
          p.vertex(positions[o] * s, positions[o + 1] * s, positions[o + 2] * s);
        }
        p.endShape();
      }
    }

    function publishAccent(rgb) {
      const value = `rgb(${rgb.map(Math.round).join(' ')})`;
      if (value === accent) return;
      accent = value;
      document.documentElement.style.setProperty('--accent', value);
    }
  };
}
