window.addEventListener("DOMContentLoaded", () => {

  // =========================
  // CURSOR (spring physics)
  // =========================

  const cursor = document.getElementById("cursor");

  const CURSOR_CONFIG = {
    size: 20,
    stiffness: 0.12,
    friction: 0.78,
    stretch: 0.12
  };

  cursor.style.width = `${CURSOR_CONFIG.size}px`;
  cursor.style.height = `${CURSOR_CONFIG.size}px`;

  let mouseX = 0;
  let mouseY = 0;

  let cx = 0;
  let cy = 0;

  let cvx = 0;
  let cvy = 0;

  let angle = 0;

  window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  let lastCursorTime = performance.now();

  function animateCursor() {
    const now = performance.now();
    const dt = (now - lastCursorTime) / 16.666;
    lastCursorTime = now;

    let dx = mouseX - cx;
    let dy = mouseY - cy;

    cvx += dx * CURSOR_CONFIG.stiffness * dt;
    cvy += dy * CURSOR_CONFIG.stiffness * dt;

    cvx *= Math.pow(CURSOR_CONFIG.friction, dt);
    cvy *= Math.pow(CURSOR_CONFIG.friction, dt);

    cx += cvx * dt;
    cy += cvy * dt;

    let speed = Math.sqrt(cvx * cvx + cvy * cvy);

    if (speed > 0.1) {
      angle = Math.atan2(cvy, cvx) * 180 / Math.PI;
    }

    let stretch = 1 + speed * CURSOR_CONFIG.stretch;

    cursor.style.left = `${cx}px`;
    cursor.style.top = `${cy}px`;

    cursor.style.transform = `
      translate(-50%, -50%)
      rotate(${angle}deg)
      scale(${stretch}, ${1 / stretch})
    `;

    // expose SPRING CURSOR
    window.springX = cx;
    window.springY = cy;

    requestAnimationFrame(animateCursor);
  }

  animateCursor();


  // =========================
  // THREE FACE (uses spring cursor)
  // =========================

  import("three").then(THREE => {
    import("three/addons/loaders/GLTFLoader.js").then(({ GLTFLoader }) => {

      const mobileMediaQuery = window.matchMedia('(max-width: 768px)');

      const CONFIG = {
        modelPath: '/models/face.glb',

        pointColor: 0xc0dceb,
        pointSize: 0.005,

        wireframeColor: 0xede7d8,
        wireframeOpacity: 0.3,

        modelOffsetX: 0,
        modelOffsetY: 0.01,
        modelOffsetZ: 0,

        baseRotationY: Math.PI - 0.1,
        baseRotationX: 0,
        mouseRotationStrength: 0.3,

        rotationSpring: 0.2,
        rotationDamping: 0.8,

        cameraFovMobile: 40,
        cameraFovDesktop: 25,
        cameraNear: 0.1,
        cameraFar: 100,
        cameraDistanceMultiplier: 2.5,
      };

      const canvas = document.querySelector('#face');
      const container = document.querySelector('#heroFace');

      const scene = new THREE.Scene();

      const camera = new THREE.PerspectiveCamera(
        mobileMediaQuery.matches ? CONFIG.cameraFovMobile : CONFIG.cameraFovDesktop,
        container.clientWidth / container.clientHeight,
        CONFIG.cameraNear,
        CONFIG.cameraFar
      );

      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true
      });

      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio);

      let group;

      let mx = 0;
      let my = 0;

      let rotVX = 0;
      let rotVY = 0;

      const loader = new GLTFLoader();

      loader.load(CONFIG.modelPath, (gltf) => {

        let mesh = null;
        gltf.scene.traverse(c => {
          if (c.isMesh && !mesh) mesh = c;
        });

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

        const wire = new THREE.LineSegments(
          new THREE.WireframeGeometry(geometry),
          new THREE.LineBasicMaterial({
            color: CONFIG.wireframeColor,
            transparent: true,
            opacity: CONFIG.wireframeOpacity,
          })
        );

        group.add(points);
        group.add(wire);

        group.position.set(
          CONFIG.modelOffsetX,
          CONFIG.modelOffsetY,
          CONFIG.modelOffsetZ
        );

        group.rotation.y = CONFIG.baseRotationY;

        scene.add(group);

        camera.position.z = radius * CONFIG.cameraDistanceMultiplier;
      });

      let lastFaceTime = performance.now();

      function animateFace() {
        requestAnimationFrame(animateFace);

        const now = performance.now();
        const dt = (now - lastFaceTime) / 16.666;
        lastFaceTime = now;

        // spring cursor → face input
        const sx = window.springX || 0;
        const sy = window.springY || 0;

        const rect = container.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        mx = (sx - cx) / (rect.width / 2);
        my = (sy - cy) / (rect.height / 2);

        if (group) {

          const targetY = CONFIG.baseRotationY + mx * CONFIG.mouseRotationStrength;
          const targetX = CONFIG.baseRotationX + my * CONFIG.mouseRotationStrength;

          let dx = targetY - group.rotation.y;
          let dy = targetX - group.rotation.x;

          rotVX += dx * CONFIG.rotationSpring * dt;
          rotVY += dy * CONFIG.rotationSpring * dt;

          rotVX *= Math.pow(CONFIG.rotationDamping, dt);
          rotVY *= Math.pow(CONFIG.rotationDamping, dt);

          group.rotation.y += rotVX * dt;
          group.rotation.x += rotVY * dt;
        }

        renderer.render(scene, camera);
      }

      animateFace();

      window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
      });

    });
  });


  // =========================
  // CARDS (FOLLOW SPRING CURSOR)
  // =========================

  const cards = document.querySelectorAll(".cards > div");

  const maxTiltDegree = 5;
  const maxGlareOpacity = 0.2;
  const outsideThreshold = 200;

  function clamp(v, min, max) {
    return Math.min(Math.max(v, min), max);
  }

  function distanceToRect(px, py, rect) {
    const dx = Math.max(rect.left - px, 0, px - rect.right);
    const dy = Math.max(rect.top - py, 0, py - rect.bottom);
    return Math.sqrt(dx * dx + dy * dy);
  }

  let lastCardTime = performance.now();

  function animateCards() {

    const now = performance.now();
    const dt = (now - lastCardTime) / 16.666;
    lastCardTime = now;

    const x = window.springX || 0;
    const y = window.springY || 0;

    cards.forEach(card => {

      const glare = card.querySelector(".glare");
      const rect = card.getBoundingClientRect();

      const hw = rect.width / 2;
      const hh = rect.height / 2;

      const cx = rect.left + hw;
      const cy = rect.top + hh;

      const dx = x - cx;
      const dy = y - cy;

      const rx = clamp(dy / hh, -1, 1);
      const ry = clamp(dx / hw, -1, 1);

      const dist = Math.sqrt(dx * dx + dy * dy);
      const norm = clamp(dist / Math.max(hw, hh), 0, 1);

      const outside = distanceToRect(x, y, rect);
      const intensity = 1 - clamp(outside / outsideThreshold, 0, 1);

      const degree = norm * maxTiltDegree * intensity;

      card.style.transform =
        `perspective(400px) rotate3d(${-rx}, ${ry}, 0, ${degree}deg)`;

      glare.style.transform =
        `translate(${-ry * 100}%, ${-rx * 100}%) scale(5)`;

      glare.style.opacity =
        norm * maxTiltDegree * 0.04 * intensity;
    });

    requestAnimationFrame(animateCards);
  }

  animateCards();

});