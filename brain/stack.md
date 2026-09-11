---
slug: stack
title: Tech stack
role: tech-stack choices
updated: "2026-09-11T16:51:31"
---

# Tech stack

| Domain | Choice | Rationale |
|--------|--------|-----------|
| Rendering | three.js **v0.158**, vendored in `lib/three.module.js` | the only dependency; vendored so no CDN/internet needed at runtime — see [[single-html-no-build]] |
| Language | Vanilla JS, ES modules, single inline module in `index.html` | zero build tooling; the smoke test can evaluate the real module directly |
| World data | `Uint8Array` grid 256×256×48 + 16×16 chunk mesher, 128px texture atlas | flat array = trivially deterministic + cheap remesh of one chunk per block edit |
| Physics | Hand-rolled AABB voxel collision, arcade car/heli motion, impulse ragdolls | no physics engine fits a voxel world; keep the code readable |
| RNG | Seeded LCG (`_s*1103515245+12345 & 0x7fffffff`) | deterministic world for MP convergence — see [[deterministic-seeded-world]] |
| Networking | Raw `WebSocket`, hand-rolled little-endian binary protocol, `DataView` | no networking library; tiny fixed-size messages; must match C++ server `NetState.hpp` |
| Server | `ServerBase/VibeGTAPlugin` (sibling project, C++) | out of repo on purpose; this repo is the client/game |
| Testing | Plain Node (`smoke/run.mjs`) + manual browser checklist (`TESTING.md`) | no test framework — see [[headless-smoke-test-stubbed-three]] |
| Input | Keyboard + `navigator.getGamepads()` polled per frame, merged into one keys map | see [[gamepad-merged-into-keys]] |
