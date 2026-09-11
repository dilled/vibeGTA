# Testing VibeGTA

VibeGTA is a single-file browser game (no build step, no test framework).
Testing is a **headless smoke test** (`node smoke/run.mjs`) plus a **manual
browser checklist** below.

## 1. Start the game

A local server is required (module scripts + import maps don't load from
`file://`).

```sh
cd vibeGTA
npx serve .          # or: python3 -m http.server
```

Open the printed URL (e.g. `http://localhost:3000`) in a recent Chrome/Edge/
Firefox.

**Expected:** start overlay ("a voxel city that breaks"); clicking it hides
the overlay and locks the pointer. City: a grid of roads, sidewalks,
parking-lot blocks and glassy buildings; a few cars already driving.

## 2. Headless smoke test (run after every code change)

```sh
node smoke/run.mjs
# → SMOKE_OK — module evaluated, heli flow + 10 frames clean
```

It loads the real `<script type="module">` from `index.html` in Node with
stubbed three.js/DOM (`smoke/three-stub.mjs`), pumps frames, then exercises
the helicopter flow in module scope: find heli → eject pilot → steal → fly
(W+Shift) → airborne exit → ragdoll landing → pilotless heli lands →
re-steal → ground exit.

It catches **runtime** errors that `node --check` can't (undefined variables
in hot paths — see regression notes: three shipped bugs were caught this
way). It does **not** catch rendering, physics feel or gameplay bugs — do
those manually.

## 3. Manual test checklist

### Rendering & the city
- [ ] City generated: road grid, sidewalks, lots, buildings with windows;
      cars and pedestrians already moving; no console errors on load
- [ ] No Z-fighting / flickering textures
- [ ] Day/night cycle visible over a few minutes (sun/moon, sky & fog shift)
- [ ] Rain weather arrives/departs smoothly (rain streaks, darker sky)

### Walking & mouse
- [ ] WASD moves relative to view; Shift sprints; Space jumps; you land
      (no falling through the world)
- [ ] **Mouse: right = look right, down = look down** (the pitch was
      inverted once — verify both axes)
