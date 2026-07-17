// World building: terrain, buildings, trees, roads, props
import * as THREE from 'three';
import { state, WORLD_SIZE } from './state.js';

// Height function shared by the terrain mesh and everything standing on it.
export function terrainHeight(x, z) {
  return Math.sin(x * 0.03) * Math.cos(z * 0.04) * 1.5;
}

const WALL_COLORS = [0xF0E6D0, 0xEDE0C4, 0xF4EBD8, 0xE9DCC2];

// Spawn-placement guard: is this ground position inside any building footprint?
const _probe = new THREE.Vector3();
export function insideBuilding(x, z) {
  _probe.set(x, terrainHeight(x, z) + 1, z);
  return state.buildings.some(b => b.userData.bbox.containsPoint(_probe));
}

function makeTree(x, z, scale = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.45, 3, 6),
    new THREE.MeshLambertMaterial({ color: 0x6B4226 })
  );
  trunk.position.y = 1.5;
  trunk.castShadow = true;
  g.add(trunk);
  // Two offset crown blobs read as a holm oak's irregular canopy
  const crownColor = new THREE.Color(0x4A5E2A)
    .offsetHSL((Math.random() - 0.5) * 0.02, 0, (Math.random() - 0.5) * 0.06);
  const crownMat = new THREE.MeshLambertMaterial({ color: crownColor });
  const crown = new THREE.Mesh(new THREE.SphereGeometry(2.5, 7, 5), crownMat);
  crown.scale.set(1, 0.65, 1);
  crown.position.y = 4;
  crown.castShadow = true;
  g.add(crown);
  const crown2 = new THREE.Mesh(new THREE.SphereGeometry(1.6, 6, 4), crownMat);
  crown2.scale.set(1, 0.7, 1);
  crown2.position.set(1.2, 4.6, 0.6);
  crown2.castShadow = true;
  g.add(crown2);
  g.scale.setScalar(scale);
  g.rotation.y = Math.random() * Math.PI * 2;
  g.position.set(x, terrainHeight(x, z), z);
  return g;
}

function makeCypress(x, z) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.2, 1, 5),
    new THREE.MeshLambertMaterial({ color: 0x5A3A22 })
  );
  trunk.position.y = 0.5;
  g.add(trunk);
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.9, 5.5, 7),
    new THREE.MeshLambertMaterial({ color: 0x2F4520 })
  );
  cone.position.y = 3.5;
  cone.castShadow = true;
  g.add(cone);
  g.position.set(x, terrainHeight(x, z), z);
  return g;
}

