// Session save/restore. Trust, discoveries, NPC memories, milestones, and
// hints already persist under their own localStorage keys — this covers the
// rest: where you and the galgos are standing, the camera, and cooldowns.
import { state } from './state.js';

const SAVE_KEY = 'game_save';
let savingEnabled = true;

export function hasSave() {
  return localStorage.getItem(SAVE_KEY) !== null ||
    parseInt(localStorage.getItem('game_sessions') || '0') > 0;
}

export function saveGame() {
  if (!state.player || !savingEnabled) return;
  const save = {
    v: 1,
    player: {
      x: state.player.position.x,
      z: state.player.position.z,
      angle: state.cameraAngle,
      pitch: state.cameraPitch,
    },
    galgos: {},
  };
  state.galgos.forEach(g => {
    save.galgos[g.id] = {
      x: g.mesh.position.x,
      z: g.mesh.position.z,
      cooldowns: { ...g.cooldowns },
    };
  });
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

// Apply the saved session on top of a freshly built world. Call after
// buildPlayer() and buildGalgos().
export function restoreGame() {
  // A malformed save must never abort startup — the start screen is already
  // hidden by the time this runs. On any problem, drop the save and start
  // from the defaults (trust/discovery keys are stored separately and keep
  // the real progress).
  try {
    const save = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!save || save.v !== 1) return;

    if (Number.isFinite(save.player?.x) && Number.isFinite(save.player?.z)) {
      state.player.position.x = save.player.x;
      state.player.position.z = save.player.z;
    }
    if (Number.isFinite(save.player?.angle)) state.cameraAngle = save.player.angle;
    if (Number.isFinite(save.player?.pitch)) state.cameraPitch = save.player.pitch;

    state.galgos.forEach(g => {
      const gs = save.galgos?.[g.id];
      if (!gs || !Number.isFinite(gs.x) || !Number.isFinite(gs.z)) return;
      g.mesh.position.x = gs.x;
      g.mesh.position.z = gs.z;
      g.cooldowns = { sit: 0, food: 0, touch: 0, ...gs.cooldowns };
    });
  } catch {
    localStorage.removeItem(SAVE_KEY);
  }
}

export function startAutosave() {
  setInterval(saveGame, 5000);
  // pagehide fires reliably on tab close / navigate on modern browsers
  window.addEventListener('pagehide', saveGame);
}

// Wipe every persisted key the game owns and reload for a fresh start.
export function resetProgress() {
  // The pagehide autosave would otherwise re-write the save during reload
  savingEnabled = false;
  const doomed = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (/^(galgo_|npc_|hint_|game_|luna_hinted|shown_milestones)/.test(key)) {
      doomed.push(key);
    }
  }
  doomed.forEach(k => localStorage.removeItem(k));
  location.reload();
}
