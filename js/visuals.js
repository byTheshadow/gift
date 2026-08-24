/* =========================================================
   Echoes for 夜寒
   Three.js Visual Engine
   ========================================================= */

window.EchoVisuals = (() => {
  let scene;
  let camera;
  let renderer;
  let clock;

  let signalPoints;
  let signalGeometry;
  let signalMaterial;

  let starPoints;
  let starGeometry;
  let starMaterial;

  let animationFrame;
  let currentMode = "prelude";
  let isInitialized = false;

  let viewportWidth = window.innerWidth;
  let viewportHeight = window.innerHeight;

  let pointerX = 0;
  let pointerY = 0;
  let targetPointerX = 0;
  let targetPointerY = 0;

  const STAR_COUNT = 430;
  const SIGNAL_COUNT = 240;

  /*
    柔焦粒子 Shader：
    不使用硬边圆点，而是让粒子边缘自然消散，
    避免产生「满屏灰尘」的感觉。
  */
  const vertexShader = `
    attribute float aSize;
    attribute float aAlpha;

    uniform float uTime;
    uniform float uMode;
    uniform float uPulse;

    varying float vAlpha;

    void main() {
      vec3 transformed = position;

      /*
        mode:
        0 = prelude
        1 = game
        2 = silence
        3 = confession
      */

      if (uMode < 0.5) {
        float wave =
          sin(position.x * 1.25 + uTime * 1.45) * 0.17 +
          sin(position.x * 2.8 - uTime * 0.72) * 0.045;

        transformed.y += wave * (0.5 + uPulse * 1.7);
        transformed.z += sin(position.x * 0.65 + uTime * 0.45) * 0.045;
      }

      vec4 modelPosition = modelMatrix * vec4(transformed, 1.0);
      vec4 viewPosition = viewMatrix * modelPosition;

      gl_Position = projectionMatrix * viewPosition;
      gl_PointSize = aSize * (130.0 / max(1.0, -viewPosition.z));

      vAlpha = aAlpha;
    }
  `;

  const fragmentShader = `
    uniform float uOpacity;
    varying float vAlpha;

    void main() {
      float distanceToCenter = distance(gl_PointCoord, vec2(0.5));

      /*
        中央亮、边缘柔和消散。
        0.5 之外会完全透明。
      */
      float softness = 1.0 - smoothstep(0.05, 0.5, distanceToCenter);
      softness = pow(softness, 1.8);

      gl_FragColor = vec4(vec3(0.96), softness * vAlpha * uOpacity);
    }
  `;

  function createMaterial({ opacity = 1, mode = 0 } = {}) {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uMode: { value: mode },
        uPulse: { value: 0 },
        uOpacity: { value: opacity }
      },
      vertexShader,
      fragmentShader
    });
  }

  /*
    加载页声波：
    只由一条极细、低密度的粒子线组成。
  */
  function createSignal() {
    const positions = new Float32Array(SIGNAL_COUNT * 3);
    const sizes = new Float32Array(SIGNAL_COUNT);
    const alphas = new Float32Array(SIGNAL_COUNT);

    for (let i = 0; i < SIGNAL_COUNT; i += 1) {
      const progress = i / (SIGNAL_COUNT - 1);
      const x = (progress - 0.5) * 10.5;

      positions[i * 3] = x;
      positions[i * 3 + 1] = Math.sin(x * 1.4) * 0.08;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.08;

      sizes[i] = 2.6 + Math.random() * 2.8;
      alphas[i] = 0.25 + Math.random() * 0.72;
    }

    signalGeometry = new THREE.BufferGeometry();
    signalGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    signalGeometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    signalGeometry.setAttribute(
      "aAlpha",
      new THREE.BufferAttribute(alphas, 1)
    );

    signalMaterial = createMaterial({
      opacity: 0.95,
      mode: 0
    });

    signalPoints = new THREE.Points(signalGeometry, signalMaterial);
    signalPoints.position.set(0, 0.15, 0);
    scene.add(signalPoints);
  }

  /*
    主界面与终章共用的远方星点。
    数量保持克制，并让多数粒子透明度很低。
  */
  function createStars() {
    const positions = new Float32Array(STAR_COUNT * 3);
    const sizes = new Float32Array(STAR_COUNT);
    const alphas = new Float32Array(STAR_COUNT);

    for (let i = 0; i < STAR_COUNT; i += 1) {
      const radius = 5 + Math.random() * 23;
      const angle = Math.random() * Math.PI * 2;
      const vertical = (Math.random() - 0.5) * 13;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = vertical;
      positions[i * 3 + 2] = -Math.random() * 48 - 1;

      sizes[i] = 1.2 + Math.random() * 4.2;

      /*
        大多数仅作为背景远信号。
        少数点更亮，用于形成层次。
      */
      alphas[i] = Math.random() > 0.88
        ? 0.38 + Math.random() * 0.26
        : 0.025 + Math.random() * 0.13;
    }

    starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    starGeometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    starGeometry.setAttribute(
      "aAlpha",
      new THREE.BufferAttribute(alphas, 1)
    );

    starMaterial = createMaterial({
      opacity: 0,
      mode: 1
    });

    starPoints = new THREE.Points(starGeometry, starMaterial);
    scene.add(starPoints);
  }

  function init() {
    if (isInitialized) return;

    if (!window.THREE) {
      console.error("Three.js 未成功加载。请检查 CDN 网络连接。");
      return;
    }

    const container = document.getElementById("three-container");

    if (!container) {
      console.error("找不到 #three-container。");
      return;
    }

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x080808, 0.026);

    camera = new THREE.PerspectiveCamera(
      50,
      viewportWidth / viewportHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 8.5);

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(viewportWidth, viewportHeight);
    renderer.setClearColor(0x000000, 0);

    container.appendChild(renderer.domElement);

    clock = new THREE.Clock();

    createSignal();
    createStars();

    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("pointermove", handlePointerMove, {
      passive: true
    });

    isInitialized = true;
    animate();
  }

  function handleResize() {
    if (!camera || !renderer) return;

    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;

    camera.aspect = viewportWidth / viewportHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(viewportWidth, viewportHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  }

  function handlePointerMove(event) {
    targetPointerX = (event.clientX / window.innerWidth - 0.5) * 2;
    targetPointerY = (event.clientY / window.innerHeight - 0.5) * 2;
  }

  function setMode(mode) {
    if (!isInitialized) return;

    currentMode = mode;

    const modeMap = {
      prelude: 0,
      game: 1,
      silence: 2,
      confession: 3
    };

    const shaderMode = modeMap[mode] ?? 0;

    signalMaterial.uniforms.uMode.value = shaderMode;
    starMaterial.uniforms.uMode.value = shaderMode;

    if (mode === "prelude") {
      signalMaterial.uniforms.uOpacity.value = 0.95;
      starMaterial.uniforms.uOpacity.value = 0;
      scene.fog.density = 0.026;
      camera.position.z = 8.5;
    }

    if (mode === "game") {
      signalMaterial.uniforms.uOpacity.value = 0.05;
      starMaterial.uniforms.uOpacity.value = 0.8;
      scene.fog.density = 0.035;
      camera.position.z = 8;
    }

    if (mode === "silence") {
      signalMaterial.uniforms.uOpacity.value = 0;
      starMaterial.uniforms.uOpacity.value = 0.08;
      scene.fog.density = 0.06;
    }

    if (mode === "confession") {
      signalMaterial.uniforms.uOpacity.value = 0;
      starMaterial.uniforms.uOpacity.value = 0.92;
      scene.fog.density = 0.016;
      camera.position.z = 6;
    }
  }

  /*
    点击盲盒时，加载页/主场景里产生一次非常轻的粒子呼吸。
  */
  function pulse(amount = 1) {
    if (!isInitialized) return;

    signalMaterial.uniforms.uPulse.value = amount;

    window.setTimeout(() => {
      if (signalMaterial) {
        signalMaterial.uniforms.uPulse.value = 0;
      }
    }, 460);
  }

  /*
    进入主场景后：
    声波向远处淡去，低密度星点显现。
  */
  function enterGame() {
    setMode("game");

    if (!signalPoints || !starPoints) return;

    const start = performance.now();
    const duration = 1700;

    function transition(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      signalMaterial.uniforms.uOpacity.value = 0.95 * (1 - eased);
      starMaterial.uniforms.uOpacity.value = 0.8 * eased;

      signalPoints.scale.setScalar(1 + eased * 1.3);
      signalPoints.position.z = -eased * 5;

      if (progress < 1) {
        requestAnimationFrame(transition);
      }
    }

    requestAnimationFrame(transition);
  }

  /*
    终章：
    相机缓慢向前推进，粒子穿过镜头后重新放回远处。
    因为速度很低、点数量受控，呈现的是漂流，
    而不是常见的高速星际穿梭。
  */
  function updateConfessionStars(delta) {
    if (!starGeometry) return;

    const positions = starGeometry.attributes.position.array;

    for (let i = 0; i < STAR_COUNT; i += 1) {
      const index = i * 3;

      positions[index + 2] += delta * 3.1;

      /*
        通过镜头后，重新置回最远处。
      */
      if (positions[index + 2] > 4) {
        const radius = 4 + Math.random() * 25;
        const angle = Math.random() * Math.PI * 2;

        positions[index] = Math.cos(angle) * radius;
        positions[index + 1] = (Math.random() - 0.5) * 13;
        positions[index + 2] = -45 - Math.random() * 20;
      }
    }

    starGeometry.attributes.position.needsUpdate = true;

    /*
      让相机不完全笔直，像在一段余韵中轻微漂移。
    */
    camera.position.z -= delta * 0.13;
    camera.position.x = Math.sin(clock.elapsedTime * 0.08) * 0.34;
    camera.position.y = Math.cos(clock.elapsedTime * 0.06) * 0.2;
  }

  function animate() {
    animationFrame = requestAnimationFrame(animate);

    if (!renderer || !scene || !camera) return;

    const delta = Math.min(clock.getDelta(), 0.05);
const elapsed = clock.elapsedTime;


    pointerX += (targetPointerX - pointerX) * 0.025;
    pointerY += (targetPointerY - pointerY) * 0.025;

    if (signalMaterial) {
      signalMaterial.uniforms.uTime.value = elapsed;
    }

    if (starMaterial) {
      starMaterial.uniforms.uTime.value = elapsed;
    }

    if (currentMode === "prelude") {
      signalPoints.rotation.z = Math.sin(elapsed * 0.18) * 0.015;
      camera.position.x += (pointerX * 0.18 - camera.position.x) * 0.018;
      camera.position.y += (-pointerY * 0.1 - camera.position.y) * 0.018;
    }

    if (currentMode === "game") {
      starPoints.rotation.y = elapsed * 0.008;
      starPoints.rotation.x = Math.sin(elapsed * 0.07) * 0.025;

      camera.position.x += (pointerX * 0.24 - camera.position.x) * 0.018;
      camera.position.y += (-pointerY * 0.16 - camera.position.y) * 0.018;
    }

    if (currentMode === "silence") {
      starPoints.rotation.y += delta * 0.003;
    }

    if (currentMode === "confession") {
      updateConfessionStars(delta);
    }

    renderer.render(scene, camera);
  }

  function destroy() {
    cancelAnimationFrame(animationFrame);

    window.removeEventListener("resize", handleResize);
    window.removeEventListener("pointermove", handlePointerMove);

    if (renderer) {
      renderer.dispose();
      renderer.domElement.remove();
    }

    if (signalGeometry) signalGeometry.dispose();
    if (signalMaterial) signalMaterial.dispose();
    if (starGeometry) starGeometry.dispose();
    if (starMaterial) starMaterial.dispose();

    isInitialized = false;
  }

  return {
    init,
    setMode,
    enterGame,
    pulse,
    destroy
  };
})();
