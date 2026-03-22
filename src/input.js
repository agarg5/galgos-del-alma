// Input handling: keyboard + mouse
import { state } from './state.js';
import { openDialogue, sendMessage } from './dialogue.js';
import { openCareMenu } from './galgos.js';

function handleInteract() {
  const pp = state.player.position;
  for (const npc of state.npcs) {
    if (npc.mesh.position.distanceTo(pp) < 6) {
      openDialogue(npc);
      return;
    }
  }
  for (const g of state.galgos) {
    if (g.mesh.position.distanceTo(pp) < 5) {
      openCareMenu(g);
      return;
    }
  }
}

export function setupInput() {
  document.addEventListener('keydown', e => {
    state.keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === 'e' && !state.dialogueActive && !state.careMenuActive) {
      handleInteract();
    }
    if (e.key === 'Enter' && state.dialogueActive) {
      sendMessage();
    }
  });

  document.addEventListener('keyup', e => {
    state.keys[e.key.toLowerCase()] = false;
  });

  state.renderer.domElement.addEventListener('mousedown', e => {
    if (state.dialogueActive || state.careMenuActive) return;
    state.mouseDown = true;
    state.mouseX = e.clientX;
    state.mouseY = e.clientY;
  });

  document.addEventListener('mouseup', () => {
    state.mouseDown = false;
  });

  document.addEventListener('mousemove', e => {
    if (!state.mouseDown) return;
    const dx = e.clientX - state.mouseX;
    const dy = e.clientY - state.mouseY;
    state.cameraAngle -= dx * 0.005;
    state.cameraPitch = Math.max(0.1, Math.min(1.2, state.cameraPitch + dy * 0.005));
    state.mouseX = e.clientX;
    state.mouseY = e.clientY;
  });
}
