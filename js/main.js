import { createScene } from './scene.js';
import { revealOnScroll, trackScroll } from './scroll.js';
import { createSound } from './sound.js';

const state = {
  progress: 0,
  pointer: { x: 0, y: 0 },
  burst: false,
  morph: { current: 0, next: 0, k: 0 },
  level: 0,
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
};

const sections = [...document.querySelectorAll('[data-section]')];
trackScroll(sections, state);
revealOnScroll(sections);

window.addEventListener('pointermove', (event) => {
  state.pointer.x = event.clientX / window.innerWidth - 0.5;
  state.pointer.y = event.clientY / window.innerHeight - 0.5;
});

const sound = createSound(state);
const soundButton = document.querySelector('[data-sound]');

async function toggleSound() {
  const on = await sound.toggle();
  soundButton.setAttribute('aria-pressed', String(on));
  soundButton.querySelector('[data-sound-label]').textContent = on ? 'Sound on' : 'Sound off';
}

soundButton.addEventListener('click', toggleSound);

window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'm' && !event.ctrlKey && !event.metaKey && !event.altKey) {
    toggleSound();
  }
});

window.addEventListener('pointerdown', (event) => {
  if (event.target.closest('a, button')) return;
  state.burst = true;
  sound.pulse();
});

new p5(createScene(state), document.getElementById('scene'));
