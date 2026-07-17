// Galgo meshes, trust system, behavior, care actions, discovery
import * as THREE from 'three';
import { state } from './state.js';
import { terrainHeight } from './world.js';
import { updateTrustPanel, showMilestone, showHint, getZoneName } from './hud.js';
import { playChime } from './audio.js';
import { requestWhisper } from './dialogue.js';

function makeGalgoMesh(color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 0.7), mat);
  body.position.y = 1.2;
  body.castShadow = true;
  g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.4), mat);
  head.position.set(1.4, 1.5, 0);
  g.add(head);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.3), mat);
  snout.position.set(1.85, 1.4, 0);
  g.add(snout);
  const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.0, 5);
  const offsets = [[0.8, 0, 0.25], [0.8, 0, -0.25], [-0.8, 0, 0.25], [-0.8, 0, -0.25]];
  offsets.forEach(([lx, , lz]) => {
    const leg = new THREE.Mesh(legGeo, mat);
    leg.position.set(lx, 0.5, lz);
    leg.castShadow = true;
    g.add(leg);
  });
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.02, 1.2, 5), mat);
  tail.position.set(-1.6, 1.3, 0);
  tail.rotation.z = -0.8;
  tail.name = 'tail';
  g.add(tail);
  const earGeo = new THREE.BoxGeometry(0.12, 0.3, 0.08);
  const earL = new THREE.Mesh(earGeo, mat);
  earL.position.set(1.3, 1.85, 0.18);
  earL.name = 'earL';
  g.add(earL);
  const earR = new THREE.Mesh(earGeo, mat);
  earR.position.set(1.3, 1.85, -0.18);
  earR.name = 'earR';
  g.add(earR);
  return g;
}

const GALGO_DEFS = [
  { id: 'luna', name: 'Luna', color: 0xC4956A, x: 80, z: -80, startTrust: 10, startsDiscovered: false },
  { id: 'rayo', name: 'Rayo', color: 0x8B7355, x: -25, z: -45, startTrust: 30, startsDiscovered: false },
  { id: 'sombra', name: 'Sombra', color: 0x2C2C2C, x: 10, z: 20, startTrust: 55, startsDiscovered: true },
];

export function buildGalgos() {
  GALGO_DEFS.forEach(def => {
    const mesh = makeGalgoMesh(def.color);
    mesh.position.set(def.x, terrainHeight(def.x, def.z), def.z);
    const trust = parseInt(localStorage.getItem(`galgo_${def.id}_trust`) || String(def.startTrust));
    const discovered = def.startsDiscovered ||
      localStorage.getItem(`galgo_${def.id}_discovered`) === 'true';
    if (discovered) state.scene.add(mesh);
    state.galgos.push({
      id: def.id, name: def.name, mesh, trust, discovered,
      cooldowns: { sit: 0, food: 0, touch: 0 },
      baseX: def.x, baseZ: def.z,
    });
  });
}

// Spec §14.1 — galgos enter the world through NPC conversations, not all at once.
export function discoverGalgo(id) {
  const galgo = state.galgos.find(g => g.id === id);
  if (!galgo || galgo.discovered) return;
  galgo.discovered = true;
  localStorage.setItem(`galgo_${id}_discovered`, 'true');
  localStorage.setItem(`galgo_${id}_rescued`, 'true');
  state.scene.add(galgo.mesh);
  updateTrustPanel();
}

// Luna is hinted at by the vet but only appears once the player walks the dehesa.
export function checkLunaSpawn() {
  if (localStorage.getItem('luna_hinted') !== 'true') return;
  const luna = state.galgos.find(g => g.id === 'luna');
  if (luna.discovered) return;
  if (getZoneName(state.player.position) === 'La Dehesa') {
    discoverGalgo('luna');
    showMilestone('A thin, fawn-colored galgo watches you from the trees. Luna.');
    playChime();
  }
}

const MAX_LEASH = 45; // how far a fleeing galgo will drift from its home spot

