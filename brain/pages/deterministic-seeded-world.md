---
id: deterministic-seeded-world
title: "World generated deterministically (seeded LCG) so MP clients converge without transmitting geometry"
category: decision
status: active
tags: [world, multiplayer, mp]
created: "2026-09-11T16:52:32"
updated: "2026-09-11T16:52:32"
---

<!-- compiled_truth -->
## What was decided

generateWorld() uses a fixed seeded LCG (_s = 987654321 ^ 1337) so every client builds an identical 256×256 voxel city. The world geometry is never transmitted; only *diffs* (block edits) go over the wire, and a late joiner receives the full edit history (MSG_GTA_BLOCK_SYNC) and converges.

## Alternatives

- Server transmits the generated world on join (bandwidth, needs storage).
- Per-client random world (no shared destruction possible).

## Rationale

Makes shared destruction cheap and self-healing: reliable TCP relay of 4-byte edits + join catch-up is all the network layer needs ([[mp-plain-websocket-binary-protocol]]).

## Blast radius

- Anything gameplay-needs-at-a-position must be derivable from the seed or relayed as a message.
- Changing world-gen code breaks cross-version convergence until all clients update together (hard-refresh rule in README).


## Timeline

- time: 2026-09-11T16:52:32
  kind: decision
  summary: "Created this page: World generated deterministically (seeded LCG) so MP clients converge without transmitting geometry"
  source: "index.html generateWorld(), README.md, git log 54768e5"
  affects: [deterministic-seeded-world]

- time: 2026-09-11T16:52:32
  kind: decision
  summary: captured from project history
  source: "index.html, README.md"
  affects: [deterministic-seeded-world]
