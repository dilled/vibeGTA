---
id: headless-smoke-test-stubbed-three
title: Headless Node smoke test runs the real game module with stubbed three.js/DOM
category: decision
status: active
tags: [testing]
created: "2026-09-11T16:52:32"
updated: "2026-09-11T16:52:32"
---

<!-- compiled_truth -->
## What was decided

Testing = node smoke/run.mjs: it loads the real <script type="module"> from index.html in Node with stubbed three.js/DOM (smoke/three-stub.mjs), pumps 10 frames, then runs a scripted helicopter flow (find heli → eject pilot → steal → fly → airborne exit → ragdoll landing → re-steal → ground exit). No test framework, no browser. A manual browser checklist (TESTING.md) covers rendering/feel.

## Alternatives

- Vitest/Jest + jsdom, Playwright/Puppeteer e2e → build tooling or heavy deps, violating [[single-html-no-build]].
- No automated test at all.

## Rationale

Catches runtime errors in hot paths that node --check misses — three shipped bugs were caught this way (B-undefined in updatePeds, v-undefined on car-driver eject, inverted steering/pitch). Zero-infra rule preserved.

## Blast radius

- Stub fidelity limits coverage: rendering, physics feel, and gameplay are manual-only.
- New regression fixes should extend the scripted smoke flow (see TESTING.md regression notes).


## Timeline

- time: 2026-09-11T16:52:32
  kind: decision
  summary: "Created this page: Headless Node smoke test runs the real game module with stubbed three.js/DOM"
  source: "git log 6bc0a35, smoke/, TESTING.md"
  affects: [headless-smoke-test-stubbed-three]

- time: 2026-09-11T16:52:32
  kind: decision
  summary: captured from project history
  source: "git log 6bc0a35, TESTING.md"
  affects: [headless-smoke-test-stubbed-three]
