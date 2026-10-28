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

// Pointer events cover mouse, touch and pen. On a phone there is no
// hover, so the face (and cards) follow the last place you tapped/dragged.
function setPointer(e) {
  state.mouseX = e.clientX;
  state.mouseY = e.clientY;
  markDirty();
}

window.addEventListener('pointermove', setPointer, { passive: true });
window.addEventListener('pointerdown', (e) => {
  setPointer(e);
  if (e.pointerType === 'mouse') state.isDown = true;
}, { passive: true });
window.addEventListener('pointerup', () => { state.isDown = false; markDirty(); }, { passive: true });

if (isTouch) {
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

// Circle reveal between themes. Everything stays live: inside the circle
// the page already has the new theme, outside it still has the old one.
// Coloured surfaces paint both colours with a radial gradient whose radius
// grows every frame, and the 3D face draws both styles masked by the same
// circle. Other scripts listen for 'hoppsann:theme' and wait for
// `finished` before they change the layout (open the gallery etc.).

const REVEAL_DURATION = 700;
const REVEAL_SURFACES = 'body, .intro, footer, .intro-sawtooth-shape, .footer-sawtooth-shape, .project-card';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let currentTheme = null;
let reveal = null;

function applyTheme(themeName) {
  document.body.classList.remove('theme-capture', 'theme-create', 'theme-code');
  document.body.classList.add(`theme-${themeName}`);
  state.themed = true;
  markDirty();
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function startReveal(clickX, clickY, themeName) {
  const html = document.documentElement;
  const bodyStyle = getComputedStyle(document.body);

  // remember the old colours before the theme class changes
  html.style.setProperty('--old-page', bodyStyle.getPropertyValue('--page-background-color').trim());
  html.style.setProperty('--old-accent', bodyStyle.getPropertyValue('--accent-color').trim());

  const maxX = Math.max(clickX, window.innerWidth - clickX);
  const maxY = Math.max(clickY, window.innerHeight - clickY);

  let resolve;
  const finished = new Promise(res => { resolve = res; });

  reveal = {
    x: clickX,
    y: clickY,
    radius: Math.sqrt(maxX * maxX + maxY * maxY) + 2,
    start: performance.now(),
    surfaces: Array.from(document.querySelectorAll(REVEAL_SURFACES)).map(el => ({ el, rect: null })),
    resolve,
  };

  const fromStyle = face.style;
  applyTheme(themeName);
  face.beginReveal(fromStyle, themeName);
  html.classList.add('revealing');
  markDirty();

  return finished;
}

function readReveal() {
  if (!reveal) return;
  for (const s of reveal.surfaces) s.rect = s.el.getBoundingClientRect();
}

function writeReveal(now) {
  if (!reveal) return false;

  const t = Math.min(Math.max((now - reveal.start) / REVEAL_DURATION, 0), 1);
  const r = reveal.radius * easeInOutCubic(t);

  for (const { el, rect } of reveal.surfaces) {
    el.style.setProperty('--rx', `${reveal.x - rect.left}px`);
    el.style.setProperty('--ry', `${reveal.y - rect.top}px`);
    el.style.setProperty('--reveal-r', `${r}px`);
  }
  face.updateReveal(reveal.x, reveal.y, r);

  if (t >= 1) endReveal();
  return true;
}

function endReveal() {
  if (!reveal) return;
  const { surfaces, resolve } = reveal;
  reveal = null;

  const html = document.documentElement;
  html.classList.remove('revealing');
  html.style.removeProperty('--old-page');
  html.style.removeProperty('--old-accent');
  for (const { el } of surfaces) {
    el.style.removeProperty('--rx');
    el.style.removeProperty('--ry');
    el.style.removeProperty('--reveal-r');
  }
  face.endReveal();
  resolve();
  markDirty();
}

function triggerThemeTransition(clickX, clickY, themeName) {
  let finished = Promise.resolve();

  if (themeName !== currentTheme) {
    currentTheme = themeName;

    // a second click while the circle is still growing: finish it first
    endReveal();

    if (reducedMotion.matches) {
      const fromStyle = face.style;
      applyTheme(themeName);
      face.beginReveal(fromStyle, themeName);
      face.endReveal();
    } else {
      finished = startReveal(clickX, clickY, themeName);
    }
  }

  document.dispatchEvent(new CustomEvent('hoppsann:theme', {
    detail: { theme: themeName, finished },
  }));
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
  voxelCornerRadius: 0.2,   // 0 = sharp cubes, 0.5 = fully round

  asciiCharacters: ' .,:;i!lI1?][}{|/\\tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
  asciiColor: '#c8ffd8',
  asciiResolution: 0.15,      // characters per CSS pixel (higher = smaller, more characters)
  asciiFont: '"Courier New", Courier, monospace',
  asciiBackdropOpacity: 0.36, // the faint points + wireframe behind the ascii

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
  beginReveal(from, to) { this.style = to; },
  updateReveal() {},
  endReveal() {},
  update() { return true; },
  render() {},
  resize() {},
};

function readFace() {
  if (face.ready && face.visible) face.rect = face.container.getBoundingClientRect();
}

// ---------------------------------------------------------
// ASCII PASS (GPU)
//
// Replaces three's AsciiEffect, which every frame copied the WebGL image
// back to the CPU, built a huge HTML string and re-laid-out a <table>.
// Here the scene is rendered to a texture and a shader draws each
// character straight from a glyph atlas: no readback, no DOM.
// ---------------------------------------------------------

function createAsciiPass(THREE, renderer, CONFIG) {
  const chars = CONFIG.asciiCharacters;
  const charCount = chars.length;

  // full-size shaded image the characters are picked from
  const sceneTarget = new THREE.WebGLRenderTarget(1, 1, { samples: 4 });
  // one texel per character column / half row (like AsciiEffect's small canvas)
  const smallTarget = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: false,
  });

  const atlasCanvas = document.createElement('canvas');
  const atlas = new THREE.CanvasTexture(atlasCanvas);
  atlas.minFilter = THREE.LinearFilter;
  atlas.magFilter = THREE.LinearFilter;
  atlas.generateMipmaps = false;

  const hex = CONFIG.asciiColor.replace('#', '');
  const color = new THREE.Vector3(
    parseInt(hex.slice(0, 2), 16) / 255,
    parseInt(hex.slice(2, 4), 16) / 255,
    parseInt(hex.slice(4, 6), 16) / 255
  );

  const fullscreenVertex = /* glsl */`
    void main() {
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `;

  // 1) shrink the image to one brightness value per character
  const downsampleMaterial = new THREE.ShaderMaterial({
    uniforms: {
      tScene: { value: sceneTarget.texture },
      uSmallSize: { value: new THREE.Vector2(1, 1) },
    },
    vertexShader: fullscreenVertex,
    fragmentShader: /* glsl */`
      uniform sampler2D tScene;
      uniform vec2 uSmallSize;

      vec3 toSrgb(vec3 c) {
        return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
      }

      void main() {
        // one filtered sample per character, like AsciiEffect's drawImage downscale
        vec4 s = texture2D(tScene, gl_FragCoord.xy / uSmallSize);
        // transparent = brightness 1 = space, same as AsciiEffect
        float brightness = 1.0;
        if (s.a > 0.0) {
          vec3 c = toSrgb(clamp(s.rgb / s.a, 0.0, 1.0));
          brightness = dot(c, vec3(0.3, 0.59, 0.11));
        }
        gl_FragColor = vec4(brightness, 0.0, 0.0, 1.0);
      }
    `,
    depthTest: false,
    depthWrite: false,
    blending: THREE.NoBlending,
  });

  // 2) fade what's already on the canvas (the points + wireframe backdrop)
  const dimMaterial = new THREE.ShaderMaterial({
    uniforms: { uKeep: { value: CONFIG.asciiBackdropOpacity } },
    vertexShader: fullscreenVertex,
    fragmentShader: /* glsl */`
      uniform float uKeep;
      void main() {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0 - uKeep);
      }
    `,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    // alpha: keep only uKeep of what was there
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });

  // 3) draw the characters from the glyph atlas
  const glyphMaterial = new THREE.ShaderMaterial({
    uniforms: {
      tSmall: { value: smallTarget.texture },
      tAtlas: { value: atlas },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uSmallSize: { value: new THREE.Vector2(1, 1) },
      uCellPx: { value: new THREE.Vector2(1, 1) },
      uCharCount: { value: charCount },
      uColor: { value: color },
    },
    vertexShader: fullscreenVertex,
    fragmentShader: /* glsl */`
      uniform sampler2D tSmall;
      uniform sampler2D tAtlas;
      uniform vec2 uResolution;
      uniform vec2 uSmallSize;
      uniform vec2 uCellPx;
      uniform float uCharCount;
      uniform vec3 uColor;

      void main() {
        // character grid starts in the top-left corner
        vec2 fromTop = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
        vec2 cellPos = fromTop / uCellPx;
        vec2 cell = floor(cellPos);
        vec2 inCell = fract(cellPos);

        // each text row uses every other row of the small image
        float smallRow = cell.y * 2.0;
        if (cell.x >= uSmallSize.x || smallRow >= uSmallSize.y) discard;

        vec2 uv = vec2(cell.x + 0.5, uSmallSize.y - smallRow - 0.5) / uSmallSize;
        float brightness = texture2D(tSmall, uv).r;

        float idx = floor((1.0 - brightness) * (uCharCount - 1.0) + 0.5);
        if (idx < 0.5) discard; // space

        float glyph = texture2D(tAtlas, vec2((idx + inCell.x) / uCharCount, 1.0 - inCell.y)).a;
        if (glyph < 0.02) discard;
        gl_FragColor = vec4(uColor * glyph, glyph); // premultiplied
      }
    `,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
  });

  const quadScene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), downsampleMaterial);
  quad.frustumCulled = false;
  quadScene.add(quad);
  const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  function drawQuad(material, target) {
    quad.material = material;
    renderer.setRenderTarget(target);
    renderer.render(quadScene, quadCamera);
  }

  function drawAtlas(cellW, cellH) {
    const w = Math.ceil(cellW);
    const h = Math.ceil(cellH);
    atlasCanvas.width = w * charCount;
    atlasCanvas.height = h;

    const ctx = atlasCanvas.getContext('2d');
    ctx.clearRect(0, 0, atlasCanvas.width, h);
    ctx.fillStyle = '#fff';
    ctx.font = `${cellH}px ${CONFIG.asciiFont}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // monospace glyphs are ~0.6em wide; squeeze them a little to fit the cell
    const squeeze = Math.min(1, (cellW / (cellH * 0.6)) * 1.1);
    for (let i = 0; i < charCount; i++) {
      ctx.save();
      ctx.translate(i * w + w / 2, h / 2);
      ctx.scale(squeeze, 1);
      ctx.fillText(chars[i], 0, 0);
      ctx.restore();
    }
    atlas.needsUpdate = true;
  }

  return {
    setSize(cssWidth, cssHeight, pixelRatio) {
      const w = Math.max(1, Math.round(cssWidth * pixelRatio));
      const h = Math.max(1, Math.round(cssHeight * pixelRatio));
      sceneTarget.setSize(w, h);

      // same grid as AsciiEffect: resolution * size, one text row per two image rows
      const smallW = Math.max(1, Math.floor(cssWidth * CONFIG.asciiResolution));
      const smallH = Math.max(1, Math.floor(cssHeight * CONFIG.asciiResolution));
      smallTarget.setSize(smallW, smallH);
      downsampleMaterial.uniforms.uSmallSize.value.set(smallW, smallH);
      glyphMaterial.uniforms.uSmallSize.value.set(smallW, smallH);

      const cellW = (w / smallW);
      const cellH = (h / smallH) * 2;
      glyphMaterial.uniforms.uResolution.value.set(w, h);
      glyphMaterial.uniforms.uCellPx.value.set(cellW, cellH);
      drawAtlas(cellW, cellH);
    },

    // the materials that draw onto the canvas (for the circle mask)
    canvasMaterials: [dimMaterial, glyphMaterial],

    // compile everything the ascii pass uses ahead of time
    warmUp(scene, camera) {
      if (renderer.initRenderTarget) {
        renderer.initRenderTarget(sceneTarget);
        renderer.initRenderTarget(smallTarget);
      }
      renderer.setRenderTarget(sceneTarget);
      renderer.compile(scene, camera);

      renderer.setRenderTarget(smallTarget);
      quad.material = downsampleMaterial;
      renderer.compile(quadScene, quadCamera);

      renderer.setRenderTarget(null);
      quad.material = dimMaterial;
      renderer.compile(quadScene, quadCamera);
      quad.material = glyphMaterial;
      renderer.compile(quadScene, quadCamera);
    },

    // the caller sets up which objects are visible for each step
    renderSource(scene, camera) {
      renderer.setRenderTarget(sceneTarget);
      renderer.clear();
      renderer.render(scene, camera);
      drawQuad(downsampleMaterial, smallTarget);
      renderer.setRenderTarget(null);
    },

    // fade the backdrop already on the canvas, then draw the characters on top
    drawCharacters() {
      const autoClear = renderer.autoClear;
      renderer.autoClear = false;
      drawQuad(dimMaterial, null);
      drawQuad(glyphMaterial, null);
      renderer.autoClear = autoClear;
    },
  };
}

// Redraw the glyph atlas once web fonts / system fonts are ready
const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();

function initFace(THREE, { GLTFLoader, DRACOLoader, MeshSurfaceSampler }) {
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
    stencil: true, // used to show the new style inside the growing circle
    powerPreference: 'high-performance',
  });
  // phones report 3x or more; rendering at that resolution is a big GPU cost
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.maxPixelRatio));
  renderer.setClearColor(0x000000, 0);

  const asciiPass = createAsciiPass(THREE, renderer, CONFIG);

  canvas.style.width = '100%';
  canvas.style.height = `${CONFIG.renderAreaScaleY * 100}%`;

  function resize() {
    const renderWidth = container.clientWidth;
    const renderHeight = container.clientHeight * CONFIG.renderAreaScaleY;
    if (!renderWidth || !renderHeight) return;

    camera.fov = mobileMediaQuery.matches ? CONFIG.cameraFovMobile : CONFIG.cameraFovDesktop;
    camera.aspect = renderWidth / renderHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(renderWidth, renderHeight, false);
    asciiPass.setSize(renderWidth, renderHeight, renderer.getPixelRatio());
    face.needsRender = true;
  }
  resize();
  fontsReady.then(() => {
    resize();
    markDirty();
  });

  let group = null;
  let pointsWireGroup = null;
  let solidGroup = null;
  let voxelGroup = null;
  let asciiGroup = null;
  let sourceMesh = null;
  let modelRadius = 1;

  let rotVX = 0;
  let rotVY = 0;

  // Voxels are plain 12-triangle boxes. The rounded edges are faked in the
  // fragment shader by bending the normal near each edge the same way a real
  // rounded box would. That is ~25x fewer triangles than RoundedBoxGeometry
  // and looks the same at this size.
  function createVoxelMaterial(voxelSize) {
    const material = new THREE.MeshStandardMaterial({
      color: CONFIG.voxelColor,
      roughness: CONFIG.voxelRoughness,
      metalness: CONFIG.voxelMetalness,
    });

    const inner = 0.5 - CONFIG.voxelCornerRadius;

    material.onBeforeCompile = (shader) => {
      shader.uniforms.uVoxelSize = { value: voxelSize };
      shader.uniforms.uVoxelInner = { value: inner };

      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>
          uniform float uVoxelSize;
          varying vec3 vVoxelLocal;
          varying vec3 vVoxelAxisX;
          varying vec3 vVoxelAxisY;
          varying vec3 vVoxelAxisZ;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vVoxelLocal = position / uVoxelSize;
          vVoxelAxisX = normalMatrix * vec3(1.0, 0.0, 0.0);
          vVoxelAxisY = normalMatrix * vec3(0.0, 1.0, 0.0);
          vVoxelAxisZ = normalMatrix * vec3(0.0, 0.0, 1.0);`);

      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform float uVoxelInner;
          varying vec3 vVoxelLocal;
          varying vec3 vVoxelAxisX;
          varying vec3 vVoxelAxisY;
          varying vec3 vVoxelAxisZ;`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          {
            // bend the normal towards the cube's edges like a rounded box:
            // flat in the middle, turning up to ~90 degrees at the edge
            vec3 lp = vVoxelLocal;
            vec3 alp = abs(lp);
            float r = 0.5 - uVoxelInner;
            vec3 edge = min(abs(lp - clamp(lp, -uVoxelInner, uVoxelInner)) / r, 0.97);
            vec3 ln = sign(lp) * tan(edge * 1.5707963);
            if (alp.x >= alp.y && alp.x >= alp.z) ln.x = sign(lp.x);
            else if (alp.y >= alp.z) ln.y = sign(lp.y);
            else ln.z = sign(lp.z);
            ln = normalize(ln);
            normal = normalize(vVoxelAxisX * ln.x + vVoxelAxisY * ln.y + vVoxelAxisZ * ln.z);
          }`);
    };
    material.customProgramCacheKey = () => 'rounded-voxel';
    return material;
  }

  function buildVoxelMesh() {
    const voxelSize = modelRadius * CONFIG.voxelSize;
    const sampler = new MeshSurfaceSampler(sourceMesh).build();
    const p = new THREE.Vector3();

    // numeric keys are much faster than string keys
    const OFFSET = 1024;
    const SPAN = 2048;
    const keyOf = (x, y, z) => ((x + OFFSET) * SPAN + (y + OFFSET)) * SPAN + (z + OFFSET);

    const cells = new Map();
    for (let i = 0; i < CONFIG.voxelSampleCount; i++) {
      sampler.sample(p);
      const vx = Math.round(p.x / voxelSize);
      const vy = Math.round(p.y / voxelSize);
      const vz = Math.round(p.z / voxelSize);
      const key = keyOf(vx, vy, vz);
      if (!cells.has(key)) cells.set(key, [vx, vy, vz]);
    }

    // skip voxels that are completely surrounded: they can never be seen
    const positions = [];
    for (const [vx, vy, vz] of cells.values()) {
      const hidden =
        cells.has(keyOf(vx + 1, vy, vz)) && cells.has(keyOf(vx - 1, vy, vz)) &&
        cells.has(keyOf(vx, vy + 1, vz)) && cells.has(keyOf(vx, vy - 1, vz)) &&
        cells.has(keyOf(vx, vy, vz + 1)) && cells.has(keyOf(vx, vy, vz - 1));
      if (!hidden) positions.push(vx * voxelSize, vy * voxelSize, vz * voxelSize);
    }

    const boxGeometry = new THREE.BoxGeometry(voxelSize, voxelSize, voxelSize);
    const boxMaterial = createVoxelMaterial(voxelSize);

    const count = positions.length / 3;
    const instancedMesh = new THREE.InstancedMesh(boxGeometry, boxMaterial, count);
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      matrix.makeTranslation(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      instancedMesh.setMatrixAt(i, matrix);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;
    instancedMesh.computeBoundingSphere();
    return instancedMesh;
  }

  function ensureVoxels() {
    if (voxelGroup.children.length || !sourceMesh) return;
    voxelGroup.add(buildVoxelMesh());
  }

  function showStyle(s) {
    if (!group) return;
    if (s === 'create') ensureVoxels();

    pointsWireGroup.visible = s === 'default';
    solidGroup.visible = s === 'capture';
    voxelGroup.visible = s === 'create';
    asciiGroup.visible = s === 'code';
  }

  function applyVisibility() {
    showStyle(face.style);
  }

  // three only compiles shaders for visible objects, so the hidden styles
  // would otherwise compile on their first use (= a freeze mid-transition)
  function warmUp() {
    if (!group) return;
    const groups = [pointsWireGroup, solidGroup, voxelGroup, asciiGroup];
    const was = groups.map(g => g.visible);

    for (const g of groups) {
      groups.forEach(other => { other.visible = other === g; });
      renderer.compile(scene, camera);
    }

    // the ascii source is drawn into a render target, which needs its own variant
    groups.forEach(g => { g.visible = g === asciiGroup; });
    asciiPass.warmUp(scene, camera);

    groups.forEach((g, i) => { g.visible = was[i]; });
    renderer.compile(circleScene, circleCamera);
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

    const pointsMaterial = new THREE.PointsMaterial({
      size: radius * CONFIG.pointSize,
      color: CONFIG.pointColor,
      sizeAttenuation: true,
    });
    const wireMaterial = new THREE.LineBasicMaterial({
      color: CONFIG.wireframeColor,
      transparent: true,
      opacity: CONFIG.wireframeOpacity,
    });

    pointsWireGroup = new THREE.Group();
    pointsWireGroup.add(new THREE.Points(geometry, pointsMaterial));
    pointsWireGroup.add(new THREE.LineSegments(wireGeometry, wireMaterial));

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

    // build the voxels and compile every style's shaders while the browser
    // is idle, so switching style later never stalls on shader compilation
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1500));
    idle(() => {
      ensureVoxels();
      warmUp();
    }, { timeout: 4000 });
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

  // draws one style. With `masked`, only pixels inside the circle are touched.
  function renderStyle(style) {
    showStyle(style);

    if (style === 'code' && group) {
      // pass 1: the shaded source image the characters are picked from
      asciiPass.renderSource(scene, camera);
      // pass 2: points + wireframe on the canvas (faded in pass 3)
      asciiGroup.visible = false;
      pointsWireGroup.visible = true;
      renderer.render(scene, camera);
      // pass 3: the characters on top
      asciiPass.drawCharacters();
    } else {
      renderer.render(scene, camera);
    }
  }

  // ---- circle reveal between two styles, both live ----

  const allMaterials = () => {
    const list = [...asciiPass.canvasMaterials];
    scene.traverse(o => {
      if (o.material) list.push(...(Array.isArray(o.material) ? o.material : [o.material]));
    });
    return list;
  };

  function setStencilTest(on) {
    for (const m of allMaterials()) {
      m.stencilWrite = on; // in three this switches the stencil *test* on
      m.stencilFunc = THREE.EqualStencilFunc;
      m.stencilRef = 1;
      m.stencilFail = THREE.KeepStencilOp;
      m.stencilZFail = THREE.KeepStencilOp;
      m.stencilZPass = THREE.KeepStencilOp;
    }
  }

  // clears the circle to transparent and marks it in the stencil buffer
  const circleMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uCenter: { value: new THREE.Vector2() },
      uRadius: { value: 0 },
    },
    vertexShader: `void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform vec2 uCenter;
      uniform float uRadius;
      void main() {
        if (distance(gl_FragCoord.xy, uCenter) > uRadius) discard;
        gl_FragColor = vec4(0.0);
      }
    `,
    blending: THREE.NoBlending,
    depthTest: false,
    depthWrite: false,
    stencilWrite: true,
    stencilFunc: THREE.AlwaysStencilFunc,
    stencilRef: 1,
    stencilZPass: THREE.ReplaceStencilOp,
  });
  const circleScene = new THREE.Scene();
  const circleQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), circleMaterial);
  circleQuad.frustumCulled = false;
  circleScene.add(circleQuad);
  const circleCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  let reveal = null; // { from, to, x, y, r } in viewport pixels

  face.beginReveal = (from, to) => {
    reveal = { from, to, x: 0, y: 0, r: 0 };
    face.style = to;
    face.needsRender = true;
  };

  face.updateReveal = (x, y, r) => {
    if (!reveal) return;
    reveal.x = x;
    reveal.y = y;
    reveal.r = r;
    face.needsRender = true;
  };

  face.endReveal = () => {
    if (!reveal) return;
    reveal = null;
    applyVisibility();
    face.needsRender = true;
  };

  face.render = () => {
    if (!face.needsRender || !face.visible) return;
    face.needsRender = false;

    if (!reveal || !group) {
      renderStyle(face.style);
      applyVisibility();
      return;
    }

    // 1) the old style everywhere
    setStencilTest(false);
    renderStyle(reveal.from);

    // 2) cut the circle out (canvas pixels, origin bottom-left)
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    circleMaterial.uniforms.uCenter.value.set(
      (reveal.x - rect.left) * scale,
      (rect.bottom - reveal.y) * scale
    );
    circleMaterial.uniforms.uRadius.value = reveal.r * scale;

    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.setRenderTarget(null);
    renderer.render(circleScene, circleCamera);
    renderer.clearDepth();

    // 3) the new style, only inside the circle
    setStencilTest(true);
    renderStyle(reveal.to);
    setStencilTest(false);

    renderer.autoClear = autoClear;
    applyVisibility();
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
]).then(([THREE, { GLTFLoader }, { DRACOLoader }, { MeshSurfaceSampler }]) => {
  initFace(THREE, { GLTFLoader, DRACOLoader, MeshSurfaceSampler });
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
  readReveal();
  readCards();
  readContact();
  readFace();

  // ---- UPDATE ----
  const cursorSettled = updateCursor(f);
  const faceSettled = face.update(f);

  // ---- WRITE ----
  const revealing = writeReveal(timestamp);
  if (!isTouch) writeCursor();
  writeCards();
  if (!isTouch) writeContact();
  face.render();

  const busy = revealing || !cursorSettled || !faceSettled || face.needsRender || state.dirty;
  state.dirty = false;

  // keep running while something is moving, otherwise go idle until
  // the next mousemove / scroll / resize / theme change
  if (busy && !rafId) {
    rafId = requestAnimationFrame(frame);
  }
}

wake();
