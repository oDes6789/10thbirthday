import { WS_URL, RECONNECT_MS } from './roomClient.js';

export function createWatchClient() {
  let ws = null;
  let reconnectTimer = null;
  let watching = false;
  let handlers = {};

  /** @type {Map<number, { name: string, wish: string }>} */
  const occupants = new Map();

  function setHandlers(h) {
    handlers = { ...handlers, ...h };
  }

  function connect() {
    if (ws?.readyState === WebSocket.OPEN) {
      if (watching) send({ type: 'watch' });
      return;
    }
    if (ws?.readyState === WebSocket.CONNECTING) return;

    ws = new WebSocket(WS_URL);

    ws.addEventListener('open', () => {
      handlers.onConnectionChange?.(true);
      if (watching) send({ type: 'watch' });
    });

    ws.addEventListener('close', () => {
      handlers.onConnectionChange?.(false);
      scheduleReconnect();
    });

    ws.addEventListener('error', () => ws?.close());

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
      case 'snapshot':
        occupants.clear();
        for (const entry of msg.active || []) {
          occupants.set(entry.i, { name: entry.name, wish: entry.wish || '' });
        }
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
        handlers.onError?.(msg);
        break;

      default:
        break;
    }
  }

  function send(msg) {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }

  function watch() {
    watching = true;
    connect();
    if (ws?.readyState === WebSocket.OPEN) send({ type: 'watch' });
  }

  function destroy() {
    clearTimeout(reconnectTimer);
    watching = false;
    ws?.close();
    ws = null;
  }

  return {
    watch,
    connect,
    destroy,
    setHandlers,
    get occupants() {
      return occupants;
    },
  };
}
