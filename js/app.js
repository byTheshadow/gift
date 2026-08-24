/* =========================================================
   Echoes for 夜寒
   Main App Controller
   ========================================================= */

(() => {
  const DATA = window.ECHO_DATA;
  const Audio = window.EchoAudio;
  const Visuals = window.EchoVisuals;

  if (!DATA || !Audio || !Visuals) {
    console.error("必要模块未加载：请检查 data.js、audio.js、visuals.js。");
    return;
  }

  const state = {
    selectedCount: 0,
    collectedArtifactIds: [],
    openedBoxIds: [],
    pendingArtifact: null,
    isBusy: false,
    soundMuted: false,
    hasDragged: false
  };

  const elements = {
    preludeScene: document.getElementById("prelude-scene"),
    gameScene: document.getElementById("game-scene"),
    artifactScene: document.getElementById("artifact-scene"),
    confessionScene: document.getElementById("confession-scene"),

    enterButton: document.getElementById("enter-button"),
    blindBoxTrack: document.getElementById("blindbox-track"),
    gameHint: document.getElementById("game-hint"),
    progressCount: document.getElementById("progress-count"),

    artifactNumber: document.getElementById("artifact-number"),
    artifactIcon: document.getElementById("artifact-icon"),
    artifactTitle: document.getElementById("artifact-title"),
    artifactEn: document.getElementById("artifact-en"),
    artifactDescription: document.getElementById("artifact-description"),
    acceptArtifactButton: document.getElementById("accept-artifact-button"),

    soundToggle: document.getElementById("sound-toggle"),
    soundStatus: document.getElementById("sound-status"),

    shatterCanvas: document.getElementById("shatter-canvas"),

    confessionText: document.getElementById("confession-text"),
    confessionSignature: document.getElementById("confession-signature"),
    replayButton: document.getElementById("replay-button")
  };

  const scenes = [
    elements.preludeScene,
    elements.gameScene,
    elements.artifactScene,
    elements.confessionScene
  ];

  /* -------------------------------------------------------
     基础工具
     ------------------------------------------------------- */

  function wait(duration) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, duration);
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  /*
    场景切换：
    先让旧场景淡出，再显示新场景。
  */
  async function showScene(nextScene) {
    const currentScene = scenes.find((scene) =>
      scene.classList.contains("scene--active")
    );

    if (currentScene === nextScene) return;

    if (currentScene) {
      currentScene.classList.remove("scene--active");
      await wait(500);
      currentScene.hidden = true;
    }

    nextScene.hidden = false;

    requestAnimationFrame(() => {
      nextScene.classList.add("scene--active");
    });
  }

  function updateProgress() {
    elements.progressCount.textContent =
      `${state.selectedCount} / ${DATA.maxSelections}`;
  }

  function updateGameHint(text) {
    elements.gameHint.textContent = text;
  }

  function getArtifactById(id) {
    return DATA.artifacts[id];
  }

  function getAvailableArtifactIds() {
    return Object.keys(DATA.artifacts).filter(
      (artifactId) => !state.collectedArtifactIds.includes(artifactId)
    );
  }

  /*
    用户可以自由选择六个盲盒。

    若盲盒对应信物尚未收集，优先给该信物；
    如果同类型信物已收集，则自动给一个尚未收集的其他信物。

    这样用户即使连续选择两个「休止符」类型的盲盒，
    仍然可以在三次开启内集齐三个不同信物。
  */
  function resolveArtifactForBox(box) {
    const availableIds = getAvailableArtifactIds();

    if (availableIds.includes(box.artifactId)) {
      return getArtifactById(box.artifactId);
    }

    return getArtifactById(availableIds[0]);
  }

  /* -------------------------------------------------------
     盲盒渲染
     ------------------------------------------------------- */

  function createBlindBoxElement(box) {
    const article = document.createElement("article");

    article.className = "blindbox";
    article.dataset.boxId = box.id;
    article.setAttribute("role", "listitem");
    article.setAttribute("tabindex", "0");
    article.setAttribute(
      "aria-label",
      `开启盲盒：${box.title}。${box.initialHint}`
    );

    article.innerHTML = `
      <span class="blindbox-number">${escapeHtml(box.number)}</span>

      <div class="blindbox-icon">
        ${box.icon}
      </div>

      <h3 class="blindbox-title">${escapeHtml(box.title)}</h3>

      <p class="blindbox-hint">
        ${escapeHtml(box.initialHint)}
      </p>
    `;

    article.addEventListener("click", () => {
      if (!state.hasDragged) {
        openBlindBox(box, article);
      }
    });

    article.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openBlindBox(box, article);
      }
    });

    return article;
  }

  function renderBlindBoxes() {
    const fragment = document.createDocumentFragment();

    DATA.blindBoxes.forEach((box) => {
      fragment.appendChild(createBlindBoxElement(box));
    });

    elements.blindBoxTrack.appendChild(fragment);
  }

  /* -------------------------------------------------------
     横向拖拽滚动
     ------------------------------------------------------- */

  function setupDragScroll() {
    const track = elements.blindBoxTrack;

    let isPointerDown = false;
    let startX = 0;
    let startScrollLeft = 0;
    let dragDistance = 0;

    track.addEventListener("pointerdown", (event) => {
      isPointerDown = true;
      dragDistance = 0;
      startX = event.clientX;
      startScrollLeft = track.scrollLeft;

      track.setPointerCapture?.(event.pointerId);
      track.classList.add("is-dragging");
    });

    track.addEventListener("pointermove", (event) => {
      if (!isPointerDown) return;

      const distance = event.clientX - startX;
      dragDistance = Math.max(dragDistance, Math.abs(distance));

      if (dragDistance > 6) {
        track.scrollLeft = startScrollLeft - distance;
      }
    });

    function endDrag() {
      if (!isPointerDown) return;

      isPointerDown = false;
      track.classList.remove("is-dragging");

      /*
        防止用户拖拽结束时误触发盲盒 click。
      */
      if (dragDistance > 6) {
        state.hasDragged = true;

        window.setTimeout(() => {
          state.hasDragged = false;
        }, 90);
      }
    }

    track.addEventListener("pointerup", endDrag);
    track.addEventListener("pointercancel", endDrag);
    track.addEventListener("pointerleave", endDrag);

    /*
      桌面端鼠标滚轮转换成横向滑动。
      移动端仍然使用原生手指滑动。
    */
    track.addEventListener(
      "wheel",
      (event) => {
        if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
          track.scrollLeft += event.deltaY;
        }
      },
      { passive: true }
    );
  }

  /* -------------------------------------------------------
     盲盒开启逻辑
     ------------------------------------------------------- */

  async function openBlindBox(box, boxElement) {
    if (state.isBusy) return;
    if (state.openedBoxIds.includes(box.id)) return;
    if (state.selectedCount >= DATA.maxSelections) return;

    state.isBusy = true;

    Audio.resume();
    Audio.playBoxSelect();
    Visuals.pulse(0.9);

    const hintElement = boxElement.querySelector(".blindbox-hint");

    boxElement.classList.add("is-opening");
    hintElement.textContent = box.openingHint;

    updateGameHint("正在读取这一段尚未命名的频率……");

    /*
      四次轻微节拍，对应摇晃动画。
    */
    [0, 150, 320, 500].forEach((delay, index) => {
      window.setTimeout(() => {
        Audio.playRattleTick(index);
      }, delay);
    });

    await wait(780);

    boxElement.classList.remove("is-opening");
    boxElement.classList.add("is-opened");

    state.openedBoxIds.push(box.id);

    const artifact = resolveArtifactForBox(box);
    state.pendingArtifact = artifact;

    Audio.playArtifactReveal();
    Visuals.pulse(1.45);

    await showArtifact(artifact);

    state.isBusy = false;
  }

  /* -------------------------------------------------------
     信物展示与收集
     ------------------------------------------------------- */

  async function showArtifact(artifact) {
    elements.artifactNumber.textContent = artifact.archiveNumber;
    elements.artifactIcon.innerHTML = artifact.icon;
    elements.artifactTitle.textContent = artifact.title;
    elements.artifactEn.textContent = artifact.englishTitle;
    elements.artifactDescription.textContent = artifact.description;

    await showScene(elements.artifactScene);
  }

  async function acceptArtifact() {
    if (state.isBusy || !state.pendingArtifact) return;

    state.isBusy = true;

    const artifact = state.pendingArtifact;

    Audio.playArtifactAccept();

    /*
      信物收下时，SVG 先缩小淡出，
      营造「变成背景中的一颗星」的感觉。
    */
    elements.artifactIcon.animate(
      [
        {
          transform: "translateY(0) scale(1)",
          opacity: 1
        },
        {
          transform: "translateY(-7rem) scale(0.12)",
          opacity: 0
        }
      ],
      {
        duration: 750,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards"
      }
    );

    await wait(570);

    if (!state.collectedArtifactIds.includes(artifact.id)) {
      state.collectedArtifactIds.push(artifact.id);
    }

    state.selectedCount = state.collectedArtifactIds.length;
    state.pendingArtifact = null;

    updateProgress();

    /*
      重置内联动画残留状态，
      供下一枚信物正常出现。
    */
    elements.artifactIcon.style.opacity = "";
    elements.artifactIcon.style.transform = "";

    if (state.selectedCount < DATA.maxSelections) {
      updateGameHint(
        `已收下 ${state.selectedCount} 段回声。还需要 ${DATA.maxSelections - state.selectedCount} 段。`
      );

      await showScene(elements.gameScene);
      state.isBusy = false;
      return;
    }

    updateGameHint("三段回声已经完整。");

    await beginFinalTransition();
    state.isBusy = false;
  }

  /* -------------------------------------------------------
     玻璃碎裂 Canvas
     ------------------------------------------------------- */

  function createShards(width, height) {
    const shards = [];
    const centerX = width / 2;
    const centerY = height / 2;
    const shardCount = Math.max(42, Math.floor(width / 24));

    for (let i = 0; i < shardCount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * Math.min(width, height) * 0.2;

      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;

      const size = 22 + Math.random() * 95;
      const sides = 3 + Math.floor(Math.random() * 3);
      const points = [];

      for (let pointIndex = 0; pointIndex < sides; pointIndex += 1) {
        const pointAngle =
          (Math.PI * 2 * pointIndex) / sides + Math.random() * 0.65;

        const pointRadius = size * (0.45 + Math.random() * 0.7);

        points.push({
          x: Math.cos(pointAngle) * pointRadius,
          y: Math.sin(pointAngle) * pointRadius
        });
      }

      const directionX = x - centerX;
      const directionY = y - centerY;
      const directionLength = Math.max(
        1,
        Math.sqrt(directionX * directionX + directionY * directionY)
      );

      shards.push({
        x,
        y,
        points,
        vx:
          (directionX / directionLength) * (2 + Math.random() * 10) +
          (Math.random() - 0.5) * 3,
        vy:
          (directionY / directionLength) * (2 + Math.random() * 10) -
          1.5 +
          (Math.random() - 0.5) * 3,
        rotation: Math.random() * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * 0.18,
        alpha: 0.38 + Math.random() * 0.34
      });
    }

    return shards;
  }

  function drawCracks(ctx, width, height, progress) {
    const centerX = width / 2;
    const centerY = height / 2;
    const rays = 18;

    ctx.save();
    ctx.lineWidth = 0.65;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.08 + progress * 0.42})`;

    for (let i = 0; i < rays; i += 1) {
      const angle = (Math.PI * 2 * i) / rays + Math.sin(i * 12.4) * 0.2;
      const maxLength = Math.max(width, height) * (0.3 + progress * 0.72);

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);

      let currentX = centerX;
      let currentY = centerY;
      const steps = 3 + Math.floor(Math.random() * 3);

      for (let step = 0; step < steps; step += 1) {
        const stepLength = maxLength / steps;
        const variation = (Math.random() - 0.5) * 0.34;

        currentX += Math.cos(angle + variation) * stepLength;
        currentY += Math.sin(angle + variation) * stepLength;

        ctx.lineTo(currentX, currentY);
      }

      ctx.stroke();
    }

    ctx.restore();
  }

  function runShatterAnimation() {
    return new Promise((resolve) => {
      const canvas = elements.shatterCanvas;
      const ctx = canvas.getContext("2d");

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const shards = createShards(width, height);
      const startTime = performance.now();
      const crackDuration = 520;
      const flightDuration = 1450;
      const totalDuration = crackDuration + flightDuration;

      canvas.style.opacity = "1";

      function render(now) {
        const elapsed = now - startTime;
        const crackProgress = Math.min(elapsed / crackDuration, 1);
        const flightProgress = Math.max(
          0,
          Math.min((elapsed - crackDuration) / flightDuration, 1)
        );

        ctx.clearRect(0, 0, width, height);

        /*
          先出现裂纹，再让玻璃碎片飞离。
        */
        if (crackProgress < 1) {
          drawCracks(ctx, width, height, crackProgress);
        }

        if (elapsed >= crackDuration) {
          const fade = 1 - flightProgress;

          shards.forEach((shard) => {
            shard.x += shard.vx * 2.3;
            shard.y += shard.vy * 2.3;
            shard.vy += 0.018;
            shard.rotation += shard.rotationSpeed;

            ctx.save();
            ctx.translate(shard.x, shard.y);
            ctx.rotate(shard.rotation);

            ctx.beginPath();

            shard.points.forEach((point, index) => {
              if (index === 0) {
                ctx.moveTo(point.x, point.y);
              } else {
                ctx.lineTo(point.x, point.y);
              }
            });

            ctx.closePath();

            ctx.fillStyle = `rgba(255, 255, 255, ${
              shard.alpha * fade * 0.12
            })`;

            ctx.strokeStyle = `rgba(255, 255, 255, ${
              shard.alpha * fade * 0.8
            })`;

            ctx.lineWidth = 0.75;
            ctx.fill();
            ctx.stroke();

            ctx.restore();
          });
        }

        if (elapsed < totalDuration) {
          requestAnimationFrame(render);
        } else {
          ctx.clearRect(0, 0, width, height);
          canvas.style.opacity = "0";
          resolve();
        }
      }

      requestAnimationFrame(render);
    });
  }

  /* -------------------------------------------------------
     最终转场与表白
     ------------------------------------------------------- */

  async function beginFinalTransition() {
    state.isBusy = true;

    /*
      1. 短暂保留最后一个信物画面；
      2. 抽离所有已有声音；
      3. 场景进入压暗静止状态；
      4. 播放碎裂与 Canvas 动画；
      5. 进入星河终章。
    */
    await wait(650);

    Audio.silenceNow();
    Visuals.setMode("silence");

    elements.artifactScene.classList.remove("scene--active");

    await wait(430);

    Audio.playShatter();

    const shatterPromise = runShatterAnimation();

    await wait(350);

    elements.artifactScene.hidden = true;

    await shatterPromise;

    Visuals.setMode("confession");
    Audio.startAmbient();

    await showScene(elements.confessionScene);

    await wait(900);

    await playConfession();

    state.isBusy = false;
  }

  /*
    每一句单独出现：
    - 字符逐个显示；
    - 整句完成后保持渐显；
    - 空行只作为停顿；
    这样不会让整段文字瞬间占满画面。
  */
  async function typeLine(lineElement, text) {
    const typingSpeed = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
      ? 0
      : 42;

    lineElement.classList.add("is-visible");

    for (let index = 0; index < text.length; index += 1) {
      lineElement.textContent += text[index];

      if (typingSpeed > 0) {
        await wait(typingSpeed);
      }
    }
  }

  async function playConfession() {
    elements.confessionText.innerHTML = "";
    elements.confessionSignature.hidden = true;
    elements.confessionSignature.classList.remove("is-visible");
    elements.replayButton.hidden = true;

    for (const line of DATA.confessionLines) {
      if (!line) {
        await wait(650);
        continue;
      }

      const lineElement = document.createElement("p");
      lineElement.className = "confession-line";
      lineElement.textContent = "";

      elements.confessionText.appendChild(lineElement);

      await typeLine(lineElement, line);
      await wait(470);
    }

    elements.confessionSignature.textContent = DATA.signature;
    elements.confessionSignature.hidden = false;

    requestAnimationFrame(() => {
      elements.confessionSignature.classList.add("is-visible");
    });

    await wait(1300);

    elements.replayButton.hidden = false;
  }

  /* -------------------------------------------------------
     音效开关
     ------------------------------------------------------- */

  function updateSoundButton() {
    const isMuted = state.soundMuted;

    elements.soundStatus.textContent = isMuted ? "SOUND: OFF" : "SOUND: ON";

    elements.soundToggle.setAttribute(
      "aria-label",
      isMuted ? "开启音效" : "关闭音效"
    );

    elements.soundToggle.setAttribute("aria-pressed", String(isMuted));

    const icon = elements.soundToggle.querySelector(".sound-icon");

    if (icon) {
      icon.innerHTML = isMuted
        ? `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M4 10v4h4l5 4V6L8 10H4Z"></path>
            <path d="M16 9l5 6"></path>
            <path d="M21 9l-5 6"></path>
          </svg>
        `
        : `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M4 10v4h4l5 4V6L8 10H4Z"></path>
            <path d="M16 9.5c.8.65 1.25 1.52 1.25 2.5s-.45 1.85-1.25 2.5"></path>
            <path d="M18.5 7c1.55 1.25 2.5 3 2.5 5s-.95 3.75-2.5 5"></path>
          </svg>
        `;
    }
  }

  function toggleSound() {
    Audio.resume();

    state.soundMuted = Audio.toggleMuted();
    updateSoundButton();

    /*
      用户在终章中重新打开声音时，
      恢复环境和弦。
    */
    if (!state.soundMuted && elements.confessionScene.classList.contains("scene--active")) {
      Audio.startAmbient();
    }
  }

  /* -------------------------------------------------------
     初始化与事件监听
     ------------------------------------------------------- */

  function bindEvents() {
    elements.enterButton.addEventListener("click", async () => {
      if (state.isBusy) return;

      state.isBusy = true;

      await Audio.resume();
      Audio.playEnterChord();
      Visuals.enterGame();

      elements.enterButton.disabled = true;

      await wait(780);

      updateGameHint("滑动浏览，选择一只盲盒。");

      await showScene(elements.gameScene);

      state.isBusy = false;
    });

    elements.acceptArtifactButton.addEventListener("click", acceptArtifact);

    elements.soundToggle.addEventListener("click", toggleSound);

    elements.replayButton.addEventListener("click", () => {
      window.location.reload();
    });
  }

  function init() {
    Visuals.init();
    Visuals.setMode("prelude");

    renderBlindBoxes();
    setupDragScroll();
    bindEvents();

    updateProgress();
    updateSoundButton();

    /*
      修正 aria-labelledby 指向：
      index.html 中终章标题是动态内容，
      所以在运行时添加 aria-label。
    */
    elements.confessionScene.setAttribute("aria-label", "最终讯息");
  }

  init();
})();
