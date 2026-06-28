import { createFlameScene } from './flameScene.js';
import { createFlameControls } from './flameControls.js';
import { createRoomClient } from './multiplayer/roomClient.js';
import { createRoomUi } from './multiplayer/roomUi.js';

const container = document.getElementById('canvas-container');
const scene = createFlameScene(container);

const roomClient = createRoomClient();
roomClient.setHandlers({
  onSlotChange(slot, on) {
    scene.setSlotActive(slot, on);
  },
  onSync(occupants) {
    scene.syncAllSlots(occupants);
  },
});

const roomUi = createRoomUi(roomClient, {
  onReady({ slot }) {
    scene.setSlotActive(slot, true);
  },
});

const gui = createFlameControls({
  flameMat: scene.flameMat,
  bloomPass: scene.bloomPass,
  params: scene.params,
  motion: scene.motion,
  onRespawnAll: () => {
    scene.respawnAll();
    scene.syncAllSlots(roomClient.occupants);
  },
});

if (scene.savedPreset && gui.applyPreset) {
  gui.applyPreset(scene.savedPreset);
}

scene.setFrameHook(() => {
  roomUi.updateTooltips(scene.getScreenPos, roomClient.occupants, roomClient.mySlot);
});

scene.start();
