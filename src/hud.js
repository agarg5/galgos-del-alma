// HUD: trust panel, zone indicator, milestones, hints, reputation
import { state } from './state.js';

export const NPC_INTERACT_RADIUS = 6;
export const GALGO_INTERACT_RADIUS = 5;

// Single source for "what would E act on here" — used by both the HUD
// prompt and the E-key handler so they can never disagree.
export function findNearbyInteractable(pos) {
  for (const npc of state.npcs) {
    if (npc.mesh.position.distanceTo(pos) < NPC_INTERACT_RADIUS) {
      return { type: 'npc', npc };
    }
  }
  for (const galgo of state.galgos) {
    if (galgo.discovered && galgo.mesh.position.distanceTo(pos) < GALGO_INTERACT_RADIUS) {
      return { type: 'galgo', galgo };
    }
  }
  return null;
}

export function updateTrustPanel() {
  const panel = document.getElementById('trust-panel');
  panel.innerHTML = '';
  state.galgos.forEach(g => {
    const c = document.createElement('div');
    c.className = 'trust-bar-container';
    if (g.discovered) {
      c.innerHTML = `
        <span class="trust-name">${g.name}</span>
        <div class="trust-bar-bg"><div class="trust-bar-fill" style="width:${g.trust}%"></div></div>
      `;
    } else {
      // Spec §14.2 — undiscovered slots hint that more galgos exist
      c.innerHTML = `
        <span class="trust-name trust-unknown">???</span>
        <div class="trust-bar-bg"></div>
      `;
    }
    panel.appendChild(c);
  });
}

export function updateReputation() {
  document.getElementById('reputation').textContent = `Village standing: ${state.reputation} / 100`;
}

// Zone ids are the stable programmatic handles; labels are display-only.
const ZONE_LABELS = {
  dehesa: 'La Dehesa',
  pueblo: 'El Pueblo',
  refugio: 'El Refugio',
  road: 'The Road',
};

export function getZone(pos) {
  if (pos.x > 30 && pos.z < -20) return 'dehesa';
  if (pos.x < -20) return 'pueblo';
  if (pos.x > -15 && pos.x < 15 && pos.z > -5 && pos.z < 25) return 'refugio';
  return 'road';
}

// Show `text` in overlay element `el` for `ms`, resetting any pending hide.
export function showTimedOverlay(el, text, ms) {
  el.textContent = text;
  el.style.display = 'block';
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => {
    el.style.display = 'none';
    if (el._onHidden) el._onHidden();
  }, ms);
}

export function showMilestone(text) {
  if (state.shownMilestones.has(text)) return;
  state.shownMilestones.add(text);
  localStorage.setItem('shown_milestones', JSON.stringify([...state.shownMilestones]));
  showTimedOverlay(document.getElementById('milestone'), text, 4500);
}

// Spec §14.2 — gentle one-time tutorial hints, persisted so they never repeat.
// Hints queue rather than overwrite, so a fast player still reads each one.
const shownHints = new Set();
const hintQueue = [];

function displayHint(id, text) {
  // Mark shown only when actually displayed, so a queued hint that never
  // got its turn (page closed) can still appear next session.
  localStorage.setItem(`hint_${id}_shown`, 'true');
  showTimedOverlay(document.getElementById('hint'), text, 8000);
}

export function showHint(id, text) {
  if (shownHints.has(id)) return;
  if (localStorage.getItem(`hint_${id}_shown`) === 'true') {
    shownHints.add(id);
    return;
  }
  shownHints.add(id);
  const el = document.getElementById('hint');
  if (el.style.display === 'block') {
    hintQueue.push({ id, text });
    return;
  }
  el._onHidden = () => {
    const next = hintQueue.shift();
    if (next) displayHint(next.id, next.text);
  };
  displayHint(id, text);
}

export function updateProximityPrompt() {
  const pp = state.player.position;
  let promptText = '';
  if (!state.dialogueActive && !state.careMenuActive) {
    const target = findNearbyInteractable(pp);
    if (target?.type === 'npc') {
      promptText = `E: Talk to ${target.npc.name}`;
      showHint('first-npc', 'Press E to talk. These conversations shape the story.');
    } else if (target?.type === 'galgo') {
      promptText = `E: Care for ${target.galgo.name}`;
      showHint('first-galgo', 'Press E to care for this galgo. Earning trust takes patience.');
    }
  }
  const promptEl = document.getElementById('interact-prompt');
  promptEl.textContent = promptText;
  promptEl.classList.toggle('visible', !!promptText);

  document.getElementById('zone-indicator').textContent = ZONE_LABELS[getZone(pp)];
}
