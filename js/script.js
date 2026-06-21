// ---------- hero face ----------

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas = document.querySelector('#face');
const container = document.querySelector('#heroFace');

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  50,
  container.clientWidth / container.clientHeight,
  0.1,
  100
);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);

const loader = new GLTFLoader();
loader.load(
  '/models/face.glb',
  (gltf) => {
    let mesh = null;
    gltf.scene.traverse((child) => {
      if (child.isMesh && !mesh) mesh = child;
    });

    if (!mesh) {
      console.error('Fant ingen mesh i GLB-filen');
      return;
    }

    const points = new THREE.Points(
      mesh.geometry,
      new THREE.PointsMaterial({ size: 0.02, color: 0xffffff, sizeAttenuation: true })
    );

    scene.add(points);
  },
  undefined,
  (error) => console.error('Feil ved lasting av modell:', error)
);

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
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