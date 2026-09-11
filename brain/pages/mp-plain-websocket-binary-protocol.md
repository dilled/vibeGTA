---
id: mp-plain-websocket-binary-protocol
title: "Multiplayer = raw WebSocket, hand-rolled LE binary protocol, server is sibling project ServerBase/VibeGTAPlugin"
category: decision
status: active
tags: [multiplayer, mp, networking]
created: "2026-09-11T16:52:32"
updated: "2026-09-11T22:22:08"
---

<!-- compiled_truth -->
## What is decided

Multiplayer client = raw WebSocket (lib/gta.js, imported only with ?mp=host:port) speaking a hand-rolled little-endian binary protocol at PROTOCOL_VERSION=2. The server (sibling project ServerBase/VibeGTAPlugin) is the **master of the shared state**: it holds a C++ port of the deterministic world grid (GtaWorld, byte-identical to the JS generator) and validates every client message — only "break to AIR" edits on destructible cells are applied (roads/sidewalks survive, placement impossible); rejected edits come back to the offending client in the MSG_GTA_TICK rejections section (flags bit 3) and the client rolls the block back; player states are sanity-checked (world bounds, 100 m/s cap) and invalid ones are dropped (last accepted state keeps relaying).

Wire: MSG_JOIN=3 / JOIN_SUCCESS=8 / JOIN_ERROR=255, GTA_STATE=19 (25B), GTA_TICK=20 (sections in order: players, blocks, names, rejections), GTA_BLOCK=21, GTA_BLOCK_SYNC=22 (join catch-up), GTA_NAME=23.

## Alternatives

- libp2p/WebRTC mesh, or a JS server (ws + colyseus) → dependencies or a second runtime.
- JSON over WebSocket → bigger messages, no fixed struct layout.
- Pure dumb relay (the original design) → clients fully authoritative; no way to stop a client from breaking roads or placing blocks.

## Rationale

Presence at ~30 Hz plus shared destruction only need tiny fixed-size messages — a C++ plugin fits with zero client-side dependencies. Master validation of destruction + presence keeps the world coherent without a server-side physics simulation (the game logic stays client-side; the server owns the shared state only).

## Blast radius

- Protocol constants must stay in sync manually with ServerBase/VibeGTAPlugin/include/.../NetState.hpp (no codegen).
- GtaWorld (C++) must stay byte-identical to the JS generator in index.html — enforced by tests (fixed cells) + GtaWorldDump vs node dump.
- Per-tab identity (crypto.randomUUID): fresh player per tab even in the same browser.
- Rejected edits are targeted: only the offending client rolls back.
- After a server update, old tabs must hard-refresh (edits stop syncing otherwise).


## Timeline

- time: 2026-09-11T16:52:32
  kind: decision
  summary: "Created this page: Multiplayer = raw WebSocket, hand-rolled LE binary protocol, server is sibling project ServerBase/VibeGTAPlugin"
  source: "lib/gta.js, README.md, git log"
  affects: [mp-plain-websocket-binary-protocol]

- time: 2026-09-11T16:52:32
  kind: decision
  summary: captured from project history
  source: "lib/gta.js, README.md"
  affects: [mp-plain-websocket-binary-protocol]

- time: 2026-09-11T22:22:08
  kind: decision
  summary: "Server upgraded from dumb relay to master of shared state: authoritative world grid (C++ port of the deterministic generator), edit validation with per-client rollback, presence sanity checks; protocol v2"
  source: "feat/server-authoritative: ServerBase VibeGTAPlugin GtaWorld/GtaModule, vibeGTA lib/gta.js"
  affects: [mp-plain-websocket-binary-protocol]
