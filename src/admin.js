import { createFlameScene } from './flameScene.js';
import { createFlameControls } from './flameControls.js';

const container = document.getElementById('canvas-container');
const scene = createFlameScene(container);

scene.lightAllFlames();

const gui = createFlameControls({
  flameMat: scene.flameMat,
  bloomPass: scene.bloomPass,
  params: scene.params,
  motion: scene.motion,
  onRespawnAll: () => {
    scene.respawnAll();
    scene.lightAllFlames();
  },
});

if (scene.savedPreset && gui.applyPreset) {
  gui.applyPreset(scene.savedPreset);
}

gui.setOpen(true);

scene.start();
