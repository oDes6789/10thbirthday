/**
 * WebSocket room — tối đa 1050 ngọn lửa đồng thời
 */
import { createServer } from 'http';
import { randomUUID } from 'crypto';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT) || 3001;
const MAX_SLOTS = 1050;
const HEARTBEAT_MS = 30_000;
const MAX_NAME_LEN = 32;
const MAX_WISH_LEN = 120;

const slots = Array.from({ length: MAX_SLOTS }, () => null);
const available = new Int32Array(MAX_SLOTS);
let availableCount = MAX_SLOTS;
for (let i = 0; i < MAX_SLOTS; i++) available[i] = i;

/** @type {Map<import('ws').WebSocket, { id: string, slot: number, name: string }>} */
const clients = new Map();
/** @type {Set<import('ws').WebSocket>} */
const watchers = new Set();

function onlineCount() {
  return clients.size;
}

function broadcastAll(msg, except = null) {
  const data = JSON.stringify(msg);
  for (const [ws] of clients) {
    if (ws !== except && ws.readyState === 1) ws.send(data);
  }
  for (const ws of watchers) {
    if (ws !== except && ws.readyState === 1) ws.send(data);
  }
}

function pickSlot() {
  if (availableCount === 0) return -1;
  const pick = (Math.random() * availableCount) | 0;
  const slot = available[pick];
  availableCount -= 1;
  available[pick] = available[availableCount];
  return slot;
}

function freeSlot(slot) {
  if (slot < 0 || slot >= MAX_SLOTS || slots[slot] === null) return;
  slots[slot] = null;
  available[availableCount] = slot;
  availableCount += 1;
}

function sanitizeName(name) {
  return String(name || '')
    .trim()
    .slice(0, MAX_NAME_LEN)
    .replace(/[<>]/g, '');
}

function sanitizeWish(wish) {
  return String(wish || '')
    .trim()
    .slice(0, MAX_WISH_LEN)
    .replace(/[<>]/g, '');
}

function activeSnapshot() {
  const list = [];
  for (let i = 0; i < MAX_SLOTS; i++) {
    const s = slots[i];
    if (s) list.push({ i, name: s.name, wish: s.wish });
  }
  return list;
}

function broadcast(msg, except = null) {
  broadcastAll(msg, except);
}

function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}

function releaseClient(ws) {
  const client = clients.get(ws);
  if (!client) return;
  freeSlot(client.slot);
  clients.delete(ws);
  broadcast({ type: 'left', slot: client.slot, online: onlineCount() });
}

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, online: onlineCount(), capacity: MAX_SLOTS }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }

    if (msg.type === 'watch') {
      if (clients.has(ws)) return;
      watchers.add(ws);
      send(ws, {
        type: 'snapshot',
        online: onlineCount(),
        active: activeSnapshot(),
      });
      return;
    }

    if (msg.type === 'join') {
      if (clients.has(ws)) return;

      const name = sanitizeName(msg.name);
      if (!name) {
        send(ws, { type: 'error', code: 'INVALID_NAME', message: 'Vui lòng nhập tên' });
        return;
      }

      const slot = pickSlot();
      if (slot < 0) {
        send(ws, { type: 'error', code: 'FULL', message: 'Đã đủ 1050 ngọn lửa, thử lại sau' });
        return;
      }

      const id = randomUUID();
      const wish = sanitizeWish(msg.wish);
      slots[slot] = { id, name, wish };
      clients.set(ws, { id, slot, name });

      send(ws, {
        type: 'joined',
        id,
        slot,
        name,
        wish,
        online: onlineCount(),
        active: activeSnapshot(),
      });

      broadcast(
        {
          type: 'user_joined',
          slot,
          name,
          wish,
          online: onlineCount(),
        },
        ws
      );
      return;
    }

    const client = clients.get(ws);
    if (!client) {
      send(ws, { type: 'error', code: 'NOT_JOINED', message: 'Chưa tham gia phòng' });
      return;
    }

    if (msg.type === 'update_name') {
      const name = sanitizeName(msg.name);
      if (!name) {
        send(ws, { type: 'error', code: 'INVALID_NAME', message: 'Tên không hợp lệ' });
        return;
      }
      client.name = name;
      slots[client.slot].name = name;
      const payload = { type: 'user_updated', slot: client.slot, name, wish: slots[client.slot].wish };
      send(ws, payload);
      broadcast(payload, ws);
      return;
    }

    if (msg.type === 'update_wish') {
      const wish = sanitizeWish(msg.wish);
      slots[client.slot].wish = wish;
      const payload = { type: 'user_updated', slot: client.slot, name: client.name, wish };
      send(ws, payload);
      broadcast(payload, ws);
    }
  });

  ws.on('close', () => {
    watchers.delete(ws);
    releaseClient(ws);
  });
  ws.on('error', () => {
    watchers.delete(ws);
    releaseClient(ws);
  });
});

const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, HEARTBEAT_MS);

wss.on('close', () => clearInterval(heartbeat));

httpServer.listen(PORT, () => {
  console.log(`Flame room server on :${PORT} (max ${MAX_SLOTS} slots)`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `Port ${PORT} đang bị chiếm — tắt process cũ (vd. taskkill /F /PID <pid>) rồi chạy lại npm run dev`
    );
    process.exit(1);
  }
  throw err;
});
