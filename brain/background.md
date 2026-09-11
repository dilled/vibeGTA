---
slug: background
title: Project background
role: project background
updated: "2026-09-11T16:51:31"
---

# Project background

## Why

VibeGTA is a "vibe" project (same family as vibeCraft, referenced in README/TESTING): a tiny GTA-style voxel city that steals cars and helicopters, runs over pedestrians, outruns the police — and lets you smash the whole city to pieces.

> **Low-confidence / needs confirmation:** the repo doesn't state the original motivation (GTA homage, voxel-playtech playground, or MP netcode experiment). Git history shows feature-driven solo development with no stated goals.

## Goals

- **Zero-infrastructure:** one HTML file + vendored three.js, no build step, no internet — serve the directory and play ([[single-html-no-build]]).
- **A full GTA-style loop in one file:** walking → carjacking → traffic → wanted stars → pursuit/BUSTED → helicopters → shared destruction over multiplayer.
- **Testable headless:** the real game module runs under Node ([[headless-smoke-test-stubbed-three]]).

## Non-goals

- No build tooling, package manager, or external assets/CDN.
- No authoritative/lockstep simulation — multiplayer is presence + block-edit relay, not a shared realtime sim.
- Not a product: no accounts, matchmaking, or persistence.

## Target users

The author in a browser; optionally LAN friends via `?mp=host:port`.

> **Low-confidence / needs confirmation:** audience assumed from the MP feature; no stated user beyond the author.
