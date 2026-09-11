---
id: gamepad-merged-into-keys
title: Gamepad input merged into the same synthetic keys map the keyboard uses
category: decision
status: active
tags: [input, gamepad]
created: "2026-09-11T16:52:32"
updated: "2026-09-11T16:52:32"
---

<!-- compiled_truth -->
## What was decided

pollGamepad() polls navigator.getGamepads() every frame and translates controller output into the same synthetic key codes (PAD_CODES + virtual KeyA/KeyE etc.) the keyboard path uses. Keyboard always wins a synthetic key; unplugging clears the pad's keys. A/X/Y/L1/R1/d-pad map per mode (on foot / car / heli); doInteract() was extracted so E and X share one code path.

## Alternatives

- Separate input abstraction (InputAxis abstractions, per-mode remaps).
- Pointer-lock gamepad events (browsers don't support grabbing pointer-lock from a polled pad).

## Rationale

Zero changes to all walk/drive/fly logic — one input surface; any XInput/DualShock/DualSense works with no setup (pad activates itself on button press).

## Blast radius

- Start only pauses: browsers won't let a polled gamepad grab pointer-lock, so resuming always needs a click on the overlay.
- Gamepad can't clear a key held on the keyboard (by design).


## Timeline

- time: 2026-09-11T16:52:32
  kind: decision
  summary: "Created this page: Gamepad input merged into the same synthetic keys map the keyboard uses"
  source: "git log ce286a5, index.html pollGamepad()"
  affects: [gamepad-merged-into-keys]

- time: 2026-09-11T16:52:32
  kind: decision
  summary: captured from project history
  source: git log ce286a5
  affects: [gamepad-merged-into-keys]
