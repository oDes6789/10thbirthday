/**
 * Thuật toán lửa cổ điển (Doom / demoscene)
 */
export class FirePropagation {
  constructor(width = 128, height = 192) {
    this.width = width;
    this.height = height;
    this.heat = new Uint8Array(width * height);
    this.palette = new Uint8Array(256 * 4);
    this.pixels = new Uint8Array(width * height * 4);
    this._buildPalette();
    this.texture = null;
    this.update();
  }

  _buildPalette() {
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      let r, g, b;

      if (t < 0.12) {
        const s = t / 0.12;
        r = s * 0.7;
        g = 0;
        b = 0;
      } else if (t < 0.3) {
        const s = (t - 0.12) / 0.18;
        r = 0.7 + s * 0.3;
        g = s * 0.15;
        b = 0;
      } else if (t < 0.55) {
        const s = (t - 0.3) / 0.25;
        r = 1.0;
        g = 0.15 + s * 0.5;
        b = s * 0.03;
      } else if (t < 0.8) {
        const s = (t - 0.55) / 0.25;
        r = 1.0;
        g = 0.65 + s * 0.3;
        b = 0.03 + s * 0.1;
      } else {
        const s = (t - 0.8) / 0.2;
        r = 1.0;
        g = 0.95 + s * 0.05;
        b = 0.13 + s * 0.87;
      }

      const idx = i * 4;
      this.palette[idx] = Math.round(r * 255);
      this.palette[idx + 1] = Math.round(g * 255);
      this.palette[idx + 2] = Math.round(b * 255);
      this.palette[idx + 3] = 255;
    }
  }

  update() {
    const { width: w, height: h, heat } = this;

    for (let y = 0; y < h - 1; y++) {
      for (let x = 0; x < w; x++) {
        const src = (y + 1) * w + x;
        const rand = (Math.random() * 3) | 0;
        const dstX = Math.min(w - 1, Math.max(0, x - rand + 1));
        const dst = y * w + dstX;
        const cool = (Math.random() * 4) | 0;
        const next = heat[src] - cool;
        heat[dst] = next > 0 ? next : 0;
      }
    }

    for (let x = 0; x < w; x++) {
      heat[(h - 1) * w + x] = 30 + ((Math.random() * 10) | 0);
    }

    for (let i = 0; i < w * h; i++) {
      const paletteIndex = Math.min(255, heat[i] * 6);
      const hi = paletteIndex * 4;
      const pi = i * 4;
      this.pixels[pi] = this.palette[hi];
      this.pixels[pi + 1] = this.palette[hi + 1];
      this.pixels[pi + 2] = this.palette[hi + 2];
      this.pixels[pi + 3] = 255;
    }
  }

  attachToThree(THREE) {
    if (!this.texture) {
      this.texture = new THREE.DataTexture(
        this.pixels,
        this.width,
        this.height,
        THREE.RGBAFormat,
        THREE.UnsignedByteType
      );
      this.texture.minFilter = THREE.LinearFilter;
      this.texture.magFilter = THREE.LinearFilter;
      this.texture.wrapS = THREE.RepeatWrapping;
      this.texture.wrapT = THREE.RepeatWrapping;
      this.texture.colorSpace = THREE.SRGBColorSpace;
    }
    this.texture.needsUpdate = true;
    return this.texture;
  }
}
