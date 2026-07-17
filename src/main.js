// Main entry point — wires everything together
import { state } from './state.js';
import { initScene, updateSun } from './scene.js';
import { buildTerrain, buildWorld } from './world.js';
import { buildPlayer, updatePlayer, updateCamera } from './player.js';
import { buildGalgos, updateGalgoBehavior, initCareListeners, checkLunaSpawn } from './galgos.js';
import { buildNPCs, updateNPCPatrol } from './npcs.js';
import { initDialogueListeners } from './dialogue.js';
import { setupInput } from './input.js';
import { updateTrustPanel, updateReputation, updateProximityPrompt, showHint } from './hud.js';
import { initAudioToggle, updateFootsteps } from './audio.js';
import { hasSave, restoreGame, startAutosave, resetProgress } from './save.js';

// Start screen — returning players continue where they left off
if (hasSave()) {
  document.getElementById('start-btn').textContent = 'Continue';
  document.getElementById('reset-btn').style.display = 'inline-block';
}
document.getElementById('reset-btn').addEventListener('click', () => {
  if (confirm('Start over? All trust, conversations, and progress will be lost.')) {
    resetProgress();
  }
});

document.getElementById('start-btn').addEventListener('click', () => {
  const keyInput = document.getElementById('api-key-input');
  const key = keyInput ? keyInput.value.trim() : '';
  if (key) sessionStorage.setItem('anthropic_key', key);
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('hud').style.display = 'block';
  state.sessions++;
  localStorage.setItem('game_sessions', state.sessions);
  init();
  animate();
  showHint('start', 'Use WASD to walk. Hold and drag the mouse to look around.');
});

function init() {
  initScene();
  buildTerrain();
  buildWorld();
  buildPlayer();
  buildGalgos();
  buildNPCs();
  restoreGame();
  startAutosave();
  setupInput();
  initCareListeners();
  initDialogueListeners();
  initAudioToggle();
  updateTrustPanel();
  updateReputation();
}

let secondsPlayed = 0;
let talkedToNPC = false;
let idleNpcHintDone = false;
let exploreHintDone = false;

// Spec §14.2 — contextual hints when the player seems stuck.
// Each check runs until it fires once, then goes quiet for good.
function checkContextualHints(dt) {
  secondsPlayed += dt;
  if (!talkedToNPC && state.dialogueActive) talkedToNPC = true;
  if (!idleNpcHintDone && secondsPlayed > 120) {
    idleNpcHintDone = true;
    if (!talkedToNPC) {
      showHint('idle-npc', 'The people of this village each know something. Try talking to someone.');
    }
  }
  if (!exploreHintDone && secondsPlayed > 300) {
    exploreHintDone = true;
    if (state.galgos.some(g => !g.discovered)) {
      showHint('idle-explore', 'Ask around — someone may know where other galgos have been seen.');
    }
  }
}

function animate() {
  requestAnimationFrame(animate);
  state.clock.update();
  const dt = Math.min(state.clock.getDelta(), 0.05);

  updatePlayer(dt);
  updateCamera();
  updateSun();

  state.galgos.forEach(g => updateGalgoBehavior(g, dt, state.player.position));
  state.npcs.forEach(npc => updateNPCPatrol(npc, dt));

  checkLunaSpawn();
  updateProximityPrompt();
  checkContextualHints(dt);
  updateFootsteps(dt);

  state.renderer.render(state.scene, state.camera);
}
