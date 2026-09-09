// Headless smoke test for the game module (no browser needed):
//   node smoke/run.mjs
// Loads index.html's <script type="module"> with a stubbed three.js + DOM,
// pumps frames, then exercises the helicopter flow in module scope:
// find -> eject pilot -> steal -> fly (W+Shift) -> airborne exit -> ragdoll
// landing -> re-steal -> ground exit.
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

function makeEl() {
  return {
    style: {},
    addEventListener: () => {},
    appendChild: () => {},
    getContext: () => ({
      createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      putImageData: () => {},
      measureText: () => ({ width: 10 }),
      createRadialGradient: () => ({ addColorStop: () => {} }),
      fillRect: () => {}, clearRect: () => {},
      beginPath: () => {}, arc: () => {}, fill: () => {},
      stroke: () => {}, fillText: () => {},
    }),
  };
}
const byId = {};
globalThis.document = {
  body: makeEl(),
  createElement: () => makeEl(),
  getElementById: (id) => (byId[id] ||= { style: {}, addEventListener: () => {}, textContent: '', innerHTML: '' }),
  addEventListener: () => {},
};
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.window = globalThis;
globalThis.location = { search: '', href: 'http://localhost/' };
globalThis.__rafCb = null;
globalThis.requestAnimationFrame = (cb) => { globalThis.__rafCb = cb; return 1; };

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, '..', 'index.html'), 'utf8');
const src = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
let patched = src.replace("from 'three'", "from './three-stub.mjs'");
patched += `
;
/* ---- smoke driver: helicopter steal / fly / exit (module scope) ---- */
{
  playing = true;
  const h = cars.find(c => c.heli);
  if (!h) throw new Error('no heli spawned');
  player.pos.set(h.x + 3, 3, h.z);
  if (findNearCar() !== h) throw new Error('findNearCar misses the heli');
  ejectDriver(h);
  enterCar(h);
  wanted = 0; wantedT = 0;   // keep the cops out of this test
  keys['KeyW'] = true; keys['ShiftLeft'] = true;
  let tt = lastT;
  const pump = (n) => { for (let i = 0; i < n; i++) { const cb = __rafCb; __rafCb = null; tt += 16.7; cb(tt); } };
  pump(120);
  if (drivingCar !== h) throw new Error('heli not being driven');
  if (h.gy <= 3.3) throw new Error('heli did not climb: ' + h.gy);
  if (h.speed < 1) throw new Error('heli has no forward speed: ' + h.speed);
  exitCar();                 // airborne: flung out, heli glides down alone
  pump(300);
  if (drivingCar !== null) throw new Error('still in the heli after exit');
  if (busted) throw new Error('busted stuck after the fall');
  if (h.gy > 3.05) throw new Error('unpiloted heli never landed: ' + h.gy);
  keys['KeyW'] = false; keys['ShiftLeft'] = false;
  // ground re-steal + ground exit
  player.pos.set(h.x + 2.5, 3, h.z);
  enterCar(h);
  pump(5);
  exitCar();
  if (!rig.g.visible) throw new Error('rig should be visible after ground exit');
}
`;
const file = join(here, '.game-smoke.mjs');
writeFileSync(file, patched);

try {
  await import(file);
  let t = 1000;
  for (let i = 0; i < 10; i++) {
    const cb = globalThis.__rafCb; globalThis.__rafCb = null;
    t += 16.7;
    if (cb) cb(t);
  }
  console.log('SMOKE_OK — module evaluated, heli flow + 10 frames clean');
} catch (e) {
  console.error('SMOKE_FAIL:', e);
  process.exitCode = 1;
} finally {
  try { writeFileSync(file, ''); } catch {}
}
