// Minimal three.js stub for headless smoke-testing index.html's game module
export class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  clone() { return new Vector3(this.x, this.y, this.z); }
  addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
  subVectors(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this; }
  normalize() { const l = Math.hypot(this.x, this.y, this.z) || 1; this.x /= l; this.y /= l; this.z /= l; return this; }
}
export class Color {
  constructor() {}
  set() { return this; } setRGB() { return this; } setHex() { return this; } setScalar() { return this; }
  setHSL() { return this; } copy() { return this; } lerp() { return this; }
  multiplyScalar() { return this; } getHex() { return 0; }
}
export class BufferAttribute { constructor(a, n) { this.array = a; this.itemSize = n; } }
export class BufferGeometry {
  constructor() { this.attributes = {}; }
  setAttribute(n, a) { this.attributes[n] = a; }
}
class Mat {
  constructor(p = {}) {
    const { color, map, ...rest } = p;
    Object.assign(this, rest);
    this.color = new Color();
  }
}
export class MeshLambertMaterial extends Mat {}
export class MeshBasicMaterial extends Mat {}
export class LineBasicMaterial extends Mat {}
export class PointsMaterial extends Mat {}
export class SpriteMaterial extends Mat {}
export class BoxGeometry { translate() {} }
export class PlaneGeometry {}
export class EdgesGeometry {}
class Node {
  constructor() {
    this.position = new Vector3();
    this.rotation = new Vector3();
    this.scale = new Vector3();
    this.children = [];
    this.visible = true;
    this.userData = {};
  }
  add(c) { this.children.push(c); }
  updateMatrixWorld() {}
  lookAt() {}
}
export class Group extends Node {}
export class Mesh extends Node {
  constructor(g, m) { super(); this.geometry = g; this.material = m; }
}
export class LineSegments extends Mesh {}
export class Points extends Node {
  constructor(g, m) { super(); this.geometry = g; this.material = m; }
}
export class Sprite extends Node { constructor(m) { super(); this.material = m; } }
export class Scene extends Node {
  constructor() { super(); this.background = null; this.fog = { color: new Color(), density: 0 }; }
}
export class FogExp2 { constructor(c, d) { this.color = new Color(); this.density = d; } }
export class WebGLRenderer {
  constructor() {
    this.domElement = { style: {} };
    this.outputColorSpace = '';
    this.shadowMap = { enabled: false, type: 0 };
  }
  setPixelRatio() {} setSize() {} render() {}
}
export class PerspectiveCamera extends Node {
  constructor(fov, aspect, near, far) {
    super(); this.fov = fov; this.aspect = aspect; this.near = near; this.far = far;
  }
  updateProjectionMatrix() {}
}
export class DirectionalLight extends Node {
  constructor(c, i) {
    super(); this.intensity = i; this.color = new Color();
    this.target = new Node();
    this.shadow = { mapSize: { set() {} }, camera: {}, bias: 0 };
  }
}
export class HemisphereLight extends Node {
  constructor(a, b, i) { super(); this.intensity = i; this.color = new Color(); }
}
export class CanvasTexture {}
export const SRGBColorSpace = 'srgb';
export const NearestFilter = 1003;
export const PCFSoftShadowMap = 2;
export const DoubleSide = 2;
export const MathUtils = {
  clamp: (x, a, b) => Math.min(b, Math.max(a, x)),
  smoothstep: (x, min, max) => { const t = Math.min(1, Math.max(0, (x - min) / (max - min))); return t * t * (3 - 2 * t); },
};
