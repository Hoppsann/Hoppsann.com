window.addEventListener("DOMContentLoaded", () => {

  // =========================
  // CURSOR (spring + click)
  // =========================

  const cursor = document.getElementById("cursor");

  const CURSOR_CONFIG = {
    size: 30,

    stiffness: 0.1,
    friction: 0.8,

    stretch: 0.03,

    clickScale: 0.75,
    clickSpring: 0.1,
    clickDamping: 0.8
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

  let isDown = false;
  let clickScale = 1;
  let clickV = 0;

  window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  window.addEventListener("mousedown", () => isDown = true);
  window.addEventListener("mouseup", () => isDown = false);

  function animateCursor() {

    let dx = mouseX - cx;
    let dy = mouseY - cy;

    cvx += dx * CURSOR_CONFIG.stiffness;
    cvy += dy * CURSOR_CONFIG.stiffness;

    cvx *= CURSOR_CONFIG.friction;
    cvy *= CURSOR_CONFIG.friction;

    cx += cvx;
    cy += cvy;

    let speed = Math.sqrt(cvx * cvx + cvy * cvy);

    if (speed > 0.1) {
      angle = Math.atan2(cvy, cvx) * 180 / Math.PI;
    }

    let moveStretch = 1 + speed * CURSOR_CONFIG.stretch;

    const targetClick = isDown ? CURSOR_CONFIG.clickScale : 1;

    clickV += (targetClick - clickScale) * CURSOR_CONFIG.clickSpring;
    clickV *= CURSOR_CONFIG.clickDamping;
    clickScale += clickV;

    const sx = moveStretch * clickScale;
    const sy = (1 / moveStretch) * clickScale;

    cursor.style.left = `${cx}px`;
    cursor.style.top = `${cy}px`;

    cursor.style.transform = `
      translate(-50%, -50%)
      rotate(${angle}deg)
      scale(${sx}, ${sy})
    `;

    window.springX = cx;
    window.springY = cy;

    requestAnimationFrame(animateCursor);
  }

  animateCursor();


  // =========================
  // THEME TRANSITION (circle reveal via View Transitions API)
  // =========================

  function applyTheme(themeName) {
    document.body.classList.remove('theme-capture', 'theme-create', 'theme-code');
    document.body.classList.add(`theme-${themeName}`);

    if (window.setFaceStyle) {
      window.setFaceStyle(themeName);
    }
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

    document.documentElement.style.setProperty('--transition-x', `${clickX}px`);
    document.documentElement.style.setProperty('--transition-y', `${clickY}px`);
    document.documentElement.style.setProperty('--transition-radius', `${radius}px`);

    document.startViewTransition(() => {
      applyTheme(themeName);
    });
  }


  // =========================
  // THREE FACE
  // =========================

  import("three").then(THREE => {
    Promise.all([
      import("three/addons/loaders/GLTFLoader.js"),
      import("three/addons/math/MeshSurfaceSampler.js"),
      import("three/addons/geometries/RoundedBoxGeometry.js")
    ]).then(([{ GLTFLoader }, { MeshSurfaceSampler }, { RoundedBoxGeometry }]) => {

      const mobileMediaQuery = window.matchMedia('(max-width: 768px)');

      const CONFIG = {
        modelPath: '/models/face.glb',

        pointColor: 0xc0dceb,
        pointSize: 0.005,

        wireframeColor: 0xede7d8,
        wireframeOpacity: 0.3,

        voxelSize: 0.03,
        voxelColor: 0x3bb0ff,
        voxelSampleCount: 150000,
        voxelRoughness: 0.4,
        voxelMetalness: 0.1,
        voxelCornerRadius: 0.2,
        voxelSegments: 2,

        ambientLightColor: 0xffffff,
        ambientLightIntensity: 1,
        directionalLightColor: 0xffffff,
        directionalLightIntensity: 1.2,

        modelOffsetX: 0,
        modelOffsetY: 0.01,
        modelOffsetZ: 0,

        baseRotationY: Math.PI - 0.1,
        baseRotationX: 0,
        mouseRotationStrength: 0.3,

        rotationSpring: 0.05,
        rotationDamping: 0.92,

        cameraFovMobile: 40,
        cameraFovDesktop: 25,
        cameraNear: 0.1,
        cameraFar: 100,
        cameraDistanceMultiplier: 2.5,
      };

      const canvas = document.querySelector('#face');
      const container = document.querySelector('#heroFace');

      const scene = new THREE.Scene();

      const ambientLight = new THREE.AmbientLight(
        CONFIG.ambientLightColor, CONFIG.ambientLightIntensity
      );
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(
        CONFIG.directionalLightColor, CONFIG.directionalLightIntensity
      );
      directionalLight.position.set(0, -2, 4);
      scene.add(directionalLight);

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
      let pointsWireGroup;
      let voxelGroup;

      let mx = 0;
      let my = 0;

      let rotVX = 0;
      let rotVY = 0;

      function buildVoxelMesh(mesh, voxelSize, color, sampleCount, cornerRadius, segments) {
        const sampler = new MeshSurfaceSampler(mesh).build();
        const tempPosition = new THREE.Vector3();

        const voxelMap = new Map();

        for (let i = 0; i < sampleCount; i++) {
          sampler.sample(tempPosition);

          const vx = Math.round(tempPosition.x / voxelSize);
          const vy = Math.round(tempPosition.y / voxelSize);
          const vz = Math.round(tempPosition.z / voxelSize);

          const key = `${vx}_${vy}_${vz}`;
          if (!voxelMap.has(key)) {
            voxelMap.set(key, [vx * voxelSize, vy * voxelSize, vz * voxelSize]);
          }
        }

        const boxGeometry = new RoundedBoxGeometry(
          voxelSize, voxelSize, voxelSize,
          segments,
          voxelSize * cornerRadius
        );

        const boxMaterial = new THREE.MeshStandardMaterial({
          color,
          roughness: CONFIG.voxelRoughness,
          metalness: CONFIG.voxelMetalness,
        });

        const instancedMesh = new THREE.InstancedMesh(
          boxGeometry, boxMaterial, voxelMap.size
        );

        const dummy = new THREE.Object3D();
        let i = 0;
        voxelMap.forEach(([x, y, z]) => {
          dummy.position.set(x, y, z);
          dummy.updateMatrix();
          instancedMesh.setMatrixAt(i, dummy.matrix);
          i++;
        });

        instancedMesh.instanceMatrix.needsUpdate = true;
        return instancedMesh;
      }

      function setActiveStyle(styleName) {
        if (!pointsWireGroup || !voxelGroup) return;

        if (styleName === 'create') {
          pointsWireGroup.visible = false;
          voxelGroup.visible = true;
        } else {
          pointsWireGroup.visible = true;
          voxelGroup.visible = false;
        }
      }

      window.setFaceStyle = setActiveStyle;

      document.querySelector('.card1').addEventListener('click', (e) => {
        triggerThemeTransition(e.clientX, e.clientY, 'capture');
      });
      document.querySelector('.card2').addEventListener('click', (e) => {
        triggerThemeTransition(e.clientX, e.clientY, 'create');
      });
      document.querySelector('.card3').addEventListener('click', (e) => {
        triggerThemeTransition(e.clientX, e.clientY, 'code');
      });

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

        pointsWireGroup = new THREE.Group();

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

        pointsWireGroup.add(points);
        pointsWireGroup.add(wire);

        voxelGroup = new THREE.Group();
        const voxelMesh = buildVoxelMesh(
          mesh,
          radius * CONFIG.voxelSize,
          CONFIG.voxelColor,
          CONFIG.voxelSampleCount,
          CONFIG.voxelCornerRadius,
          CONFIG.voxelSegments
        );
        voxelGroup.add(voxelMesh);
        voxelGroup.visible = false;

        group.add(pointsWireGroup);
        group.add(voxelGroup);

        group.position.set(
          CONFIG.modelOffsetX,
          CONFIG.modelOffsetY,
          CONFIG.modelOffsetZ
        );

        group.rotation.y = CONFIG.baseRotationY;

        scene.add(group);

        camera.position.z = radius * CONFIG.cameraDistanceMultiplier;
      });

      function animateFace() {
        requestAnimationFrame(animateFace);

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

          rotVX += (targetY - group.rotation.y) * CONFIG.rotationSpring;
          rotVY += (targetX - group.rotation.x) * CONFIG.rotationSpring;

          rotVX *= CONFIG.rotationDamping;
          rotVY *= CONFIG.rotationDamping;

          group.rotation.y += rotVX;
          group.rotation.x += rotVY;
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
  // CARDS
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

  function animateCards() {

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
        norm * 0.2 * intensity;
    });

    requestAnimationFrame(animateCards);
  }

  animateCards();

});