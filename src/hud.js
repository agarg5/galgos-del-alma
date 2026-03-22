// HUD: trust panel, zone indicator, milestones, reputation
import { state } from './state.js';

export function updateTrustPanel() {
  const panel = document.getElementById('trust-panel');
  panel.innerHTML = '';
  state.galgos.forEach(g => {
    const c = document.createElement('div');
    c.className = 'trust-bar-container';
    c.innerHTML = `
      <span class="trust-name">${g.name}</span>
      <div class="trust-bar-bg"><div class="trust-bar-fill" style="width:${g.trust}%"></div></div>
    `;
    panel.appendChild(c);
  });
}

export function updateReputation() {
  document.getElementById('reputation').textContent = `Village standing: ${state.reputation} / 100`;
}

export function getZoneName(pos) {
  if (pos.x > 30 && pos.z < -20) return 'La Dehesa';
  if (pos.x < -20) return 'El Pueblo';
  if (pos.x > -15 && pos.x < 15 && pos.z > -5 && pos.z < 25) return 'El Refugio';
  return 'The Road';
}

export function showMilestone(text) {
  if (state.shownMilestones.has(text)) return;
  state.shownMilestones.add(text);
  localStorage.setItem('shown_milestones', JSON.stringify([...state.shownMilestones]));
  const el = document.getElementById('milestone');
  el.textContent = text;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 3500);
}

export function updateProximityPrompt() {
  const pp = state.player.position;
  let promptText = '';
  if (!state.dialogueActive && !state.careMenuActive) {
    for (const npc of state.npcs) {
      if (npc.mesh.position.distanceTo(pp) < 6) {
        promptText = `E: Talk to ${npc.name}`;
        break;
      }
    }
    if (!promptText) {
      for (const g of state.galgos) {
        if (g.mesh.position.distanceTo(pp) < 5) {
          promptText = `E: Care for ${g.name}`;
          break;
        }
      }
    }
  }
  const promptEl = document.getElementById('interact-prompt');
  promptEl.textContent = promptText;
  promptEl.classList.toggle('visible', !!promptText);

  document.getElementById('zone-indicator').textContent = getZoneName(pp);
}
