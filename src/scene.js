// Scene setup: renderer, camera, lights
import * as THREE from 'three';
import { state } from './state.js';

export function initScene() {
  state.clock = new THREE.Timer();
  state.scene = new THREE.Scene();
  state.scene.background = new THREE.Color(0xF2C07A);
  // Fog color must match the sky dome's horizon color or a seam shows
  // where fogged terrain meets the sky.
  state.scene.fog = new THREE.Fog(0xF8D79A, 90, 300);

  // Renderer
  state.renderer = new THREE.WebGLRenderer({ antialias: true });
  state.renderer.setSize(window.innerWidth, window.innerHeight);
  state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  state.renderer.shadowMap.enabled = true;
  state.renderer.shadowMap.type = THREE.PCFShadowMap;
  state.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  state.renderer.toneMappingExposure = 1.1;
  document.body.appendChild(state.renderer.domElement);

  // Camera
  state.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.5, 400);

  // Sky dome — vertex-colored gradient from warm horizon to deeper amber
  const skyGeo = new THREE.SphereGeometry(340, 24, 12);
  const skyColors = [];
  const horizon = new THREE.Color(0xF8D79A);
  const zenith = new THREE.Color(0xCE8A4E);
  const pos = skyGeo.attributes.position;
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = Math.max(0, pos.getY(i) / 340);
    c.lerpColors(horizon, zenith, Math.pow(t, 0.7));
    skyColors.push(c.r, c.g, c.b);
  }
  skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(skyColors, 3));
  const sky = new THREE.Mesh(
    skyGeo,
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })
  );
  state.scene.add(sky);
  state.sky = sky;

  // Lights — hemisphere gives the warm sky bounce + cooler ground shade
  const hemi = new THREE.HemisphereLight(0xFFE3B3, 0x9A6B3F, 0.65);
  state.scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xFFF0C0, 1.2);
  sun.position.set(100, 120, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -80;
  sun.shadow.camera.right = 80;
  sun.shadow.camera.top = 80;
  sun.shadow.camera.bottom = -80;
  sun.shadow.camera.near = 50;
  sun.shadow.camera.far = 300;
  state.scene.add(sun);
  state.scene.add(sun.target);
  state.sun = sun;

  window.addEventListener('resize', () => {
    state.camera.aspect = window.innerWidth / window.innerHeight;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// The shadow camera only covers ±80 units — recenter it on the player so
// shadows exist everywhere in the 500-unit world, not just near the origin.
export function updateSun() {
  const pp = state.player.position;
  state.sun.position.set(pp.x + 100, 120, pp.z + 60);
  state.sun.target.position.set(pp.x, 0, pp.z);
  // Keep the sky dome centered on the player so it never clips the far plane
  state.sky.position.set(pp.x, 0, pp.z);
}
