// vibeGTA multiplayer client
//
// Enable by loading the page with ?mp=host:port (or a full wss:// URL).
// Protocol (keep in sync with ServerBase/VibeGTAPlugin/include/VibeGTAPlugin/NetState.hpp):
//   type 3   MSG_JOIN          "playerId|1"
//   type 8   MSG_JOIN_SUCCESS  u32 publicId (big-endian)
//   type 255 MSG_JOIN_ERROR    ascii message
//   type 19  MSG_GTA_STATE     u32 publicId LE, f32 x,y,z,yaw,pitch LE, u8 state   (25B)
//   type 20  MSG_GTA_TICK      u8 flags, u32 tickId LE, then sections:
//                                bit0: u32 count, states...                     (players)
//                                bit1: u32 count, 4B per edit (x,y,z,type)      (blocks)
//                                bit2: u32 count, u32 pub, u32 len, name...     (names)
//   type 21  MSG_GTA_BLOCK     u8 x, u8 y, u8 z, u8 type
//   type 22  MSG_GTA_BLOCK_SYNC u32 count LE, 4B per edit (join catch-up)
//   type 23  MSG_GTA_NAME      utf8 display name (set on join)
//
// state byte: bit0 = on ground, bit1 = sprinting
// All fields little-endian (server memcpys native LE structs).

import * as THREE from 'three';

const MSG_JOIN = 3;
const MSG_JOIN_SUCCESS = 8;
const MSG_JOIN_ERROR = 255;
const MSG_GTA_STATE = 19;
const MSG_GTA_TICK = 20;
const MSG_GTA_BLOCK = 21;
const MSG_GTA_BLOCK_SYNC = 22;
const MSG_GTA_NAME = 23;
const PROTOCOL_VERSION = 1;
const STATE_BYTES = 25;
const SEND_RATE = 30;
const MESH_REBUILD_MS = 150;     // throttle for remote block edits

const NAMES = [
  'Ace', 'Bree', 'Cass', 'Dex', 'Echo', 'Flint', 'Gus', 'Hollis',
  'Ivy', 'Jax', 'Kip', 'Luz', 'Marlo', 'Niko', 'Otto', 'Paz',
];
const SURNAMES = [
  'Vance', 'Reyes', 'Okafor', 'Novak', 'Tanaka', 'Berg', 'Kowalski', 'Duval',
];
const RANDOM_NAME = () =>
  `${NAMES[(Math.random() * NAMES.length) | 0]} ${SURNAMES[(Math.random() * SURNAMES.length) | 0]}`;

