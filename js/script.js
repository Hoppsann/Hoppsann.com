// =========================================================
// hoppsann.com — main script
//
// Performance notes:
// - ONE requestAnimationFrame loop drives cursor, cards, contact link
//   and the 3D face. All DOM reads happen before any DOM writes in a
//   frame, so the browser never has to recalculate layout mid-frame.
// - The loop goes idle when nothing moves (no mouse movement, no scroll,
//   springs settled), and the 3D face only re-renders when it actually
//   changed and is on screen.
// - The heavy voxel mesh is built in idle time after load instead of
//   blocking the page.
// =========================================================

const TARGET_FRAME_MS = 1000 / 60;
const ANIMATION_SPEED = 2;
const EPSILON = 0.01;

const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
const mobileMediaQuery = window.matchMedia('(max-width: 768px)');

function getFrameFactor(timestamp, lastTimestamp) {
  if (!lastTimestamp) return 1;
  return Math.min((timestamp - lastTimestamp) / TARGET_FRAME_MS, 3) * ANIMATION_SPEED;
}

function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}

function distanceToRect(px, py, rect) {
  const dx = Math.max(rect.left - px, 0, px - rect.right);
  const dy = Math.max(rect.top - py, 0, py - rect.bottom);
  return Math.sqrt(dx * dx + dy * dy);
}

// ---------------------------------------------------------
// Shared state
// ---------------------------------------------------------

const state = {
  mouseX: window.innerWidth / 2,
  mouseY: window.innerHeight / 2,
  isDown: false,
  themed: false,       // true once a card theme is chosen
  dirty: true,         // something changed that needs a frame
};

function markDirty() {
  state.dirty = true;
  wake();
}

// ---------------------------------------------------------
// CURSOR (spring + click)
// ---------------------------------------------------------

const CURSOR_CONFIG = {
  size: 30,
  stiffness: 0.1,
  friction: 0.8,
  stretch: 0.03,
  clickScale: 0.75,
  clickSpring: 0.1,
  clickDamping: 0.8,
};

const cursorEl = document.getElementById('cursor');
cursorEl.style.width = `${CURSOR_CONFIG.size}px`;
cursorEl.style.height = `${CURSOR_CONFIG.size}px`;

const cursor = {
  x: state.mouseX,
  y: state.mouseY,
  vx: 0,
  vy: 0,
  angle: 0,
  clickScale: 1,
  clickV: 0,
};

function updateCursor(f) {
  const dx = state.mouseX - cursor.x;
  const dy = state.mouseY - cursor.y;

  cursor.vx += dx * CURSOR_CONFIG.stiffness * f;
  cursor.vy += dy * CURSOR_CONFIG.stiffness * f;

  const friction = Math.pow(CURSOR_CONFIG.friction, f);
  cursor.vx *= friction;
  cursor.vy *= friction;

  cursor.x += cursor.vx * f;
  cursor.y += cursor.vy * f;

  const speed = Math.sqrt(cursor.vx * cursor.vx + cursor.vy * cursor.vy);
  if (speed > 0.1) {
    cursor.angle = Math.atan2(cursor.vy, cursor.vx) * 180 / Math.PI;
  }

  const targetClick = state.isDown ? CURSOR_CONFIG.clickScale : 1;
  cursor.clickV += (targetClick - cursor.clickScale) * CURSOR_CONFIG.clickSpring * f;
  cursor.clickV *= Math.pow(CURSOR_CONFIG.clickDamping, f);
  cursor.clickScale += cursor.clickV * f;

  // settled = close to the mouse and not moving
  return (
    Math.abs(dx) < EPSILON * 10 &&
    Math.abs(dy) < EPSILON * 10 &&
    speed < EPSILON &&
    Math.abs(targetClick - cursor.clickScale) < 0.001 &&
    Math.abs(cursor.clickV) < 0.001
  );
}

