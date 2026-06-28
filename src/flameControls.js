/**
 * Bảng điều chỉnh lửa — preset, lưu tự động, toast
 */
import GUI from 'lil-gui';
import './styles/panel.css';

const STORAGE_KEY = 'flame-embers-settings-v3';

const defaultMotion = {
  speedMin: 0.05,
  speedMax: 2,
  sway: 0.36,
  fixedPositions: false,
};

export const defaultParams = {
  bloom: { strength: 0, radius: 1, threshold: 1 },
  shader: {
    alpha: 1.2,
    brightness: 1.8,
    height: 0.8,
    tintWarm: 0.5,
    anim: 1.0,
  },
  particles: {
    scaleMin: 0.5,
    scaleMax: 0.7,
  },
};

export { defaultMotion };

export const presets = {
  realistic: {
    label: 'Chuẩn',
    desc: 'Giống emoji 🔥',
    bloom: { strength: 0, radius: 1, threshold: 1 },
    shader: { alpha: 1.2, brightness: 1.8, height: 0.8, tintWarm: 0.5, anim: 1.0 },
    particles: { scaleMin: 0.5, scaleMax: 0.7 },
    motion: { speedMin: 0.05, speedMax: 2, sway: 0.36 },
  },
  dense: {
    label: 'Dày đặc',
    desc: 'Nhiều đốm nhỏ',
    bloom: { strength: 0.65, radius: 0.45, threshold: 0.45 },
    shader: { alpha: 0.82, brightness: 1.0, height: 1.22, tintWarm: 0.08 },
    particles: { scaleMin: 0.08, scaleMax: 0.24 },
    motion: { speedMin: 0.16, speedMax: 0.48, sway: 0.1 },
  },
  soft: {
    label: 'Nhẹ nhàng',
    desc: 'Mờ, dreamy',
    bloom: { strength: 0, radius: 1, threshold: 1 },
    shader: { alpha: 1.2, brightness: 1.8, height: 0.8, tintWarm: 0.5, anim: 1.0 },
    particles: { scaleMin: 0.5, scaleMax: 0.7 },
    motion: { speedMin: 0.05, speedMax: 2, sway: 0.36 },
  },
  vivid: {
    label: 'Rực rỡ',
    desc: 'Sáng, nổi bật',
    bloom: { strength: 0.95, radius: 0.4, threshold: 0.32 },
    shader: { alpha: 0.95, brightness: 1.2, height: 1.32, tintWarm: 0.05 },
    particles: { scaleMin: 0.14, scaleMax: 0.38 },
    motion: { speedMin: 0.22, speedMax: 0.65, sway: 0.15 },
  },
};

