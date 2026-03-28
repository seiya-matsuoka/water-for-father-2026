(() => {
  const canvas = document.getElementById("neo-canvas");
  const ctx = canvas.getContext("2d", { alpha: true });
  const DPR_CAP = 1.2;

  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    currentX: 0,
    currentY: 0,
    targetX: 0,
    targetY: 0,
    velocityX: 0,
    velocityY: 0,
    drag: false,
    pointerId: null,
    lastX: 0,
    lastY: 0,
    lastMove: 0,
    time: 0,
    drift: 0,
  };

  const palette = {
    bgTop: "#020915",
    bgMid: "#071322",
    bgBottom: "#02060d",
    deepBlue: "#14314a",
    blue: "#2b6e96",
    cyan: "#87d9ea",
    aqua: "#65c4d8",
    white: "#edf6fb",
    gray: "#b7cad4",
    green: "#8dd6c0",
    amber: "#f0ba57",
    orange: "#e28b3d",
    warmWhite: "#ffe6b0",
  };

  const blocks = [
    { x: -0.9, y: -0.84, w: 0.34, h: 0.54, c: "cool", a: 0.34 },
    { x: -0.45, y: -0.9, w: 0.28, h: 0.5, c: "cool", a: 0.28 },
    { x: -0.1, y: -0.72, w: 0.22, h: 0.34, c: "warm", a: 0.25 },
    { x: 0.16, y: -0.82, w: 0.28, h: 0.52, c: "cool", a: 0.3 },
    { x: 0.55, y: -0.7, w: 0.3, h: 0.48, c: "cool", a: 0.32 },
    { x: -0.82, y: -0.18, w: 0.42, h: 0.4, c: "warm", a: 0.24 },
    { x: -0.36, y: -0.12, w: 0.3, h: 0.28, c: "cool", a: 0.24 },
    { x: 0.02, y: -0.08, w: 0.5, h: 0.46, c: "warm", a: 0.28 },
    { x: 0.58, y: -0.12, w: 0.36, h: 0.36, c: "cool", a: 0.27 },
    { x: -0.74, y: 0.34, w: 0.36, h: 0.44, c: "cool", a: 0.24 },
    { x: -0.3, y: 0.28, w: 0.28, h: 0.34, c: "warm", a: 0.2 },
    { x: 0.08, y: 0.38, w: 0.24, h: 0.24, c: "cool", a: 0.22 },
    { x: 0.38, y: 0.26, w: 0.3, h: 0.5, c: "cool", a: 0.24 },
    { x: 0.72, y: 0.42, w: 0.26, h: 0.34, c: "warm", a: 0.18 },
  ];

  const roads = [
    { x: -0.18, w: 0.16, glow: 0.42, warm: false },
    { x: 0.22, w: 0.14, glow: 0.34, warm: true },
    { x: 0.64, w: 0.12, glow: 0.24, warm: false },
  ];

  const veils = [
    {
      x: 0.16,
      width: 0.36,
      hue: "gray",
      alpha: 0.16,
      bend: 0.08,
      speed: 0.18,
      depth: 0.82,
    },
    {
      x: 0.42,
      width: 0.28,
      hue: "blue",
      alpha: 0.14,
      bend: -0.06,
      speed: 0.24,
      depth: 0.56,
    },
    {
      x: 0.66,
      width: 0.34,
      hue: "white",
      alpha: 0.17,
      bend: 0.07,
      speed: 0.21,
      depth: 0.92,
    },
    {
      x: 0.84,
      width: 0.24,
      hue: "green",
      alpha: 0.1,
      bend: -0.05,
      speed: 0.15,
      depth: 0.68,
    },
  ];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function resize() {
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    state.dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);

    canvas.width = Math.round(state.width * state.dpr);
    canvas.height = Math.round(state.height * state.dpr);
    canvas.style.width = `${state.width}px`;
    canvas.style.height = `${state.height}px`;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  }

  function setTargetByDelta(dx, dy) {
    state.targetX = clamp(state.targetX + dx * 0.96, -220, 220);
    state.targetY = clamp(state.targetY + dy * 0.88, -220, 220);
    state.velocityX = clamp(dx * 0.12, -10, 10);
    state.velocityY = clamp(dy * 0.12, -10, 10);
  }

  function onPointerDown(event) {
    state.drag = true;
    state.pointerId = event.pointerId;
    state.lastX = event.clientX;
    state.lastY = event.clientY;
    state.lastMove = performance.now();
    canvas.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event) {
    if (!state.drag || event.pointerId !== state.pointerId) {
      return;
    }

    const now = performance.now();
    const dx = event.clientX - state.lastX;
    const dy = event.clientY - state.lastY;
    const elapsed = Math.max(16, now - state.lastMove);

    setTargetByDelta(dx, dy);

    state.velocityX = clamp((dx / elapsed) * 12, -10, 10);
    state.velocityY = clamp((dy / elapsed) * 12, -10, 10);
    state.lastX = event.clientX;
    state.lastY = event.clientY;
    state.lastMove = now;
  }

  function endPointer(event) {
    if (event.pointerId !== state.pointerId) {
      return;
    }
    state.drag = false;
    state.pointerId = null;
  }

  function update(delta) {
    const t = delta / 16.6667;
    state.time += delta * 0.001;
    state.drift += delta * 0.00022;

    if (!state.drag) {
      state.targetX += Math.sin(state.drift * 2.1) * 0.12;
      state.targetY += Math.cos(state.drift * 2.6) * 0.1;
      state.velocityX *= Math.pow(0.965, t);
      state.velocityY *= Math.pow(0.965, t);
      state.targetX += state.velocityX * 0.48;
      state.targetY += state.velocityY * 0.48;
      state.targetX *= Math.pow(0.9983, t);
      state.targetY *= Math.pow(0.9983, t);
    }

    state.targetX = clamp(state.targetX, -230, 230);
    state.targetY = clamp(state.targetY, -230, 230);

    state.currentX += (state.targetX - state.currentX) * (0.09 * t);
    state.currentY += (state.targetY - state.currentY) * (0.09 * t);
  }

  function fillRoundedRect(x, y, width, height, radius) {
    const r = Math.min(radius, width * 0.5, height * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
    ctx.fill();
  }

  function drawBackground() {
    const { width, height } = state;
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, palette.bgTop);
    gradient.addColorStop(0.5, palette.bgMid);
    gradient.addColorStop(1, palette.bgBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const glow = ctx.createRadialGradient(
      width * 0.5 + state.currentX * 0.06,
      height * 0.48 + state.currentY * 0.04,
      0,
      width * 0.5,
      height * 0.48,
      Math.max(width, height) * 0.7,
    );
    glow.addColorStop(0, "rgba(91, 176, 210, 0.10)");
    glow.addColorStop(0.35, "rgba(49, 103, 145, 0.08)");
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  }

  function drawAbstractLayout() {
    const { width, height } = state;
    const shiftX = state.currentX * 0.18;
    const shiftY = state.currentY * 0.12;
    const sceneScale = Math.max(width, height);

    ctx.save();
    ctx.translate(width * 0.5 + shiftX, height * 0.56 + shiftY);
    ctx.rotate(-0.34);

    const bgStreet = ctx.createLinearGradient(0, -sceneScale, 0, sceneScale);
    bgStreet.addColorStop(0, "rgba(12, 26, 38, 0.65)");
    bgStreet.addColorStop(0.5, "rgba(17, 41, 60, 0.38)");
    bgStreet.addColorStop(1, "rgba(8, 16, 26, 0.72)");
    ctx.fillStyle = bgStreet;
    ctx.fillRect(
      -sceneScale * 1.1,
      -sceneScale * 1.2,
      sceneScale * 2.2,
      sceneScale * 2.4,
    );

    for (const road of roads) {
      const x = road.x * sceneScale;
      const w = road.w * sceneScale;
      const roadGradient = ctx.createLinearGradient(
        x,
        -sceneScale,
        x + w,
        sceneScale,
      );
      if (road.warm) {
        roadGradient.addColorStop(0, "rgba(255, 191, 96, 0.02)");
        roadGradient.addColorStop(0.45, `rgba(244, 182, 84, ${road.glow})`);
        roadGradient.addColorStop(1, "rgba(255, 160, 54, 0.04)");
      } else {
        roadGradient.addColorStop(0, "rgba(83, 183, 219, 0.03)");
        roadGradient.addColorStop(0.5, `rgba(78, 164, 204, ${road.glow})`);
        roadGradient.addColorStop(1, "rgba(27, 102, 136, 0.04)");
      }
      ctx.fillStyle = roadGradient;
      ctx.fillRect(x - w * 0.5, -sceneScale * 1.2, w, sceneScale * 2.4);

      ctx.strokeStyle = road.warm
        ? "rgba(255, 237, 190, 0.11)"
        : "rgba(194, 235, 255, 0.09)";
      ctx.lineWidth = Math.max(2, sceneScale * 0.0018);
      for (let i = -8; i <= 10; i += 1) {
        const yy = i * sceneScale * 0.12;
        ctx.beginPath();
        ctx.moveTo(x - w * 0.32, yy);
        ctx.lineTo(x + w * 0.32, yy + sceneScale * 0.02);
        ctx.stroke();
      }
    }

    for (const block of blocks) {
      const x =
        block.x * sceneScale +
        Math.sin(state.time * 0.2 + block.x * 7) * sceneScale * 0.008;
      const y = block.y * sceneScale;
      const w = block.w * sceneScale;
      const h = block.h * sceneScale;

      const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
      if (block.c === "warm") {
        gradient.addColorStop(0, `rgba(234, 163, 70, ${block.a * 0.4})`);
        gradient.addColorStop(0.5, `rgba(255, 201, 119, ${block.a})`);
        gradient.addColorStop(1, "rgba(255, 148, 66, 0.04)");
      } else {
        gradient.addColorStop(0, `rgba(83, 173, 216, ${block.a * 0.45})`);
        gradient.addColorStop(0.45, `rgba(128, 216, 234, ${block.a})`);
        gradient.addColorStop(1, "rgba(51, 112, 153, 0.04)");
      }

      ctx.fillStyle = gradient;
      fillRoundedRect(x, y, w, h, Math.max(12, sceneScale * 0.012));

      ctx.strokeStyle =
        block.c === "warm"
          ? "rgba(255, 236, 189, 0.08)"
          : "rgba(216, 245, 255, 0.06)";
      ctx.lineWidth = Math.max(1.5, sceneScale * 0.0012);
      ctx.stroke();
    }

    ctx.globalCompositeOperation = "screen";
    ctx.strokeStyle = "rgba(235, 245, 252, 0.14)";
    ctx.lineWidth = Math.max(3, sceneScale * 0.0026);
    for (let i = -5; i <= 6; i += 1) {
      const y =
        i * sceneScale * 0.14 +
        Math.sin(state.time * 0.24 + i) * sceneScale * 0.005;
      ctx.beginPath();
      ctx.moveTo(-sceneScale * 0.18, y);
      ctx.lineTo(sceneScale * 0.18, y + sceneScale * 0.03);
      ctx.stroke();
    }

    const avenueGlow = ctx.createLinearGradient(
      -sceneScale * 0.06,
      -sceneScale,
      sceneScale * 0.2,
      sceneScale,
    );
    avenueGlow.addColorStop(0, "rgba(255, 240, 203, 0)");
    avenueGlow.addColorStop(0.42, "rgba(255, 231, 168, 0.17)");
    avenueGlow.addColorStop(0.6, "rgba(181, 228, 242, 0.11)");
    avenueGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = avenueGlow;
    ctx.fillRect(
      -sceneScale * 0.08,
      -sceneScale * 1.1,
      sceneScale * 0.22,
      sceneScale * 2.2,
    );

    ctx.restore();
  }

  function drawLiquidOverlay() {
    const { width, height } = state;
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    for (const veil of veils) {
      const baseX =
        veil.x * width + state.currentX * (0.06 + veil.depth * 0.08);
      const baseY = state.currentY * (0.02 + veil.depth * 0.015);
      const wave =
        Math.sin(state.time * veil.speed * 2.6 + veil.x * 8) * width * 0.04;
      const wave2 =
        Math.cos(state.time * veil.speed * 2 + veil.x * 5) * width * 0.03;
      const w = veil.width * width;

      const gradient = ctx.createLinearGradient(
        baseX - w * 0.5,
        0,
        baseX + w * 0.5,
        height,
      );
      if (veil.hue === "white") {
        gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
        gradient.addColorStop(0.32, `rgba(246, 251, 255, ${veil.alpha})`);
        gradient.addColorStop(
          0.68,
          `rgba(188, 211, 221, ${veil.alpha * 0.75})`,
        );
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      } else if (veil.hue === "gray") {
        gradient.addColorStop(0, "rgba(176, 196, 208, 0)");
        gradient.addColorStop(0.32, `rgba(188, 205, 214, ${veil.alpha})`);
        gradient.addColorStop(
          0.68,
          `rgba(154, 178, 188, ${veil.alpha * 0.74})`,
        );
        gradient.addColorStop(1, "rgba(176, 196, 208, 0)");
      } else if (veil.hue === "green") {
        gradient.addColorStop(0, "rgba(133, 217, 196, 0)");
        gradient.addColorStop(0.34, `rgba(146, 222, 202, ${veil.alpha})`);
        gradient.addColorStop(0.72, `rgba(96, 178, 164, ${veil.alpha * 0.68})`);
        gradient.addColorStop(1, "rgba(133, 217, 196, 0)");
      } else {
        gradient.addColorStop(0, "rgba(112, 186, 214, 0)");
        gradient.addColorStop(0.34, `rgba(136, 205, 226, ${veil.alpha})`);
        gradient.addColorStop(0.72, `rgba(83, 168, 208, ${veil.alpha * 0.72})`);
        gradient.addColorStop(1, "rgba(112, 186, 214, 0)");
      }

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(baseX - w * 0.62, -height * 0.08);
      ctx.bezierCurveTo(
        baseX + wave * 0.65 + width * veil.bend,
        height * 0.22 + baseY,
        baseX - wave2 * 0.8 - width * veil.bend,
        height * 0.48 + baseY,
        baseX + wave * 0.2,
        height * 1.08,
      );
      ctx.lineTo(baseX + w * 0.48, height * 1.08);
      ctx.bezierCurveTo(
        baseX + wave2 * 0.96 + width * veil.bend,
        height * 0.66 + baseY,
        baseX - wave * 0.34 - width * veil.bend,
        height * 0.3 + baseY,
        baseX + w * 0.08,
        -height * 0.08,
      );
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle =
        veil.hue === "green"
          ? "rgba(215, 255, 244, 0.08)"
          : "rgba(248, 252, 255, 0.09)";
      ctx.lineWidth = Math.max(1.8, width * 0.002);
      ctx.beginPath();
      ctx.moveTo(baseX - w * 0.08, -height * 0.06);
      ctx.bezierCurveTo(
        baseX + wave * 0.44,
        height * 0.26 + baseY,
        baseX - wave2 * 0.52,
        height * 0.6 + baseY,
        baseX + w * 0.06,
        height * 1.04,
      );
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawSoftChromaticMist() {
    const { width, height } = state;
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    const pools = [
      { x: 0.28, y: 0.34, r: 0.18, color: "rgba(228, 239, 247, 0.06)" },
      { x: 0.72, y: 0.4, r: 0.22, color: "rgba(118, 196, 223, 0.07)" },
      { x: 0.52, y: 0.72, r: 0.2, color: "rgba(142, 221, 202, 0.05)" },
    ];

    for (const pool of pools) {
      const gradient = ctx.createRadialGradient(
        width * pool.x + state.currentX * 0.08,
        height * pool.y + state.currentY * 0.05,
        0,
        width * pool.x,
        height * pool.y,
        Math.max(width, height) * pool.r,
      );
      gradient.addColorStop(0, pool.color);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();
  }

  function drawT() {
    const { width, height } = state;
    const x =
      width * 0.63 + state.currentX * 0.2 + Math.sin(state.time * 0.5) * 14;
    const y =
      height * 0.48 + state.currentY * 0.16 + Math.cos(state.time * 0.42) * 18;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.22 + state.currentX * 0.00055);
    ctx.globalCompositeOperation = "screen";
    ctx.font = `${Math.round(Math.max(28, width * 0.065))}px Inter, Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const textGradient = ctx.createLinearGradient(-40, -40, 40, 40);
    textGradient.addColorStop(0, "rgba(246, 252, 255, 0.22)");
    textGradient.addColorStop(0.5, "rgba(158, 212, 230, 0.18)");
    textGradient.addColorStop(1, "rgba(122, 212, 190, 0.14)");

    ctx.fillStyle = textGradient;
    ctx.shadowColor = "rgba(214, 244, 255, 0.1)";
    ctx.shadowBlur = 18;
    ctx.fillText("t", 0, 0);
    ctx.shadowBlur = 0;
    ctx.lineWidth = Math.max(1.1, width * 0.0014);
    ctx.strokeStyle = "rgba(236, 249, 255, 0.1)";
    ctx.strokeText("t", 0, 0);
    ctx.restore();
  }

  function drawFrameGlow() {
    const { width, height } = state;
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    const topBand = ctx.createLinearGradient(0, 0, 0, height * 0.24);
    topBand.addColorStop(0, "rgba(205, 232, 244, 0.055)");
    topBand.addColorStop(1, "rgba(205, 232, 244, 0)");
    ctx.fillStyle = topBand;
    ctx.fillRect(0, 0, width, height * 0.24);

    const side = ctx.createLinearGradient(0, 0, width * 0.16, 0);
    side.addColorStop(0, "rgba(110, 177, 206, 0.03)");
    side.addColorStop(1, "rgba(110, 177, 206, 0)");
    ctx.fillStyle = side;
    ctx.fillRect(0, 0, width * 0.16, height);
    ctx.fillRect(width - width * 0.16, 0, width * 0.16, height);

    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, state.width, state.height);
    drawBackground();
    drawAbstractLayout();
    drawSoftChromaticMist();
    drawLiquidOverlay();
    drawT();
    drawFrameGlow();
  }

  let lastTime = performance.now();
  function frame(now) {
    const delta = Math.min(32, now - lastTime);
    lastTime = now;
    update(delta);
    render();
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize, { passive: true });
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("pointerleave", endPointer);

  resize();
  requestAnimationFrame((now) => {
    lastTime = now;
    frame(now);
  });
})();