function writeCursor() {
  const speed = Math.sqrt(cursor.vx * cursor.vx + cursor.vy * cursor.vy);
  const moveStretch = 1 + speed * CURSOR_CONFIG.stretch;
  const sx = moveStretch * cursor.clickScale;
  const sy = (1 / moveStretch) * cursor.clickScale;

  // transform only: no layout, runs on the compositor
  cursorEl.style.transform =
    `translate3d(${cursor.x}px, ${cursor.y}px, 0) translate(-50%, -50%) ` +
    `rotate(${cursor.angle}deg) scale(${sx}, ${sy})`;
}

if (!isTouch) {
  window.addEventListener('mousemove', (e) => {
    state.mouseX = e.clientX;
    state.mouseY = e.clientY;
    markDirty();
  }, { passive: true });

  window.addEventListener('mousedown', () => { state.isDown = true; markDirty(); });
  window.addEventListener('mouseup', () => { state.isDown = false; markDirty(); });
} else {
  cursorEl.style.display = 'none';
}

window.addEventListener('scroll', markDirty, { passive: true });
window.addEventListener('resize', () => {
  face.needsResize = true;
  markDirty();
}, { passive: true });

// ---------------------------------------------------------
// CARDS (tilt + glare + grayscale)
// ---------------------------------------------------------

const CARD_CONFIG = {
  maxColorDistance: 200,
  maxTiltDegree: 5,
  maxGlareOpacity: 0.2,
  outsideThreshold: 200,
};

const cards = Array.from(document.querySelectorAll('.cards > .card')).map(el => ({
  el,
  glare: el.querySelector('.glare'),
  rect: null,
  // last written values, so unchanged styles aren't rewritten every frame
  lastTransform: '',
  lastGlareTransform: '',
  lastGlareOpacity: '',
  lastFilter: '',
}));

function readCards() {
  for (const card of cards) card.rect = card.el.getBoundingClientRect();
}

function writeCards() {
  const x = cursor.x;
  const y = cursor.y;

  for (const card of cards) {
    const rect = card.rect;
    const hw = rect.width / 2;
    const hh = rect.height / 2;

    const dx = x - (rect.left + hw);
    const dy = y - (rect.top + hh);

    const rx = clamp(dy / hh, -1, 1);
    const ry = clamp(dx / hw, -1, 1);

    const dist = Math.sqrt(dx * dx + dy * dy);
    const norm = clamp(dist / Math.max(hw, hh), 0, 1);

    const outside = distanceToRect(x, y, rect);
    const intensity = 1 - clamp(outside / CARD_CONFIG.outsideThreshold, 0, 1);
    const colorAmount = 1 - clamp(outside / CARD_CONFIG.maxColorDistance, 0, 1);

    const filter = state.themed
      ? 'grayscale(0)'
      : `grayscale(${(1 - colorAmount).toFixed(2)})`;

    const degree = norm * CARD_CONFIG.maxTiltDegree * intensity;

    const transform =
      `perspective(400px) rotate3d(${(-rx).toFixed(3)}, ${ry.toFixed(3)}, 0, ${degree.toFixed(2)}deg)`;
    const glareTransform =
      `translate(${(-ry * 100).toFixed(1)}%, ${(-rx * 100).toFixed(1)}%) scale(5)`;
    const glareOpacity = (norm * CARD_CONFIG.maxGlareOpacity * intensity).toFixed(3);

    if (filter !== card.lastFilter) {
      card.el.style.filter = filter;
      card.lastFilter = filter;
    }
    if (transform !== card.lastTransform) {
      card.el.style.transform = transform;
      card.lastTransform = transform;
    }
    if (glareTransform !== card.lastGlareTransform) {
      card.glare.style.transform = glareTransform;
      card.lastGlareTransform = glareTransform;
    }
    if (glareOpacity !== card.lastGlareOpacity) {
      card.glare.style.opacity = glareOpacity;
      card.lastGlareOpacity = glareOpacity;
    }
  }
}

// ---------------------------------------------------------
// CONTACT LINK (scale up when the cursor gets close)
// ---------------------------------------------------------

const CONTACT_CONFIG = {
  smallestSize: 1.0,
  biggestSize: 1.1,
  effectDistance: 250,
};

const contact = {
  el: document.getElementById('contact'),
  rect: null,
  lastScale: '',
};