function makeBuilding(x, z, w, h, d, roofColor) {
  const g = new THREE.Group();
  const wallColor = WALL_COLORS[Math.floor(Math.random() * WALL_COLORS.length)];
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color: wallColor })
  );
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  // Gabled roof: a solid triangular prism, ridge running along the depth axis
  const ridgeH = w * 0.3;
  const overhang = 0.5;
  const roofShape = new THREE.Shape([
    new THREE.Vector2(-w / 2 - overhang, 0),
    new THREE.Vector2(w / 2 + overhang, 0),
    new THREE.Vector2(0, ridgeH),
  ]);
  const roof = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roofShape, { depth: d + overhang, bevelEnabled: false }),
    new THREE.MeshLambertMaterial({ color: roofColor || 0xB85C38 })
  );
  roof.position.set(0, h - 0.05, -(d + overhang) / 2);
  roof.castShadow = true;
  g.add(roof);

  // Door on the front face
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 2.2, 0.12),
    new THREE.MeshLambertMaterial({ color: 0x5A3A22 })
  );
  door.position.set(0, 1.1, d / 2 + 0.07);
  g.add(door);

  // Framed windows either side of the door
  const frameMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x2C2C2C });
  for (let side = -1; side <= 1; side += 2) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.5, 0.08), frameMat);
    frame.position.set(side * (w * 0.3), h * 0.55, d / 2 + 0.05);
    g.add(frame);
    const win = new THREE.Mesh(new THREE.BoxGeometry(1, 1.2, 0.1), glassMat);
    win.position.set(side * (w * 0.3), h * 0.55, d / 2 + 0.07);
    g.add(win);
  }

  // Sink slightly below the lowest nearby terrain so no gap shows on slopes.
  const y = terrainHeight(x, z) - 0.4;
  g.position.set(x, y, z);
  g.userData.isBuilding = true;
  g.userData.bbox = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(x, y + h / 2, z),
    new THREE.Vector3(w + 1, h + 2, d + 1)
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
    pos.setY(i, terrainHeight(x, z));
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
  for (let i = 0; i < 34; i++) {
    const x = 40 + Math.random() * 150;
    const z = -150 + Math.random() * 130;
    state.scene.add(makeTree(x, z, 0.8 + Math.random() * 0.5));
  }
  // Village trees + cypresses
  state.scene.add(makeTree(-20, 15));
  state.scene.add(makeTree(-38, -12, 0.9));
  state.scene.add(makeTree(15, 30, 1.1));
  state.scene.add(makeCypress(-30, -25));
  state.scene.add(makeCypress(-32, -26.5));
  state.scene.add(makeCypress(-10, 14));
  state.scene.add(makeCypress(10, 16));
  state.scene.add(makeCypress(-58, -30));

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

  // Fountain — in the open plaza, clear of every building footprint
  const FOUNTAIN_X = -40, FOUNTAIN_Z = -26;
  const fountainY = terrainHeight(FOUNTAIN_X, FOUNTAIN_Z);
  const stone = new THREE.MeshLambertMaterial({ color: 0xA8A29A });
  const fountainBase = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.5, 1.2, 12), stone);
  fountainBase.position.set(FOUNTAIN_X, fountainY + 0.6, FOUNTAIN_Z);
  fountainBase.castShadow = true;
  state.scene.add(fountainBase);
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(1.9, 1.9, 0.15, 12),
    new THREE.MeshLambertMaterial({ color: 0x4C7FA8 })
  );
  water.position.set(FOUNTAIN_X, fountainY + 1.15, FOUNTAIN_Z);
  state.scene.add(water);
  const fountainTop = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.45, 1.6, 8), stone);
  fountainTop.position.set(FOUNTAIN_X, fountainY + 1.9, FOUNTAIN_Z);
  fountainTop.castShadow = true;
  state.scene.add(fountainTop);

  // Scattered rocks
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x9E9284 });
  for (let i = 0; i < 24; i++) {
    const x = (Math.random() - 0.5) * 380;
    const z = (Math.random() - 0.5) * 380;
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4 + Math.random() * 0.8, 0), rockMat);
    rock.position.set(x, terrainHeight(x, z) + 0.15, z);
    rock.scale.y = 0.5 + Math.random() * 0.4;
    rock.rotation.y = Math.random() * Math.PI;
    rock.castShadow = true;
    state.scene.add(rock);
  }

  // Grass tufts (instanced, with per-instance color variation)
  const grassGeo = new THREE.BoxGeometry(0.1, 0.8, 0.1);
  const grassMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
  const grassMesh = new THREE.InstancedMesh(grassGeo, grassMat, 700);
  const dummy = new THREE.Object3D();
  const grassBase = new THREE.Color(0x8B9A5A);
  const grassC = new THREE.Color();
  for (let i = 0; i < 700; i++) {
    const x = (Math.random() - 0.5) * 400;
    const z = (Math.random() - 0.5) * 400;
    dummy.position.set(x, terrainHeight(x, z) + 0.4, z);
    dummy.rotation.y = Math.random() * Math.PI;
    dummy.scale.set(1, 0.5 + Math.random(), 1);
    dummy.updateMatrix();
    grassMesh.setMatrixAt(i, dummy.matrix);
    grassC.copy(grassBase).offsetHSL((Math.random() - 0.5) * 0.03, 0, (Math.random() - 0.5) * 0.1);
    grassMesh.setColorAt(i, grassC);
  }
  state.scene.add(grassMesh);

  // Roads — short slope-aligned segments that hug the terrain, instanced so
  // they still render in a single draw call.
  const segments = [];
  for (let x = -50; x <= 30; x += 4) segments.push([x, -20, 4.6, 4, 'x']);
  for (let z = -30; z <= 30; z += 4) segments.push([0, z, 4, 4.6, 'z']);
  const roadMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 0.05, 1),
    new THREE.MeshLambertMaterial({ color: 0xB89860 }),
    segments.length
  );
  const seg = new THREE.Object3D();
  segments.forEach(([x, z, w, d, axis], i) => {
    seg.position.set(x, terrainHeight(x, z) + 0.05, z);
    seg.scale.set(w, 1, d);
    // Tilt along the direction of travel to match the terrain slope
    if (axis === 'x') {
      seg.rotation.set(0, 0, -Math.atan2(terrainHeight(x + 2, z) - terrainHeight(x - 2, z), 4));
    } else {
      seg.rotation.set(Math.atan2(terrainHeight(x, z + 2) - terrainHeight(x, z - 2), 4), 0, 0);
    }
    seg.updateMatrix();
    roadMesh.setMatrixAt(i, seg.matrix);
  });
  roadMesh.receiveShadow = true;
  state.scene.add(roadMesh);
}
