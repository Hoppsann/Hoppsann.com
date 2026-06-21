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

let group; // gjøres tilgjengelig utenfor loader-callbacken
const baseRotationY = Math.PI; // 180°-fiksen fra før

let mouseX = 0;
let mouseY = 0;

window.addEventListener('mousemove', (event) => {
  mouseX = (event.clientX / window.innerWidth) * 2 - 1;
  mouseY = (event.clientY / window.innerHeight) * 2 - 1;
});

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

    const geometry = mesh.geometry;
    geometry.computeBoundingSphere();
    const { center, radius } = geometry.boundingSphere;

    geometry.translate(-center.x, -center.y, -center.z);

    group = new THREE.Group();

    const points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        size: radius * 0.02,
        color: 0x0a0447,
        sizeAttenuation: true,
      })
    );
    group.add(points);

    const wireframeGeometry = new THREE.WireframeGeometry(geometry);
    const wireframe = new THREE.LineSegments(
      wireframeGeometry,
      new THREE.LineBasicMaterial({
        color: 0x0a0447,
        transparent: true,
        opacity: 0.4,
      })
    );
    group.add(wireframe);

    group.rotation.y = baseRotationY; // startrotasjon, før lerp tar over
    scene.add(group);

    camera.position.z = radius * 2.5;
  },
  undefined,
  (error) => console.error('Feil ved lasting av modell:', error)
);

const maxRotation = 0.3; // radianer – juster for mer/mindre bevegelse

function animate() {
  requestAnimationFrame(animate);

  if (group) {
    const targetRotationY = baseRotationY + mouseX * maxRotation;
    const targetRotationX = mouseY * maxRotation;

    group.rotation.y += (targetRotationY - group.rotation.y) * 0.05;
    group.rotation.x += (targetRotationX - group.rotation.x) * 0.05;
  }

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