---
id: mp-plain-websocket-binary-protocol
title: "Multiplayer = raw WebSocket, hand-rolled LE binary protocol, server is sibling project ServerBase/VibeGTAPlugin"
category: decision
status: active
tags: [multiplayer, mp, networking]
created: "2026-09-11T16:52:32"
updated: "2026-09-11T16:52:32"
---

<!-- compiled_truth -->
## What was decided

Multiplayer is a raw WebSocket client (lib/gta.js, dynamically imported only when ?mp=host:port) speaking a hand-rolled little-endian binary protocol: MSG_JOIN=3 / JOIN_SUCCESS=8 / JOIN_ERROR=255 / GTA_STATE=19 (25B) / GTA_TICK=20 (flagged players/blocks/names sections) / GTA_BLOCK=21 / GTA_BLOCK_SYNC=22 (join catch-up) / GTA_NAME=23. The server is C++ in the sibling project ServerBase/VibeGTAPlugin — deliberately outside this repo.

## Alternatives

- libp2p/WebRTC mesh, or a JS server (ws + colyseus) → dependencies or a second runtime in the project.
- JSON over WebSocket → bigger messages, no fixed struct layout.

## Rationale

Presence at ~30 Hz and shared destruction ([[deterministic-seeded-world]]) only need tiny fixed-size messages and a dumb relay — a C++ plugin fits with zero client-side dependencies.

## Blast radius

- Protocol constants must stay in sync with ServerBase/VibeGTAPlugin/include/…/NetState.hpp (no codegen, manual sync).
- Per-tab identity (crypto.randomUUID): fresh player per tab even in the same browser.
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
