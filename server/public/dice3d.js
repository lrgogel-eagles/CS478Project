import * as THREE from '/vendor/three/build/three.module.js';
import { GLTFLoader } from '/vendor/three/examples/jsm/loaders/GLTFLoader.js';

const content = document.getElementById('root');
const loader = new GLTFLoader();
const models = new Map();
const active = new Map();
const dieNames = { 4: 'd4', 6: 'd6', 8: 'd8', 10: 'd10', 12: 'd12', 20: 'd20', 100: 'd100' };
let manifest;

const faceRotations = {};

function rollRotation(sides, value) {
  const face = faceRotations[sides]?.[value];
  if (!face) return new THREE.Quaternion();
  return new THREE.Quaternion().setFromEuler(new THREE.Euler(...face));
}

async function loadDie(sides) {
  manifest ||= fetch('/dice-models/manifest.json').then(response => {
    if (!response.ok) throw new Error('Dice models not found');
    return response.json();
  });
  const files = await manifest;
  const url = files[dieNames[sides]];
  if (!url) throw new Error(`No model for d${sides}`);
  if (!models.has(url)) models.set(url, loader.loadAsync(url));
  return (await models.get(url)).scene.clone(true);
}

function createView(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(148, 148, false);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(3, 2.7, 5);
  camera.position.setLength(6.5);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.AmbientLight(0xffffff, 1.8));
  const light = new THREE.DirectionalLight(0xffffff, 2.4);
  light.position.set(2, 5, 4);
  scene.add(light);
  return { renderer, scene, camera };
}

async function showDie(canvas) {
  const sides = Number(canvas.dataset.die3d);
  const value = Number(canvas.dataset.key.split('-').pop());
  const view = createView(canvas);
  let frame;
  let stopped = false;
  const stop = () => {
    stopped = true;
    cancelAnimationFrame(frame);
    view.renderer.dispose();
  };
  try {
    const model = await loadDie(sides);
    if (stopped || !canvas.isConnected) return stop;
    const bounds = new THREE.Box3().setFromObject(model);
    model.position.sub(bounds.getCenter(new THREE.Vector3()));
    const size = bounds.getSize(new THREE.Vector3());
    model.scale.setScalar(2.2 / Math.max(size.x, size.y, size.z));
    const pivot = new THREE.Group();
    pivot.add(model);
    view.scene.add(pivot);
    const end = rollRotation(sides, value);
    const started = performance.now();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reducedMotion ? 0 : 2200;
    const start = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.7, -0.8, 0.4));
    const turns = Math.PI * 2 * 4;
    const spin = new THREE.Quaternion();
    const spinAxis = new THREE.Vector3(1, 0.7, 0.4).normalize();
    const spinningEnd = new THREE.Quaternion();
    const settleAt = 0.75;

    function animate(now) {
      if (stopped || !canvas.isConnected) return stop();
      const progress = duration === 0 ? 1 : Math.min((now - started) / duration, 1);
      if (progress < settleAt) {
        const t = progress / settleAt;
        spin.setFromAxisAngle(spinAxis, turns * t);
        pivot.quaternion.copy(start).multiply(spin);
        spinningEnd.copy(pivot.quaternion);
        pivot.position.y = Math.sin(t * Math.PI * 6) * 0.12 * (1 - t);
      } else {
        const t = (progress - settleAt) / (1 - settleAt);
        const eased = 1 - (1 - t) * (1 - t);
        pivot.quaternion.copy(spinningEnd).slerp(end, eased);
        pivot.position.y = 0;
      }
      view.renderer.render(view.scene, view.camera);
      if (progress < 1) frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
    canvas.title = `d${sides} rolled ${value}`;
  } catch (error) {
    console.error('Unable to load dice model:', error);
    stop();
    canvas.replaceWith(document.createTextNode(`d${sides}: ${value}`));
  }
  return stop;
}

function updateDice() {
  const canvases = new Set(content.querySelectorAll('canvas[data-die3d]'));
  for (const [canvas, stop] of active) {
    if (!canvases.has(canvas)) {
      stop();
      active.delete(canvas);
    }
  }
  for (const canvas of canvases) {
    if (active.has(canvas)) continue;
    let stop = () => {};
    let removed = false;
    active.set(canvas, () => { removed = true; stop(); });
    showDie(canvas).then(cleanup => {
      stop = cleanup || (() => {});
      if (removed || !canvas.isConnected) stop();
    });
  }
}

new MutationObserver(updateDice).observe(content, { childList: true, subtree: true });
updateDice();
