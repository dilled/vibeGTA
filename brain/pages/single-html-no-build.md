---
id: single-html-no-build
title: "Single HTML file, vendored three.js, no build step"
category: decision
status: active
tags: [architecture, build]
created: "2026-09-11T16:52:31"
updated: "2026-09-11T16:52:32"
---

<!-- compiled_truth -->
## What was decided

All game code lives in ONE inline <script type="module"> in index.html (~2000 lines). three.js v0.158 is vendored in lib/three.module.js (51k lines, unmodified). No package manager, no bundler, no CDN, no external assets — the repo runs from a plain static server.

## Alternatives

- Vite/webpack + npm three → build step, node_modules.
- CDN <script> tag → needs internet, version drift.

## Rationale

Zero infrastructure: serve the directory and play; offline-capable; and the headless smoke test ([[headless-smoke-test-stubbed-three]]) can evaluate the *real* module straight out of index.html.

## Blast radius

- The file is a monolith — every feature (world, physics, vehicles, police, MP glue) is in one module scope.
- Must be served over http(s): module scripts + import maps don't load from file://.
- Adding any dependency must keep the "vendored in lib/" rule to stay offline.


## Timeline

- time: 2026-09-11T16:52:31
  kind: decision
  summary: "Created this page: Single HTML file, vendored three.js, no build step"
  source: "README.md, code, git log"
  affects: [single-html-no-build]

- time: 2026-09-11T16:52:32
  kind: decision
  summary: captured from project history
  source: "README.md, index.html, git log"
  affects: [single-html-no-build]
