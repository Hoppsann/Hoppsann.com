// ---------- hero face: kontroll-variabler ----------

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const CONFIG = {
  modelPath: '/models/face.glb',

  // punkter
  pointColor: 0x0a0447,
  pointSize: 0.01,            // multipliseres med modellens radius

  // wireframe-linjer
  wireframeColor: 0x0a0447,
  wireframeOpacity: 0.3,

  // posisjon (offset fra senter, etter at modellen er sentrert)
  modelOffsetX: 0,
  modelOffsetY: 0,
  modelOffsetZ: 0,

  // rotasjon
  baseRotationY: Math.PI,     // 180° - retningsfiks (peker feil vei uten denne)
  baseRotationX: 0,
  mouseRotationStrength: 0.25, // radianer - hvor mye den roterer mot musepekeren
  rotationSmoothing: 0.1,    // 0-1 - lavere = tregere/mykere bevegelse

  // kamera
  cameraFov: 25,
  cameraNear: 0.1,
  cameraFar: 100,
  cameraDistanceMultiplier: 2.5, // multipliseres med modellens radius
};


// ---------- oppsett ----------

const canvas = document.querySelector('#face');
const container = document.querySelector('#heroFace');

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  CONFIG.cameraFov,
  container.clientWidth / container.clientHeight,
  CONFIG.cameraNear,
  CONFIG.cameraFar
);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);

let group;

let mouseX = 0;
let mouseY = 0;

window.addEventListener('mousemove', (event) => {
  mouseX = (event.clientX / window.innerWidth) * 2 - 1;
  mouseY = (event.clientY / window.innerHeight) * 2 - 1;
});

// touch fallback: finger-drag rotates face on phones (no mousemove there)
window.addEventListener('touchmove', (event) => {
  const touch = event.touches[0];
  if (!touch) return;
  mouseX = (touch.clientX / window.innerWidth) * 2 - 1;
  mouseY = (touch.clientY / window.innerHeight) * 2 - 1;
}, { passive: true });

const loader = new GLTFLoader();
loader.load(
  CONFIG.modelPath,
  (gltf) => {
    let mesh = null;
    gltf.scene.traverse((child) => {
      if (child.isMesh && !mesh) mesh = child;
    });

    if (!mesh) {
      console.error('Fant ingen mesh i GLB-filen');
      return;
    }

    const geometry = mesh.geometry;
    geometry.computeBoundingSphere();
    const { center, radius } = geometry.boundingSphere;

    geometry.translate(-center.x, -center.y, -center.z);

    group = new THREE.Group();

    const points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        size: radius * CONFIG.pointSize,
        color: CONFIG.pointColor,
        sizeAttenuation: true,
      })
    );
    group.add(points);

    const wireframeGeometry = new THREE.WireframeGeometry(geometry);
    const wireframe = new THREE.LineSegments(
      wireframeGeometry,
      new THREE.LineBasicMaterial({
        color: CONFIG.wireframeColor,
        transparent: true,
        opacity: CONFIG.wireframeOpacity,
      })
    );
    group.add(wireframe);

    group.position.set(CONFIG.modelOffsetX, CONFIG.modelOffsetY, CONFIG.modelOffsetZ);
    group.rotation.y = CONFIG.baseRotationY;
    group.rotation.x = CONFIG.baseRotationX;
    scene.add(group);

    camera.position.z = radius * CONFIG.cameraDistanceMultiplier;
  },
  undefined,
  (error) => console.error('Feil ved lasting av modell:', error)
);

function animate() {
  requestAnimationFrame(animate);

  if (group) {
    const targetRotationY = CONFIG.baseRotationY + mouseX * CONFIG.mouseRotationStrength;
    const targetRotationX = CONFIG.baseRotationX + mouseY * CONFIG.mouseRotationStrength;

    group.rotation.y += (targetRotationY - group.rotation.y) * CONFIG.rotationSmoothing;
    group.rotation.x += (targetRotationX - group.rotation.x) * CONFIG.rotationSmoothing;
  }

  renderer.render(scene, camera);
}
animate();

function resizeFace() {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

window.addEventListener('resize', resizeFace);
window.addEventListener('orientationchange', () => {
  setTimeout(resizeFace, 100); // dims lag right after rotate
});


// ---------- cards ----------

const cards = document.querySelectorAll(".cards > div");

const maxTiltDegree = 5;
const maxGlareOpacity = 0.2;
const outsideThreshold = 200; // px beyond card edge where effect fully stops

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function distanceToRect(px, py, rect) {
    const dx = Math.max(rect.left - px, 0, px - rect.right);
    const dy = Math.max(rect.top - py, 0, py - rect.bottom);
    return Math.sqrt(dx * dx + dy * dy);
}

document.addEventListener("mousemove", (event) => {
    cards.forEach(card => {
        const glare = card.querySelector(".glare");
        const cardRec = card.getBoundingClientRect();

        const halfWidth = cardRec.width / 2;
        const halfHeight = cardRec.height / 2;

        const cardCenterX = cardRec.left + halfWidth;
        const cardCenterY = cardRec.top + halfHeight;

        const deltaX = event.clientX - cardCenterX;
        const deltaY = event.clientY - cardCenterY;

        const rx = clamp(deltaY / halfHeight, -1, 1);
        const ry = clamp(deltaX / halfWidth, -1, 1);

        const distanceToTheCenter = Math.sqrt(deltaX ** 2 + deltaY ** 2);
        const maxDistance = Math.max(halfWidth, halfHeight);
        const normalizedDist = clamp(distanceToTheCenter / maxDistance, 0, 1);

        const distOutside = distanceToRect(event.clientX, event.clientY, cardRec);
        const intensity = 1 - clamp(distOutside / outsideThreshold, 0, 1);

        const degree = normalizedDist * maxTiltDegree * intensity;

        card.style.transform = `perspective(400px) rotate3d(${-rx}, ${ry}, 0, ${degree}deg)`;

        glare.style.transform = `translate(${-ry * 100}%, ${-rx * 100}%) scale(5)`;
        glare.style.opacity = normalizedDist * maxGlareOpacity * intensity;
    });
});