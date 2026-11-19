// Live 3D typewriter for the letter intro. Falls back to the SVG drawing if WebGL is unavailable.
import * as THREE from './three.module.min.js';
import { RoomEnvironment } from './RoomEnvironment.js';

const host = document.getElementById('typewriter');
const canvas = document.getElementById('tw3d');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { renderer = null; }

if (renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(30, 1.3, 1, 400);
  camera.position.set(0, 56, 58);
  camera.lookAt(0, 5, -1);

  // lights: warm key from upper left, cool rim from behind
  const key = new THREE.DirectionalLight(0xfff4e0, 2.4);
  key.position.set(-18, 40, 26); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 120 });
  key.shadow.radius = 4;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xdfe8ff, 1.4); rim.position.set(20, 18, -30); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x222222, 0.35));

  // materials
  const paint = new THREE.MeshPhysicalMaterial({ color: 0x080808, roughness: 0.45, metalness: 0.05, clearcoat: 0.8, clearcoatRoughness: 0.25 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, metalness: 1, roughness: 0.16 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, metalness: 0.85, roughness: 0.38 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.75 });
  const ivory = new THREE.MeshPhysicalMaterial({ color: 0xf2eee4, roughness: 0.28, clearcoat: 0.6 });
  const felt = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1 });

  const shadowy = m => { m.castShadow = true; m.receiveShadow = true; return m; };
  const add = (parent, geo, mat, x = 0, y = 0, z = 0) => { const m = shadowy(new THREE.Mesh(geo, mat)); m.position.set(x, y, z); parent.add(m); return m; };

  const tw = new THREE.Group(); scene.add(tw);

  // body: side profile (z forward, y up), extruded across the width, with rounded bevels
  const W = 30;
  const prof = new THREE.Shape();
  prof.moveTo(-12, 0); prof.lineTo(11, 0); prof.lineTo(11, 3.2); prof.lineTo(1, 8.2);
  prof.lineTo(-6.5, 10.2); prof.lineTo(-11, 10.2); prof.lineTo(-12, 9); prof.lineTo(-12, 0);
  const bodyGeo = new THREE.ExtrudeGeometry(prof, { depth: W, bevelEnabled: true, bevelThickness: 0.9, bevelSize: 0.9, bevelSegments: 6, curveSegments: 8 });
  bodyGeo.rotateY(-Math.PI / 2); bodyGeo.translate(W / 2, 0.9, 0);
  add(tw, bodyGeo, paint);

  // feet
  for (const x of [-13, 13]) for (const z of [-10, 9.5]) add(tw, new THREE.CylinderGeometry(1, 1.2, 0.9, 20), rubber, x, 0.45, z);

  // front chrome trim strip
  add(tw, new THREE.BoxGeometry(W + 0.6, 0.35, 0.35), chrome, 0, 3.9, 11.9);

  // typebar basket: dark felt well with a fan of typebars
  const well = add(tw, new THREE.CylinderGeometry(8.5, 8.5, 1, 48, 1, false, -Math.PI / 2, Math.PI), felt, 0, 11.55, -6.6);
  well.scale.set(1, 1, 0.62);
  const bars = [];
  for (let i = 0; i < 25; i++) {
    const a = -Math.PI / 2 + (i + 0.5) * Math.PI / 25;
    const pivot = new THREE.Group();
    pivot.position.set(Math.sin(a) * 7.6, 12.1, -6.6 + Math.cos(a) * 4.7);
    pivot.rotation.y = a;
    const bar = add(pivot, new THREE.BoxGeometry(0.22, 0.12, 4.6), darkMetal, 0, 0, -2.3);
    bar.castShadow = false;
    tw.add(pivot); bars.push(pivot);
  }
  add(tw, new THREE.TorusGeometry(7.9, 0.18, 8, 64, Math.PI), chrome, 0, 12.1, -6.6).rotation.set(-Math.PI / 2, 0, Math.PI);

  // carriage (slides side to side)
  const carriage = new THREE.Group(); carriage.position.set(0, 13.6, -9); tw.add(carriage);
  const platen = add(carriage, new THREE.CylinderGeometry(2.1, 2.1, W + 2, 48), rubber); platen.rotation.z = Math.PI / 2;
  for (const s of [-1, 1]) {
    const knob = add(carriage, new THREE.CylinderGeometry(2.5, 2.5, 1.6, 40), chrome, s * (W / 2 + 2.2), 0, 0); knob.rotation.z = Math.PI / 2;
    const cap = add(carriage, new THREE.CylinderGeometry(1.4, 2.3, 0.7, 40), darkMetal, s * (W / 2 + 3.3), 0, 0); cap.rotation.z = Math.PI / 2;
    add(carriage, new THREE.BoxGeometry(1, 3.6, 4.6), paint, s * (W / 2 + 0.9), -1.8, 0.4);
  }
  const rail = add(carriage, new THREE.CylinderGeometry(0.28, 0.28, W + 3, 16), chrome, 0, 1.2, 2.6); rail.rotation.z = Math.PI / 2; // paper bail
  const guide = add(carriage, new THREE.BoxGeometry(W - 6, 0.12, 1.4), chrome, 0, 2.15, -1.2); guide.rotation.x = -0.5; // paper table
  // return lever
  const lever = add(carriage, new THREE.CylinderGeometry(0.32, 0.32, 9, 16), chrome, -(W / 2 + 1.4), 2.6, 3.4);
  lever.rotation.set(0.5, 0, -1.15);
  add(carriage, new THREE.SphereGeometry(0.75, 20, 16), chrome, -(W / 2 + 5.4), 4.4, 5.6);
  // carriage rail on the body
  add(tw, new THREE.BoxGeometry(W + 6, 0.8, 1.2), chrome, 0, 11.4, -11);

  // keys: 4 staggered rows of round keys on chrome stems, climbing the slope
  const keys = [];
  const capGeo = new THREE.CylinderGeometry(0.78, 0.78, 0.36, 32);
  const ringGeo = new THREE.TorusGeometry(0.8, 0.13, 10, 32);
  const stemGeo = new THREE.CylinderGeometry(0.1, 0.1, 2.4, 8);
  const rows = [[11, 0], [11, 0.55], [10, 0.25], [10, 0.8]];
  rows.forEach(([n, off], r) => {
    const z = 9.2 - r * 2.25, y = 6.9 + r * 1.15;
    for (let i = 0; i < n; i++) {
      const g = new THREE.Group();
      const x = (i - (n - 1) / 2) * 2.15 + off - 0.3;
      g.position.set(x, y, z); g.rotation.x = -0.12;
      add(g, capGeo, ivory, 0, 0, 0);
      const ring = add(g, ringGeo, chrome, 0, 0, 0); ring.rotation.x = Math.PI / 2;
      add(g, stemGeo, chrome, 0, -1.25, -0.4).rotation.x = -0.35;
      tw.add(g); keys.push({ g, y0: y, t: 0 });
    }
  });
  const space = new THREE.Group(); space.position.set(0, 5.4, 11.6); tw.add(space);
  add(space, new THREE.CylinderGeometry(0.42, 0.42, 13, 20), chrome).rotation.z = Math.PI / 2;
  const spaceKey = { g: space, y0: 5.4, t: 0 };

  // ground that only receives a soft shadow
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.ShadowMaterial({ opacity: 0.55 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  tw.rotation.y = -0.06;

  // sizing
  function size() {
    const w = host.clientWidth, h = Math.round(w / 1.15);
    renderer.setSize(w, h, false); canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  addEventListener('resize', size); size();

  // animation
  let carriageX = 0, carriageTarget = 0, strike = null, strikeT = 0;
  function press(which) {
    const k = which === 'space' ? spaceKey : keys[Math.random() * keys.length | 0];
    k.t = 1;
    if (which !== 'space') { strike = bars[Math.random() * bars.length | 0]; strikeT = 1; }
    carriageTarget = Math.max(-6, carriageTarget - 0.35);
    if (carriageTarget <= -6) carriageTarget = 6; // carriage return
  }
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (host.classList.contains('on') || strikeT > 0) {
      for (const k of [...keys, spaceKey]) {
        if (k.t > 0) { k.t = Math.max(0, k.t - dt * 9); k.g.position.y = k.y0 - 0.45 * Math.sin(k.t * Math.PI); }
      }
      for (const b of bars) b.rotation.x = 0;
      if (strike && strikeT > 0) { strikeT = Math.max(0, strikeT - dt * 8); strike.rotation.x = 1.25 * Math.sin(strikeT * Math.PI); }
      carriageX += (carriageTarget - carriageX) * Math.min(1, dt * 14);
      carriage.position.x = carriageX;
      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);

  host.classList.add('is3d');
  window.tw3d = { press };
}
