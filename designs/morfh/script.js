(() => {
  const canvas = document.getElementById("morfh-canvas");
  const ctx = canvas.getContext("2d", { alpha: true });

  const dprMax = 1.5;
  const baseCanvas = document.createElement("canvas");
  const baseCtx = baseCanvas.getContext("2d", { alpha: true });
  const grainCanvas = document.createElement("canvas");
  const grainCtx = grainCanvas.getContext("2d", { alpha: true });

  let width = 0;
  let height = 0;
  let dpr = 1;

  const pointer = { active: false };
  const motion = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    vx: 0,
    vy: 0,
  };

  const state = {
    tiles: [],
    tAnchor: null,
  };

  const palette = {
    bg0: "#e5f2f7",
    bg1: "#edf8fb",
    bg2: "#e9f5f6",
    paperWhite: "#f6fbfd",
    whiteTint: "rgba(252, 254, 255, 0.98)",
    ice: "rgba(213, 244, 255, 0.98)",
    sky: "rgba(186, 232, 255, 0.96)",
    cyan: "rgba(152, 221, 253, 0.95)",
    aqua: "rgba(124, 210, 249, 0.95)",
    lavender: "rgba(211, 200, 252, 0.95)",
    violet: "rgba(171, 151, 239, 0.92)",
    mint: "rgba(216, 239, 227, 0.92)",
    yellow: "rgba(245, 239, 187, 0.90)",
    seam: "rgba(226, 235, 238, 0.96)",
    seamShadow: "rgba(164, 178, 188, 0.18)",
    grainDark: "rgba(97, 110, 120, 0.26)",
    grainLight: "rgba(255,255,255,0.24)",
    tBlue: "rgba(160, 216, 248, 0.66)",
    tLavender: "rgba(197, 188, 243, 0.34)",
  };

  const tileFamilies = [
    {
      base: "rgba(225,244,252,0.99)",
      ramp: ["rgba(251,254,255,0.98)", palette.sky, palette.aqua],
      accent: ["rgba(255,255,255,0.94)", palette.lavender],
    },
    {
      base: "rgba(229,246,253,0.99)",
      ramp: ["rgba(252,254,255,0.98)", palette.ice, palette.cyan],
      accent: ["rgba(255,255,255,0.94)", palette.violet],
    },
    {
      base: "rgba(232,246,251,0.99)",
      ramp: ["rgba(252,254,255,0.98)", palette.cyan, palette.sky],
      accent: ["rgba(255,255,255,0.94)", palette.mint],
    },
    {
      base: "rgba(230,244,252,0.99)",
      ramp: ["rgba(251,254,255,0.98)", palette.sky, palette.lavender],
      accent: ["rgba(255,255,255,0.94)", palette.yellow],
    },
    {
      base: "rgba(227,243,251,0.99)",
      ramp: ["rgba(252,254,255,0.98)", palette.aqua, palette.sky],
      accent: ["rgba(255,255,255,0.94)", palette.violet],
    },
  ];

  const patternModes = [
    "horizontal",
    "vertical",
    "diagA",
    "diagB",
    "corner",
    "veil",
    "cross",
    "band",
  ];

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function rand(min, max) {
    return lerp(min, max, Math.random());
  }

  function choose(values) {
    return values[(Math.random() * values.length) | 0];
  }

  function rgbaWithAlpha(color, alpha) {
    return color.replace(
      /rgba\(([^)]+),\s*[0-9.]+\)/,
      (_, rgb) => `rgba(${rgb}, ${alpha})`,
    );
  }

  function setCanvasSize(targetCanvas, targetCtx) {
    targetCanvas.width = Math.round(width * dpr);
    targetCanvas.height = Math.round(height * dpr);
    targetCtx.setTransform(1, 0, 0, 1, 0, 0);
    targetCtx.scale(dpr, dpr);
  }

  function buildTiles() {
    state.tiles = [];

    const idealCell = clamp(Math.round(width / 5.7), 68, 98);
    const cols = Math.max(4, Math.round(width / idealCell));
    const cell = width / cols;
    const rows = Math.ceil(height / cell) + 1;
    const occupancy = Array.from({ length: rows }, () =>
      Array(cols).fill(false),
    );

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        if (occupancy[row][col]) continue;

        const wide = col < cols - 1 && Math.random() < 0.5;
        const tall = row < rows - 1 && Math.random() < 0.22;
        const spanX = wide ? 2 : 1;
        const spanY = tall ? 2 : 1;

        for (let ry = row; ry < Math.min(rows, row + spanY); ry += 1) {
          for (let cx = col; cx < Math.min(cols, col + spanX); cx += 1) {
            occupancy[ry][cx] = true;
          }
        }

        const x = col * cell + rand(-1.25, 1.25);
        const y = row * cell + rand(-1.25, 1.25);
        const w = cell * spanX + rand(-2.2, 2.2);
        const h = cell * spanY + rand(-2.2, 2.2);
        const family = choose(tileFamilies);
        const mode = choose(patternModes);
        const secondaryMode = choose(
          patternModes.filter((item) => item !== mode),
        );

        state.tiles.push({
          x,
          y,
          w,
          h,
          mode,
          secondaryMode,
          base: family.base,
          ramp0: family.ramp[0],
          ramp1: family.ramp[1],
          ramp2: family.ramp[2],
          accent0: family.accent[0],
          accent1: family.accent[1],
          fillAlpha: rand(0.965, 0.995),
          tintAlphaA: rand(0.58, 0.82),
          tintAlphaB: rand(0.36, 0.62),
          whiteAlpha: rand(0.34, 0.52),
          accentAlpha: rand(0.16, 0.36),
          cloudAlpha: rand(0.22, 0.36),
          edgeAlpha: rand(0.2, 0.34),
          brightness: rand(0.96, 1.04),
          phase: rand(0, Math.PI * 2),
        });
      }
    }

    const tTile =
      state.tiles[Math.floor(state.tiles.length * 0.62)] ||
      state.tiles[state.tiles.length - 1];
    if (tTile) {
      state.tAnchor = {
        x: tTile.x + tTile.w * 0.52,
        y: tTile.y + tTile.h * 0.54,
        size: clamp(Math.min(tTile.w, tTile.h) * 0.17, 13, 18),
      };
    }
  }

  function makePrimaryGradient(tile) {
    const {
      x,
      y,
      w,
      h,
      mode,
      ramp0,
      ramp1,
      ramp2,
      tintAlphaA,
      tintAlphaB,
      whiteAlpha,
    } = tile;
    let grad;

    switch (mode) {
      case "horizontal":
        grad = baseCtx.createLinearGradient(x, y, x, y + h);
        break;
      case "vertical":
        grad = baseCtx.createLinearGradient(x, y, x + w, y);
        break;
      case "diagB":
        grad = baseCtx.createLinearGradient(x + w, y, x, y + h);
        break;
      case "corner":
        grad = baseCtx.createLinearGradient(
          x,
          y + h * 0.16,
          x + w,
          y + h * 0.82,
        );
        break;
      case "veil":
        grad = baseCtx.createLinearGradient(
          x + w * 0.12,
          y,
          x + w * 0.88,
          y + h,
        );
        break;
      case "cross":
        grad = baseCtx.createLinearGradient(x, y + h * 0.2, x + w, y + h * 0.8);
        break;
      case "band":
        grad = baseCtx.createLinearGradient(
          x,
          y + h * 0.48,
          x + w,
          y + h * 0.52,
        );
        break;
      default:
        grad = baseCtx.createLinearGradient(x, y, x + w, y + h);
        break;
    }

    grad.addColorStop(0, rgbaWithAlpha(ramp1, tintAlphaA));
    grad.addColorStop(rand(0.12, 0.22), rgbaWithAlpha(ramp0, whiteAlpha));
    grad.addColorStop(rand(0.32, 0.48), rgbaWithAlpha(ramp2, tintAlphaB));
    grad.addColorStop(rand(0.54, 0.7), rgbaWithAlpha(ramp0, whiteAlpha * 0.92));
    grad.addColorStop(rand(0.78, 0.9), rgbaWithAlpha(ramp1, tintAlphaA * 0.85));
    grad.addColorStop(1, rgbaWithAlpha(ramp2, tintAlphaB * 0.88));
    return grad;
  }

  function paintSecondaryPattern(tile) {
    const {
      x,
      y,
      w,
      h,
      secondaryMode,
      ramp0,
      ramp1,
      ramp2,
      accent1,
      accentAlpha,
      cloudAlpha,
    } = tile;
    let grad;

    switch (secondaryMode) {
      case "horizontal":
        grad = baseCtx.createLinearGradient(
          x,
          y + h * rand(0.18, 0.36),
          x,
          y + h * rand(0.68, 0.88),
        );
        break;
      case "vertical":
        grad = baseCtx.createLinearGradient(
          x + w * rand(0.18, 0.36),
          y,
          x + w * rand(0.68, 0.88),
          y,
        );
        break;
      case "diagB":
        grad = baseCtx.createLinearGradient(
          x + w,
          y + h * 0.14,
          x,
          y + h * 0.86,
        );
        break;
      case "corner":
        grad = baseCtx.createRadialGradient(
          x + w * 0.16,
          y + h * 0.22,
          0,
          x + w * 0.16,
          y + h * 0.22,
          Math.max(w, h) * 0.86,
        );
        grad.addColorStop(0, rgbaWithAlpha(ramp0, cloudAlpha * 0.88));
        grad.addColorStop(0.34, rgbaWithAlpha(ramp2, cloudAlpha * 0.68));
        grad.addColorStop(1, "rgba(255,255,255,0)");
        baseCtx.fillStyle = grad;
        baseCtx.fillRect(x, y, w, h);
        return;
      case "veil":
        grad = baseCtx.createLinearGradient(x, y, x + w, y + h);
        break;
      case "cross":
        grad = baseCtx.createLinearGradient(
          x,
          y + h * 0.52,
          x + w,
          y + h * 0.48,
        );
        break;
      case "band":
        grad = baseCtx.createLinearGradient(x, y + h * 0.5, x, y + h * 0.5);
        grad.addColorStop(0, "rgba(255,255,255,0)");
        grad.addColorStop(0.2, rgbaWithAlpha(ramp0, 0.16));
        grad.addColorStop(0.5, rgbaWithAlpha(accent1, accentAlpha * 0.82));
        grad.addColorStop(0.8, rgbaWithAlpha(ramp1, 0.15));
        grad.addColorStop(1, "rgba(255,255,255,0)");
        baseCtx.fillStyle = grad;
        baseCtx.fillRect(x, y, w, h);
        return;
      default:
        grad = baseCtx.createLinearGradient(x, y, x + w, y + h);
        break;
    }

    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(
      rand(0.18, 0.28),
      rgbaWithAlpha(ramp0, cloudAlpha * 0.88),
    );
    grad.addColorStop(
      rand(0.42, 0.56),
      rgbaWithAlpha(accent1, accentAlpha * 0.78),
    );
    grad.addColorStop(
      rand(0.62, 0.76),
      rgbaWithAlpha(ramp2, cloudAlpha * 0.62),
    );
    grad.addColorStop(1, "rgba(255,255,255,0)");
    baseCtx.fillStyle = grad;
    baseCtx.fillRect(x, y, w, h);
  }

  function paintTile(tile) {
    const {
      x,
      y,
      w,
      h,
      base,
      cloudAlpha,
      edgeAlpha,
      ramp0,
      ramp1,
      ramp2,
      accent0,
      accent1,
      accentAlpha,
    } = tile;

    baseCtx.save();
    baseCtx.globalAlpha = tile.fillAlpha;
    baseCtx.fillStyle = base;
    baseCtx.fillRect(x, y, w, h);
    baseCtx.restore();

    baseCtx.save();
    baseCtx.fillStyle = makePrimaryGradient(tile);
    baseCtx.fillRect(x, y, w, h);
    baseCtx.restore();

    paintSecondaryPattern(tile);

    const sideSheen = baseCtx.createLinearGradient(
      x,
      y,
      x + w,
      y + h * rand(0.06, 0.16),
    );
    sideSheen.addColorStop(0, "rgba(255,255,255,0.02)");
    sideSheen.addColorStop(0.16, rgbaWithAlpha(ramp0, 0.26));
    sideSheen.addColorStop(0.38, rgbaWithAlpha(ramp1, 0.18));
    sideSheen.addColorStop(0.62, rgbaWithAlpha(accent1, accentAlpha * 0.82));
    sideSheen.addColorStop(1, "rgba(255,255,255,0.03)");
    baseCtx.fillStyle = sideSheen;
    baseCtx.fillRect(x, y, w, h);

    const glowX = x + w * rand(0.18, 0.82);
    const glowY = y + h * rand(0.18, 0.82);
    const radial = baseCtx.createRadialGradient(
      glowX,
      glowY,
      0,
      glowX,
      glowY,
      Math.max(w, h) * rand(0.54, 0.96),
    );
    radial.addColorStop(0, rgbaWithAlpha(accent0, accentAlpha * 0.88));
    radial.addColorStop(0.34, rgbaWithAlpha(accent1, accentAlpha * 0.76));
    radial.addColorStop(0.68, rgbaWithAlpha(ramp1, cloudAlpha * 0.32));
    radial.addColorStop(1, "rgba(255,255,255,0)");
    baseCtx.save();
    baseCtx.globalCompositeOperation = "screen";
    baseCtx.fillStyle = radial;
    baseCtx.fillRect(x, y, w, h);
    baseCtx.restore();

    const diagonal = baseCtx.createLinearGradient(x, y, x + w, y + h);
    diagonal.addColorStop(0, "rgba(255,255,255,0)");
    diagonal.addColorStop(0.26, rgbaWithAlpha(ramp0, 0.1));
    diagonal.addColorStop(0.48, rgbaWithAlpha(ramp2, 0.12));
    diagonal.addColorStop(0.68, rgbaWithAlpha(ramp1, 0.08));
    diagonal.addColorStop(1, "rgba(255,255,255,0)");
    baseCtx.fillStyle = diagonal;
    baseCtx.fillRect(x, y, w, h);

    baseCtx.save();
    baseCtx.strokeStyle = `rgba(230, 237, 239, ${edgeAlpha})`;
    baseCtx.lineWidth = 1;
    baseCtx.strokeRect(
      Math.round(x) + 0.5,
      Math.round(y) + 0.5,
      Math.round(w),
      Math.round(h),
    );
    baseCtx.restore();

    baseCtx.save();
    baseCtx.strokeStyle = rgbaWithAlpha(palette.seamShadow, edgeAlpha * 0.86);
    baseCtx.lineWidth = 0.8;
    baseCtx.beginPath();
    baseCtx.moveTo(x + 0.5, y + h - 0.5);
    baseCtx.lineTo(x + w - 0.5, y + h - 0.5);
    baseCtx.moveTo(x + w - 0.5, y + 0.5);
    baseCtx.lineTo(x + w - 0.5, y + h - 0.5);
    baseCtx.stroke();
    baseCtx.restore();
  }

  function paintBase() {
    baseCtx.clearRect(0, 0, width, height);

    const bg = baseCtx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, palette.bg0);
    bg.addColorStop(0.32, palette.paperWhite);
    bg.addColorStop(0.68, palette.bg2);
    bg.addColorStop(1, palette.bg1);
    baseCtx.fillStyle = bg;
    baseCtx.fillRect(0, 0, width, height);

    state.tiles.forEach(paintTile);
  }

  function paintGrain() {
    grainCtx.clearRect(0, 0, width, height);

    const dots = Math.round((width * height) / 220);
    for (let i = 0; i < dots; i += 1) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const s = Math.random() < 0.88 ? 1 : 1.4;
      grainCtx.fillStyle =
        Math.random() < 0.76 ? palette.grainDark : palette.grainLight;
      grainCtx.fillRect(x, y, s, s);
    }

    grainCtx.save();
    grainCtx.globalAlpha = 0.075;
    for (let i = 0; i < 30; i += 1) {
      const y = rand(0, height);
      grainCtx.fillStyle =
        Math.random() < 0.55
          ? "rgba(255,255,255,0.60)"
          : "rgba(114, 123, 131, 0.34)";
      grainCtx.fillRect(0, y, width, rand(0.5, 1.15));
    }
    grainCtx.restore();
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, dprMax);

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    setCanvasSize(baseCanvas, baseCtx);
    setCanvasSize(grainCanvas, grainCtx);

    buildTiles();
    paintBase();
    paintGrain();
  }

  function updateMotion(time) {
    motion.vx += (motion.targetX - motion.x) * 0.04;
    motion.vy += (motion.targetY - motion.y) * 0.04;
    motion.vx *= 0.84;
    motion.vy *= 0.84;
    motion.x += motion.vx;
    motion.y += motion.vy;

    if (!pointer.active) {
      motion.targetX = Math.sin(time * 0.00018) * 5.2;
      motion.targetY = Math.cos(time * 0.00015) * 4.4;
    }
  }

  function drawT(time) {
    if (!state.tAnchor) return;

    const driftX = motion.x * 0.14;
    const driftY = motion.y * 0.12;
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.00045);
    const alphaBase = 0.3 + pulse * 0.05;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `600 ${state.tAnchor.size}px "Helvetica Neue", Arial, sans-serif`;

    ctx.fillStyle = `rgba(255,255,255,${alphaBase})`;
    ctx.fillText("t", state.tAnchor.x + driftX, state.tAnchor.y + driftY);
    ctx.fillStyle = `rgba(194, 230, 247, ${0.24 + pulse * 0.04})`;
    ctx.fillText(
      "t",
      state.tAnchor.x + driftX + 1.0,
      state.tAnchor.y + driftY - 0.5,
    );
    ctx.fillStyle = `rgba(200, 190, 238, ${0.15 + pulse * 0.03})`;
    ctx.fillText(
      "t",
      state.tAnchor.x + driftX - 0.9,
      state.tAnchor.y + driftY + 0.9,
    );
    ctx.restore();
  }

  function render(time) {
    updateMotion(time);
    ctx.clearRect(0, 0, width, height);

    const baseOffsetX = motion.x * 0.12;
    const baseOffsetY = motion.y * 0.1;
    ctx.drawImage(baseCanvas, baseOffsetX, baseOffsetY, width, height);

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.04;
    const shift = 0.5 + 0.5 * Math.sin(time * 0.00036);
    const glow = ctx.createLinearGradient(
      width * 0.14,
      0,
      width * 0.86,
      height,
    );
    glow.addColorStop(0, `rgba(214,240,251,${0.12 + shift * 0.04})`);
    glow.addColorStop(0.34, `rgba(255,255,255,${0.06 + shift * 0.03})`);
    glow.addColorStop(0.7, `rgba(207,196,238,${0.08 + (1 - shift) * 0.04})`);
    glow.addColorStop(1, "rgba(255,255,255,0.08)");
    ctx.fillStyle = glow;
    ctx.fillRect(motion.x * 0.16, motion.y * 0.12, width, height);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.drawImage(grainCanvas, motion.x * 0.08, motion.y * 0.08, width, height);
    ctx.restore();

    drawT(time);
    requestAnimationFrame(render);
  }

  function handlePointer(x, y, active = true) {
    pointer.active = active;
    const nx = (x / width - 0.5) * 2;
    const ny = (y / height - 0.5) * 2;
    motion.targetX = clamp(nx * 9, -9, 9);
    motion.targetY = clamp(ny * 7, -7, 7);
  }

  function preventTouchDefault(event) {
    event.preventDefault();
  }

  window.addEventListener("resize", resize);
  document.addEventListener("touchmove", preventTouchDefault, {
    passive: false,
  });

  canvas.addEventListener("pointerdown", (event) => {
    canvas.setPointerCapture(event.pointerId);
    handlePointer(event.clientX, event.clientY, true);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!pointer.active) return;
    handlePointer(event.clientX, event.clientY, true);
  });

  const releasePointer = () => {
    pointer.active = false;
  };

  canvas.addEventListener("pointerup", releasePointer);
  canvas.addEventListener("pointercancel", releasePointer);
  canvas.addEventListener("pointerleave", () => {
    if (pointer.active) return;
    pointer.active = false;
  });

  resize();
  requestAnimationFrame(render);
})();
