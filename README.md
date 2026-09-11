# VibeGTA

A tiny GTA-style voxel city in a single HTML file. Steal cars (and helicopters),
run over pedestrians, run from the police — and smash the whole city to pieces.
Three.js (v0.158) is vendored in `lib/` — no build step, no internet needed.

## Testing

See [TESTING.md](TESTING.md) for the headless smoke test and the manual test
checklist (walking, driving, carjacking, police pursuit, helicopters).

## Run

```sh
npx serve .        # or: python3 -m http.server
# open http://localhost:PORT
```

Module scripts and import maps don't load from `file://` — a local server is
required (double-clicking `index.html` will not work).

## Multiplayer (presence + shared world)

Open the page with `?mp=host:port` pointed at the VibeGTA plugin
(`ServerBase/VibeGTAPlugin`):

```sh
# terminal 1 — server (from the ServerBase build dir; self-signed cert, accept the warning)
cd ../ServerBase/build-linux/VibeGTAPlugin && ./VibeGTAPlugin
# terminal 2+ — players (same machine or LAN)
# open http://localhost:PORT/?mp=localhost:PORT in each tab
```

The world is generated deterministically (seeded LCG), so every client builds
the same city without transmitting it. Over the wire:

- **Presence:** other players appear as name-tagged characters at ~30 Hz,
  position/aim interpolated. Each tab gets its own random identity
  (fresh player per tab, even in the same browser).
- **Shared destruction:** block breaks are relayed to everyone (reliable over
  TCP), and a tab that joins late receives the full edit history, so every
  tab converges on the same hole-riddled skyline.

The server is the **master** of the shared state: it holds the same
deterministic world grid and validates everything clients send — only
"break to air" edits on destructible blocks are applied (roads and
sidewalks survive), placement is impossible, and player states that
imply super-speed or leave the world are dropped. A rejected block edit
comes back in the next tick and the client rolls the block back.

**Hard-refresh after a server update** (Ctrl+Shift+R): an old tab still sees
the other players, but its block edits are no longer synced.

## Controls

On foot:

| Key | Action |
|-----|--------|
| WASD | move |
| Mouse | look (down = look down) |
| Shift | sprint |
| Space | jump |
| Left click | break block (roads/sidewalks are indestructible) |
| E | near a car: throw the driver out, then steal it |
| Esc | pause / release mouse |

In a car:

| Key | Action |
|-----|--------|
| W/S | drive / brake+reverse |
| A/D | steer (A = left) |
| Shift | boost |
| Space | handbrake |
| E | throw driver out / steal, or get out |

In a helicopter:

| Key | Action |
|-----|--------|
| W/S | ascend / descend |
| A/D | turn |
| Shift | fly forward |
| Space | brake |
| E | throw the pilot out / steal, or get out (in the air: you get flung) |

## Gamepad

Any XInput / DualShock / DualSense works — plug it in and press a button, the
pad activates itself (the game polls `navigator.getGamepads()` every frame
and merges its output into the same input map as the keyboard):

| Button | On foot | In a car | In a heli |
|--------|---------|----------|-----------|
| Left stick | move (also steers) | drive / steer | turn + up/down |
| Right stick | look | steer | (camera is fixed) |
| A / Cross | jump (hold = auto-hop) | gas | fly forward |
| B / Circle | — | brake / reverse | brake |
| X / Square | in/out of vehicle (= E) | in/out | in/out |
| Y / Triangle | break targeted block | — | — |
| L1 / LB | sprint | handbrake | — |
| R1 / RB | — | boost | — |
| D-pad | move | — | — |
| Select / Start | pause (see below) | | |

The keyboard always wins a key the gamepad is faking — hold W on the
keyboard and the stick can't clear it. Unplugging a pad clears its keys.
Note: **Start only pauses** — browsers won't let a polled gamepad grab
pointer-lock, so starting/unpausing still needs a click on the overlay.

## Features

- Procedural 256×256 voxel city (seeded LCG): blocks, roads, sidewalks, lots,
  buildings with windows — all destructible except the street grid
- First/third-person on-foot controls with AABB physics, sprint, jump
- Block breaking with raycast + highlight, falling-block debris
- Traffic: AI cars with reckless drivers (yield to you, hit pedestrians),
  respawn up to 24 cars
- GTA1-style carjacking: E throws the seated driver out as a ragdoll, E again
  steals the car with its momentum; cars coast and park when abandoned
- Pedestrians: wander sidewalks, hop between blocks, cross roads — and get
  flung if a car (yours or an AI one) runs them over (+1 wanted)
- Police: 3-cop beat, classic livery with flashing light bar. Wanted stars
  (0–3) from run-overs, carjackings and ramming cops; decay after 20 s clean.
  Pursuit: ram-driven / corner-on-foot, BUSTED eject, impound, then the cops
  reposition and reset
- Helicopters: two choppers on helipads, spinning rotors, visible pilots.
  Fly (W/S up-down, A/D turn, Shift forward), collide with buildings at
  altitude, land on streets/lots/**rooftops**, hard-landing debris, airborne
  ejections, pilotless choppers glide down and settle where they stop
- Day/night cycle (sun/moon, sky & fog color) and random rain weather
- Ragdoll physics for ejected drivers, flung pedestrians and busted players
- Headless smoke test (`smoke/`) runs the real game module in Node with
  stubbed three.js/DOM, including a scripted helicopter steal/fly/exit flow
