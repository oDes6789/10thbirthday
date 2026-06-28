import * as THREE from 'three';

/**
 * Texture emoji 🔥 — 3 lớp màu phẳng, giống hệt icon
 * Đỏ #F44336 → Cam #FF9800 → Vàng #FFEB3B
 */
export function createFlameTexture(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { alpha: true });
  ctx.clearRect(0, 0, size, size);

  const s = size / 100;
  ctx.save();
  ctx.scale(s, s);
  ctx.translate(0, 2);

  drawOuterRed(ctx);
  drawMiddleOrange(ctx);
  drawInnerYellow(ctx);

  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.premultiplyAlpha = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

/** Lớp ngoài — đỏ, 3 lưỡi lửa */
function drawOuterRed(ctx) {
  ctx.fillStyle = '#F44336';
  ctx.beginPath();
  ctx.moveTo(50, 92);
  ctx.bezierCurveTo(28, 88, 18, 72, 22, 58);
  ctx.bezierCurveTo(24, 48, 28, 42, 32, 36);
  ctx.bezierCurveTo(34, 28, 36, 22, 38, 18);
  ctx.bezierCurveTo(39, 14, 41, 12, 42, 16);
  ctx.bezierCurveTo(43, 10, 45, 8, 46, 14);
  ctx.bezierCurveTo(47, 6, 50, 4, 50, 12);
  ctx.bezierCurveTo(50, 4, 53, 6, 54, 14);
  ctx.bezierCurveTo(55, 8, 57, 10, 58, 16);
  ctx.bezierCurveTo(59, 12, 61, 14, 62, 18);
  ctx.bezierCurveTo(64, 22, 66, 28, 68, 36);
  ctx.bezierCurveTo(72, 42, 76, 48, 78, 58);
  ctx.bezierCurveTo(82, 72, 72, 88, 50, 92);
  ctx.closePath();
  ctx.fill();
}

/** Lớp giữa — cam */
function drawMiddleOrange(ctx) {
  ctx.fillStyle = '#FF9800';
  ctx.beginPath();
  ctx.moveTo(50, 90);
  ctx.bezierCurveTo(34, 86, 28, 72, 30, 60);
  ctx.bezierCurveTo(32, 50, 36, 44, 40, 38);
  ctx.bezierCurveTo(42, 32, 44, 26, 46, 22);
  ctx.bezierCurveTo(47, 18, 48, 20, 49, 24);
  ctx.bezierCurveTo(49.5, 16, 50, 14, 50.5, 20);
  ctx.bezierCurveTo(51, 14, 51.5, 16, 52, 20);
  ctx.bezierCurveTo(52, 18, 53, 22, 54, 24);
  ctx.bezierCurveTo(56, 26, 58, 32, 60, 38);
  ctx.bezierCurveTo(64, 44, 68, 50, 70, 60);
  ctx.bezierCurveTo(72, 72, 66, 86, 50, 90);
  ctx.closePath();
  ctx.fill();
}

/** Lõi — vàng */
function drawInnerYellow(ctx) {
  ctx.fillStyle = '#FFEB3B';
  ctx.beginPath();
  ctx.moveTo(50, 88);
  ctx.bezierCurveTo(40, 84, 36, 74, 38, 64);
  ctx.bezierCurveTo(40, 56, 44, 50, 47, 46);
  ctx.bezierCurveTo(48, 42, 49, 38, 50, 34);
  ctx.bezierCurveTo(51, 38, 52, 42, 53, 46);
  ctx.bezierCurveTo(56, 50, 60, 56, 62, 64);
  ctx.bezierCurveTo(64, 74, 60, 84, 50, 88);
  ctx.closePath();
  ctx.fill();
}
