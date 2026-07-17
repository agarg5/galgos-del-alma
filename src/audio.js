// Ambient audio via Web Audio API — no external files (spec §11).
// Everything starts muted; the speaker icon in the HUD toggles it.
import { state } from './state.js';

let ctx = null;
let masterGain = null;
let enabled = false;
let footstepTimer = 0;
let noiseBuffer = null;

function ensureContext() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.35;
  masterGain.connect(ctx.destination);

  // Wind drone: low sine with a slow LFO wobbling its gain
  const wind = ctx.createOscillator();
  wind.type = 'sine';
  wind.frequency.value = 58;
  const windGain = ctx.createGain();
  windGain.gain.value = 0.12;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.13;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.06;
  lfo.connect(lfoGain);
  lfoGain.connect(windGain.gain);
  wind.connect(windGain);
  windGain.connect(masterGain);
  wind.start();
  lfo.start();

  // One shared decaying-noise buffer; footsteps reuse it instead of filling
  // a fresh AudioBuffer on every step.
  const noiseLen = Math.floor(ctx.sampleRate * 0.1);
  noiseBuffer = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseLen; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / noiseLen);
  }
}

function noiseBurst(gainValue, filterFreq) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  const g = ctx.createGain();
  g.gain.value = gainValue;
  src.connect(filter);
  filter.connect(g);
  g.connect(masterGain);
  // Play the whole buffer — its envelope decays to zero, so cutting it
  // short would end at nonzero amplitude and click.
  src.start();
}

export function playChime() {
  if (!enabled) return;
  // Pentatonic arpeggio on A: A4, C5, D5, E5
  [440, 523.25, 587.33, 659.25].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const g = ctx.createGain();
    const t = ctx.currentTime + i * 0.14;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.15, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(t);
    osc.stop(t + 1);
  });
}

// Called each frame; plays soft steps while the player is walking.
export function updateFootsteps(dt) {
  if (!enabled || !state.moving) return;
  footstepTimer -= dt;
  if (footstepTimer <= 0) {
    footstepTimer = 0.38;
    noiseBurst(0.25, 900);
  }
}

export function initAudioToggle() {
  const btn = document.getElementById('audio-toggle');
  btn.addEventListener('click', () => {
    enabled = !enabled;
    if (enabled) {
      ensureContext();
      ctx.resume();
      masterGain.gain.value = 0.35;
    } else if (masterGain) {
      masterGain.gain.value = 0;
    }
    btn.textContent = enabled ? '\u{1F50A}' : '\u{1F507}';
    btn.title = enabled ? 'Mute ambient sound' : 'Enable ambient sound';
  });
}