function readContact() {
  if (!contact.el) return;
  // the element is scaled from its centre, so the transformed rect is
  // close enough to the real one for a distance check
  contact.rect = contact.el.getBoundingClientRect();
}

function writeContact() {
  if (!contact.el || !contact.rect) return;

  const distance = distanceToRect(state.mouseX, state.mouseY, contact.rect);
  let scale = CONTACT_CONFIG.smallestSize;

  if (distance < CONTACT_CONFIG.effectDistance) {
    const progress = 1 - distance / CONTACT_CONFIG.effectDistance;
    scale = CONTACT_CONFIG.smallestSize +
      (CONTACT_CONFIG.biggestSize - CONTACT_CONFIG.smallestSize) * progress;
  }

  const value = `scale(${scale.toFixed(3)})`;
  if (value !== contact.lastScale) {
    contact.el.style.transform = value;
    contact.lastScale = value;
  }
}

// ---------------------------------------------------------
// THEME TRANSITION (circle reveal via View Transitions API)
// ---------------------------------------------------------

function applyTheme(themeName) {
  document.body.classList.remove('theme-capture', 'theme-create', 'theme-code');
  document.body.classList.add(`theme-${themeName}`);
  state.themed = true;
  face.setStyle(themeName);
  markDirty();
}

function triggerThemeTransition(clickX, clickY, themeName) {
  // fallback for nettlesere uten støtte - bare bytt tema direkte
  if (!document.startViewTransition) {
    applyTheme(themeName);
    return;
  }

  const maxX = Math.max(clickX, window.innerWidth - clickX);
  const maxY = Math.max(clickY, window.innerHeight - clickY);
  const radius = Math.sqrt(maxX * maxX + maxY * maxY);

  const root = document.documentElement.style;
  root.setProperty('--transition-x', `${clickX}px`);
  root.setProperty('--transition-y', `${clickY}px`);
  root.setProperty('--transition-radius', `${radius}px`);

  document.startViewTransition(() => applyTheme(themeName));
}

const CARD_THEMES = { card1: 'capture', card2: 'create', card3: 'code' };

for (const [cls, themeName] of Object.entries(CARD_THEMES)) {
  const el = document.querySelector(`.${cls}`);
  if (!el) continue;

  el.addEventListener('click', (e) => {
    // keyboard "clicks" have no pointer position: start the circle from the card's centre
    if (e.detail === 0) {
      const r = el.getBoundingClientRect();
      triggerThemeTransition(r.left + r.width / 2, r.top + r.height / 2, themeName);
    } else {
      triggerThemeTransition(e.clientX, e.clientY, themeName);
    }
  });

  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      el.click();
    }
  });
}

// ---------------------------------------------------------
// THREE FACE
// ---------------------------------------------------------

const FACE_CONFIG = {
  modelPath: '/models/face.glb',
  dracoDecoderPath: 'https://unpkg.com/three@0.184.0/examples/jsm/libs/draco/gltf/',
  maxPixelRatio: 2,

  pointColor: 0xc0dceb,
  pointSize: 0.005,

  wireframeColor: 0xede7d8,
  wireframeOpacity: 0.3,

  captureSolidColor: 0xc0dceb,
  captureSolidRoughness: 0.45,
  captureSolidMetalness: 0.1,

  voxelSize: 0.03,
  voxelColor: 0x3bb0ff,
  voxelSampleCount: 150000,
  voxelRoughness: 0.4,
  voxelMetalness: 0.1,
  voxelCornerRadius: 0.2,
  voxelSegments: 2,

  asciiCharacters: ' .,:;i!lI1?][}{|/\\tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
  asciiColor: '#c8ffd8',
  asciiBackground: 'transparent',
  asciiResolution: 0.15,
  asciiOffsetX: '-2.35%',
  asciiScaleX: 0.94,

  ambientLightColor: 0xffffff,
  ambientLightIntensity: 1,
  directionalLightColor: 0xffffff,
  directionalLightIntensity: 1.8,

  modelOffsetX: 0,
  modelOffsetY: -0.01,
  modelOffsetZ: 0,

  baseRotationY: Math.PI - 0.1,
  baseRotationX: 0,
  mouseRotationStrength: 0.3,

  rotationSpring: 0.05,
  rotationDamping: 0.92,

  cameraFovMobile: 65,
  cameraFovDesktop: 45,
  cameraNear: 0.1,
  cameraFar: 100,
  cameraDistanceMultiplier: 2.5,
  renderAreaScaleY: 1.45,
};

