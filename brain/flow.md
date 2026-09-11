---
slug: flow
title: Key flows
role: key flows
updated: "2026-09-11T16:51:31"
---

# Key flows

## Solo play — typical session

1. Serve the directory (`npx serve .` / `python3 -m http.server`) — **required**, `file://` won't load module scripts.
2. Page loads → `generateWorld()` builds the city (seeded LCG), spawns cars/peds/helis, start overlay shown.
3. Click overlay → pointer lock, `playing = true`.
4. Main loop (`loop`, rAF, dt clamped 0.05 s): `pollGamepad` → driving ? `updateDriving` : `updatePlayer` (+hold-break) → wanted decay / cop retreat → `updateEjected` → traffic/ped respawn timers → `updatePeds`/`updateCars`/`updateEnvironment`/`updateDebris`/`updateHud` → `renderer.render`.
5. Block breaking: left click → `aimTarget()` raycast → `breakBlock()` → `localBlockEdit` → `rebuildAround` remeshes the chunk (MP: also relayed, below).

## Multiplayer — join & shared destruction

```mermaid
sequenceDiagram
  participant P as tab (index.html module)
  participant G as lib/gta.js attachGta()
  participant S as VibeGTAPlugin server (C++)
  participant Q as other / late-joining tabs
  P->>G: ?mp=host:port present → dynamic import
  G->>S: MSG_JOIN "remoteId|1" (per-tab identity, crypto.randomUUID)
  S-->>G: MSG_JOIN_SUCCESS (u32 publicId)
  G->>S: MSG_GTA_STATE @ ~30 Hz (25B: pos/yaw/pitch/state)
  S-->>G: MSG_GTA_TICK (players / blocks / names sections)
  P->>P: breakBlock() → localBlockEdit()
  P->>G: blockEdit(x,y,z,type)
  G->>S: MSG_GTA_BLOCK (5B)
  S->>S: appends to edit history + relays
  S-->>Q: block section in MSG_GTA_TICK
  Q->>Q: applyRemoteBlock → setB → throttled rebuildAround (150 ms)
  S-->>Q: late joiner gets MSG_GTA_BLOCK_SYNC (full edit history)
```

State byte: bit0 on-ground, bit1 sprinting. Remote players are name-tagged rigs, positions exponential-smoothed, walk cycle synthesized from movement.
