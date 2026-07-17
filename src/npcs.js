// NPC definitions, meshes, patrol
import * as THREE from 'three';
import { state } from './state.js';
import { terrainHeight, insideBuilding } from './world.js';

const NPC_DEFS = [
  {
    id: 'cazador', name: 'Miguel (El Cazador)',
    x: 70, z: -60, color: 0x556B2F, height: 1.8, accessory: 'hat',
    patrolRadius: 20, patrolSpeed: 1.5,
    system: `You are Miguel, a 58-year-old galgo hunter from Castilla-La Mancha. You have hunted with galgos your whole life, as did your father. You genuinely love your dogs but see them as working animals. You are not a villain — you are a man of tradition who has never been asked to question it. You are gruff but not cruel. You speak with brief, direct sentences. You remember previous conversations.`,
  },
  {
    id: 'veterinaria', name: 'Dr. Amparo (La Veterinaria)',
    x: 5, z: 18, color: 0x7FA88F, height: 1.6, accessory: 'coat',
    patrolRadius: 0, patrolSpeed: 0,
    system: `You are Dr. Amparo, a vet who volunteers at the galgo shelter. You are warm but exhausted. You have seen too many galgos come in injured. You give practical advice about caring for frightened galgos and remember which ones the player has been working with. You are encouraging but realistic.`,
  },
  {
    id: 'alcalde', name: 'Don Bernardo (El Alcalde)',
    x: -37, z: -27, color: 0x2C2C5E, height: 1.7, accessory: 'suit',
    patrolRadius: 0, patrolSpeed: 0,
    system: `You are Alcalde Don Bernardo, the mayor of this small Spanish village. You care about your village and your re-election. You are not hostile to animal welfare but you fear upsetting the hunters who vote for you. You are persuadable with the right arguments — economics, tourism, public image. You speak in measured, political sentences.`,
  },
  {
    id: 'adoptante', name: 'Clara (La Adoptante)',
    x: 12, z: 2, color: 0xC77D5A, height: 1.55,
    patrolRadius: 0, patrolSpeed: 0,
    system: `You are Clara, a 34-year-old graphic designer who lives alone in a quiet apartment in Madrid. You work from home. You want to adopt a galgo but you are nervous — you have never had a dog. Ask the player about the galgo they are recommending. Be genuinely moved if the match sounds right. You are curious, gentle, and a little anxious.`,
  },
];

function makeNPCMesh(color, height, accessory) {
  const g = new THREE.Group();
  const clothMat = new THREE.MeshLambertMaterial({ color });
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xE8C9A0 });
  const legMat = new THREE.MeshLambertMaterial({ color: 0x4A3B2C });

  const legH = height * 0.42;
  for (let side = -1; side <= 1; side += 2) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, legH, 8), legMat);
    leg.position.set(0, legH / 2, side * 0.15);
    leg.castShadow = true;
    g.add(leg);
  }

  const torsoH = height * 0.62;
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, torsoH * 0.6, 4, 12), clothMat);
  torso.position.y = legH + torsoH / 2;
  torso.castShadow = true;
  g.add(torso);

  for (let side = -1; side <= 1; side += 2) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, torsoH * 0.55, 3, 8), clothMat);
    arm.position.set(0, legH + torsoH * 0.52, side * 0.44);
    arm.rotation.x = side * 0.12;
    arm.castShadow = true;
    g.add(arm);
  }

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), skinMat);
  head.position.y = height + 0.34;
  head.castShadow = true;
  g.add(head);

  if (accessory === 'hat') {
    const hatMat = new THREE.MeshLambertMaterial({ color: 0x6B5335 });
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 14), hatMat);
    brim.position.y = height + 0.56;
    g.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.28, 12), hatMat);
    crown.position.y = height + 0.7;
    g.add(crown);
  } else if (accessory === 'coat') {
    // Long white coat over the clothes
    const coat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.42, torsoH * 0.95, 12, 1, true),
      new THREE.MeshLambertMaterial({ color: 0xF5F5F0, side: THREE.DoubleSide })
    );
    coat.position.y = legH + torsoH * 0.48;
    g.add(coat);
  } else if (accessory === 'suit') {
    const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.16, torsoH * 0.5, 0.3),
      new THREE.MeshLambertMaterial({ color: 0xF5F5F0 }));
    shirt.position.set(0.28, legH + torsoH * 0.62, 0);
    g.add(shirt);
  }
  return g;
}

export function buildNPCs() {
  NPC_DEFS.forEach(def => {
    if (insideBuilding(def.x, def.z)) {
      console.warn(`NPC "${def.id}" spawns inside a building at (${def.x}, ${def.z}) — fix its position`);
    }
    const mesh = makeNPCMesh(def.color, def.height, def.accessory);
    mesh.position.set(def.x, terrainHeight(def.x, def.z), def.z);
    state.scene.add(mesh);
    const summary = localStorage.getItem(`npc_${def.id}_summary`) || '';
    const history = JSON.parse(localStorage.getItem(`npc_${def.id}_history`) || '[]');
    state.npcs.push({
      ...def, mesh, summary, history,
      baseX: def.x, baseZ: def.z,
      patrolAngle: Math.random() * Math.PI * 2,
    });
  });
}

export function updateNPCPatrol(npc, dt) {
  if (npc.patrolRadius <= 0) return;
  npc.patrolAngle += npc.patrolSpeed * dt * 0.1;
  const x = npc.baseX + Math.cos(npc.patrolAngle) * npc.patrolRadius;
  const z = npc.baseZ + Math.sin(npc.patrolAngle) * npc.patrolRadius;
  npc.mesh.position.set(x, terrainHeight(x, z), z);
  // Face along the direction of travel (tangent to the patrol circle)
  npc.mesh.rotation.y = Math.atan2(-Math.sin(npc.patrolAngle), Math.cos(npc.patrolAngle));
}
