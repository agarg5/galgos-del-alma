// Player mesh and controller
import * as THREE from 'three';
import { state, WORLD_BOUND } from './state.js';
import { terrainHeight } from './world.js';

export function buildPlayer() {
  const playerMesh = new THREE.Group();
  // Two-tone volunteer: dark trousers, terracotta shirt, bare head
  const legs = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.3, 0.75, 8),
    new THREE.MeshLambertMaterial({ color: 0x4A3B2C })
  );
  legs.position.y = 0.375;
  legs.castShadow = true;
  playerMesh.add(legs);
  const shirtMat = new THREE.MeshLambertMaterial({ color: 0xB8703F });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.6, 4, 12), shirtMat);
  torso.position.y = 1.15;
  torso.castShadow = true;
  playerMesh.add(torso);
  for (let side = -1; side <= 1; side += 2) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.55, 3, 8), shirtMat);
    arm.position.set(0, 1.15, side * 0.47);
    arm.rotation.x = side * 0.12;
    arm.castShadow = true;
    playerMesh.add(arm);
  }
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 14, 10),
    new THREE.MeshLambertMaterial({ color: 0xE8C9A0 })
  );
  head.position.y = 1.95;
  head.castShadow = true;
  playerMesh.add(head);
  playerMesh.position.set(-20, terrainHeight(-20, -10), -10);
  state.scene.add(playerMesh);
  state.player = playerMesh;
}

export function updatePlayer(dt) {
  state.moving = false;
  if (state.dialogueActive || state.careMenuActive) return;

  const pp = state.player.position;
  const speed = 8;
  let moveX = 0, moveZ = 0;

  if (state.keys['w'] || state.keys['arrowup']) moveZ -= 1;
  if (state.keys['s'] || state.keys['arrowdown']) moveZ += 1;
  if (state.keys['a'] || state.keys['arrowleft']) moveX -= 1;
  if (state.keys['d'] || state.keys['arrowright']) moveX += 1;

  if (moveX || moveZ) {
    const angle = state.cameraAngle;
    const forward = new THREE.Vector3(-Math.sin(angle), 0, -Math.cos(angle));
    const right = new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle));
    const dir = forward.multiplyScalar(-moveZ).add(right.multiplyScalar(moveX)).normalize();
    const newX = pp.x + dir.x * speed * dt;
    const newZ = pp.z + dir.z * speed * dt;

    // Collision check
    const testPos = new THREE.Vector3(newX, pp.y, newZ);
    let blocked = false;
    for (const b of state.buildings) {
      if (b.userData.bbox && b.userData.bbox.containsPoint(testPos)) {
        blocked = true;
        break;
      }
    }
    if (Math.abs(newX) > WORLD_BOUND || Math.abs(newZ) > WORLD_BOUND) blocked = true;

    if (!blocked) {
      pp.x = newX;
      pp.z = newZ;
      state.moving = true;
    }
    state.player.rotation.y = Math.atan2(dir.x, dir.z);
  }
  pp.y = terrainHeight(pp.x, pp.z);
}

export function updateCamera() {
  const pp = state.player.position;
  const camDist = 14;
  const camHeight = 8;
  state.camera.position.set(
    pp.x + Math.sin(state.cameraAngle) * camDist * Math.cos(state.cameraPitch),
    pp.y + camHeight * state.cameraPitch / 0.4,
    pp.z + Math.cos(state.cameraAngle) * camDist * Math.cos(state.cameraPitch)
  );
  state.camera.lookAt(pp.x, pp.y + 2, pp.z);
}