export function updateGalgoBehavior(galgo, dt, playerPos) {
  if (!galgo.discovered) return;
  const dist = galgo.mesh.position.distanceTo(playerPos);
  const tail = galgo.mesh.getObjectByName('tail');
  const earL = galgo.mesh.getObjectByName('earL');
  const earR = galgo.mesh.getObjectByName('earR');
  const t = galgo.trust;

  const moveBy = (dir, speed) => {
    const p = galgo.mesh.position;
    const nx = p.x + dir.x * speed * dt;
    const nz = p.z + dir.z * speed * dt;
    // Leash to home spot and world bounds so a galgo can't be chased off the map
    const dxHome = nx - galgo.baseX, dzHome = nz - galgo.baseZ;
    if (dxHome * dxHome + dzHome * dzHome > MAX_LEASH * MAX_LEASH) return;
    if (Math.abs(nx) > 220 || Math.abs(nz) > 220) return;
    p.x = nx;
    p.z = nz;
  };

  if (t <= 25) {
    if (tail) tail.rotation.z = -0.8;
    if (earL) earL.rotation.x = -0.5;
    if (earR) earR.rotation.x = -0.5;
    galgo.mesh.scale.y = 0.85;
    if (dist < 6) {
      moveBy(galgo.mesh.position.clone().sub(playerPos).normalize(), 3);
    }
  } else if (t <= 60) {
    if (tail) tail.rotation.z = -0.2;
    if (earL) earL.rotation.x = -0.2;
    if (earR) earR.rotation.x = -0.2;
    galgo.mesh.scale.y = 0.95;
    if (dist < 3) {
      moveBy(galgo.mesh.position.clone().sub(playerPos).normalize(), 2);
    }
  } else if (t <= 85) {
    if (tail) tail.rotation.z = 0.3;
    if (earL) earL.rotation.x = 0.1;
    if (earR) earR.rotation.x = 0.1;
    galgo.mesh.scale.y = 1;
    if (dist < 8 && dist > 3) {
      moveBy(playerPos.clone().sub(galgo.mesh.position).normalize(), 1.5);
    }
  } else {
    if (tail) tail.rotation.z = Math.sin(Date.now() * 0.015) * 0.5;
    if (earL) earL.rotation.x = 0.2;
    if (earR) earR.rotation.x = 0.2;
    galgo.mesh.scale.y = 1;
    if (dist > 2.5) {
      // Bonded galgos follow the player anywhere — ignore the home leash
      const p = galgo.mesh.position;
      const toward = playerPos.clone().sub(p).normalize();
      p.x = Math.max(-220, Math.min(220, p.x + toward.x * 5 * dt));
      p.z = Math.max(-220, Math.min(220, p.z + toward.z * 5 * dt));
    }
  }

  galgo.mesh.position.y = terrainHeight(galgo.mesh.position.x, galgo.mesh.position.z);

  // Face toward or away from player
  const dx = playerPos.x - galgo.mesh.position.x;
  const dz = playerPos.z - galgo.mesh.position.z;
  if (t > 60 || dist < 6) {
    const targetAngle = t > 60 ? Math.atan2(dx, dz) : Math.atan2(-dx, -dz);
    galgo.mesh.rotation.y += (targetAngle - galgo.mesh.rotation.y) * 2 * dt;
  }

  // Cooldowns
  for (const k in galgo.cooldowns) {
    if (galgo.cooldowns[k] > 0) galgo.cooldowns[k] -= dt;
  }
}

// Care menu
function careButtonLabel(base, cooldown) {
  return cooldown > 0 ? `${base} (${Math.ceil(cooldown)}s)` : base;
}

export function openCareMenu(galgo) {
  if (state.careMenuActive || state.dialogueActive) return;
  state.careMenuActive = true;
  state.currentGalgo = galgo;
  document.getElementById('care-galgo-name').textContent = `Care for ${galgo.name}`;
  const sit = document.getElementById('care-sit');
  const food = document.getElementById('care-food');
  const touch = document.getElementById('care-touch');
  sit.disabled = galgo.cooldowns.sit > 0;
  food.disabled = galgo.trust < 20 || galgo.cooldowns.food > 0;
  touch.disabled = galgo.trust < 50 || galgo.cooldowns.touch > 0;
  sit.textContent = careButtonLabel('Sit nearby quietly (+3 trust)', galgo.cooldowns.sit);
  food.textContent = galgo.trust < 20
    ? 'Offer food (needs more trust)'
    : careButtonLabel('Offer food (+8 trust)', galgo.cooldowns.food);
  touch.textContent = galgo.trust < 50
    ? 'Gentle touch (needs more trust)'
    : careButtonLabel('Gentle touch (+12 trust)', galgo.cooldowns.touch);
  // Spec §8.3 — bonded galgos can share a quiet inner monologue
  document.getElementById('care-whisper').style.display = galgo.trust > 85 ? 'block' : 'none';
  document.getElementById('care-menu').style.display = 'block';
}

export function closeCareMenu() {
  state.careMenuActive = false;
  state.currentGalgo = null;
  document.getElementById('care-menu').style.display = 'none';
}

export function doCareAction(action) {
  if (!state.currentGalgo) return;
  const gains = { sit: 3, food: 8, touch: 12 };
  const cooldowns = { sit: 60, food: 120, touch: 180 };
  const galgo = state.currentGalgo;
  const prevTrust = galgo.trust;
  galgo.trust = Math.min(100, galgo.trust + gains[action]);
  galgo.cooldowns[action] = cooldowns[action];
  localStorage.setItem(`galgo_${galgo.id}_trust`, galgo.trust);
  updateTrustPanel();
  checkMilestones(galgo, prevTrust);
  closeCareMenu();
  showHint('after-care', 'Trust builds slowly. Try different actions — sit nearby, offer food, or a gentle touch when the time is right.');
}

function checkMilestones(galgo, prevTrust) {
  if (galgo.trust >= 50 && prevTrust < 50) {
    showMilestone(`${galgo.name} is starting to trust you.`);
    playChime();
  }
  if (galgo.trust >= 100 && prevTrust < 100) {
    showMilestone(`${galgo.name} is ready for a forever home.`);
    playChime();
  }
}

export function initCareListeners() {
  document.getElementById('care-sit').addEventListener('click', () => doCareAction('sit'));
  document.getElementById('care-food').addEventListener('click', () => doCareAction('food'));
  document.getElementById('care-touch').addEventListener('click', () => doCareAction('touch'));
  document.getElementById('care-whisper').addEventListener('click', () => {
    const galgo = state.currentGalgo;
    closeCareMenu();
    if (galgo) requestWhisper(galgo);
  });
  document.getElementById('care-close-btn').addEventListener('click', closeCareMenu);
}
