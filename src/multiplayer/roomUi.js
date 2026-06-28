import './room.css';

const NAME_KEY = 'flame-room-name';
const MAX_VISIBLE_TOOLTIPS = 40;
const WISH_MAX = 120;
const MOBILE_MQ = window.matchMedia('(max-width: 639px)');

export function createRoomUi(roomClient, { onReady, onWishChange } = {}) {
  const overlay = document.getElementById('room-overlay');
  const nameForm = document.getElementById('room-name-form');
  const nameInput = document.getElementById('room-name-input');
  const joinBtn = document.getElementById('room-join-btn');
  const joinError = document.getElementById('room-join-error');
  const hud = document.getElementById('room-hud');
  const myNameEl = document.getElementById('room-my-name');
  const onlineEl = document.getElementById('room-online-count');
  const editNameBtn = document.getElementById('room-edit-name');
  const wishPanel = document.getElementById('room-wish-panel');
  const wishToggle = document.getElementById('room-wish-toggle');
  const wishPreview = document.getElementById('room-wish-preview');
  const wishForm = document.getElementById('room-wish-form');
  const wishEdit = document.getElementById('room-wish-edit');
  const wishSendBtn = document.getElementById('room-wish-send');
  const wishCount = document.getElementById('room-wish-count');
  const wishHint = document.getElementById('room-wish-hint');
  const nameModal = document.getElementById('room-name-modal');
  const nameEditForm = document.getElementById('room-name-edit-form');
  const nameEditInput = document.getElementById('room-name-edit-input');
  const ticker = document.getElementById('room-ticker');
  const tickerTrack = document.getElementById('room-ticker-track');
  const tooltipLayer = document.getElementById('flame-tooltips');

  let myName = '';
  const tickerQueue = [];
  let tickerBusy = false;
  let sendResetTimer = null;
  let wishExpanded = false;
  let nudgeWish = false;

  const savedName = localStorage.getItem(NAME_KEY);
  if (savedName) nameInput.value = savedName;

  function isMobile() {
    return MOBILE_MQ.matches;
  }

  function setMyName(name) {
    myName = name;
    if (myNameEl) myNameEl.textContent = name;
  }

  function setOnline(n) {
    onlineEl.textContent = String(n);
  }

  function showJoinError(msg) {
    joinError.textContent = msg;
    joinError.hidden = !msg;
  }

  function dismissOverlay() {
    overlay.classList.add('hidden');
    hud.hidden = false;
  }

  function showOverlay() {
    overlay.classList.remove('hidden');
    hud.hidden = true;
  }

  function updateWishPreview() {
    const text = wishEdit.value.trim();
    if (!text) {
      wishPreview.textContent = 'Chạm để viết lời chúc…';
      wishPreview.classList.remove('has-wish');
      return;
    }
    wishPreview.textContent = text.length > 42 ? `${text.slice(0, 42)}…` : text;
    wishPreview.classList.add('has-wish');
  }

  function updateWishCount() {
    const len = wishEdit.value.length;
    wishCount.textContent = `${len}/${WISH_MAX}`;
    wishCount.classList.toggle('near-limit', len >= WISH_MAX - 15);
    updateWishPreview();
    wishPanel?.classList.toggle('has-content', len > 0);
  }

  function setWishExpanded(open) {
    if (!isMobile()) {
      wishExpanded = true;
      wishPanel?.classList.remove('collapsed');
      wishToggle?.setAttribute('aria-expanded', 'true');
      return;
    }
    wishExpanded = open;
    wishPanel?.classList.toggle('collapsed', !open);
    wishToggle?.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('wish-open', open);
    if (open) {
      nudgeWish = false;
      wishPanel?.classList.remove('nudge');
      requestAnimationFrame(() => wishEdit.focus());
    } else {
      wishEdit.blur();
    }
  }

  function showWishSent() {
    wishSendBtn.classList.add('sent');
    wishHint.textContent = 'Đã gửi lời chúc!';
    updateWishPreview();
    clearTimeout(sendResetTimer);
    sendResetTimer = setTimeout(() => {
      wishSendBtn.classList.remove('sent');
      wishHint.textContent = 'Lời chúc sẽ hiện trên ngọn lửa của bạn';
      if (isMobile()) setWishExpanded(false);
    }, 1600);
  }

  function maybeNudgeWish() {
    if (!isMobile() || wishEdit.value.trim()) return;
    nudgeWish = true;
    wishPanel?.classList.add('nudge');
    setTimeout(() => wishPanel?.classList.remove('nudge'), 4800);
  }

  function openNameModal() {
    nameEditInput.value = myName;
    nameModal.hidden = false;
    requestAnimationFrame(() => nameEditInput.focus());
  }

  function closeNameModal() {
    nameModal.hidden = true;
  }

  function enqueueTicker(text) {
    tickerQueue.push(text);
    if (!tickerBusy) runTicker();
  }

  function runTicker() {
    if (tickerQueue.length === 0) {
      tickerBusy = false;
      ticker.classList.remove('show');
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

  function getUiInsets() {
    const top = isMobile() ? 72 : 96;
    const bottom = isMobile() ? (wishExpanded ? 190 : 72) : 24;
    return { top, bottom };
  }

  nameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (!name) {
      showJoinError('Vui lòng nhập tên của bạn');
      nameInput.focus();
      return;
    }
    showJoinError('');
    joinBtn.disabled = true;
    joinBtn.querySelector('.room-join-btn-label').textContent = 'Đang thắp lửa…';
    roomClient.join(name);
  });

  wishForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const wish = wishEdit.value.trim();
    roomClient.updateWish(wish);
    onWishChange?.(roomClient.mySlot, wish);
    showWishSent();
  });

  wishEdit.addEventListener('input', () => {
    updateWishCount();
    wishEdit.style.height = 'auto';
    wishEdit.style.height = `${Math.min(wishEdit.scrollHeight, 120)}px`;
  });

  wishToggle?.addEventListener('click', () => {
    if (!isMobile()) return;
    setWishExpanded(!wishExpanded);
  });

  editNameBtn.addEventListener('click', openNameModal);

  nameEditForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const trimmed = nameEditInput.value.trim();
    if (!trimmed || trimmed === myName) {
      closeNameModal();
      return;
    }
    roomClient.updateName(trimmed);
    closeNameModal();
  });

  nameModal.querySelectorAll('[data-dismiss="room-name-modal"]').forEach((el) => {
    el.addEventListener('click', closeNameModal);
  });

  nameModal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeNameModal();
  });

  document.addEventListener('pointerdown', (e) => {
    if (!isMobile() || !wishExpanded) return;
    if (wishPanel?.contains(e.target) || nameModal?.contains(e.target)) return;
    setWishExpanded(false);
  });

  MOBILE_MQ.addEventListener('change', () => {
    if (!isMobile()) setWishExpanded(true);
    else if (!wishEdit.matches(':focus')) setWishExpanded(false);
  });

  roomClient.setHandlers({
    onConnectionChange(connected) {
      hud?.classList.toggle('offline', !connected);
      if (!connected && !roomClient.isJoined) {
        joinBtn.disabled = false;
        joinBtn.querySelector('.room-join-btn-label').textContent = 'Thắp ngọn lửa của tôi';
      }
    },

    onJoined({ slot, name, wish, online }) {
      setMyName(name);
      localStorage.setItem(NAME_KEY, name);
      wishEdit.value = wish;
      updateWishCount();
      joinBtn.disabled = false;
      joinBtn.querySelector('.room-join-btn-label').textContent = 'Thắp ngọn lửa của tôi';
      showJoinError('');
      setOnline(online);
      dismissOverlay();
      setWishExpanded(!isMobile());
      enqueueTicker(`🔥 ${name} vừa thắp ngọn lửa!`);
      onReady?.({ slot, name, wish });
      onWishChange?.(slot, wish);
      setTimeout(maybeNudgeWish, 1200);
    },

    onUserJoined({ name, online }) {
      setOnline(online);
      enqueueTicker(`🔥 ${name} vừa vào — chào mừng!`);
    },

    onUserLeft({ online }) {
      setOnline(online);
    },

    onUserUpdated({ slot, name, wish }) {
      if (slot === roomClient.mySlot) {
        setMyName(name);
        localStorage.setItem(NAME_KEY, name);
        wishEdit.value = wish;
        updateWishCount();
      }
      onWishChange?.(slot, wish);
    },

    onOnlineCount: setOnline,

    onError({ message, code }) {
      joinBtn.disabled = false;
      joinBtn.querySelector('.room-join-btn-label').textContent = 'Thắp ngọn lửa của tôi';
      showJoinError(message);
      if (code === 'FULL') showOverlay();
    },
  });

  updateWishCount();
  showOverlay();
  roomClient.connect();

  function updateTooltips(getScreenPos, occupants, mySlot) {
    if (!tooltipLayer) return;

    const { top, bottom } = getUiInsets();
    const minY = top + 8;
    const maxY = window.innerHeight - bottom - 8;

    const candidates = [];
    for (const [slot, data] of occupants) {
      if (!data.wish && slot !== mySlot) continue;
      const pos = getScreenPos(slot);
      if (!pos || pos.z > 1) continue;
      const dist = Math.hypot(pos.x - window.innerWidth / 2, pos.y - window.innerHeight / 2);
      candidates.push({ slot, data, pos, dist, isMine: slot === mySlot });
    }

    candidates.sort((a, b) => (a.isMine ? -1 : b.isMine ? 1 : 0) || a.dist - b.dist);
    const visible = candidates.slice(0, MAX_VISIBLE_TOOLTIPS);

    const used = new Set();
    for (const item of visible) {
      used.add(item.slot);
      let el = tooltipLayer.querySelector(`[data-slot="${item.slot}"]`);
      if (!el) {
        el = document.createElement('div');
        el.className = 'flame-tooltip';
        el.dataset.slot = String(item.slot);
        tooltipLayer.appendChild(el);
      }
      el.classList.toggle('mine', item.isMine);
      const wishLine = item.data.wish
        ? `<p class="flame-tooltip-wish">${escapeHtml(item.data.wish)}</p>`
        : '';
      el.innerHTML = `<span class="flame-tooltip-name">${escapeHtml(item.data.name)}</span>${wishLine}`;

      const y = Math.max(minY, Math.min(item.pos.y, maxY));
      el.style.transform = `translate(${item.pos.x}px, ${y}px) translate(-50%, -100%)`;
      el.style.opacity = String(Math.min(1, 1.1 - item.pos.z * 0.3));
      el.hidden = false;
    }

    tooltipLayer.querySelectorAll('.flame-tooltip').forEach((el) => {
      if (!used.has(Number(el.dataset.slot))) el.hidden = true;
    });
  }

  return {
    setOnline,
    enqueueTicker,
    updateTooltips,
    get myName() {
      return myName;
    },
  };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
