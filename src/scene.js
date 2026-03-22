// Scene setup: renderer, camera, lights
import * as THREE from 'three';
import { state } from './state.js';

export function initScene() {
  state.clock = new THREE.Clock();
  state.scene = new THREE.Scene();
  state.scene.background = new THREE.Color(0xF2C07A);
  state.scene.fog = new THREE.Fog(0xC8854A, 80, 300);

  // Renderer
  state.renderer = new THREE.WebGLRenderer({ antialias: true });
  state.renderer.setSize(window.innerWidth, window.innerHeight);
  state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  state.renderer.shadowMap.enabled = true;
  state.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(state.renderer.domElement);

  // Camera
  state.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.5, 400);

  // Lights
  const ambient = new THREE.AmbientLight(0xFFD580, 0.6);
  state.scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xFFF0C0, 1.2);
  sun.position.set(100, 120, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -80;
  sun.shadow.camera.right = 80;
  sun.shadow.camera.top = 80;
  sun.shadow.camera.bottom = -80;
  sun.shadow.camera.near = 50;
  sun.shadow.camera.far = 300;
  state.scene.add(sun);

  window.addEventListener('resize', () => {
    state.camera.aspect = window.innerWidth / window.innerHeight;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(window.innerWidth, window.innerHeight);
  });
}
