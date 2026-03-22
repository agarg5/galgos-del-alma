// Player mesh and controller
import * as THREE from 'three';
import { state } from './state.js';

export function buildPlayer() {
  const playerMesh = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.35, 1.6, 8),
    new THREE.MeshLambertMaterial({ color: 0xD2B48C })
  );
  body.position.y = 1.3;
  body.castShadow = true;
  playerMesh.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 8, 6),
    new THREE.MeshLambertMaterial({ color: 0xE8C9A0 })
  );
  head.position.y = 2.4;
  head.castShadow = true;
  playerMesh.add(head);
  playerMesh.position.set(-20, 0, -10);
  state.scene.add(playerMesh);
  state.player = playerMesh;
}

export function updatePlayer(dt) {
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
    if (Math.abs(newX) > 220 || Math.abs(newZ) > 220) blocked = true;

    if (!blocked) {
      pp.x = newX;
      pp.z = newZ;
    }
    state.player.rotation.y = Math.atan2(dir.x, dir.z);
  }
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
