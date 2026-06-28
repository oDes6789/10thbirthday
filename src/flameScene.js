import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { createFlameTexture } from './createFlameTexture.js';
import {
  defaultParams,
  defaultMotion,
  applyShaderUniforms,
  loadSavedParams,
  applySavedSettings,
} from './flameControls.js';
import {
  flameVertexShader,
  flameFragmentShader,
} from './shaders/flameShader.js';

export const FLAME_COUNT = 1050;

export function createFlameScene(container) {
  const params = structuredClone(defaultParams);
  const motion = { ...defaultMotion };
  const savedPreset = applySavedSettings(params, motion, loadSavedParams());

  const spriteTex = createFlameTexture(512);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  camera.position.set(0, 0, 24);

  function getViewBounds() {
    const dist = camera.position.z;
    const vFov = (camera.fov * Math.PI) / 180;
    const halfH = Math.tan(vFov / 2) * dist;
    const halfW = halfH * camera.aspect;
    return { x: halfW * 0.96, y: halfH * 0.96, z: 18 };
  }

  let bounds = getViewBounds();

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    params.bloom.strength,
    params.bloom.radius,
    params.bloom.threshold
  );
  composer.addPass(bloomPass);

  const dummy = new THREE.Object3D();
  const phases = new Float32Array(FLAME_COUNT);
  const seeds = new Float32Array(FLAME_COUNT);
  const scales = new Float32Array(FLAME_COUNT);
  const depths = new Float32Array(FLAME_COUNT);
  const activeFlags = new Float32Array(FLAME_COUNT);
  const velocities = [];

  const screenPos = new THREE.Vector3();
  const screenProj = new THREE.Vector3();

  function randomInRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function randomSpreadPosition(fromBottom = false) {
    const x = randomInRange(-bounds.x, bounds.x);
    const y = fromBottom
      ? randomInRange(-bounds.y, -bounds.y * 0.5)
      : randomInRange(-bounds.y, bounds.y);
    const z = randomInRange(-bounds.z, bounds.z);
    return { x, y, z };
  }

  function randomScale(depth) {
    const { scaleMin, scaleMax } = params.particles;
    const t = Math.pow(Math.random(), 0.7);
    return (scaleMin + t * (scaleMax - scaleMin)) * (0.35 + depth * 1.15);
  }

  function randomSpeedY(depth) {
    return randomInRange(motion.speedMin, motion.speedMax) * (0.45 + depth * 0.75);
  }

  const baseGeo = new THREE.PlaneGeometry(1, 1.18);
  baseGeo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1));
  baseGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  baseGeo.setAttribute('aScale', new THREE.InstancedBufferAttribute(scales, 1));
  baseGeo.setAttribute('aDepth', new THREE.InstancedBufferAttribute(depths, 1));
  baseGeo.setAttribute('aActive', new THREE.InstancedBufferAttribute(activeFlags, 1));

  const flameMat = new THREE.ShaderMaterial({
    defines: { USE_INSTANCING: '' },
    uniforms: {
      uTime: { value: 0 },
      uFlameTex: { value: spriteTex },
      uBrightness: { value: params.shader.brightness },
      uAlpha: { value: params.shader.alpha },
      uFlameHeight: { value: params.shader.height },
      uTintWarm: { value: params.shader.tintWarm },
    },
    vertexShader: flameVertexShader,
    fragmentShader: flameFragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.NormalBlending,
    side: THREE.DoubleSide,
  });

  const flames = new THREE.InstancedMesh(baseGeo, flameMat, FLAME_COUNT);
  flames.frustumCulled = false;

  function initGridPositions() {
    const cols = Math.ceil(Math.sqrt(FLAME_COUNT * camera.aspect * 1.1));
    const rows = Math.ceil(FLAME_COUNT / cols);

    for (let i = 0; i < FLAME_COUNT; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cellW = (bounds.x * 2) / cols;
      const cellH = (bounds.y * 2) / rows;

      const x =
        -bounds.x + col * cellW + cellW * 0.5 + randomInRange(-cellW * 0.42, cellW * 0.42);
      const y =
        -bounds.y + row * cellH + cellH * 0.5 + randomInRange(-cellH * 0.42, cellH * 0.42);
      const z = randomInRange(-bounds.z, bounds.z);

      const depth = (z + bounds.z) / (bounds.z * 2);
      depths[i] = depth;
      scales[i] = randomScale(depth);
      phases[i] = Math.random() * Math.PI * 2;
      seeds[i] = Math.random();
      activeFlags[i] = 0;

      dummy.position.set(x, y, z);
      dummy.rotation.set(0, 0, 0);
      dummy.lookAt(camera.position);
      dummy.updateMatrix();
      flames.setMatrixAt(i, dummy.matrix);

      velocities[i] = {
        x: randomInRange(-0.08, 0.08),
        y: randomSpeedY(depth),
        z: randomInRange(-0.04, 0.04),
        px: x,
        py: y,
        pz: z,
      };
    }
  }

  function spawnFlame(i, fromBottom = false) {
    const { x, y, z } = randomSpreadPosition(fromBottom);
    const depth = (z + bounds.z) / (bounds.z * 2);
    depths[i] = depth;
    scales[i] = randomScale(depth);
    phases[i] = Math.random() * Math.PI * 2;
    seeds[i] = Math.random();

    dummy.position.set(x, y, z);
    dummy.lookAt(camera.position);
    dummy.updateMatrix();
    flames.setMatrixAt(i, dummy.matrix);

    velocities[i] = {
      x: randomInRange(-0.08, 0.08),
      y: randomSpeedY(depth),
      z: randomInRange(-0.04, 0.04),
      px: x,
      py: y,
      pz: z,
    };
  }

  function setSlotActive(slot, on) {
    if (slot < 0 || slot >= FLAME_COUNT) return;
    activeFlags[slot] = on ? 1 : 0;
    baseGeo.attributes.aActive.needsUpdate = true;
    if (on) {
      const v = velocities[slot];
      dummy.position.set(v.px, v.py, v.pz);
      dummy.lookAt(camera.position);
      dummy.updateMatrix();
      flames.setMatrixAt(slot, dummy.matrix);
      flames.instanceMatrix.needsUpdate = true;
    }
  }

  function syncAllSlots(occupants) {
    for (let i = 0; i < FLAME_COUNT; i++) setSlotActive(i, false);
    for (const slot of occupants.keys()) setSlotActive(slot, true);
  }

  function lightAllFlames() {
    for (let i = 0; i < FLAME_COUNT; i++) setSlotActive(i, true);
  }

  function getScreenPos(slot) {
    if (activeFlags[slot] < 0.5) return null;
    const v = velocities[slot];
    screenPos.set(v.px, v.py + 0.35, v.pz);
    screenProj.copy(screenPos).project(camera);
    if (screenProj.z > 1) return null;
    return {
      x: (screenProj.x * 0.5 + 0.5) * window.innerWidth,
      y: (-screenProj.y * 0.5 + 0.5) * window.innerHeight,
      z: screenProj.z,
    };
  }

  function respawnAll() {
    initGridPositions();
    flames.instanceMatrix.needsUpdate = true;
    baseGeo.attributes.aScale.needsUpdate = true;
    baseGeo.attributes.aDepth.needsUpdate = true;
  }

  function updateBillboards() {
    let matrixDirty = false;
    for (let i = 0; i < FLAME_COUNT; i++) {
      if (activeFlags[i] < 0.5) continue;
      const v = velocities[i];
      dummy.position.set(v.px, v.py, v.pz);
      dummy.lookAt(camera.position);
      dummy.updateMatrix();
      flames.setMatrixAt(i, dummy.matrix);
      matrixDirty = true;
    }
    if (matrixDirty) flames.instanceMatrix.needsUpdate = true;
  }

  function updateFlames(dt, t) {
    if (motion.fixedPositions) {
      updateBillboards();
      return;
    }

    let matrixDirty = false;

    for (let i = 0; i < FLAME_COUNT; i++) {
      if (activeFlags[i] < 0.5) continue;

      const v = velocities[i];
      v.px += v.x * dt;
      v.py += v.y * dt;
      v.pz += v.z * dt;
      v.px += Math.sin(t * 0.75 + phases[i]) * dt * motion.sway;

      if (v.py > bounds.y + 0.5) {
        spawnFlame(i, true);
        matrixDirty = true;
        continue;
      }

      if (Math.abs(v.px) > bounds.x + 0.5) {
        v.px = Math.sign(v.px) * bounds.x * 0.96;
        v.x *= -0.4;
      }

      dummy.position.set(v.px, v.py, v.pz);
      dummy.lookAt(camera.position);
      dummy.updateMatrix();
      flames.setMatrixAt(i, dummy.matrix);
      matrixDirty = true;
    }

    if (matrixDirty) flames.instanceMatrix.needsUpdate = true;
  }

  initGridPositions();
  flames.instanceMatrix.needsUpdate = true;
  scene.add(flames);
  applyShaderUniforms(flameMat, params.shader);

  const clock = new THREE.Clock();
  let frameHook = null;

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    flameMat.uniforms.uTime.value = t;
    updateFlames(dt, t);

    camera.position.x = Math.sin(t * 0.035) * 0.1;
    camera.position.y = Math.cos(t * 0.028) * 0.06;
    camera.lookAt(0, 0, 0);

    composer.render();
    frameHook?.();
  }

  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    bounds = getViewBounds();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    bloomPass.resolution.set(w, h);
  }

  window.addEventListener('resize', onResize);

  return {
    params,
    motion,
    flameMat,
    bloomPass,
    savedPreset,
    setSlotActive,
    syncAllSlots,
    lightAllFlames,
    getScreenPos,
    respawnAll,
    setFrameHook(fn) {
      frameHook = fn;
    },
    start() {
      animate();
    },
  };
}
