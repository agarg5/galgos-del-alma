// Main entry point — wires everything together
import { state } from './state.js';
import { initScene } from './scene.js';
import { buildTerrain, buildWorld } from './world.js';
import { buildPlayer, updatePlayer, updateCamera } from './player.js';
import { buildGalgos, updateGalgoBehavior, initCareListeners } from './galgos.js';
import { buildNPCs, updateNPCPatrol } from './npcs.js';
import { initDialogueListeners } from './dialogue.js';
import { setupInput } from './input.js';
import { updateTrustPanel, updateReputation, updateProximityPrompt } from './hud.js';

// Start screen
document.getElementById('start-btn').addEventListener('click', () => {
  const key = document.getElementById('api-key-input').value.trim();
  if (!key) return;
  sessionStorage.setItem('anthropic_key', key);
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('hud').style.display = 'block';
  state.sessions++;
  localStorage.setItem('game_sessions', state.sessions);
  init();
  animate();
});

function init() {
  initScene();
  buildTerrain();
  buildWorld();
  buildPlayer();
  buildGalgos();
  buildNPCs();
  setupInput();
  initCareListeners();
  initDialogueListeners();
  updateTrustPanel();
  updateReputation();
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(state.clock.getDelta(), 0.05);

  updatePlayer(dt);
  updateCamera();

  state.galgos.forEach(g => updateGalgoBehavior(g, dt, state.player.position));
  state.npcs.forEach(npc => updateNPCPatrol(npc, dt));

  updateProximityPrompt();

  state.renderer.render(state.scene, state.camera);
}
