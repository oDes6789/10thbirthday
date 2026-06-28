import { createFlameScene } from './flameScene.js';
import { createWatchClient } from './multiplayer/watchClient.js';
import { createPreviewUi } from './multiplayer/previewUi.js';

const container = document.getElementById('canvas-container');
const scene = createFlameScene(container);

const watchClient = createWatchClient();
watchClient.setHandlers({
  onSlotChange(slot, on) {
    scene.setSlotActive(slot, on);
  },
  onSync(occupants) {
    scene.syncAllSlots(occupants);
  },
});

const previewUi = createPreviewUi(watchClient, {
  getScreenPos: scene.getScreenPos,
});

watchClient.watch();

scene.setFrameHook(() => {
  previewUi.updateTooltips(watchClient.occupants);
});

scene.start();
