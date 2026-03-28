(() => {
  const canvas = document.getElementById("neo-canvas");
  const ctx = canvas.getContext("2d", { alpha: true });

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

  const baseCanvas = document.createElement("canvas");
  const baseCtx = baseCanvas.getContext("2d", { alpha: true });
  let cacheWidth = 0;
  let cacheHeight = 0;

  const palette = {
    bgTop: "#02070d",
    bgMid: "#050d15",
    bgBottom: "#02060c",
    darkA: "rgba(8, 18, 28, 0.96)",
    darkB: "rgba(12, 26, 40, 0.92)",
    darkC: "rgba(20, 40, 54, 0.78)",
    cool: "rgba(112, 215, 245, 0.19)",
    coolGlow: "rgba(205, 241, 255, 0.11)",
    warm: "rgba(255, 191, 108, 0.18)",
    warmGlow: "rgba(255, 229, 182, 0.1)",
    mint: "rgba(136, 246, 196, 0.18)",
    mintGlow: "rgba(221, 253, 234, 0.1)",
    aquaText: "rgba(178, 240, 255, 0.95)",
    whiteText: "rgba(245, 251, 255, 0.98)",
  };

  const darkPanels = [];
  const microTiles = [];
  const tracerLines = [];
  const staticGlows = [];
  const pulses = [];

  function seeded(seed) {
    let value = seed >>> 0;
    return () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }

  const rand = seeded(2026032815);

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function roundedRect(targetCtx, x, y, width, height, radius) {
    const r = Math.min(radius, width * 0.5, height * 0.5);
    targetCtx.beginPath();
    targetCtx.moveTo(x + r, y);
    targetCtx.arcTo(x + width, y, x + width, y + height, r);
    targetCtx.arcTo(x + width, y + height, x, y + height, r);
    targetCtx.arcTo(x, y + height, x, y, r);
    targetCtx.arcTo(x, y, x + width, y, r);
    targetCtx.closePath();
  }

  function resize() {
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    const isSmall = Math.min(state.width, state.height) < 680;
    state.dpr = Math.min(window.devicePixelRatio || 1, isSmall ? 0.78 : 0.92);

    canvas.width = Math.round(state.width * state.dpr);
    canvas.height = Math.round(state.height * state.dpr);
    canvas.style.width = `${state.width}px`;
    canvas.style.height = `${state.height}px`;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

    buildLayout();
    renderBaseCache();
  }

  function buildLayout() {
    darkPanels.length = 0;
    microTiles.length = 0;
    tracerLines.length = 0;
    staticGlows.length = 0;
    pulses.length = 0;

    cacheWidth = Math.round(state.width * 1.55);
    cacheHeight = Math.round(state.height * 1.55);

    baseCanvas.width = Math.round(cacheWidth * state.dpr);
    baseCanvas.height = Math.round(cacheHeight * state.dpr);
    baseCtx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

    for (let i = 0; i < 18; i += 1) {
      darkPanels.push({
        x: -0.92 + rand() * 1.84,
        y: -1.12 + rand() * 2.24,
        w: 0.08 + rand() * 0.22,
        h: 0.16 + rand() * 0.34,
        rot: -0.34 + (rand() - 0.5) * 0.16,
        alpha: 0.22 + rand() * 0.22,
        depth: rand(),
      });
    }

    for (let band = 0; band < 10; band += 1) {
      const baseX = -0.96 + band * 0.24 + (rand() - 0.5) * 0.08;
      const tilt = -0.34 + (rand() - 0.5) * 0.11;
      const rows = 30 + Math.floor(rand() * 14);
      for (let i = 0; i < rows; i += 1) {
        const y = -1.12 + i * 0.064 + (rand() - 0.5) * 0.055;
        const pieces = 8 + Math.floor(rand() * 7);
        let cursor = baseX + (rand() - 0.5) * 0.06;
        for (let j = 0; j < pieces; j += 1) {
          const w = 0.01 + rand() * 0.034;
          const h = 0.008 + rand() * 0.028;
          const gap = 0.004 + rand() * 0.018;
          const roll = rand();
          let fill = "rgba(20, 34, 48, 0.62)";
          let glow = "rgba(136, 212, 241, 0.04)";
          let bright = false;
          let extraBright = false;

          if (roll > 0.55 && roll < 0.78) {
            fill = palette.cool;
            glow = palette.coolGlow;
            bright = rand() > 0.64;
            extraBright = rand() > 0.9;
          } else if (roll >= 0.78 && roll < 0.9) {
            fill = palette.warm;
            glow = palette.warmGlow;
            bright = true;
            extraBright = rand() > 0.84;
          } else if (roll >= 0.9) {
            fill = palette.mint;
            glow = palette.mintGlow;
            bright = true;
            extraBright = rand() > 0.82;
          }

          microTiles.push({
            x: cursor + (rand() - 0.5) * 0.02,
            y,
            w,
            h,
            rot: tilt + (rand() - 0.5) * 0.14,
            alpha: 0.3 + rand() * 0.8,
            fill,
            glow,
            bright,
            extraBright,
            radius: 0.002 + rand() * 0.009,
          });
          cursor += w + gap;
        }
      }
    }

    for (let i = 0; i < 28; i += 1) {
      tracerLines.push({
        x: -1 + rand() * 2,
        y: -1 + rand() * 2,
        len: 0.045 + rand() * 0.14,
        width: 0.001 + rand() * 0.0022,
        rot: -0.34 + (rand() - 0.5) * 0.08,
        alpha: 0.028 + rand() * 0.06,
        warm: rand() > 0.72,
        mint: rand() > 0.88,
      });
    }

    for (let i = 0; i < 16; i += 1) {
      staticGlows.push({
        x: 0.06 + rand() * 0.88,
        y: 0.1 + rand() * 0.78,
        size: 0.04 + rand() * 0.08,
        type: rand() > 0.72 ? "warm" : rand() > 0.84 ? "mint" : "cool",
      });
    }

    for (let i = 0; i < 7; i += 1) {
      pulses.push({
        x: rand(),
        y: rand(),
        size: 0.05 + rand() * 0.08,
        speed: 0.22 + rand() * 0.36,
        phase: rand() * Math.PI * 2,
        type: rand() > 0.7 ? "warm" : rand() > 0.84 ? "mint" : "cool",
      });
    }
  }

  function renderBaseCache() {
    baseCtx.clearRect(0, 0, cacheWidth, cacheHeight);

    const field = baseCtx.createLinearGradient(0, 0, 0, cacheHeight);
    field.addColorStop(0, "rgba(4, 8, 13, 0.985)");
    field.addColorStop(0.48, "rgba(8, 14, 22, 0.94)");
    field.addColorStop(1, "rgba(2, 5, 9, 0.995)");
    baseCtx.fillStyle = field;
    baseCtx.fillRect(0, 0, cacheWidth, cacheHeight);

    baseCtx.save();
    baseCtx.translate(cacheWidth * 0.5, cacheHeight * 0.54);
    baseCtx.rotate(-0.34);

    const size = Math.max(cacheWidth, cacheHeight);

    const darkField = baseCtx.createLinearGradient(0, -size, 0, size);
    darkField.addColorStop(0, "rgba(4, 9, 15, 0.985)");
    darkField.addColorStop(0.42, "rgba(8, 16, 26, 0.95)");
    darkField.addColorStop(0.76, "rgba(14, 28, 42, 0.82)");
    darkField.addColorStop(1, "rgba(6, 12, 20, 0.98)");
    baseCtx.fillStyle = darkField;
    baseCtx.fillRect(-size * 1.2, -size * 1.35, size * 2.4, size * 2.7);

    for (const panel of darkPanels) {
      const x = panel.x * size;
      const y = panel.y * size;
      const w = panel.w * size;
      const h = panel.h * size;
      const panelGrad = baseCtx.createLinearGradient(
        x - w * 0.5,
        y - h * 0.5,
        x + w * 0.5,
        y + h * 0.5,
      );
      panelGrad.addColorStop(
        0,
        `rgba(3, 8, 14, ${(0.88 + panel.alpha * 0.08).toFixed(3)})`,
      );
      panelGrad.addColorStop(
        0.5,
        `rgba(8, 16, 26, ${(0.72 + panel.alpha * 0.08).toFixed(3)})`,
      );
      panelGrad.addColorStop(
        1,
        `rgba(18, 30, 44, ${(0.36 + panel.alpha * 0.06).toFixed(3)})`,
      );
      baseCtx.save();
      baseCtx.translate(x, y);
      baseCtx.rotate(panel.rot);
      baseCtx.fillStyle = panelGrad;
      roundedRect(baseCtx, -w * 0.5, -h * 0.5, w, h, size * 0.014);
      baseCtx.fill();
      baseCtx.restore();
    }

    baseCtx.globalCompositeOperation = "screen";

    for (const tile of microTiles) {
      const x = tile.x * size;
      const y = tile.y * size;
      const w = tile.w * size;
      const h = tile.h * size;
      const fillStyle = tile.fill.replace(
        /,\s*[0-9.]+\)$/,
        `, ${(tile.alpha * (tile.extraBright ? 1.02 : tile.bright ? 0.72 : 0.8)).toFixed(3)})`,
      );
      baseCtx.save();
      baseCtx.translate(x, y);
      baseCtx.rotate(tile.rot);
      baseCtx.fillStyle = fillStyle;
      roundedRect(baseCtx, -w * 0.5, -h * 0.5, w, h, tile.radius * size);
      baseCtx.fill();

      if (tile.bright) {
        baseCtx.shadowColor = tile.glow;
        baseCtx.shadowBlur = Math.max(
          7,
          size * (tile.extraBright ? 0.012 : 0.008),
        );
        baseCtx.fillStyle = tile.glow.replace(
          /,\s*[0-9.]+\)$/,
          tile.extraBright ? ", 0.2)" : ", 0.11)",
        );
        roundedRect(
          baseCtx,
          -w * 0.44,
          -h * 0.24,
          w * 0.88,
          h * 0.5,
          tile.radius * size,
        );
        baseCtx.fill();
        baseCtx.shadowBlur = 0;
      }
      baseCtx.restore();
    }

    for (const tracer of tracerLines) {
      const x = tracer.x * size;
      const y = tracer.y * size;
      baseCtx.save();
      baseCtx.translate(x, y);
      baseCtx.rotate(tracer.rot);
      if (tracer.mint) {
        baseCtx.strokeStyle = "rgba(170, 248, 198, 0.08)";
      } else if (tracer.warm) {
        baseCtx.strokeStyle = "rgba(255, 219, 160, 0.08)";
      } else {
        baseCtx.strokeStyle = "rgba(222, 244, 255, 0.06)";
      }
      baseCtx.lineWidth = Math.max(1, tracer.width * size);
      baseCtx.globalAlpha = tracer.alpha;
      baseCtx.beginPath();
      baseCtx.moveTo(-tracer.len * size * 0.5, 0);
      baseCtx.lineTo(tracer.len * size * 0.5, 0);
      baseCtx.stroke();
      baseCtx.restore();
    }

    for (const node of staticGlows) {
      const gx = (node.x - 0.5) * size * 1.8;
      const gy = (node.y - 0.5) * size * 1.7;
      const radius = node.size * size;
      let center = "rgba(191, 238, 255, 0.16)";
      let mid = "rgba(108, 204, 234, 0.1)";
      if (node.type === "warm") {
        center = "rgba(255, 230, 170, 0.22)";
        mid = "rgba(255, 182, 92, 0.11)";
      } else if (node.type === "mint") {
        center = "rgba(217, 255, 231, 0.18)";
        mid = "rgba(128, 243, 184, 0.1)";
      }
      const radial = baseCtx.createRadialGradient(gx, gy, 0, gx, gy, radius);
      radial.addColorStop(0, center);
      radial.addColorStop(0.52, mid);
      radial.addColorStop(1, "rgba(255,255,255,0)");
      baseCtx.fillStyle = radial;
      baseCtx.fillRect(gx - radius, gy - radius, radius * 2, radius * 2);
    }

    baseCtx.restore();
  }

  function setTargetByDelta(dx, dy) {
    state.targetX = clamp(state.targetX + dx * 1.28, -360, 360);
    state.targetY = clamp(state.targetY + dy * 1.28, -360, 360);
    state.velocityX = clamp(dx * 0.16, -14, 14);
    state.velocityY = clamp(dy * 0.16, -14, 14);
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
    state.velocityX = clamp((dx / elapsed) * 14.2, -14, 14);
    state.velocityY = clamp((dy / elapsed) * 14.2, -14, 14);
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
      state.targetX += Math.sin(state.drift * 2.2) * 0.2;
      state.targetY += Math.cos(state.drift * 2.9) * 0.18;
      state.velocityX *= Math.pow(0.972, t);
      state.velocityY *= Math.pow(0.972, t);
      state.targetX += state.velocityX * 0.42;
      state.targetY += state.velocityY * 0.42;
      state.targetX *= Math.pow(0.9983, t);
      state.targetY *= Math.pow(0.9983, t);
    }

    state.targetX = clamp(state.targetX, -370, 370);
    state.targetY = clamp(state.targetY, -370, 370);
    state.currentX += (state.targetX - state.currentX) * (0.108 * t);
    state.currentY += (state.targetY - state.currentY) * (0.108 * t);
  }

  function overlayStops(phase, scale = 1) {
    const s1 = 0.5 + 0.5 * Math.sin(phase);
    const s2 = 0.5 + 0.5 * Math.sin(phase + 1.55);
    const s3 = 0.5 + 0.5 * Math.sin(phase + 3.15);

    const whiteAlpha = (0.42 + s1 * 0.28) * scale;
    const blueAlpha = (0.11 + s2 * 0.18) * scale;
    const mintAlpha = (0.06 + s3 * 0.13) * scale;

    return [
      `rgba(${Math.round(251 + s1 * 4)}, ${Math.round(253 + s1 * 2)}, 255, ${whiteAlpha.toFixed(3)})`,
      `rgba(${Math.round(212 + s2 * 22)}, ${Math.round(238 + s2 * 14)}, ${Math.round(255 - s3 * 2)}, ${blueAlpha.toFixed(3)})`,
      `rgba(${Math.round(214 + s3 * 12)}, ${Math.round(247 + s3 * 8)}, ${Math.round(230 + s3 * 14)}, ${mintAlpha.toFixed(3)})`,
    ];
  }

  function softenOverlayColor(color, alphaFactor = 1, tint = 0) {
    const match = color.match(
      /rgba\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/,
    );
    if (!match) return color;

    const r = Math.round(Number(match[1]) * (1 - tint) + 238 * tint);
    const g = Math.round(Number(match[2]) * (1 - tint) + 246 * tint);
    const b = Math.round(Number(match[3]) * (1 - tint) + 252 * tint);
    const a = clamp(Number(match[4]) * alphaFactor, 0, 1);
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, state.height);
    gradient.addColorStop(0, palette.bgTop);
    gradient.addColorStop(0.5, palette.bgMid);
    gradient.addColorStop(1, palette.bgBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, state.width, state.height);

    const glow = ctx.createRadialGradient(
      state.width * 0.52 + state.currentX * 0.014,
      state.height * 0.48 + state.currentY * 0.012,
      0,
      state.width * 0.52,
      state.height * 0.48,
      Math.max(state.width, state.height) * 0.76,
    );
    glow.addColorStop(0, "rgba(118, 197, 221, 0.11)");
    glow.addColorStop(0.48, "rgba(66, 104, 128, 0.06)");
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, state.width, state.height);
  }

  function drawAbstractBase() {
    const offsetX = -(cacheWidth - state.width) * 0.5 + state.currentX * 0.09;
    const offsetY =
      -(cacheHeight - state.height) * 0.5 + state.currentY * 0.068;
    ctx.drawImage(baseCanvas, offsetX, offsetY, cacheWidth, cacheHeight);

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (const pulse of pulses) {
      const x =
        state.width * pulse.x +
        state.currentX * 0.08 +
        Math.sin(state.time * pulse.speed + pulse.phase) * 22;
      const y =
        state.height * pulse.y +
        state.currentY * 0.058 +
        Math.cos(state.time * pulse.speed * 0.85 + pulse.phase) * 18;
      const radius = Math.max(state.width, state.height) * pulse.size * 0.92;
      const radial = ctx.createRadialGradient(x, y, 0, x, y, radius);
      if (pulse.type === "warm") {
        radial.addColorStop(0, "rgba(255, 228, 172, 0.14)");
        radial.addColorStop(0.5, "rgba(255, 173, 83, 0.06)");
      } else if (pulse.type === "mint") {
        radial.addColorStop(0, "rgba(222, 255, 232, 0.13)");
        radial.addColorStop(0.5, "rgba(128, 242, 185, 0.055)");
      } else {
        radial.addColorStop(0, "rgba(206, 242, 255, 0.12)");
        radial.addColorStop(0.5, "rgba(118, 214, 243, 0.055)");
      }
      radial.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = radial;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    ctx.restore();
  }

  function drawOverlayVeils() {
    const overlayX = state.currentX * 0.66;
    const overlayY = state.currentY * 0.5;
    const phase = state.time * 1.38;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    for (let i = 0; i < 4; i += 1) {
      const px = state.width * (0.12 + i * 0.18) + overlayX * (0.94 + i * 0.18);
      const wave1 =
        Math.sin(state.time * (0.5 + i * 0.08) + i * 0.8) *
        state.width *
        (0.04 + i * 0.007);
      const wave2 =
        Math.cos(state.time * (0.4 + i * 0.06) + i * 1.15) *
        state.width *
        (0.032 + i * 0.006);
      const ribbonWidth = state.width * (0.24 + i * 0.05);
      const stops = overlayStops(phase + i * 0.82, 1.2 - i * 0.08);
      const ribbonStops = [
        softenOverlayColor(stops[0], 0.22, 0.28),
        softenOverlayColor(stops[1], 0.26, 0.18),
        softenOverlayColor(stops[2], 0.24, 0.12),
      ];
      const grad = ctx.createLinearGradient(
        px - ribbonWidth,
        0,
        px + ribbonWidth,
        state.height,
      );
      grad.addColorStop(0, "rgba(255,255,255,0)");
      grad.addColorStop(0.14, ribbonStops[0]);
      grad.addColorStop(0.42, ribbonStops[1]);
      grad.addColorStop(0.72, ribbonStops[2]);
      grad.addColorStop(1, "rgba(255,255,255,0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(px - ribbonWidth * 0.86, -state.height * 0.1);
      ctx.bezierCurveTo(
        px + wave1,
        state.height * 0.22 + overlayY,
        px - wave2,
        state.height * 0.5 + overlayY,
        px + wave1 * 0.35,
        state.height * 1.12,
      );
      ctx.lineTo(px + ribbonWidth * 0.44, state.height * 1.12);
      ctx.bezierCurveTo(
        px + wave2,
        state.height * 0.66 + overlayY,
        px - wave1 * 0.45,
        state.height * 0.24 + overlayY,
        px + ribbonWidth * 0.04,
        -state.height * 0.1,
      );
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = `rgba(240, 248, 252, ${(0.0018 - i * 0.00022).toFixed(4)})`;
      ctx.lineWidth = Math.max(1, state.width * 0.0009);
      ctx.beginPath();
      ctx.moveTo(px - ribbonWidth * 0.04, -state.height * 0.08);
      ctx.bezierCurveTo(
        px + wave2 * 0.5,
        state.height * 0.28 + overlayY,
        px - wave1 * 0.32,
        state.height * 0.68 + overlayY,
        px + ribbonWidth * 0.1,
        state.height * 1.04,
      );
      ctx.stroke();
    }

    for (let i = 0; i < 12; i += 1) {
      const rx =
        state.width * (0.06 + i * 0.07) + overlayX * (1.02 + (i % 3) * 0.2);
      const ry =
        state.height * (0.1 + (i % 6) * 0.12) +
        overlayY * (0.88 + (i % 4) * 0.14);
      const r = Math.max(state.width, state.height) * (0.09 + (i % 4) * 0.022);
      const stops = overlayStops(phase + i * 0.48, 1.05);
      const radial = ctx.createRadialGradient(rx, ry, 0, rx, ry, r);
      radial.addColorStop(0, stops[0]);
      radial.addColorStop(0.3, stops[1]);
      radial.addColorStop(0.62, stops[2]);
      radial.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = radial;
      ctx.fillRect(rx - r, ry - r, r * 2, r * 2);
    }

    ctx.restore();
  }

  function drawT() {
    const x =
      state.width * 0.58 +
      state.currentX * 0.64 +
      Math.sin(state.time * 0.56) * 22;
    const y =
      state.height * 0.5 +
      state.currentY * 0.48 +
      Math.cos(state.time * 0.48) * 24;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(
      -0.12 + state.currentX * 0.001 + Math.sin(state.time * 0.26) * 0.06,
    );
    ctx.globalCompositeOperation = "screen";
    ctx.font = `600 ${Math.round(Math.max(30, state.width * 0.072))}px "Orbitron", "Rajdhani", "DIN Condensed", "Avenir Next Condensed", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const tg = ctx.createLinearGradient(-42, -48, 48, 44);
    tg.addColorStop(0, palette.whiteText);
    tg.addColorStop(0.45, palette.aquaText);
    tg.addColorStop(1, "rgba(215, 247, 255, 0.96)");
    ctx.fillStyle = tg;
    ctx.shadowColor = "rgba(192, 244, 255, 0.52)";
    ctx.shadowBlur = 24;
    ctx.fillText("t", 0, 0);
    ctx.shadowBlur = 0;
    ctx.lineWidth = Math.max(1, state.width * 0.0012);
    ctx.strokeStyle = "rgba(245, 251, 255, 0.26)";
    ctx.strokeText("t", 0, 0);
    ctx.restore();
  }

  function drawFrameGlow() {
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    const topBand = ctx.createLinearGradient(0, 0, 0, state.height * 0.24);
    topBand.addColorStop(0, "rgba(244, 250, 255, 0.1)");
    topBand.addColorStop(1, "rgba(220, 239, 248, 0)");
    ctx.fillStyle = topBand;
    ctx.fillRect(0, 0, state.width, state.height * 0.24);

    const sideBand = ctx.createLinearGradient(0, 0, state.width * 0.2, 0);
    sideBand.addColorStop(0, "rgba(216, 244, 252, 0.07)");
    sideBand.addColorStop(1, "rgba(164, 224, 238, 0)");
    ctx.fillStyle = sideBand;
    ctx.fillRect(0, 0, state.width * 0.2, state.height);
    ctx.fillRect(
      state.width - state.width * 0.2,
      0,
      state.width * 0.2,
      state.height,
    );

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

  resize();
  requestAnimationFrame((now) => {
    lastTime = now;
    frame(now);
  });
})();
