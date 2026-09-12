---
id: server-authoritative-traffic
title: "Server is master of all traffic: cars, peds, helis, police (protocol v3)"
category: decision
status: active
tags: [multiplayer, networking, server-authoritative]
created: "2026-09-12T16:02:40"
updated: "2026-09-12T16:03:32"
---

<!-- compiled_truth -->
## What is decided

The server is the master of ALL shared game state, not just presence + block edits: traffic cars, pedestrians, police cars, and helicopters are simulated on the server (C++ port of the client AI, fixed 30 Hz tick) and broadcast as snapshots; clients only own their own player and, while driving, the vehicle they control.

Protocol v3 (GTA_TICK new tick sections: vehicles 28B each, peds 20B each, global events 22B each, per-client events 12B each; GtaPlayerState grows 25B → 28B with vehicleId + wanted; new MSG_GTA_VEH=24 client→server vehicle state 28B and MSG_GTA_WORLD_SYNC=25 join roster). Vehicle control handoff is implicit: a client putting vehicleId in its player state requests control, the server validates (distance, not police, not already driven) and the server-assigned driver in the vehicles section is the truth — a client sees a different driver and force-exits.

Crimes, wanted level, busts and ped flings are server-derived from its own state (car speed × ped proximity, ramming, carjacking), so every client sees the same consequences. Ped fling / driver eject / vehicle destroyed are global events; the bust itself is a per-client event (like block rejections).

## Alternatives

- Keep per-client AI (status quo) → worlds diverge (a car destroyed by one player survives for everyone else; peds flung on one tab walk on another).
- Lockstep determinism (share RNG seed, step in sync) → variable client dt makes convergence fragile; no tolerance for one slow tab.

## Rationale

Same pattern as the existing authoritative world grid (GtaWorld): server owns a C++ port of the sim and only relays what it applied. The traffic AI is pure math over the 5×5 road grid (already known to the server), so the port is self-contained. Snapshots + client lerp keep bandwidth tiny (~30 KB/s per client).

## Blast radius

- Protocol v3: PROTOCOL_VERSION=3, hard-refresh required on clients after a server update (existing rule).
- Server RNG is server-owned (not the client LCG): entity IDs are assigned by the server and handed out in MSG_GTA_WORLD_SYNC.
- In MP mode the client must not spawn/simulate its own AI cars/peds/police — it renders the server roster. Singleplayer keeps the local sim unchanged.


## Timeline

- time: 2026-09-12T16:02:40
  kind: decision
  summary: "Created this page: Server is master of all traffic: cars, peds, helis, police (protocol v3)"
  source: created via brain create-page
  affects: [server-authoritative-traffic]

- time: 2026-09-12T16:03:32
  kind: decision
  summary: Rewrote compiled_truth to the new best understanding
  source: brain update-truth
  affects: [server-authoritative-traffic]
