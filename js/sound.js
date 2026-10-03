import { shapes } from './shapes.js';

const VOLUME = 0.55;
const VOICE_GAIN = 0.045;

// Synthetic reverb: a few seconds of decaying noise used as an impulse response.
function createImpulse(ctx, seconds) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
    }
  }
  return buffer;
}

// Ambient sound driven by the scene: the chord follows the current form,
// scrolling opens the filter, and a click rings a bell.
// The measured loudness is written to state.level so the cloud can react to it.
export function createSound(state) {
  let ctx = null;
  let master, filter, bus, analyser, samples, voices;
  let enabled = false;
  let lastProgress = state.progress;
  let lastTime = 0;

  function build() {
    ctx = new AudioContext();

    master = ctx.createGain();
    master.gain.value = 0;

    filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;

    bus = ctx.createGain();
    const reverb = ctx.createConvolver();
    reverb.buffer = createImpulse(ctx, 3.5);
    const wet = ctx.createGain();
    wet.gain.value = 0.5;

    analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    samples = new Float32Array(analyser.fftSize);

    filter.connect(bus);
    bus.connect(master);
    bus.connect(reverb);
    reverb.connect(wet);
    wet.connect(master);
    master.connect(analyser);
    analyser.connect(ctx.destination);

    voices = shapes[0].notes.map(createVoice);
  }

  function createVoice(frequency, index) {
    const gain = ctx.createGain();
    gain.gain.value = VOICE_GAIN;
    gain.connect(filter);

    const oscillators = [
      ['sine', 0],
      ['triangle', 7],
    ].map(([type, detune]) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = frequency;
      osc.detune.value = detune;
      osc.connect(gain);
      osc.start();
      return osc;
    });

    // Each voice swells at its own slow rate, so the chord keeps breathing.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07 + index * 0.045;
    const depth = ctx.createGain();
    depth.gain.value = VOICE_GAIN * 0.7;
    lfo.connect(depth);
    depth.connect(gain.gain);
    lfo.start();

    return oscillators;
  }

  function update(now) {
    if (!enabled) return;
    requestAnimationFrame(update);

    const dt = Math.max(0.001, (now - lastTime) / 1000);
    lastTime = now;
    const t = ctx.currentTime;

    const { current, next, k } = state.morph;
    const from = shapes[current].notes;
    const to = shapes[next].notes;
    voices.forEach((oscillators, i) => {
      const frequency = from[i] * Math.pow(to[i] / from[i], k);
      oscillators.forEach((osc) => osc.frequency.setTargetAtTime(frequency, t, 0.12));
    });

    const speed = Math.min(Math.abs(state.progress - lastProgress) / dt, 3);
    lastProgress = state.progress;
    filter.frequency.setTargetAtTime(700 + speed * 1400, t, 0.25);

    analyser.getFloatTimeDomainData(samples);
    let sum = 0;
    for (const v of samples) sum += v * v;
    const level = Math.min(1, Math.sqrt(sum / samples.length) * 6);
    state.level += (level - state.level) * 0.2;
  }

  function pulse() {
    if (!enabled) return;
    const t = ctx.currentTime;
    const notes = shapes[state.morph.current].notes;

    [notes[2] * 2, notes[3] * 2].forEach((frequency, n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(n ? 0.05 : 0.08, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
      osc.connect(gain);
      gain.connect(bus);
      osc.start(t);
      osc.stop(t + 3);
    });
  }

  async function toggle() {
    if (!ctx) build();
    enabled = !enabled;

    if (enabled) {
      await ctx.resume();
      lastTime = performance.now();
      requestAnimationFrame(update);
      master.gain.setTargetAtTime(VOLUME, ctx.currentTime, 0.6);
    } else {
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
      state.level = 0;
      setTimeout(() => {
        if (!enabled) ctx.suspend();
      }, 1500);
    }
    return enabled;
  }

  return { toggle, pulse };
}