export function loadSavedParams() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function createFlameControls(ctx) {
  const { flameMat, bloomPass, params, motion, onRespawnAll } = ctx;

  let activePreset = 'soft';
  let saveTimer = null;
  let toastTimer = null;

  const panel = document.getElementById('flame-panel');
  const fab = document.getElementById('panel-fab');
  const toast = document.getElementById('toast');
  const hudHint = document.querySelector('.hud-hint');
  const guiRoot = document.getElementById('gui-root');
  const presetContainer = document.getElementById('panel-presets');

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ bloom: params.bloom, shader: params.shader, particles: params.particles, motion, preset: activePreset })
      );
    }, 400);
  }

  function setOpen(open) {
    panel.classList.toggle('open', open);
    fab.classList.toggle('active', open);
    fab.setAttribute('aria-expanded', String(open));
    if (open && hudHint) hudHint.classList.add('hidden');
  }

  function applyPreset(key) {
    const preset = presets[key];
    if (!preset) return;
    activePreset = key;
    Object.assign(params.bloom, preset.bloom);
    Object.assign(params.shader, preset.shader);
    Object.assign(params.particles, preset.particles);
    Object.assign(motion, preset.motion);
    applyAll(ctx);
    refreshGUI(gui);
    updatePresetButtons();
    onRespawnAll();
    scheduleSave();
    showToast(`Preset: ${preset.label}`);
  }

  function updatePresetButtons() {
    presetContainer.querySelectorAll('.preset-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.preset === activePreset);
    });
  }

  Object.entries(presets).forEach(([key, preset]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset-btn';
    btn.dataset.preset = key;
    btn.innerHTML = `${preset.label}<span>${preset.desc}</span>`;
    btn.addEventListener('click', () => applyPreset(key));
    presetContainer.appendChild(btn);
  });
  updatePresetButtons();

  const gui = new GUI({ container: guiRoot, title: 'Chi tiết' });
  gui.domElement.querySelector('.title')?.remove();

  const bloom = gui.addFolder('✨ Ánh sáng (Bloom)');
  bloom.add(params.bloom, 'strength', 0, 2, 0.01).name('Cường độ').onChange((v) => {
    bloomPass.strength = v;
    scheduleSave();
  });
  bloom.add(params.bloom, 'radius', 0, 1, 0.01).name('Tỏa sáng').onChange((v) => {
    bloomPass.radius = v;
    scheduleSave();
  });
  bloom.add(params.bloom, 'threshold', 0, 1, 0.01).name('Ngưỡng').onChange((v) => {
    bloomPass.threshold = v;
    scheduleSave();
  });

  const shader = gui.addFolder('🔥 Hình ảnh lửa');
  shader.add(params.shader, 'alpha', 0.2, 1.2, 0.01).name('Độ đậm').onChange(() => {
    applyShaderUniforms(flameMat, params.shader);
    scheduleSave();
  });
  shader.add(params.shader, 'brightness', 0.4, 1.8, 0.01).name('Độ sáng').onChange(() => {
    applyShaderUniforms(flameMat, params.shader);
    scheduleSave();
  });
  shader.add(params.shader, 'height', 0.8, 2, 0.01).name('Chiều cao').onChange(() => {
    applyShaderUniforms(flameMat, params.shader);
    scheduleSave();
  });
  shader.add(params.shader, 'tintWarm', 0, 0.5, 0.01).name('Tông ấm').onChange(() => {
    applyShaderUniforms(flameMat, params.shader);
    scheduleSave();
  });

  const particles = gui.addFolder('✦ Hạt lửa');
  particles.add(motion, 'fixedPositions').name('Cố định vị trí').onChange(scheduleSave);
  particles.add(params.particles, 'scaleMin', 0.04, 0.7, 0.01).name('Nhỏ nhất').onChange(scheduleSave);
  particles.add(params.particles, 'scaleMax', 0.08, 0.9, 0.01).name('Lớn nhất').onChange(scheduleSave);
  particles.add(motion, 'speedMin', 0.05, 1.2, 0.01).name('Tốc độ thấp').onChange(scheduleSave);
  particles.add(motion, 'speedMax', 0.1, 2, 0.01).name('Tốc độ cao').onChange(scheduleSave);
  particles.add(motion, 'sway', 0, 0.4, 0.01).name('Lắc ngang').onChange(scheduleSave);

  bloom.open();
  shader.open();

  document.getElementById('btn-respawn').addEventListener('click', () => {
    onRespawnAll();
    showToast('Đã phân bố lại đốm lửa');
  });

  document.getElementById('btn-copy').addEventListener('click', () => {
    const json = JSON.stringify({ bloom: params.bloom, shader: params.shader, particles: params.particles, motion }, null, 2);
    navigator.clipboard.writeText(json).then(() => showToast('Đã copy cài đặt'));
  });

  document.getElementById('btn-reset').addEventListener('click', () => {
    applyPreset('soft');
    showToast('Đã khôi phục mặc định');
  });

  fab.addEventListener('click', () => setOpen(!panel.classList.contains('open')));
  document.querySelector('.panel-close').addEventListener('click', () => setOpen(false));

  window.addEventListener('keydown', (e) => {
    if (e.key === 'h' || e.key === 'H') setOpen(!panel.classList.contains('open'));
    if (e.key === 'Escape' && panel.classList.contains('open')) setOpen(false);
  });

  setTimeout(() => hudHint?.classList.add('hidden'), 8000);

  return { gui, setOpen, showToast, applyPreset };
}

function applyAll(ctx) {
  const { flameMat, bloomPass, params } = ctx;
  bloomPass.strength = params.bloom.strength;
  bloomPass.radius = params.bloom.radius;
  bloomPass.threshold = params.bloom.threshold;
  applyShaderUniforms(flameMat, params.shader);
}

function refreshGUI(g) {
  g.controllers.forEach((c) => c.updateDisplay());
  g.folders.forEach(refreshGUI);
}

export function applyShaderUniforms(flameMat, shaderParams) {
  const s = { ...defaultParams.shader, ...shaderParams };
  flameMat.uniforms.uAlpha.value = s.alpha;
  flameMat.uniforms.uBrightness.value = s.brightness;
  flameMat.uniforms.uFlameHeight.value = s.height;
  flameMat.uniforms.uTintWarm.value = s.tintWarm;
}

export function applySavedSettings(params, motion, saved) {
  if (!saved) return null;
  if (saved.bloom) Object.assign(params.bloom, saved.bloom);
  if (saved.shader) Object.assign(params.shader, { ...defaultParams.shader, ...saved.shader });
  if (saved.particles) Object.assign(params.particles, saved.particles);
  if (saved.motion) {
    Object.assign(motion, saved.motion);
    if (saved.motion.fixedPositions === undefined) motion.fixedPositions = false;
  }
  return saved.preset || null;
}
