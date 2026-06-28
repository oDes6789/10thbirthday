import './preview.css';

const MAX_VISIBLE_TOOLTIPS = 50;

export function createPreviewUi(watchClient, { getScreenPos } = {}) {
  const onlineEl = document.getElementById('preview-online-count');
  const ticker = document.getElementById('preview-ticker');
  const tickerTrack = document.getElementById('preview-ticker-track');
  const tooltipLayer = document.getElementById('preview-tooltips');
  const statusEl = document.getElementById('preview-status');

  const tickerQueue = [];
  let tickerBusy = false;

  function setOnline(n) {
    if (onlineEl) onlineEl.textContent = String(n);
  }

  function setStatus(msg) {
    if (statusEl) {
      statusEl.textContent = msg;
      statusEl.hidden = !msg;
    }
  }

  function enqueueTicker(text) {
    tickerQueue.push(text);
    if (!tickerBusy) runTicker();
  }

  function runTicker() {
    if (tickerQueue.length === 0) {
      tickerBusy = false;
      ticker?.classList.remove('show');
      return;
    }
    tickerBusy = true;
    tickerTrack.textContent = tickerQueue.shift();
    ticker.classList.add('show');
    setTimeout(() => {
      ticker.classList.remove('show');
      setTimeout(runTicker, 400);
    }, 4200);
  }

  watchClient.setHandlers({
    onConnectionChange(connected) {
      setStatus(connected ? '' : 'Đang kết nối lại…');
    },
    onError({ code, message }) {
      if (code === 'NOT_JOINED') {
        setStatus('Máy chủ phòng cũ — dừng process :3001 rồi chạy lại npm run dev');
        return;
      }
      setStatus(message || 'Lỗi kết nối màn chiếu');
    },
    onUserJoined({ name, online }) {
      setOnline(online);
      enqueueTicker(`🔥 ${name} vừa thắp ngọn lửa!`);
    },
    onUserLeft({ online }) {
      setOnline(online);
    },
    onOnlineCount: setOnline,
  });

  function updateTooltips(occupants) {
    if (!tooltipLayer || !getScreenPos) return;

    const candidates = [];
    for (const [slot, data] of occupants) {
      const pos = getScreenPos(slot);
      if (!pos || pos.z > 1) continue;
      const dist = Math.hypot(pos.x - window.innerWidth / 2, pos.y - window.innerHeight / 2);
      candidates.push({ slot, data, pos, dist });
    }

    candidates.sort((a, b) => a.dist - b.dist);
    const visible = candidates.slice(0, MAX_VISIBLE_TOOLTIPS);
    const used = new Set();

    for (const item of visible) {
      used.add(item.slot);
      let el = tooltipLayer.querySelector(`[data-slot="${item.slot}"]`);
      if (!el) {
        el = document.createElement('div');
        el.className = 'preview-tooltip';
        el.dataset.slot = String(item.slot);
        tooltipLayer.appendChild(el);
      }
      const wishLine = item.data.wish
        ? `<p class="preview-tooltip-wish">${escapeHtml(item.data.wish)}</p>`
        : '';
      el.innerHTML = `<span class="preview-tooltip-name">${escapeHtml(item.data.name)}</span>${wishLine}`;
      el.style.transform = `translate(${item.pos.x}px, ${item.pos.y}px) translate(-50%, -100%)`;
      el.style.opacity = String(Math.min(1, 1.1 - item.pos.z * 0.3));
      el.hidden = false;
    }

    tooltipLayer.querySelectorAll('.preview-tooltip').forEach((el) => {
      if (!used.has(Number(el.dataset.slot))) el.hidden = true;
    });
  }

  document.body.addEventListener('dblclick', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  });

  return { updateTooltips, enqueueTicker, setOnline };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
