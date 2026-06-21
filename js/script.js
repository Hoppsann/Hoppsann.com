window.addEventListener("DOMContentLoaded", () => {

  // =========================
  // CURSOR (spring + momentum)
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

  let cAngle = 0;

  window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

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
      cAngle = Math.atan2(cvy, cvx) * 180 / Math.PI;
    }

    let stretch = 1 + speed * CURSOR_CONFIG.stretch;

    cursor.style.left = `${cx}px`;
    cursor.style.top = `${cy}px`;

    cursor.style.transform = `
      translate(-50%, -50%)
      rotate(${cAngle}deg)
      scale(${stretch}, ${1 / stretch})
    `;

    requestAnimationFrame(animateCursor);
  }

  animateCursor();


  // =========================
  // THREE FACE (spring + inertia)
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

        rotationSpring: 0.075,
        rotationDamping: 0.9,

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

      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio);

      let group;

      let mx = 0;
      let my = 0;

      window.addEventListener('mousemove', (event) => {
        const rect = container.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        mx = (event.clientX - cx) / (rect.width / 2);
        my = (event.clientY - cy) / (rect.height / 2);
      });

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

      function animateFace() {
        requestAnimationFrame(animateFace);

        if (group) {

          const targetY = CONFIG.baseRotationY + mx * CONFIG.mouseRotationStrength;
          const targetX = CONFIG.baseRotationX + my * CONFIG.mouseRotationStrength;

          let dx = targetY - group.rotation.y;
          let dy = targetX - group.rotation.x;

          rotVX += dx * CONFIG.rotationSpring;
          rotVY += dy * CONFIG.rotationSpring;

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

});