// The face is filled in once three.js has loaded. Until then these
// no-op functions keep the main loop and theme code simple.
const face = {
  ready: false,
  visible: true,
  needsRender: false,
  needsResize: false,
  style: 'default',
  container: document.querySelector('#heroFace'),
  rect: null,
  setStyle(name) { this.style = name; },
  update() { return true; },
  render() {},
  resize() {},
};

function readFace() {
  if (face.ready && face.visible) face.rect = face.container.getBoundingClientRect();
}

function initFace(THREE, { GLTFLoader, DRACOLoader, MeshSurfaceSampler, RoundedBoxGeometry, AsciiEffect }) {
  const CONFIG = FACE_CONFIG;
  const canvas = document.querySelector('#face');
  const container = face.container;

  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(CONFIG.ambientLightColor, CONFIG.ambientLightIntensity));

  const directionalLight = new THREE.DirectionalLight(
    CONFIG.directionalLightColor, CONFIG.directionalLightIntensity
  );
  directionalLight.position.set(0, -2, 4);
  scene.add(directionalLight);

  const camera = new THREE.PerspectiveCamera(
    mobileMediaQuery.matches ? CONFIG.cameraFovMobile : CONFIG.cameraFovDesktop,
    1,
    CONFIG.cameraNear,
    CONFIG.cameraFar
  );

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  // phones report 3x or more; rendering at that resolution is a big GPU cost
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.maxPixelRatio));
  renderer.setClearColor(0x000000, 0);

  const asciiEffect = new AsciiEffect(renderer, CONFIG.asciiCharacters, {
    invert: false,
    resolution: CONFIG.asciiResolution,
  });
  const asciiEl = asciiEffect.domElement;
  asciiEl.id = 'asciiFace';
  asciiEl.style.color = CONFIG.asciiColor;
  asciiEl.style.backgroundColor = CONFIG.asciiBackground;
  asciiEl.style.display = 'none';
  asciiEl.style.setProperty('--ascii-offset-x', CONFIG.asciiOffsetX);
  asciiEl.style.setProperty('--ascii-scale-x', CONFIG.asciiScaleX);
  container.appendChild(asciiEl);

  canvas.style.width = '100%';
  canvas.style.height = `${CONFIG.renderAreaScaleY * 100}%`;
  asciiEl.style.width = '100%';
  asciiEl.style.height = `${CONFIG.renderAreaScaleY * 100}%`;

  function resize() {
    const renderWidth = container.clientWidth;
    const renderHeight = container.clientHeight * CONFIG.renderAreaScaleY;
    if (!renderWidth || !renderHeight) return;

    camera.fov = mobileMediaQuery.matches ? CONFIG.cameraFovMobile : CONFIG.cameraFovDesktop;
    camera.aspect = renderWidth / renderHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(renderWidth, renderHeight, false);
    asciiEffect.setSize(renderWidth, renderHeight);
    face.needsRender = true;
  }
  resize();

  let group = null;
  let pointsWireGroup = null;
  let solidGroup = null;
  let voxelGroup = null;
  let asciiGroup = null;
  let sourceMesh = null;
  let modelRadius = 1;

  let rotVX = 0;
  let rotVY = 0;

  function buildVoxelMesh() {
    const voxelSize = modelRadius * CONFIG.voxelSize;
    const sampler = new MeshSurfaceSampler(sourceMesh).build();
    const p = new THREE.Vector3();

    // numeric keys are much faster than string keys
    const seen = new Set();
    const positions = [];
    const OFFSET = 1024;
    const SPAN = 2048;

    for (let i = 0; i < CONFIG.voxelSampleCount; i++) {
      sampler.sample(p);
      const vx = Math.round(p.x / voxelSize);
      const vy = Math.round(p.y / voxelSize);
      const vz = Math.round(p.z / voxelSize);
      const key = ((vx + OFFSET) * SPAN + (vy + OFFSET)) * SPAN + (vz + OFFSET);
      if (!seen.has(key)) {
        seen.add(key);
        positions.push(vx * voxelSize, vy * voxelSize, vz * voxelSize);
      }
    }

    const boxGeometry = new RoundedBoxGeometry(
      voxelSize, voxelSize, voxelSize,
      CONFIG.voxelSegments,
      voxelSize * CONFIG.voxelCornerRadius
    );
    const boxMaterial = new THREE.MeshStandardMaterial({
      color: CONFIG.voxelColor,
      roughness: CONFIG.voxelRoughness,
      metalness: CONFIG.voxelMetalness,
    });

    const count = positions.length / 3;
    const instancedMesh = new THREE.InstancedMesh(boxGeometry, boxMaterial, count);
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      matrix.makeTranslation(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      instancedMesh.setMatrixAt(i, matrix);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;
    return instancedMesh;
  }

  function ensureVoxels() {
    if (voxelGroup.children.length || !sourceMesh) return;
    voxelGroup.add(buildVoxelMesh());
  }

  function applyVisibility() {
    const s = face.style;
    canvas.style.opacity = s === 'code' ? '0.36' : '1';
    asciiEl.style.display = s === 'code' ? 'block' : 'none';

    if (!group) return;
    if (s === 'create') ensureVoxels();

    pointsWireGroup.visible = s === 'default';
    solidGroup.visible = s === 'capture';
    voxelGroup.visible = s === 'create';
    asciiGroup.visible = s === 'code';
  }

  face.setStyle = (name) => {
    face.style = name;
    applyVisibility();
    face.needsRender = true;
  };

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(CONFIG.dracoDecoderPath);
  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);

  loader.load(CONFIG.modelPath, (gltf) => {
    gltf.scene.traverse(c => {
      if (c.isMesh && !sourceMesh) sourceMesh = c;
    });
    if (!sourceMesh) return;

    const geometry = sourceMesh.geometry;
    geometry.computeBoundingSphere();
    const { center, radius } = geometry.boundingSphere;
    geometry.translate(-center.x, -center.y, -center.z);
    modelRadius = radius;

    // one wireframe geometry shared by both styles that need it
    const wireGeometry = new THREE.WireframeGeometry(geometry);

    group = new THREE.Group();

    pointsWireGroup = new THREE.Group();
    pointsWireGroup.add(new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        size: radius * CONFIG.pointSize,
        color: CONFIG.pointColor,
        sizeAttenuation: true,
      })
    ));
    pointsWireGroup.add(new THREE.LineSegments(
      wireGeometry,
      new THREE.LineBasicMaterial({
        color: CONFIG.wireframeColor,
        transparent: true,
        opacity: CONFIG.wireframeOpacity,
      })
    ));

    solidGroup = new THREE.Group();
    solidGroup.add(new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: CONFIG.captureSolidColor,
        roughness: CONFIG.captureSolidRoughness,
        metalness: CONFIG.captureSolidMetalness,
      })
    ));

    voxelGroup = new THREE.Group();

    asciiGroup = new THREE.Group();
    asciiGroup.add(new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ color: 0x707070, side: THREE.BackSide })
    ));
    asciiGroup.add(new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    ));
    asciiGroup.add(new THREE.LineSegments(
      wireGeometry,
      new THREE.LineBasicMaterial({ color: 0x8f8f8f, transparent: true, opacity: 0.45 })
    ));

    group.add(pointsWireGroup, solidGroup, voxelGroup, asciiGroup);
    group.position.set(CONFIG.modelOffsetX, CONFIG.modelOffsetY, CONFIG.modelOffsetZ);
    group.rotation.y = CONFIG.baseRotationY;
    scene.add(group);

    camera.position.z = radius * CONFIG.cameraDistanceMultiplier;

    applyVisibility();
    face.needsRender = true;
    markDirty();

    // upload shaders to the GPU now instead of on the first theme click
    renderer.compile(scene, camera);

    // build the voxels while the browser is idle, not on click
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1500));
    idle(() => ensureVoxels(), { timeout: 4000 });
  }, undefined, (err) => console.error('[face]', err));

  // returns true when the rotation has settled
  face.update = (f) => {
    if (!group || !face.rect) return true;

    const rect = face.rect;
    const mx = (cursor.x - (rect.left + rect.width / 2)) / (rect.width / 2);
    const my = (cursor.y - (rect.top + rect.height / 2)) / (rect.height / 2);

    const targetY = CONFIG.baseRotationY + mx * CONFIG.mouseRotationStrength;
    const targetX = CONFIG.baseRotationX + my * CONFIG.mouseRotationStrength;

    rotVX += (targetY - group.rotation.y) * CONFIG.rotationSpring * f;
    rotVY += (targetX - group.rotation.x) * CONFIG.rotationSpring * f;

    const damping = Math.pow(CONFIG.rotationDamping, f);
    rotVX *= damping;
    rotVY *= damping;

    const before = group.rotation.y + group.rotation.x * 7;
    group.rotation.y += rotVX * f;
    group.rotation.x += rotVY * f;
    const moved = Math.abs(group.rotation.y + group.rotation.x * 7 - before) > 1e-5;

    if (moved) face.needsRender = true;

    return (
      !moved &&
      Math.abs(targetY - group.rotation.y) < 1e-4 &&
      Math.abs(targetX - group.rotation.x) < 1e-4
    );
  };

  face.render = () => {
    if (!face.needsRender || !face.visible) return;
    face.needsRender = false;

    if (face.style === 'code' && group) {
      // pass 1: the ascii version
      asciiEffect.render(scene, camera);
      // pass 2: faint points+wireframe on the canvas underneath
      pointsWireGroup.visible = true;
      asciiGroup.visible = false;
      renderer.render(scene, camera);
      pointsWireGroup.visible = false;
      asciiGroup.visible = true;
    } else {
      renderer.render(scene, camera);
    }
  };

  face.resize = resize;
  face.ready = true;

  // stop rendering the face entirely when it's scrolled out of view
  new IntersectionObserver(([entry]) => {
    face.visible = entry.isIntersecting;
    if (face.visible) {
      face.needsRender = true;
      markDirty();
    }
  }, { rootMargin: '100px 0px' }).observe(container);

  applyVisibility();
  markDirty();
}

