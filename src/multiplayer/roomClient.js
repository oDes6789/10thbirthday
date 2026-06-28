const WS_URL = (() => {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.hostname}:3001`;
})();

const RECONNECT_MS = 2500;
const JOIN_TIMEOUT_MS = 12_000;

export { WS_URL, RECONNECT_MS };

export function createRoomClient() {
  let ws = null;
  let reconnectTimer = null;
  let joinTimeout = null;
  let joined = false;
  let mySlot = -1;
  let myId = null;
  let handlers = {};
  /** @type {{ name: string, wish: string } | null} */
  let pendingJoin = null;

  /** @type {Map<number, { name: string, wish: string }>} */
  const occupants = new Map();

  function setHandlers(h) {
    handlers = { ...handlers, ...h };
  }

  function clearJoinTimeout() {
    clearTimeout(joinTimeout);
    joinTimeout = null;
  }

  function failJoin(message, code = 'CONNECT_FAILED') {
    clearJoinTimeout();
    pendingJoin = null;
    handlers.onError?.({ code, message });
  }

  function flushPendingJoin() {
    if (!pendingJoin || ws?.readyState !== WebSocket.OPEN) return;
    send({ type: 'join', name: pendingJoin.name, wish: pendingJoin.wish });
  }

  function connect() {
    if (ws?.readyState === WebSocket.OPEN) {
      flushPendingJoin();
      return;
    }
    if (ws?.readyState === WebSocket.CONNECTING) return;

    ws = new WebSocket(WS_URL);

    ws.addEventListener('open', () => {
      handlers.onConnectionChange?.(true);
      flushPendingJoin();
    });

    ws.addEventListener('close', () => {
      handlers.onConnectionChange?.(false);
      joined = false;
      if (pendingJoin) {
        failJoin('Không kết nối được máy chủ. Chạy terminal: npm run dev');
      }
      scheduleReconnect();
    });

    ws.addEventListener('error', () => {
      ws?.close();
    });

    ws.addEventListener('message', (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      handleMessage(msg);
    });
  }

  function scheduleReconnect() {
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, RECONNECT_MS);
  }

  function handleMessage(msg) {
    switch (msg.type) {
      case 'joined':
        joined = true;
        pendingJoin = null;
        clearJoinTimeout();
        mySlot = msg.slot;
        myId = msg.id;
        occupants.clear();
        for (const entry of msg.active || []) {
          occupants.set(entry.i, { name: entry.name, wish: entry.wish || '' });
        }
        handlers.onJoined?.({
          slot: msg.slot,
          id: msg.id,
          name: msg.name,
          wish: msg.wish || '',
          online: msg.online,
        });
        handlers.onOnlineCount?.(msg.online);
        handlers.onSync?.(occupants);
        break;

      case 'user_joined':
        occupants.set(msg.slot, { name: msg.name, wish: msg.wish || '' });
        handlers.onUserJoined?.(msg);
        handlers.onSlotChange?.(msg.slot, true, occupants.get(msg.slot));
        handlers.onOnlineCount?.(msg.online);
        break;

      case 'left':
        occupants.delete(msg.slot);
        handlers.onUserLeft?.(msg);
        handlers.onSlotChange?.(msg.slot, false, null);
        handlers.onOnlineCount?.(msg.online);
        break;

      case 'user_updated':
        occupants.set(msg.slot, { name: msg.name, wish: msg.wish || '' });
        handlers.onUserUpdated?.(msg);
        handlers.onSlotChange?.(msg.slot, true, occupants.get(msg.slot));
        break;

      case 'error':
        if (pendingJoin) {
          failJoin(msg.message || 'Không thể tham gia', msg.code);
        } else {
          handlers.onError?.(msg);
        }
        break;

      default:
        break;
    }
  }

  function send(msg) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  function join(name, wish = '') {
    pendingJoin = { name, wish };
    clearJoinTimeout();
    joinTimeout = setTimeout(() => {
      if (!joined && pendingJoin) {
        failJoin('Máy chủ không phản hồi. Kiểm tra đã chạy npm run dev chưa.', 'TIMEOUT');
      }
    }, JOIN_TIMEOUT_MS);
    connect();
    flushPendingJoin();
  }

  function updateName(name) {
    send({ type: 'update_name', name });
  }

  function updateWish(wish) {
    send({ type: 'update_wish', wish });
  }

  function destroy() {
    clearTimeout(reconnectTimer);
    clearJoinTimeout();
    pendingJoin = null;
    joined = false;
    ws?.close();
    ws = null;
  }

  return {
    connect,
    join,
    updateName,
    updateWish,
    destroy,
    setHandlers,
    get mySlot() {
      return mySlot;
    },
    get myId() {
      return myId;
    },
    get isJoined() {
      return joined;
    },
    get occupants() {
      return occupants;
    },
  };
}
