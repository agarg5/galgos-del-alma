// NPC definitions, meshes, patrol
import * as THREE from 'three';
import { state } from './state.js';

const NPC_DEFS = [
  {
    id: 'cazador', name: 'Miguel (El Cazador)',
    x: 70, z: -60, color: 0x556B2F, height: 1.8,
    patrolRadius: 20, patrolSpeed: 1.5,
    system: `You are Miguel, a 58-year-old galgo hunter from Castilla-La Mancha. You have hunted with galgos your whole life, as did your father. You genuinely love your dogs but see them as working animals. You are not a villain — you are a man of tradition who has never been asked to question it. You are gruff but not cruel. You speak with brief, direct sentences. You remember previous conversations.`,
  },
  {
    id: 'veterinaria', name: 'Dr. Amparo (La Veterinaria)',
    x: 5, z: 18, color: 0xF0F0F0, height: 1.6,
    patrolRadius: 0, patrolSpeed: 0,
    system: `You are Dr. Amparo, a vet who volunteers at the galgo shelter. You are warm but exhausted. You have seen too many galgos come in injured. You give practical advice about caring for frightened galgos and remember which ones the player has been working with. You are encouraging but realistic.`,
  },
  {
    id: 'alcalde', name: 'Don Bernardo (El Alcalde)',
    x: -45, z: -22, color: 0x2C2C5E, height: 1.7,
    patrolRadius: 0, patrolSpeed: 0,
    system: `You are Alcalde Don Bernardo, the mayor of this small Spanish village. You care about your village and your re-election. You are not hostile to animal welfare but you fear upsetting the hunters who vote for you. You are persuadable with the right arguments — economics, tourism, public image. You speak in measured, political sentences.`,
  },
  {
    id: 'adoptante', name: 'Clara (La Adoptante)',
    x: 8, z: 5, color: 0xC77D5A, height: 1.55,
    patrolRadius: 0, patrolSpeed: 0,
    system: `You are Clara, a 34-year-old graphic designer who lives alone in a quiet apartment in Madrid. You work from home. You want to adopt a galgo but you are nervous — you have never had a dog. Ask the player about the galgo they are recommending. Be genuinely moved if the match sounds right. You are curious, gentle, and a little anxious.`,
  },
];

function makeNPCMesh(color, height) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.45, height, 8),
    new THREE.MeshLambertMaterial({ color })
  );
  body.position.y = height / 2;
  body.castShadow = true;
  g.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 8, 6),
    new THREE.MeshLambertMaterial({ color: 0xE8C9A0 })
  );
  head.position.y = height + 0.4;
  head.castShadow = true;
  g.add(head);
  return g;
}

export function buildNPCs() {
  NPC_DEFS.forEach(def => {
    const mesh = makeNPCMesh(def.color, def.height);
    mesh.position.set(def.x, 0, def.z);
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
  npc.mesh.position.x = npc.baseX + Math.cos(npc.patrolAngle) * npc.patrolRadius;
  npc.mesh.position.z = npc.baseZ + Math.sin(npc.patrolAngle) * npc.patrolRadius;
}