export function attachGta({ player, scene, url, applyRemoteBlock, rebuildAround }) {
  const wsUrl = /^wss?:\/\//i.test(url) ? url : `wss://${url}`;

  let ws = null;
  let publicId = 0;
  let reconnectDelay = 1000;
  let closedByUs = false;
  let worldDirty = false;
  let lastMeshRebuild = 0;
  const names = new Map();   // publicId -> display name (full roster per tick)
  const api = { onlineCount: 1 };

  /* ------------------------------ HUD ------------------------------ */
  const hud = document.createElement('div');
  hud.style.cssText = 'position:fixed;top:8px;left:8px;z-index:15;color:#9fd87a;' +
    'font-family:monospace;font-size:12px;pointer-events:none;text-shadow:0 0 4px #000;' +
    'white-space:pre;opacity:.85;';
  document.body.appendChild(hud);
  let statusText = 'VIBEGTA MP connecting…';
  const setStatus = s => { statusText = s; };
  setInterval(() => {
    hud.textContent = statusText + (ws && ws.readyState === 1 ? '' : '');
  }, 500);

  /* --------------------------- remote players ---------------------- */
  const remotes = new Map();   // publicId -> rig state

  function makeNameTag(text) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.font = 'bold 36px monospace';
    const w = Math.min(512, Math.ceil(ctx.measureText(text).width + 24));
    c.width = w;
    const ctx2 = c.getContext('2d');
    ctx2.font = 'bold 36px monospace';
    ctx2.textAlign = 'center';
    ctx2.textBaseline = 'middle';
    ctx2.fillStyle = 'rgba(0,0,0,.45)';
    ctx2.fillRect(0, 0, c.width, 64);
    ctx2.fillStyle = '#fff';
    ctx2.fillText(text, c.width / 2, 32);
    const tex = new THREE.CanvasTexture(c);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    spr.scale.set(1.4, 0.35, 1);
    return spr;
  }

  function makeRig(id, name) {
    const h = (id * 2654435761) % 997;
    const hue = (id * 137.508) % 360;
    const skin = new THREE.MeshLambertMaterial({
      color: new THREE.Color().setHSL(0.08, 0.45, 0.5 + (h % 20) / 100) });
    const shirt = new THREE.MeshLambertMaterial({
      color: new THREE.Color(`hsl(${hue}, 55%, ${40 + h % 25}%)`) });
    const pants = new THREE.MeshLambertMaterial({ color: new THREE.Color(`hsl(${hue}, 15%, 22%)`) });
    const hairM = new THREE.MeshLambertMaterial({
      color: new THREE.Color(`hsl(${(h * 13) % 360}, 30%, ${15 + h % 10}%)`) });

    const limb = (w, len, d, mat) => {
      const geo = new THREE.BoxGeometry(w, len, d);
      geo.translate(0, -len / 2, 0);
      const p = new THREE.Group();
      const m = new THREE.Mesh(geo, mat); m.castShadow = true;
      p.add(m);
      return p;
    };

    const g = new THREE.Group();
    const body = new THREE.Group();
    g.add(body);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.76, 0.32), shirt);
    torso.position.y = 1.28; torso.castShadow = true;
    body.add(torso);
    const head = new THREE.Group();
    head.position.y = 1.78;
    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skin);
    headMesh.castShadow = true;
    head.add(headMesh);
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.46), hairM);
    hair.position.y = 0.24; head.add(hair);
    body.add(head);
    const tag = makeNameTag(name || `Player ${id}`);
    tag.position.y = 2.25;
    body.add(tag);
    const legL = limb(0.2, 0.9, 0.24, pants); legL.position.set(0.15, 0.9, 0);
    const legR = limb(0.2, 0.9, 0.24, pants); legR.position.set(-0.15, 0.9, 0);
    const armL = limb(0.18, 0.66, 0.22, shirt); armL.position.set(0.38, 1.64, 0);
    const armR = limb(0.18, 0.66, 0.22, shirt); armR.position.set(-0.38, 1.64, 0);
    g.add(legL); g.add(legR); g.add(armL); g.add(armR);
    scene.add(g);
    return { group: g, body, head, legL, legR, armL, armR, tag };
  }

  function getRemote(id) {
    let r = remotes.get(id);
    if (!r) {
      r = {
        id, last: null, latest: null,
        phase: Math.random() * Math.PI * 2, speed: 0, air: 0,
        name: `Player ${id}`, rigKey: '',
        group: null, body: null, head: null,
        legL: null, legR: null, armL: null, armR: null,
      };
      remotes.set(id, r);
    }
    syncRig(r);
    return r;
  }

  function syncRig(r) {
    const key = r.name;
    if (r.rigKey === key && r.group) return;
    if (r.group) scene.remove(r.group);
    const rig = makeRig(r.id, r.name);
    r.group = rig.group; r.body = rig.body; r.head = rig.head;
    r.legL = rig.legL; r.legR = rig.legR; r.armL = rig.armL; r.armR = rig.armR;
    if (r.last) r.group.position.set(r.last.x, r.last.y, r.last.z);
    r.rigKey = key;
  }

  function displayNameOf(id) {
    if (id === publicId) return myName;
    return names.get(id) || `Player ${id}`;
  }

  function removeRemote(id) {
    const r = remotes.get(id);
    if (!r) return;
    scene.remove(r.group);
    remotes.delete(id);
  }

  // player section: [u32 count][states...] starting at off.
  function onSnapshot(buf, off) {
    const count = buf.getUint32(off, true);
    let p = off + 4;
    const seen = new Set();
    for (let i = 0; i < count; i++, p += STATE_BYTES) {
      const id = buf.getUint32(p, true);
      if (id === publicId) continue;   // ignore self
      seen.add(id);
      const x = buf.getFloat32(p + 4, true);
      const y = buf.getFloat32(p + 8, true);
      const z = buf.getFloat32(p + 12, true);
      const yaw = buf.getFloat32(p + 16, true);
      const pitch = buf.getFloat32(p + 20, true);
      const state = buf.getUint8(p + 24);
      const r = getRemote(id);
      r.name = displayNameOf(id);
      r.latest = { x, y, z, yaw, pitch, state };
      if (!r.last) r.last = { x, y, z, yaw };   // first sight: snap
    }
    for (const id of [...remotes.keys()]) if (!seen.has(id)) removeRemote(id);
    api.onlineCount = seen.size + 1;
    setStatus(`VIBEGTA MP ${wsUrl.replace('wss://', '')} · ${api.onlineCount} online`);
  }

  function lerpAngle(a, b, t) {
    let d = b - a;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return a + d * t;
  }

  /* --------------------------- block sections ---------------------- */
  function onBlockSection(buf, off) {
    const count = buf.getUint32(off, true);
    for (let i = 0; i < count; i++) {
      const p = off + 4 + i * 4;
      applyRemoteBlock(buf.getUint8(p), buf.getUint8(p + 1), buf.getUint8(p + 2), buf.getUint8(p + 3));
    }
    worldDirty = true;
  }
  function onNamesSection(buf, off) {
    for (const k of names.keys()) names.delete(k);   // section = full roster
    const count = buf.getUint32(off, true);
    let p = off + 4;
    for (let i = 0; i < count; i++) {
      const id = buf.getUint32(p, true);
      const len = buf.getUint32(p + 4, true);
      names.set(id, new TextDecoder().decode(new Uint8Array(buf.buffer, p + 8, len)));
      p += 8 + len;
    }
  }

  function onTick(buf) {
    const flags = buf.getUint8(1);
    let off = 6;   // [type][u8 flags][u32 tickId]
    if (flags & 1) { onSnapshot(buf, off); off += 4 + buf.getUint32(off, true) * STATE_BYTES; }
    if (flags & 2) { onBlockSection(buf, off); off += 4 + buf.getUint32(off, true) * 4; }
    if (flags & 4) { onNamesSection(buf, off); }
  }

  function onBlockSync(buf) {
    const count = buf.getUint32(1, true);
    for (let i = 0; i < count; i++) {
      const p = 5 + i * 4;
      applyRemoteBlock(buf.getUint8(p), buf.getUint8(p + 1), buf.getUint8(p + 2), buf.getUint8(p + 3));
    }
    if (count) {
      for (let i = 0; i < count; i++) {
        const p = 5 + i * 4;
        rebuildAround(buf.getUint8(p), buf.getUint8(p + 2));
      }
      worldDirty = false;
      lastMeshRebuild = performance.now();
    }
  }

  /* ----------------------------- networking ------------------------ */
  function buildStateMessage() {
    const buf = new ArrayBuffer(1 + STATE_BYTES);
    const dv = new DataView(buf);
    dv.setUint8(0, MSG_GTA_STATE);
    dv.setUint32(1, publicId, true);
    dv.setFloat32(5, player.pos.x, true);
    dv.setFloat32(9, player.pos.y, true);
    dv.setFloat32(13, player.pos.z, true);
    dv.setFloat32(17, player.yaw, true);
    dv.setFloat32(21, player.pitch, true);
    dv.setUint8(25, (player.onGround ? 1 : 0) | (player.sprinting ? 2 : 0));
    return buf;
  }

  function sendName() {
    if (!ws || ws.readyState !== 1) return;
    const bytes = new TextEncoder().encode(myName.slice(0, 24));
    const buf = new ArrayBuffer(1 + bytes.length);
    new Uint8Array(buf).set([MSG_GTA_NAME, ...bytes]);
    ws.send(buf);
  }

  function blockEdit(x, y, z, type) {
    if (!ws || ws.readyState !== 1) return;
    const buf = new ArrayBuffer(5);
    const dv = new DataView(buf);
    dv.setUint8(0, MSG_GTA_BLOCK);
    dv.setUint8(1, x); dv.setUint8(2, y); dv.setUint8(3, z); dv.setUint8(4, type);
    ws.send(buf);
  }

  // Per-TAB identity: two tabs in the same browser are two players.
  const remoteId = crypto.randomUUID
    ? crypto.randomUUID()
    : `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const myName = (localStorage.getItem('vgName') || '').slice(0, 24) || RANDOM_NAME();

  function onBinary(data) {
    const buf = new DataView(data.buffer);
    const type = buf.getUint8(0);
    if (type === MSG_JOIN_SUCCESS) {
      publicId = buf.getUint32(1, false);   // big-endian per JoinResponse
      sendTimer = setInterval(() => {
        const now = performance.now();
        sendState();
        if (worldDirty && now - lastMeshRebuild > MESH_REBUILD_MS) {
          // edits were applied into the grid already; remesh affected chunks
          pendingRebuilds.forEach(([x, z]) => rebuildAround(x, z));
          pendingRebuilds.clear();
          worldDirty = false;
          lastMeshRebuild = now;
        }
      }, 1000 / SEND_RATE);
      setStatus(`VIBEGTA MP connected as ${myName}`);
      sendName();
    } else if (type === MSG_JOIN_ERROR) {
      const msg = new TextDecoder().decode(new Uint8Array(data.buffer, 1));
      setStatus(`MP join failed: ${msg}`);
      ws.close();
    } else if (type === MSG_GTA_TICK) {
      onTick(buf);
    } else if (type === MSG_GTA_BLOCK_SYNC) {
      onBlockSync(buf);
    }
  }

  // queued remote edits awaiting a throttled remesh: "x,z" set (deduped)
  const pendingRebuilds = new Map();

  function sendState() {
    if (!ws || ws.readyState !== 1) return;
    const now = performance.now();
    if (now - lastSent < 1000 / SEND_RATE - 2) return;
    lastSent = now;
    ws.send(buildStateMessage());
  }

  let sendTimer = 0;
  let lastSent = 0;

  // wrap applyRemoteBlock so remote edits queue a remesh
  const baseApply = applyRemoteBlock;
  applyRemoteBlock = (x, y, z, t) => {
    baseApply(x, y, z, t);
    pendingRebuilds.set(`${x},${z}`, [x, z]);
  };

  function connect() {
    ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';
    ws.onopen = () => {
      const payload = new TextEncoder().encode(`${remoteId}|${PROTOCOL_VERSION}`);
      ws.send(new Uint8Array([MSG_JOIN, ...payload]));
    };
    ws.onmessage = e => onBinary(new Uint8Array(e.data));
    ws.onclose = () => {
      clearInterval(sendTimer);
      if (closedByUs) return;
      setStatus('MP disconnected — reconnecting…');
      setTimeout(connect, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 1.6, 10000);
    };
    ws.onerror = () => {};
  }

  /* ------------------------------- main loop ------------------------- */
  let last = performance.now();
  (function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    for (const r of remotes.values()) {
      if (!r.latest) continue;
      syncRig(r);
      const l = r.last, t = r.latest;
      const k = 1 - Math.exp(-10 * dt);
      const moved = Math.hypot(t.x - l.x, t.z - l.z);
      l.x += (t.x - l.x) * k; l.y += (t.y - l.y) * k; l.z += (t.z - l.z) * k;
      l.yaw = lerpAngle(l.yaw, t.yaw, k);
      r.group.position.set(l.x, l.y, l.z);
      // face movement direction (clamped), like the local player
      const fwd = l.yaw + Math.PI;
      const mdir = moved > 0.5
        ? Math.atan2(t.x - l.x, t.z - l.z)
        : fwd;
      let rel = mdir - fwd;
      rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      if (rel > 2.1) rel = 2.1; else if (rel < -2.1) rel = -2.1;
      r.group.rotation.y = lerpAngle(r.group.rotation.y, fwd + rel, 1 - Math.exp(-10 * dt));

      // walk cycle
      r.speed += (moved / Math.max(dt, 1e-3) - r.speed) * (1 - Math.exp(-6 * dt));
      r.air += ((t.state & 1 ? 0 : 1) - r.air) * (1 - Math.exp(-12 * dt));
      r.phase += r.speed * dt * 5;
      const walk = Math.min(1, r.speed / 4);
      const air = r.air;
      const swing = Math.sin(r.phase);
      r.legL.rotation.x = swing * 0.85 * walk * (1 - air) - air * 0.6;
      r.legR.rotation.x = -swing * 0.85 * walk * (1 - air) - air * 0.3;
      r.armL.rotation.x = -swing * 0.6 * walk * (1 - air) - air * 0.8;
      r.armR.rotation.x = swing * 0.6 * walk * (1 - air) - air * 0.8;
      r.body.position.y = Math.abs(Math.sin(r.phase * 2)) * 0.035 * walk;
    }
  })(last);

  connect();
  window.addEventListener('beforeunload', () => { closedByUs = true; ws && ws.close(); });

  return {
    blockEdit,
    get onlineCount() { return api.onlineCount; },
    disconnect() { closedByUs = true; ws && ws.close(); },
  };
}
