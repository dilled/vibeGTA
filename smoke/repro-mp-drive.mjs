// Headless MP repro: join the running VibeGTA MP server, steal a car,
// drive it for N seconds at client-authoritative position, and log
// when/why control is lost + how the server's snapshot of the car moves.
//
// Usage: NODE_TLS_REJECT_UNAUTHORIZED=0 node smoke/repro-mp-drive.mjs [seconds] [heli]
const URL = process.env.MP_URL || 'wss://127.0.0.1:3002';
const SECONDS = Number(process.argv[2] || 60);
const MAX_SPEED = Number(process.env.MAX_SPEED ?? 12);
const WANT_HELI = process.argv[3] === 'heli';

const MSG_JOIN = 3, MSG_JOIN_SUCCESS = 8, MSG_JOIN_ERROR = 255;
const MSG_GTA_STATE = 19, MSG_GTA_TICK = 20, MSG_GTA_VEH = 24, MSG_GTA_WORLD_SYNC = 25;
const NO_DRIVER = 0xFFFF;

let publicId = 0, granted = NO_DRIVER, controlReq = NO_DRIVER;
let roster = null, ownPos = null, carSnap = null;
let target = null, grantedAt = 0;
let x = 20, z = 20, heading = 0, speed = 0, y = 3;
let frame = 0;

const log = (m) => console.log(`[${(Date.now() / 1000) % 1000000 .toFixed(3)}] ${m}`);

function sendState() {
  const buf = new ArrayBuffer(1 + 28);
  const dv = new DataView(buf);
  dv.setUint8(0, MSG_GTA_STATE);
  dv.setUint32(1, publicId, true);
  dv.setFloat32(5, x, true);
  dv.setFloat32(9, y, true);
  dv.setFloat32(13, z, true);
  dv.setFloat32(17, heading, true);
  dv.setFloat32(21, 0.1, true);
  dv.setUint8(25, 1);
  dv.setUint16(26, controlReq, true);
  dv.setUint8(28, 0);
  ws.send(buf);
}
function sendVeh() {
  if (granted === NO_DRIVER || !target) return;
  const buf = new ArrayBuffer(1 + 28);
  const dv = new DataView(buf);
  dv.setUint8(0, MSG_GTA_VEH);
  dv.setUint16(1, target.id, true);
  dv.setUint8(3, 0);
  dv.setFloat32(5, x, true);
  dv.setFloat32(9, y, true);
  dv.setFloat32(13, z, true);
  dv.setFloat32(17, heading, true);
  dv.setFloat32(21, speed, true);
  dv.setFloat32(25, 0, true);
  ws.send(buf);
}

function pickVehicle(vs) {
  if (WANT_HELI) { const h = vs.find(v => v.type === 2); if (h) return h; }
  const c = vs.find(v => v.type === 0 && v.hasDriver);
  return c || vs.find(v => v.type === 0);
}

function onTick(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const flags = buf[1];
  let off = 6;
  const rd = (n) => { const r = dv.getUint32(off, true); off += n; return r; };
  if (flags & 1) {
    const n = rd(4);
    for (let i = 0; i < n; i++) {
      const p = off + i * 28;
      const id = dv.getUint32(p, true);
      const vid = dv.getUint16(p + 25, true);
      const wanted = dv.getUint8(p + 27);
      if (id === publicId) {
        if (vid !== granted) {
          log(`GRANT CHANGE: ${granted === NO_DRIVER ? 'none' : granted} -> ${vid === NO_DRIVER ? 'none' : vid} (wanted=${wanted}, req=${controlReq})`);
          granted = vid;
        }
      }
    }
    off += n * 28;
  }
  if (flags & 2) { const n = rd(4); off += n * 4; }
  if (flags & 4) off += namesLen(dv, off);
  if (flags & 8) { const n = rd(4); off += n * 4; }
  if (flags & 16) {
    const n = rd(4);
    for (let i = 0; i < n; i++) {
      const p = off + i * 28;
      const id = dv.getUint16(p, true);
      if (target && id === target.id)
        carSnap = { x: dv.getFloat32(p + 8, true), y: dv.getFloat32(p + 12, true), z: dv.getFloat32(p + 16, true), speed: dv.getFloat32(p + 24, true), driver: dv.getUint32(p + 4, true) };
    }
    off += n * 28;
  }
  if (flags & 32) { const n = rd(4); off += n * 20; }
  if (flags & 64) {
    const n = rd(4);
    for (let i = 0; i < n; i++) {
      const p = off + i * 22;
      const kind = dv.getUint8(p), a = dv.getUint16(p + 2, true);
      if (kind === 3) log(`EVENT: vehicle ${a} GONE`);
      if (kind === 2) log(`EVENT: driver of vehicle ${a} ejected`);
      if (kind === 1) log(`EVENT: ped ${a} flung`);
    }
    off += n * 22;
  }
  if (flags & 128) {
    const n = rd(4);
    for (let i = 0; i < n; i++) {
      const p = off + i * 12;
      if (dv.getUint8(p) === 1) log(`!! CLIENT EVENT: BUSTED`);
    }
    off += n * 12;
  }
}
function namesLen(dv, off) {
  const cnt = dv.getUint32(off, true);
  let n = off + 4;
  for (let i = 0; i < cnt; i++) { const l = dv.getUint32(n + 4, true); n += 8 + l; }
  return n - off;
}

