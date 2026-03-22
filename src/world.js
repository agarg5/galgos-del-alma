// World building: terrain, buildings, trees, roads, props
import * as THREE from 'three';
import { state, WORLD_SIZE } from './state.js';

function makeTree(x, z) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.4, 3, 6),
    new THREE.MeshLambertMaterial({ color: 0x6B4226 })
  );
  trunk.position.y = 1.5;
  trunk.castShadow = true;
  g.add(trunk);
  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(2.5, 6, 5),
    new THREE.MeshLambertMaterial({ color: 0x4A5E2A })
  );
  crown.scale.y = 0.7;
  crown.position.y = 4;
  crown.castShadow = true;
  g.add(crown);
  g.position.set(x, 0, z);
  return g;
}

function makeBuilding(x, z, w, h, d, roofColor) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color: 0xF0E6D0 })
  );
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.6, 0.5, d + 0.6),
    new THREE.MeshLambertMaterial({ color: roofColor || 0xB85C38 })
  );
  roof.position.y = h + 0.25;
  roof.castShadow = true;
  g.add(roof);
  for (let side = -1; side <= 1; side += 2) {
    const win = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1.2, 0.1),
      new THREE.MeshLambertMaterial({ color: 0x2C2C2C })
    );
    win.position.set(side * (w * 0.3), h * 0.55, d / 2 + 0.06);
    g.add(win);
  }
  g.position.set(x, 0, z);
  g.userData.isBuilding = true;
  g.userData.bbox = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(x, h / 2, z),
    new THREE.Vector3(w + 1, h, d + 1)
  );
  return g;
}

export function buildTerrain() {
  const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, 60, 60);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, Math.sin(x * 0.03) * Math.cos(z * 0.04) * 1.5);
    const base = new THREE.Color(0xD4A96A);
    const dark = new THREE.Color(0xB8935A);
    const t = (Math.sin(x * 0.1 + z * 0.07) + 1) * 0.5;
    const c = base.clone().lerp(dark, t * 0.3);
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const terrain = new THREE.Mesh(geo, mat);
  terrain.receiveShadow = true;
  state.scene.add(terrain);
}

export function buildWorld() {
  // Dehesa trees (northeast)
  for (let i = 0; i < 30; i++) {
    const x = 40 + Math.random() * 150;
    const z = -150 + Math.random() * 130;
    state.scene.add(makeTree(x, z));
  }
  // Village trees
  state.scene.add(makeTree(-20, 15));
  state.scene.add(makeTree(-40, -10));
  state.scene.add(makeTree(15, 30));

  // Village buildings
  const blds = [
    makeBuilding(-50, -20, 10, 7, 8, 0xB85C38),
    makeBuilding(-35, -35, 8, 6, 7, 0xA04830),
    makeBuilding(-60, -40, 9, 6.5, 8, 0xB85C38),
    makeBuilding(-45, -5, 7, 5.5, 6, 0xA04830),
    makeBuilding(-70, -15, 8, 6, 7, 0xB85C38),
  ];
  blds.forEach(b => {
    state.scene.add(b);
    state.buildings.push(b);
  });

  // Shelter
  const shelter = makeBuilding(0, 10, 14, 7, 10, 0xD4763A);
  state.scene.add(shelter);
  state.buildings.push(shelter);

  // Fountain
  const fountainBase = new THREE.Mesh(
    new THREE.CylinderGeometry(2, 2.2, 1.5, 12),
    new THREE.MeshLambertMaterial({ color: 0xA0A0A0 })
  );
  fountainBase.position.set(-45, 0.75, -20);
  fountainBase.castShadow = true;
  state.scene.add(fountainBase);
  const fountainTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.5, 2, 8),
    new THREE.MeshLambertMaterial({ color: 0xB0B0B0 })
  );
  fountainTop.position.set(-45, 2.5, -20);
  state.scene.add(fountainTop);

  // Grass tufts (instanced)
  const grassGeo = new THREE.BoxGeometry(0.1, 0.8, 0.1);
  const grassMat = new THREE.MeshLambertMaterial({ color: 0x8B9A5A });
  const grassMesh = new THREE.InstancedMesh(grassGeo, grassMat, 600);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 600; i++) {
    const x = (Math.random() - 0.5) * 400;
    const z = (Math.random() - 0.5) * 400;
    dummy.position.set(x, 0.4, z);
    dummy.rotation.y = Math.random() * Math.PI;
    dummy.scale.set(1, 0.5 + Math.random(), 1);
    dummy.updateMatrix();
    grassMesh.setMatrixAt(i, dummy.matrix);
  }
  state.scene.add(grassMesh);

  // Roads
  const roadMat = new THREE.MeshLambertMaterial({ color: 0xB89860 });
  const road1 = new THREE.Mesh(new THREE.BoxGeometry(80, 0.05, 4), roadMat);
  road1.position.set(-10, 0.03, -20);
  road1.receiveShadow = true;
  state.scene.add(road1);
  const road2 = new THREE.Mesh(new THREE.BoxGeometry(4, 0.05, 60), roadMat);
  road2.position.set(0, 0.03, 0);
  road2.receiveShadow = true;
  state.scene.add(road2);
}