- [ ] Left click breaks the highlighted block (roads/sidewalks don't break)
- [ ] Walk into a building: you collide, you don't clip through
- [ ] No jitter or teleporting at block boundaries or world edges

### Carjacking & driving (GTA1 style)
- [ ] Near a car with a driver: hint says "E — throw the driver out"; press
      E → driver ragdolls out, car keeps rolling and parks
- [ ] E again → you're in the driver seat, **car keeps its momentum**
- [ ] **Steering: A = left, D = right** (was inverted once); S brakes and
      reverses (steering flips correctly while reversing)
- [ ] Shift boosts; Space handbrakes (car slides)
- [ ] Hitting a wall at speed: car stops/decelerates, debris flies
- [ ] AI cars yield to your moving/parked car; traffic respawns up to 24
- [ ] Abandoned cars coast to a stop and can be re-stolen
- [ ] Pedestrians cross roads and get **flung** by cars (yours or AI);
      run-over adds a wanted star

### Wanted & police
- [ ] Crimes add stars (run-over +1, carjack +1, ramming a cop at speed +1);
      stars decay ~20 s apart when clean
- [ ] With wanted > 0: a patrol cop chases — livery lights flash red/blue
      alternately
- [ ] **Driving:** cop rams you at speed → BUSTED: red flash, you eject as a
      ragdoll, car is impounded (gone), stars cleared
- [ ] **On foot:** cop stops within arm's reach and holds ~1.5 s → BUSTED
- [ ] After bust / star decay: cops reposition to intersections, no more
      chasing; light bar stops flashing

### Helicopters
- [ ] Two choppers sit on **H-pads** (yellow ring + H on asphalt) with
      slowly idling rotors; pilots visible through the cabin glass
- [ ] E → pilot flies out as an aerial ragdoll (+1 wanted); E again → you're
      the pilot, rotors spin up
- [ ] W/S ascend/descend; A/D turn; Shift flies forward; Space brakes
- [ ] Flying into a building bounces you off with debris; flying over
      buildings at altitude does **not** clip them
- [ ] You can land on streets, lots **and rooftops** (ground query sees roofs)
- [ ] Hard landing kicks up dust; flying over pedestrians at low altitude
      flings them
- [ ] **Airborne exit (E):** you get flung out with momentum, tumble down,
      controls return on landing
- [ ] Pilotless heli glides forward and **settles where it stops** — it must
      not freeze in mid-air
- [ ] Busted while flying: the chopper flies off and lands on its own
      (not impounded); you fall out

### Gamepad (any XInput / DualShock / DualSense)
- [ ] Plug in a controller and press any button — it activates itself
- [ ] On foot: left stick moves (both axes), right stick looks
      (right = look right, up = look up — not inverted)
- [ ] A jumps (held = auto-hop); L1 sprints
- [ ] X behaves exactly like E (throw driver out → steal → get out);
      Y breaks the highlighted block
- [ ] Car: A gas, B brake/reverse, right stick steers (A-key-left rule
      still holds), L1 handbrake, R1 boost
- [ ] Heli: left stick up/down & turn, A forward, B brake, X pilot out /
      get out
- [ ] Keyboard + pad together: hold W on the keyboard, move the stick —
      the stick must not kill the keyboard's W; releasing both stops you
- [ ] Unplug the pad while using it — controls release, nothing sticks
- [ ] Start pauses (overlay returns); resume needs a click (browser security
      — a polled pad can't grab pointer-lock)

### HUD & UI
- [ ] Wanted stars (★, gold) appear/clear correctly
- [ ] Hint bar: context-sensitive (steal/throw-driver, car controls,
      heli controls)
- [ ] "BUSTED" big red text flashes for ~2 s
- [ ] Esc pauses / releases mouse; overlay returns; game resumes on click

### Multiplayer (`?mp=host:port`, VibeGTAPlugin server)
**Hard-refresh (Ctrl+Shift+R) both tabs** so both run the current protocol.

- [ ] Both tabs show the same city (deterministic world gen — no world
      download needed)
- [ ] Your character appears in the other tab with a name tag, ~30 Hz,
      interpolated (no teleporting between updates)
- [ ] Two tabs in the **same browser** show two different players
      (per-tab identity)
- [ ] **Shared destruction:** break a block in one tab → the other tab
      sees the same block removed within ~0.5 s
- [ ] **Master rollback:** try to break a road/sidewalk block → it pops
      back into place in your own tab within one tick (server rejected it),
      no console errors
- [ ] Rejection is targeted: the *other* tabs never see your rejected
      edit in their block stream
- [ ] **Late joiner:** a third tab joins → it has the same breaks the first
      two made
- [ ] Kill the server → reconnection; restart → session restores
- [ ] Single-player mode (no `?mp=`) is completely unaffected

### Console & performance (continuous)
- [ ] Console stays clean (no errors/warnings) during the whole session
- [ ] FPS stays stable while walking, driving at speed, and after many
      block breaks and ragdolls
- [ ] Memory is flat over ~10 minutes (no leaks from repeated
      breaks/carjackings/flings)

## 4. Regression notes

Known shipped bugs — after changing anything nearby, re-verify each:

1. **`B is not defined` in `updatePeds`** (commit `6bc0a35`): a dropped
   `const B = pts[p.seg]` killed the whole loop on frame 1 — *after*
   `node --check` passed. Symptom: game never renders, `ReferenceError`
   in console. → smoke test now catches this.
2. **Inverted car steering** (commit `5be7ff6`): D turned left. Symptom:
   the car fights your input. → "Steering: A = left" above.
3. **Inverted vertical mouse pitch** (commit `5be7ff6`): mouse down looked
   up. → mouse check above.
4. **`v is not defined` in `ejectDriver`** (commit `54768e5`): carjacking
   crashed the game the instant a driver was flung. → smoke test now
   ejects a heli pilot.
5. **Pilotless heli frozen in mid-air**: `coastCar` early-returned before
   the descent when speed decayed. → "settles where it stops" above.
6. **`file://` never works** (module scripts + import maps): always test
   over http.
7. **MP tabs desync after a server update**: hard-refresh, or the old tab
   keeps showing players but block edits stop syncing.

At minimum, after any code change, re-run:
1. `node smoke/run.mjs` → `SMOKE_OK`
2. Load → no console errors, city visible, cars driving
3. Walk (mouse both axes) → steal a car (A left / D right) → drive around
4. Get flung / get busted once
5. Helicopter: steal → fly → exit airborne → chopper lands

## 5. Environment used for tests

- Browser: latest stable Chrome (primary), Firefox (secondary)
- OS: (fill in when testing)
- Date / commit: (fill in)