const ws = new WebSocket(URL);
ws.binaryType = 'arraybuffer';
ws.onopen = () => {
  const payload = new TextEncoder().encode(`repro-${Date.now()}|3`);
  ws.send(new Uint8Array([MSG_JOIN, ...payload]));
};
ws.onmessage = (e) => {
  const buf = new Uint8Array(e.data instanceof ArrayBuffer ? e.data : e.data.buffer);
  const type = buf[0];
  if (type === MSG_JOIN_SUCCESS) {
    publicId = new DataView(buf.buffer, buf.byteOffset, buf.byteLength).getUint32(1, false);
    log(`joined as publicId=${publicId}`);
    setInterval(() => { sendState(); sendVeh(); }, 1000 / 30);
  } else if (type === MSG_JOIN_ERROR) {
    console.error('JOIN ERROR:', new TextDecoder().decode(buf.subarray(1)));
    process.exit(1);
  } else if (type === MSG_GTA_WORLD_SYNC) {
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    let off = 1;
    const vc = dv.getUint32(off, true); off += 4;
    const vs = [];
    for (let i = 0; i < vc; i++) {
      const p = off + i * 22;
      vs.push({
        id: dv.getUint16(p, true), type: dv.getUint8(p + 2),
        x: dv.getFloat32(p + 6, true), y: dv.getFloat32(p + 10, true), z: dv.getFloat32(p + 14, true),
        hasDriver: dv.getUint8(p + 4),
      });
    }
    off += vc * 22;
    const pc = dv.getUint32(off, true); off += 4 + pc * 16;
    const bc = dv.getUint32(off, true);
    log(`world sync: ${vc} vehicles, ${pc} peds, ${bc} block edits`);
    roster = vs;
    target = pickVehicle(vs);
    log(`target vehicle ${target.id} (type ${target.type}) at ${target.x.toFixed(1)},${target.z.toFixed(1)}`);
    x = target.x; z = target.z; heading = 0;
    controlReq = target.id;
  } else if (type === MSG_GTA_TICK) {
    onTick(buf);
  }
};

// scenario: once granted, drive straight ahead (heading 0 = +z) at speed 12
const t0 = Date.now();
setInterval(() => {
  const el = (Date.now() - t0) / 1000;
  if (granted !== NO_DRIVER && target) {
    if (!grantedAt) { grantedAt = el; log(`GRANTED vehicle ${granted}, driving at speed 12 (heading +z)`); }
    const fx = Math.sin(heading), fz = Math.cos(heading);
    x += fx * speed * (1 / 30);
    z += fz * speed * (1 / 30);
    speed = Math.min(MAX_SPEED, speed + 0.5);
    if (carSnap && ++frame % 15 === 0) {
      const d = Math.hypot(carSnap.x - x, carSnap.z - z);
      log(`t=${el.toFixed(1)}s grant=${granted} me=${x.toFixed(1)},${z.toFixed(1)} server=${carSnap.x.toFixed(1)},${carSnap.z.toFixed(1)} (d=${d.toFixed(1)}) driver=${carSnap.driver} wanted=${0}`);
    }
  } else if (roster && !target) {
    log('no vehicle available');
  }
  if (el > SECONDS) { log(`done (${SECONDS}s)`); process.exit(0); }
}, 1000 / 30);
