(() => {
  const canvas = document.getElementById("neo-canvas");
  const ctx = canvas.getContext("2d", { alpha: true });
  const DPR_CAP = 1.1;

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
    bgTop: "#02060d",
    bgMid: "#08121d",
    bgBottom: "#040811",
    baseCool: "rgba(76, 157, 196, 0.18)",
    baseCoolSoft: "rgba(136, 206, 226, 0.11)",
    baseWarm: "rgba(232, 166, 68, 0.18)",
    baseWarmSoft: "rgba(255, 220, 154, 0.09)",
    line: "rgba(228, 241, 248, 0.11)",
    lineWarm: "rgba(255, 224, 170, 0.08)",
  };

  const microTiles = [];
  const tracerLines = [];
  const shards = [];

  function seeded(seed) {
    let value = seed >>> 0;
    return () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }

  const rand = seeded(20260328);

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function createLayout() {
    microTiles.length = 0;
    tracerLines.length = 0;
    shards.length = 0;

    for (let band = 0; band < 7; band += 1) {
      const baseX = -0.98 + band * 0.31 + (rand() - 0.5) * 0.05;
      const tilt = -0.34 + (rand() - 0.5) * 0.07;
      const rows = 20 + Math.floor(rand() * 10);
      for (let i = 0; i < rows; i += 1) {
        const y = -1.08 + i * 0.1 + (rand() - 0.5) * 0.05;
        const pieces = 4 + Math.floor(rand() * 4);
        let cursor = baseX + (rand() - 0.5) * 0.06;
        for (let j = 0; j < pieces; j += 1) {
          const w = 0.04 + rand() * 0.08;
          const h = 0.024 + rand() * 0.065;
          const gap = 0.012 + rand() * 0.03;
          const hueRoll = rand();
          let fill = palette.baseCool;
          let glow = "rgba(188, 234, 245, 0.06)";
          if (hueRoll > 0.68 && hueRoll < 0.9) {
            fill = palette.baseWarm;
            glow = "rgba(255, 223, 156, 0.07)";
          } else if (hueRoll >= 0.9) {
            fill = "rgba(121, 192, 176, 0.14)";
            glow = "rgba(190, 240, 227, 0.055)";
          }
          microTiles.push({
            x: cursor + (rand() - 0.5) * 0.018,
            y,
            w,
            h,
            rot: tilt + (rand() - 0.5) * 0.08,
            alpha: 0.35 + rand() * 0.65,
            fill,
            glow,
            radius: 0.003 + rand() * 0.015,
            drift: 0.45 + rand() * 1.1,
            offset: rand() * Math.PI * 2,
          });
          cursor += w + gap;
        }
      }
    }

    for (let i = 0; i < 44; i += 1) {
      tracerLines.push({
        x: -1 + rand() * 2,
        y: -1 + rand() * 2,
        len: 0.06 + rand() * 0.22,
        width: 0.0015 + rand() * 0.004,
        rot: -0.34 + (rand() - 0.5) * 0.09,
        alpha: 0.04 + rand() * 0.08,
        warm: rand() > 0.76,
        speed: 0.3 + rand() * 0.8,
        offset: rand() * Math.PI * 2,
      });
    }

    for (let i = 0; i < 16; i += 1) {
      shards.push({
        x: -0.9 + rand() * 1.8,
        y: -1.04 + rand() * 2.1,
        w: 0.12 + rand() * 0.16,
        h: 0.32 + rand() * 0.4,
        rot: -0.36 + (rand() - 0.5) * 0.14,
        alpha: 0.035 + rand() * 0.04,
        color:
          rand() > 0.6
            ? "rgba(118, 204, 229, 0.08)"
            : "rgba(255, 202, 122, 0.055)",
        speed: 0.18 + rand() * 0.3,
        offset: rand() * Math.PI * 2,
      });
    }
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
    state.targetX = clamp(state.targetX + dx * 0.72, -180, 180);
    state.targetY = clamp(state.targetY + dy * 0.72, -180, 180);
    state.velocityX = clamp(dx * 0.11, -8, 8);
    state.velocityY = clamp(dy * 0.11, -8, 8);
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
    if (!state.drag || event.pointerId !== state.pointerId) return;

    const now = performance.now();
    const dx = event.clientX - state.lastX;
    const dy = event.clientY - state.lastY;
    const elapsed = Math.max(16, now - state.lastMove);

    setTargetByDelta(dx, dy);
    state.velocityX = clamp((dx / elapsed) * 10.5, -8, 8);
    state.velocityY = clamp((dy / elapsed) * 10.5, -8, 8);
    state.lastX = event.clientX;
    state.lastY = event.clientY;
    state.lastMove = now;
  }

  function endPointer(event) {
    if (event.pointerId !== state.pointerId) return;
    state.drag = false;
    state.pointerId = null;
  }

  function update(delta) {
    const t = delta / 16.6667;
    state.time += delta * 0.001;
    state.drift += delta * 0.00022;

    if (!state.drag) {
      state.targetX += Math.sin(state.drift * 2.0) * 0.12;
      state.targetY += Math.cos(state.drift * 2.6) * 0.1;
      state.velocityX *= Math.pow(0.968, t);
      state.velocityY *= Math.pow(0.968, t);
      state.targetX += state.velocityX * 0.34;
      state.targetY += state.velocityY * 0.34;
      state.targetX *= Math.pow(0.9984, t);
      state.targetY *= Math.pow(0.9984, t);
    }

    state.targetX = clamp(state.targetX, -190, 190);
    state.targetY = clamp(state.targetY, -190, 190);
    state.currentX += (state.targetX - state.currentX) * (0.08 * t);
    state.currentY += (state.targetY - state.currentY) * (0.08 * t);
  }

  function roundedRect(x, y, width, height, radius) {
    const r = Math.min(radius, width * 0.5, height * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
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
      width * 0.5 + state.currentX * 0.02,
      height * 0.52 + state.currentY * 0.02,
      0,
      width * 0.5,
      height * 0.52,
      Math.max(width, height) * 0.72,
    );
    glow.addColorStop(0, "rgba(87, 163, 194, 0.09)");
    glow.addColorStop(0.45, "rgba(28, 74, 103, 0.07)");
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  }

  function drawAbstractBase() {
    const { width, height } = state;
    const size = Math.max(width, height);
    const baseShiftX = state.currentX * 0.055;
    const baseShiftY = state.currentY * 0.04;

    ctx.save();
    ctx.translate(width * 0.5 + baseShiftX, height * 0.54 + baseShiftY);
    ctx.rotate(-0.34);

    const field = ctx.createLinearGradient(0, -size, 0, size);
    field.addColorStop(0, "rgba(10, 21, 34, 0.85)");
    field.addColorStop(0.46, "rgba(18, 39, 58, 0.52)");
    field.addColorStop(1, "rgba(8, 16, 27, 0.92)");
    ctx.fillStyle = field;
    ctx.fillRect(-size * 1.2, -size * 1.35, size * 2.4, size * 2.7);

    ctx.globalCompositeOperation = "screen";
    for (const shard of shards) {
      const x =
        shard.x * size +
        Math.sin(state.time * shard.speed + shard.offset) * size * 0.012;
      const y = shard.y * size;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(shard.rot);
      ctx.fillStyle = shard.color.replace(
        /0\.0\d+\)/,
        `${shard.alpha.toFixed(3)})`,
      );
      roundedRect(
        -shard.w * size * 0.5,
        -shard.h * size * 0.5,
        shard.w * size,
        shard.h * size,
        size * 0.02,
      );
      ctx.fill();
      ctx.restore();
    }

    for (const tile of microTiles) {
      const wobble =
        Math.sin(state.time * tile.drift + tile.offset) * size * 0.0026;
      const x = tile.x * size + wobble;
      const y =
        tile.y * size +
        Math.cos(state.time * tile.drift * 0.72 + tile.offset) * size * 0.0018;
      const w = tile.w * size;
      const h = tile.h * size;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tile.rot);
      ctx.fillStyle = tile.fill.replace(
        /0\.\d+\)/,
        `${(parseFloat(tile.fill.match(/0\.(\d+)/)?.[0] || "0.18") * tile.alpha).toFixed(3)})`,
      );
      roundedRect(-w * 0.5, -h * 0.5, w, h, tile.radius * size);
      ctx.fill();

      if (h > size * 0.035 || w > size * 0.065) {
        ctx.fillStyle = tile.glow;
        roundedRect(
          -w * 0.4,
          -h * 0.14,
          w * 0.8,
          h * 0.18,
          tile.radius * size * 0.7,
        );
        ctx.fill();
      }
      ctx.restore();
    }

    for (const tracer of tracerLines) {
      const x = tracer.x * size;
      const y =
        tracer.y * size +
        Math.sin(state.time * tracer.speed + tracer.offset) * size * 0.02;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tracer.rot);
      ctx.strokeStyle = tracer.warm ? palette.lineWarm : palette.line;
      ctx.lineWidth = Math.max(1, tracer.width * size);
      ctx.globalAlpha = tracer.alpha;
      ctx.beginPath();
      ctx.moveTo(-tracer.len * size * 0.5, 0);
      ctx.lineTo(tracer.len * size * 0.5, 0);
      ctx.stroke();
      ctx.restore();
    }

    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(238, 245, 250, 0.08)";
    for (let i = -3; i <= 4; i += 1) {
      const x =
        i * size * 0.22 + Math.sin(state.time * 0.18 + i) * size * 0.008;
      roundedRect(
        x - size * 0.012,
        -size * 1.05,
        size * 0.024,
        size * 2.1,
        size * 0.01,
      );
      ctx.fill();
    }

    ctx.restore();
  }

  function overlayColorStops(phase, alphaScale = 1) {
    const c1 = 0.5 + 0.5 * Math.sin(phase);
    const c2 = 0.5 + 0.5 * Math.sin(phase + 2.1);
    const c3 = 0.5 + 0.5 * Math.sin(phase + 4.2);

    const a = (0.06 + c1 * 0.11) * alphaScale;
    const b = (0.05 + c2 * 0.1) * alphaScale;
    const c = (0.04 + c3 * 0.08) * alphaScale;

    return [
      `rgba(${Math.round(222 + c1 * 20)}, ${Math.round(232 + c1 * 18)}, ${Math.round(242 + c1 * 13)}, ${a.toFixed(3)})`,
      `rgba(${Math.round(150 + c2 * 38)}, ${Math.round(194 + c2 * 24)}, ${Math.round(220 + c2 * 20)}, ${b.toFixed(3)})`,
      `rgba(${Math.round(126 + c3 * 18)}, ${Math.round(193 + c3 * 24)}, ${Math.round(182 + c3 * 16)}, ${c.toFixed(3)})`,
    ];
  }

  function drawOverlayVeils() {
    const { width, height } = state;
    const overlayX = state.currentX * 0.22;
    const overlayY = state.currentY * 0.16;
    const phase = state.time * 0.34;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    for (let i = 0; i < 5; i += 1) {
      const px = width * (0.16 + i * 0.18) + overlayX * (0.6 + i * 0.12);
      const wave1 =
        Math.sin(state.time * (0.42 + i * 0.08) + i * 0.8) *
        width *
        (0.026 + i * 0.004);
      const wave2 =
        Math.cos(state.time * (0.34 + i * 0.06) + i * 1.2) *
        width *
        (0.022 + i * 0.003);
      const ribbonWidth = width * (0.16 + i * 0.035);
      const stops = overlayColorStops(phase + i * 0.55, 0.95 - i * 0.08);
      const grad = ctx.createLinearGradient(
        px - ribbonWidth,
        0,
        px + ribbonWidth,
        height,
      );
      grad.addColorStop(0, "rgba(255,255,255,0)");
      grad.addColorStop(0.24, stops[0]);
      grad.addColorStop(0.52, stops[1]);
      grad.addColorStop(0.78, stops[2]);
      grad.addColorStop(1, "rgba(255,255,255,0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(px - ribbonWidth * 0.78, -height * 0.08);
      ctx.bezierCurveTo(
        px + wave1,
        height * 0.22 + overlayY,
        px - wave2,
        height * 0.46 + overlayY,
        px + wave1 * 0.4,
        height * 1.08,
      );
      ctx.lineTo(px + ribbonWidth * 0.44, height * 1.08);
      ctx.bezierCurveTo(
        px + wave2 * 1.08,
        height * 0.62 + overlayY,
        px - wave1 * 0.52,
        height * 0.26 + overlayY,
        px + ribbonWidth * 0.02,
        -height * 0.08,
      );
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = `rgba(245, 251, 255, ${(0.07 - i * 0.01).toFixed(3)})`;
      ctx.lineWidth = Math.max(1.4, width * 0.0018);
      ctx.beginPath();
      ctx.moveTo(px - ribbonWidth * 0.1, -height * 0.06);
      ctx.bezierCurveTo(
        px + wave2 * 0.6,
        height * 0.26 + overlayY,
        px - wave1 * 0.4,
        height * 0.68 + overlayY,
        px + ribbonWidth * 0.08,
        height * 1.04,
      );
      ctx.stroke();
    }

    for (let i = 0; i < 12; i += 1) {
      const rx = width * (0.08 + i * 0.084) + overlayX * (0.9 + (i % 3) * 0.25);
      const ry =
        height * (0.12 + (i % 6) * 0.14) + overlayY * (0.7 + (i % 4) * 0.15);
      const r = Math.max(width, height) * (0.05 + (i % 4) * 0.016);
      const stops = overlayColorStops(phase + i * 0.37, 0.7);
      const radial = ctx.createRadialGradient(rx, ry, 0, rx, ry, r);
      radial.addColorStop(0, stops[0]);
      radial.addColorStop(0.45, stops[1]);
      radial.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = radial;
      ctx.fillRect(rx - r, ry - r, r * 2, r * 2);
    }

    ctx.restore();
  }

  function drawT() {
    const { width, height } = state;
    const overlayX = state.currentX * 0.26;
    const overlayY = state.currentY * 0.18;
    const x = width * 0.58 + overlayX + Math.sin(state.time * 0.46) * 18;
    const y = height * 0.5 + overlayY + Math.cos(state.time * 0.4) * 24;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(
      -0.18 + state.currentX * 0.0007 + Math.sin(state.time * 0.18) * 0.04,
    );
    ctx.globalCompositeOperation = "screen";
    ctx.font = `${Math.round(Math.max(28, width * 0.066))}px Inter, Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const tg = ctx.createLinearGradient(-40, -46, 46, 42);
    const stops = overlayColorStops(state.time * 0.28 + 1.2, 1.05);
    tg.addColorStop(0, stops[0]);
    tg.addColorStop(0.5, stops[1]);
    tg.addColorStop(1, stops[2]);

    ctx.fillStyle = tg;
    ctx.shadowColor = "rgba(233, 247, 255, 0.12)";
    ctx.shadowBlur = 16;
    ctx.fillText("t", 0, 0);
    ctx.shadowBlur = 0;
    ctx.lineWidth = Math.max(1, width * 0.0012);
    ctx.strokeStyle = "rgba(244, 251, 255, 0.08)";
    ctx.strokeText("t", 0, 0);
    ctx.restore();
  }

  function drawFrameGlow() {
    const { width, height } = state;
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    const topBand = ctx.createLinearGradient(0, 0, 0, height * 0.22);
    topBand.addColorStop(0, "rgba(208, 228, 238, 0.04)");
    topBand.addColorStop(1, "rgba(208, 228, 238, 0)");
    ctx.fillStyle = topBand;
    ctx.fillRect(0, 0, width, height * 0.22);

    const leftBand = ctx.createLinearGradient(0, 0, width * 0.18, 0);
    leftBand.addColorStop(0, "rgba(120, 182, 205, 0.03)");
    leftBand.addColorStop(1, "rgba(120, 182, 205, 0)");
    ctx.fillStyle = leftBand;
    ctx.fillRect(0, 0, width * 0.18, height);
    ctx.fillRect(width - width * 0.18, 0, width * 0.18, height);

    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, state.width, state.height);
    drawBackground();
    drawAbstractBase();
    drawOverlayVeils();
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

  createLayout();
  resize();
  requestAnimationFrame((now) => {
    lastTime = now;
    frame(now);
  });
})();
