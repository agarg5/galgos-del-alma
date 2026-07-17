// Input handling: keyboard + mouse
import { state } from './state.js';
import { openDialogue, sendMessage, closeDialogue } from './dialogue.js';
import { openCareMenu, closeCareMenu } from './galgos.js';
import { findNearbyInteractable } from './hud.js';

function handleInteract() {
  const target = findNearbyInteractable(state.player.position);
  if (target?.type === 'npc') openDialogue(target.npc);
  else if (target?.type === 'galgo') openCareMenu(target.galgo);
}

export function setupInput() {
  document.addEventListener('keydown', e => {
    const typing = e.target instanceof HTMLInputElement;

    if (e.key === 'Escape') {
      if (state.dialogueActive) closeDialogue();
      if (state.careMenuActive) closeCareMenu();
      return;
    }

    if (e.key === 'Enter' && state.dialogueActive) {
      sendMessage();
      return;
    }

    if (typing) return; // don't treat typed characters as movement/interaction

    state.keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === 'e' && !state.dialogueActive && !state.careMenuActive) {
      // preventDefault so the "e" doesn't land in the dialogue input we focus
      e.preventDefault();
      handleInteract();
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
