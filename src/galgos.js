// Galgo meshes, trust system, behavior, care actions
import * as THREE from 'three';
import { state } from './state.js';
import { updateTrustPanel, showMilestone } from './hud.js';

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
  { id: 'luna', name: 'Luna', color: 0xC4956A, x: 80, z: -80, startTrust: 10 },
  { id: 'rayo', name: 'Rayo', color: 0x8B7355, x: -25, z: -45, startTrust: 30 },
  { id: 'sombra', name: 'Sombra', color: 0x2C2C2C, x: 10, z: 20, startTrust: 55 },
];

export function buildGalgos() {
  GALGO_DEFS.forEach(def => {
    const mesh = makeGalgoMesh(def.color);
    mesh.position.set(def.x, 0, def.z);
    state.scene.add(mesh);
    const trust = parseInt(localStorage.getItem(`galgo_${def.id}_trust`) || String(def.startTrust));
    state.galgos.push({
      id: def.id, name: def.name, mesh, trust,
      cooldowns: { sit: 0, food: 0, touch: 0 },
      baseX: def.x, baseZ: def.z,
    });
  });
}

export function updateGalgoBehavior(galgo, dt, playerPos) {
  const dist = galgo.mesh.position.distanceTo(playerPos);
  const tail = galgo.mesh.getObjectByName('tail');
  const earL = galgo.mesh.getObjectByName('earL');
  const earR = galgo.mesh.getObjectByName('earR');
  const t = galgo.trust;

  if (t <= 25) {
    if (tail) tail.rotation.z = -0.8;
    if (earL) earL.rotation.x = -0.5;
    if (earR) earR.rotation.x = -0.5;
    galgo.mesh.scale.y = 0.85;
    if (dist < 6) {
      const away = galgo.mesh.position.clone().sub(playerPos).normalize();
      galgo.mesh.position.x += away.x * 3 * dt;
      galgo.mesh.position.z += away.z * 3 * dt;
    }
  } else if (t <= 60) {
    if (tail) tail.rotation.z = -0.2;
    if (earL) earL.rotation.x = -0.2;
    if (earR) earR.rotation.x = -0.2;
    galgo.mesh.scale.y = 0.95;
    if (dist < 3) {
      const away = galgo.mesh.position.clone().sub(playerPos).normalize();
      galgo.mesh.position.x += away.x * 2 * dt;
      galgo.mesh.position.z += away.z * 2 * dt;
    }
  } else if (t <= 85) {
    if (tail) tail.rotation.z = 0.3;
    if (earL) earL.rotation.x = 0.1;
    if (earR) earR.rotation.x = 0.1;
    galgo.mesh.scale.y = 1;
    if (dist < 8 && dist > 3) {
      const toward = playerPos.clone().sub(galgo.mesh.position).normalize();
      galgo.mesh.position.x += toward.x * 1.5 * dt;
      galgo.mesh.position.z += toward.z * 1.5 * dt;
    }
  } else {
    if (tail) tail.rotation.z = Math.sin(Date.now() * 0.015) * 0.5;
    if (earL) earL.rotation.x = 0.2;
    if (earR) earR.rotation.x = 0.2;
    galgo.mesh.scale.y = 1;
    if (dist > 2.5) {
      const toward = playerPos.clone().sub(galgo.mesh.position).normalize();
      galgo.mesh.position.x += toward.x * 5 * dt;
      galgo.mesh.position.z += toward.z * 5 * dt;
    }
  }

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
export function openCareMenu(galgo) {
  if (state.careMenuActive || state.dialogueActive) return;
  state.careMenuActive = true;
  state.currentGalgo = galgo;
  document.getElementById('care-galgo-name').textContent = `Care for ${galgo.name}`;
  document.getElementById('care-sit').disabled = galgo.cooldowns.sit > 0;
  document.getElementById('care-food').disabled = galgo.trust < 20 || galgo.cooldowns.food > 0;
  document.getElementById('care-touch').disabled = galgo.trust < 50 || galgo.cooldowns.touch > 0;
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
  state.currentGalgo.trust = Math.min(100, state.currentGalgo.trust + gains[action]);
  state.currentGalgo.cooldowns[action] = cooldowns[action];
  localStorage.setItem(`galgo_${state.currentGalgo.id}_trust`, state.currentGalgo.trust);
  updateTrustPanel();
  checkMilestones(state.currentGalgo);
  closeCareMenu();
}

function checkMilestones(galgo) {
  if (galgo.trust >= 50 && galgo.trust - 12 < 50) {
    showMilestone(`${galgo.name} is starting to trust you.`);
  }
  if (galgo.trust >= 100) {
    showMilestone(`${galgo.name} is ready for a forever home.`);
  }
}

export function initCareListeners() {
  document.getElementById('care-sit').addEventListener('click', () => doCareAction('sit'));
  document.getElementById('care-food').addEventListener('click', () => doCareAction('food'));
  document.getElementById('care-touch').addEventListener('click', () => doCareAction('touch'));
  document.getElementById('care-close-btn').addEventListener('click', closeCareMenu);
}
