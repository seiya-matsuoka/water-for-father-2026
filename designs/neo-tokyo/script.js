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
    bgTop: "#04111c",
    bgMid: "#0a1926",
    bgBottom: "#07111b",
    line: "rgba(229, 245, 250, 0.10)",
    lineWarm: "rgba(255, 227, 174, 0.10)",
    signCool: "rgba(115, 213, 240, 0.24)",
    signCoolGlow: "rgba(175, 239, 245, 0.14)",
    signWarm: "rgba(255, 187, 97, 0.24)",
    signWarmGlow: "rgba(255, 222, 170, 0.14)",
    signMint: "rgba(132, 223, 194, 0.2)",
    signMintGlow: "rgba(200, 242, 226, 0.12)",
  };

  const microTiles = [];
  const tracerLines = [];
  const shards = [];
  const glowNodes = [];

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

  function createLayout() {
    microTiles.length = 0;
    tracerLines.length = 0;
    shards.length = 0;
    glowNodes.length = 0;

    for (let band = 0; band < 8; band += 1) {
      const baseX = -0.96 + band * 0.28 + (rand() - 0.5) * 0.06;
      const tilt = -0.34 + (rand() - 0.5) * 0.09;
      const rows = 28 + Math.floor(rand() * 18);
      for (let i = 0; i < rows; i += 1) {
        const y = -1.12 + i * 0.072 + (rand() - 0.5) * 0.05;
        const pieces = 6 + Math.floor(rand() * 6);
        let cursor = baseX + (rand() - 0.5) * 0.07;
        for (let j = 0; j < pieces; j += 1) {
          const w = 0.018 + rand() * 0.052;
          const h = 0.012 + rand() * 0.048;
          const gap = 0.006 + rand() * 0.022;
          const glowRoll = rand();
          let fill = "rgba(76, 157, 196, 0.14)";
          let glow = "rgba(188, 234, 245, 0.055)";
          let bright = false;

          if (glowRoll > 0.58 && glowRoll < 0.82) {
            fill = palette.signCool;
            glow = palette.signCoolGlow;
            bright = rand() > 0.56;
          } else if (glowRoll >= 0.82 && glowRoll < 0.93) {
            fill = palette.signWarm;
            glow = palette.signWarmGlow;
            bright = true;
          } else if (glowRoll >= 0.93) {
            fill = palette.signMint;
            glow = palette.signMintGlow;
            bright = true;
          }

          microTiles.push({
            x: cursor + (rand() - 0.5) * 0.018,
            y,
            w,
            h,
            rot: tilt + (rand() - 0.5) * 0.09,
            alpha: 0.3 + rand() * 0.7,
            fill,
            glow,
            bright,
            radius: 0.003 + rand() * 0.012,
            drift: 0.45 + rand() * 1.25,
            offset: rand() * Math.PI * 2,
          });
          cursor += w + gap;
        }
      }
    }

    for (let i = 0; i < 56; i += 1) {
      tracerLines.push({
        x: -1 + rand() * 2,
        y: -1 + rand() * 2,
        len: 0.04 + rand() * 0.18,
        width: 0.001 + rand() * 0.0034,
        rot: -0.34 + (rand() - 0.5) * 0.11,
        alpha: 0.03 + rand() * 0.12,
        warm: rand() > 0.76,
        speed: 0.26 + rand() * 0.7,
        offset: rand() * Math.PI * 2,
      });
    }

    for (let i = 0; i < 22; i += 1) {
      shards.push({
        x: -0.92 + rand() * 1.84,
        y: -1.1 + rand() * 2.2,
        w: 0.08 + rand() * 0.14,
        h: 0.18 + rand() * 0.3,
        rot: -0.36 + (rand() - 0.5) * 0.16,
        alpha: 0.028 + rand() * 0.04,
        color:
          rand() > 0.65
            ? "rgba(118, 204, 229, 0.09)"
            : "rgba(255, 202, 122, 0.07)",
        speed: 0.14 + rand() * 0.28,
        offset: rand() * Math.PI * 2,
      });
    }

    for (let i = 0; i < 14; i += 1) {
      glowNodes.push({
        x: 0.08 + rand() * 0.84,
        y: 0.14 + rand() * 0.7,
        size: 0.05 + rand() * 0.11,
        phase: rand() * Math.PI * 2,
        speed: 0.18 + rand() * 0.3,
        warm: rand() > 0.62,
        mint: rand() > 0.82,
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
    state.targetX = clamp(state.targetX + dx * 0.9, -230, 230);
    state.targetY = clamp(state.targetY + dy * 0.9, -230, 230);
    state.velocityX = clamp(dx * 0.13, -10, 10);
    state.velocityY = clamp(dy * 0.13, -10, 10);
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
    state.velocityX = clamp((dx / elapsed) * 12, -10, 10);
    state.velocityY = clamp((dy / elapsed) * 12, -10, 10);
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
      state.targetX += Math.sin(state.drift * 2.05) * 0.14;
      state.targetY += Math.cos(state.drift * 2.8) * 0.12;
      state.velocityX *= Math.pow(0.972, t);
      state.velocityY *= Math.pow(0.972, t);
      state.targetX += state.velocityX * 0.38;
      state.targetY += state.velocityY * 0.38;
      state.targetX *= Math.pow(0.9985, t);
      state.targetY *= Math.pow(0.9985, t);
    }

    state.targetX = clamp(state.targetX, -240, 240);
    state.targetY = clamp(state.targetY, -240, 240);
    state.currentX += (state.targetX - state.currentX) * (0.09 * t);
    state.currentY += (state.targetY - state.currentY) * (0.09 * t);
  }

  function alphaFrom(fill, fallback = 0.16) {
    const m = fill.match(/,\s*([0-9.]+)\)$/);
    return m ? parseFloat(m[1]) : fallback;
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
      width * 0.52 + state.currentX * 0.018,
      height * 0.5 + state.currentY * 0.016,
      0,
      width * 0.52,
      height * 0.5,
      Math.max(width, height) * 0.78,
    );
    glow.addColorStop(0, "rgba(107, 192, 218, 0.12)");
    glow.addColorStop(0.42, "rgba(60, 108, 137, 0.08)");
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  }

  function drawAbstractBase() {
    const { width, height } = state;
    const size = Math.max(width, height);
    const baseShiftX = state.currentX * 0.075;
    const baseShiftY = state.currentY * 0.055;

    ctx.save();
    ctx.translate(width * 0.5 + baseShiftX, height * 0.54 + baseShiftY);
    ctx.rotate(-0.34);

    const field = ctx.createLinearGradient(0, -size, 0, size);
    field.addColorStop(0, "rgba(12, 26, 39, 0.82)");
    field.addColorStop(0.4, "rgba(20, 43, 64, 0.48)");
    field.addColorStop(0.72, "rgba(24, 45, 62, 0.42)");
    field.addColorStop(1, "rgba(10, 18, 29, 0.88)");
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
        /0\.[0-9]+\)/,
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
        Math.sin(state.time * tile.drift + tile.offset) * size * 0.0028;
      const x = tile.x * size + wobble;
      const y =
        tile.y * size +
        Math.cos(state.time * tile.drift * 0.72 + tile.offset) * size * 0.0019;
      const w = tile.w * size;
      const h = tile.h * size;
      const localAlpha = alphaFrom(tile.fill) * tile.alpha;
      const fillStyle = tile.fill.replace(
        /,\s*[0-9.]+\)$/,
        `, ${localAlpha.toFixed(3)})`,
      );

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tile.rot);
      ctx.fillStyle = fillStyle;
      roundedRect(-w * 0.5, -h * 0.5, w, h, tile.radius * size);
      ctx.fill();

      ctx.fillStyle = tile.glow;
      roundedRect(
        -w * 0.42,
        -h * 0.18,
        w * 0.84,
        h * 0.26,
        tile.radius * size * 0.7,
      );
      ctx.fill();

      if (tile.bright) {
        ctx.shadowColor = tile.glow;
        ctx.shadowBlur = Math.max(8, size * 0.016);
        ctx.fillStyle = tile.glow.replace(/,\s*[0-9.]+\)$/, ", 0.18)");
        roundedRect(
          -w * 0.38,
          -h * 0.24,
          w * 0.76,
          h * 0.48,
          tile.radius * size * 0.8,
        );
        ctx.fill();
        ctx.shadowBlur = 0;
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

    for (const node of glowNodes) {
      const gx =
        (node.x - 0.5) * size * 1.8 +
        Math.sin(state.time * node.speed + node.phase) * size * 0.01;
      const gy =
        (node.y - 0.5) * size * 1.7 +
        Math.cos(state.time * node.speed * 0.8 + node.phase) * size * 0.012;
      const radius = node.size * size;
      let center = "rgba(187, 238, 248, 0.16)";
      let mid = "rgba(106, 204, 234, 0.10)";
      if (node.warm) {
        center = "rgba(255, 221, 150, 0.22)";
        mid = "rgba(255, 176, 86, 0.12)";
      } else if (node.mint) {
        center = "rgba(193, 242, 228, 0.18)";
        mid = "rgba(102, 216, 186, 0.1)";
      }
      const radial = ctx.createRadialGradient(gx, gy, 0, gx, gy, radius);
      radial.addColorStop(0, center);
      radial.addColorStop(0.5, mid);
      radial.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = radial;
      ctx.fillRect(gx - radius, gy - radius, radius * 2, radius * 2);
    }

    ctx.fillStyle = "rgba(242, 248, 253, 0.075)";
    for (let i = -3; i <= 4; i += 1) {
      const x = i * size * 0.2 + Math.sin(state.time * 0.16 + i) * size * 0.008;
      roundedRect(
        x - size * 0.008,
        -size * 1.05,
        size * 0.016,
        size * 2.1,
        size * 0.008,
      );
      ctx.fill();
    }

    ctx.restore();
  }

  function overlayColorStops(phase, alphaScale = 1) {
    const c1 = 0.5 + 0.5 * Math.sin(phase);
    const c2 = 0.5 + 0.5 * Math.sin(phase + 2.1);
    const c3 = 0.5 + 0.5 * Math.sin(phase + 4.2);

    const whiteAlpha = (0.12 + c1 * 0.18) * alphaScale;
    const blueAlpha = (0.1 + c2 * 0.17) * alphaScale;
    const mintAlpha = (0.07 + c3 * 0.14) * alphaScale;

    return [
      `rgba(${Math.round(236 + c1 * 18)}, ${Math.round(244 + c1 * 10)}, ${Math.round(252 + c1 * 4)}, ${whiteAlpha.toFixed(3)})`,
      `rgba(${Math.round(165 + c2 * 35)}, ${Math.round(218 + c2 * 20)}, ${Math.round(248 + c2 * 7)}, ${blueAlpha.toFixed(3)})`,
      `rgba(${Math.round(172 + c3 * 18)}, ${Math.round(228 + c3 * 16)}, ${Math.round(214 + c3 * 14)}, ${mintAlpha.toFixed(3)})`,
    ];
  }

  function drawOverlayVeils() {
    const { width, height } = state;
    const overlayX = state.currentX * 0.34;
    const overlayY = state.currentY * 0.26;
    const phase = state.time * 0.5;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    for (let i = 0; i < 6; i += 1) {
      const px = width * (0.09 + i * 0.16) + overlayX * (0.8 + i * 0.15);
      const wave1 =
        Math.sin(state.time * (0.42 + i * 0.08) + i * 0.8) *
        width *
        (0.034 + i * 0.005);
      const wave2 =
        Math.cos(state.time * (0.34 + i * 0.06) + i * 1.2) *
        width *
        (0.028 + i * 0.004);
      const ribbonWidth = width * (0.18 + i * 0.04);
      const stops = overlayColorStops(phase + i * 0.7, 1.1 - i * 0.08);
      const grad = ctx.createLinearGradient(
        px - ribbonWidth,
        0,
        px + ribbonWidth,
        height,
      );
      grad.addColorStop(0, "rgba(255,255,255,0)");
      grad.addColorStop(0.18, stops[0]);
      grad.addColorStop(0.45, stops[1]);
      grad.addColorStop(0.72, stops[2]);
      grad.addColorStop(1, "rgba(255,255,255,0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(px - ribbonWidth * 0.84, -height * 0.1);
      ctx.bezierCurveTo(
        px + wave1,
        height * 0.2 + overlayY,
        px - wave2,
        height * 0.48 + overlayY,
        px + wave1 * 0.35,
        height * 1.12,
      );
      ctx.lineTo(px + ribbonWidth * 0.42, height * 1.12);
      ctx.bezierCurveTo(
        px + wave2 * 1.02,
        height * 0.64 + overlayY,
        px - wave1 * 0.48,
        height * 0.24 + overlayY,
        px + ribbonWidth * 0.02,
        -height * 0.1,
      );
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = `rgba(248, 252, 255, ${(0.14 - i * 0.012).toFixed(3)})`;
      ctx.lineWidth = Math.max(1.4, width * 0.0021);
      ctx.beginPath();
      ctx.moveTo(px - ribbonWidth * 0.06, -height * 0.08);
      ctx.bezierCurveTo(
        px + wave2 * 0.56,
        height * 0.28 + overlayY,
        px - wave1 * 0.4,
        height * 0.68 + overlayY,
        px + ribbonWidth * 0.1,
        height * 1.04,
      );
      ctx.stroke();
    }

    for (let i = 0; i < 15; i += 1) {
      const rx = width * (0.06 + i * 0.068) + overlayX * (0.95 + (i % 3) * 0.2);
      const ry =
        height * (0.12 + (i % 7) * 0.11) + overlayY * (0.78 + (i % 4) * 0.14);
      const r = Math.max(width, height) * (0.05 + (i % 4) * 0.017);
      const stops = overlayColorStops(phase + i * 0.43, 1.0);
      const radial = ctx.createRadialGradient(rx, ry, 0, rx, ry, r);
      radial.addColorStop(0, stops[0]);
      radial.addColorStop(0.36, stops[1]);
      radial.addColorStop(0.72, stops[2]);
      radial.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = radial;
      ctx.fillRect(rx - r, ry - r, r * 2, r * 2);
    }

    ctx.restore();
  }

  function drawT() {
    const { width, height } = state;
    const overlayX = state.currentX * 0.38;
    const overlayY = state.currentY * 0.3;
    const x = width * 0.58 + overlayX + Math.sin(state.time * 0.52) * 20;
    const y = height * 0.5 + overlayY + Math.cos(state.time * 0.46) * 24;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(
      -0.14 + state.currentX * 0.0008 + Math.sin(state.time * 0.22) * 0.05,
    );
    ctx.globalCompositeOperation = "screen";
    ctx.font = `600 ${Math.round(Math.max(28, width * 0.066))}px "SFMono-Regular", Consolas, Menlo, Monaco, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const tg = ctx.createLinearGradient(-40, -46, 46, 42);
    const stops = overlayColorStops(state.time * 0.4 + 1.2, 1.12);
    tg.addColorStop(0, stops[0]);
    tg.addColorStop(0.5, stops[1]);
    tg.addColorStop(1, stops[2]);

    ctx.fillStyle = tg;
    ctx.shadowColor = "rgba(235, 248, 255, 0.22)";
    ctx.shadowBlur = 20;
    ctx.fillText("t", 0, 0);
    ctx.shadowBlur = 0;
    ctx.lineWidth = Math.max(1, width * 0.0011);
    ctx.strokeStyle = "rgba(245, 251, 255, 0.1)";
    ctx.strokeText("t", 0, 0);
    ctx.restore();
  }

  function drawFrameGlow() {
    const { width, height } = state;
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    const topBand = ctx.createLinearGradient(0, 0, 0, height * 0.24);
    topBand.addColorStop(0, "rgba(218, 236, 244, 0.06)");
    topBand.addColorStop(1, "rgba(218, 236, 244, 0)");
    ctx.fillStyle = topBand;
    ctx.fillRect(0, 0, width, height * 0.24);

    const leftBand = ctx.createLinearGradient(0, 0, width * 0.22, 0);
    leftBand.addColorStop(0, "rgba(142, 210, 229, 0.05)");
    leftBand.addColorStop(1, "rgba(142, 210, 229, 0)");
    ctx.fillStyle = leftBand;
    ctx.fillRect(0, 0, width * 0.22, height);
    ctx.fillRect(width - width * 0.22, 0, width * 0.22, height);

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
