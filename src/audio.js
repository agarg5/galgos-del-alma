// Ambient audio via Web Audio API — no external files (spec §11).
// Everything starts muted; the speaker icon in the HUD toggles it.
import { state } from './state.js';

let ctx = null;
let masterGain = null;
let enabled = false;
let footstepTimer = 0;
let noiseBuffer = null;
let musicTimer = null;

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

// --- Ambient guitar ------------------------------------------------------
// A slow Andalusian cadence (Am - G - F - E), plucked arpeggios with a soft
// synthesized string tone. Scheduled ahead of time against ctx.currentTime.

const CHORDS = [
  [110.0, 164.81, 220.0, 261.63, 329.63],   // A minor
  [98.0, 146.83, 196.0, 246.94, 293.66],    // G major
  [87.31, 130.81, 174.61, 220.0, 261.63],   // F major
  [82.41, 123.47, 164.81, 207.65, 246.94],  // E major
];
const CHORD_SECONDS = 6;
let musicScheduledUntil = 0;
let chordIndex = 0;

function pluckNote(freq, t, velocity) {
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  const osc2 = ctx.createOscillator();
  osc2.type = 'triangle';
  osc2.frequency.value = freq * 1.003; // slight detune, warmer
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(velocity, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0005, t + 1.6);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1600;
  osc.connect(g);
  osc2.connect(g);
  g.connect(filter);
  filter.connect(masterGain);
  osc.start(t);
  osc2.start(t);
  osc.stop(t + 1.8);
  osc2.stop(t + 1.8);
}

function scheduleMusic() {
  // Keep ~8s of plucks queued
  while (musicScheduledUntil < ctx.currentTime + 8) {
    const chord = CHORDS[chordIndex % CHORDS.length];
    const start = Math.max(musicScheduledUntil, ctx.currentTime + 0.1);
    // Bass note, then a lazy upward arpeggio with gentle humanization
    pluckNote(chord[0], start, 0.055);
    for (let i = 1; i < chord.length; i++) {
      const t = start + i * 1.05 + (Math.random() - 0.5) * 0.08;
      pluckNote(chord[i], t, 0.03 + Math.random() * 0.015);
    }
    // Occasional high echo of the fifth
    if (Math.random() < 0.5) {
      pluckNote(chord[2] * 2, start + 4.6 + Math.random() * 0.5, 0.018);
    }
    musicScheduledUntil = start + CHORD_SECONDS;
    chordIndex++;
  }
}

function startMusic() {
  // Never rewind the schedule: a quick mute→unmute leaves already-scheduled
  // (inaudible while muted) notes in flight, and rescheduling from "now"
  // would layer a second progression on top of them.
  musicScheduledUntil = Math.max(musicScheduledUntil, ctx.currentTime);
  scheduleMusic();
  musicTimer = setInterval(scheduleMusic, 2000);
}

function stopMusic() {
  clearInterval(musicTimer);
  musicTimer = null;
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
      if (!musicTimer) startMusic();
    } else if (masterGain) {
      masterGain.gain.value = 0;
      stopMusic();
    }
    btn.textContent = enabled ? '\u{1F50A}' : '\u{1F507}';
    btn.title = enabled ? 'Mute sound & music' : 'Enable sound & music';
  });
}
