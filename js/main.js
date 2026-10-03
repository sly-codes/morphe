import { createScene } from './scene.js';
import { revealOnScroll, trackScroll } from './scroll.js';

const state = {
  progress: 0,
  pointer: { x: 0, y: 0 },
  burst: false,
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
};

const sections = [...document.querySelectorAll('[data-section]')];
trackScroll(sections, state);
revealOnScroll(sections);

window.addEventListener('pointermove', (event) => {
  state.pointer.x = event.clientX / window.innerWidth - 0.5;
  state.pointer.y = event.clientY / window.innerHeight - 0.5;
});

window.addEventListener('pointerdown', (event) => {
  if (!event.target.closest('a, button')) state.burst = true;
});

new p5(createScene(state), document.getElementById('scene'));
