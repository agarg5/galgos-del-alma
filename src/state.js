// Shared game state — single source of truth
import * as THREE from 'three';

export const state = {
  scene: null,
  camera: null,
  renderer: null,
  clock: null,
  player: null,
  galgos: [],
  npcs: [],
  buildings: [],
  keys: {},
  dialogueActive: false,
  careMenuActive: false,
  currentNPC: null,
  currentGalgo: null,
  streaming: false,
  mouseDown: false,
  mouseX: 0,
  mouseY: 0,
  cameraAngle: Math.PI,
  cameraPitch: 0.4,
  reputation: parseInt(localStorage.getItem('game_reputation') || '0'),
  sessions: parseInt(localStorage.getItem('game_sessions') || '0'),
  shownMilestones: new Set(JSON.parse(localStorage.getItem('shown_milestones') || '[]')),
};

export const WORLD_SIZE = 500;