Promise.all([
  import('three'),
  import('three/addons/loaders/GLTFLoader.js'),
  import('three/addons/loaders/DRACOLoader.js'),
  import('three/addons/math/MeshSurfaceSampler.js'),
  import('three/addons/geometries/RoundedBoxGeometry.js'),
  import('three/addons/effects/AsciiEffect.js'),
]).then(([THREE, { GLTFLoader }, { DRACOLoader }, { MeshSurfaceSampler }, { RoundedBoxGeometry }, { AsciiEffect }]) => {
  initFace(THREE, { GLTFLoader, DRACOLoader, MeshSurfaceSampler, RoundedBoxGeometry, AsciiEffect });
}).catch(err => console.error('[face] three.js failed to load', err));

// ---------------------------------------------------------
// MAIN LOOP
// ---------------------------------------------------------

let rafId = 0;
let lastTimestamp = 0;

function wake() {
  if (!rafId) {
    lastTimestamp = 0;
    rafId = requestAnimationFrame(frame);
  }
}

function frame(timestamp) {
  rafId = 0;
  const f = getFrameFactor(timestamp, lastTimestamp);
  lastTimestamp = timestamp;

  if (face.needsResize) {
    face.needsResize = false;
    face.resize();
  }

  // ---- READ (all layout reads first) ----
  readCards();
  readContact();
  readFace();

  // ---- UPDATE ----
  const cursorSettled = isTouch ? true : updateCursor(f);
  const faceSettled = face.update(f);

  // ---- WRITE ----
  if (!isTouch) writeCursor();
  writeCards();
  if (!isTouch) writeContact();
  face.render();

  const busy = !cursorSettled || !faceSettled || face.needsRender || state.dirty;
  state.dirty = false;

  // keep running while something is moving, otherwise go idle until
  // the next mousemove / scroll / resize / theme change
  if (busy) {
    rafId = requestAnimationFrame(frame);
  }
}

wake();
