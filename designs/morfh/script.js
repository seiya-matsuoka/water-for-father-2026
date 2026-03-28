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
    overlayPatches: [],
  };

  const palette = {
    bg0: "#dff0f8",
    bg1: "#edf7fb",
    bg2: "#e6f3f5",
    paperWhite: "#f8fcfd",
    whiteTint: "rgba(251, 254, 255, 0.98)",
    ice: "rgba(228, 245, 253, 0.98)",
    sky: "rgba(190, 229, 249, 0.96)",
    cyan: "rgba(153, 216, 247, 0.95)",
    aqua: "rgba(125, 204, 244, 0.93)",
    blueDeep: "rgba(98, 188, 239, 0.90)",
    lavender: "rgba(209, 191, 247, 0.94)",
    violet: "rgba(156, 133, 233, 0.90)",
    mint: "rgba(206, 239, 226, 0.84)",
    yellow: "rgba(245, 238, 176, 0.82)",
    seam: "rgba(225, 235, 239, 0.82)",
    seamShadow: "rgba(160, 172, 178, 0.13)",
    grainDark: "rgba(109, 118, 126, 0.23)",
    grainLight: "rgba(255,255,255,0.28)",
    tBlue: "rgba(176, 227, 255, 0.68)",
    tLavender: "rgba(198, 186, 244, 0.36)",
  };

  const tileFamilies = [
    {
      weight: 5.6,
      base: "rgba(231,246,252,0.98)",
      ramp: [palette.whiteTint, palette.sky, palette.cyan],
      accent: [palette.whiteTint, palette.lavender],
    },
    {
      weight: 3.8,
      base: "rgba(227,244,251,0.98)",
      ramp: [palette.ice, palette.cyan, palette.aqua],
      accent: [palette.whiteTint, palette.violet],
    },
    {
      weight: 2.3,
      base: "rgba(229,245,252,0.98)",
      ramp: [palette.whiteTint, palette.sky, palette.lavender],
      accent: [palette.whiteTint, palette.violet],
    },
    {
      weight: 1.3,
      base: "rgba(232,246,251,0.98)",
      ramp: [palette.ice, palette.cyan, palette.sky],
      accent: [palette.whiteTint, palette.mint],
    },
    {
      weight: 0.9,
      base: "rgba(234,247,250,0.98)",
      ramp: [palette.whiteTint, palette.sky, palette.cyan],
      accent: [palette.whiteTint, palette.yellow],
    },
  ];

  const gradientModes = [
    "h",
    "v",
    "diagA",
    "diagB",
    "corner",
    "sweep",
    "band",
    "cross",
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

  function weightedFamily(excludeKey) {
    const available = tileFamilies.filter((f) => f !== excludeKey);
    const pool = available.length ? available : tileFamilies;
    const total = pool.reduce((sum, item) => sum + item.weight, 0);
    let pick = Math.random() * total;
    for (const item of pool) {
      pick -= item.weight;
      if (pick <= 0) return item;
    }
    return pool[0];
  }

  function chooseMode(exclude) {
    const options = gradientModes.filter((m) => m !== exclude);
    return choose(options.length ? options : gradientModes);
  }

  function buildTiles() {
    state.tiles = [];

    const idealCell = clamp(Math.round(width / 5.5), 66, 96);
    const cols = Math.max(4, Math.round(width / idealCell));
    const cell = width / cols;
    const rows = Math.ceil(height / cell) + 1;
    const occupancy = Array.from({ length: rows }, () =>
      Array(cols).fill(false),
    );
    const refs = Array.from({ length: rows }, () => Array(cols).fill(null));

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        if (occupancy[row][col]) continue;

        const wide = col < cols - 1 && Math.random() < 0.46;
        const tall = row < rows - 1 && Math.random() < 0.22;
        const spanX = wide ? 2 : 1;
        const spanY = tall ? 2 : 1;

        const leftTile = col > 0 ? refs[row][col - 1] : null;
        const upTile = row > 0 ? refs[row - 1][col] : null;
        const family = weightedFamily(
          leftTile && upTile && leftTile.family === upTile.family
            ? leftTile.family
            : null,
        );
        const mode = chooseMode(
          leftTile && upTile && leftTile.mode === upTile.mode
            ? leftTile.mode
            : null,
        );
        const variant = choose(["soft", "ribbon", "wash", "halo", "beam"]);

        const tile = {
          x: col * cell + rand(-1.0, 1.0),
          y: row * cell + rand(-1.0, 1.0),
          w: cell * spanX + rand(-1.8, 1.8),
          h: cell * spanY + rand(-1.8, 1.8),
          family,
          mode,
          variant,
          base: family.base,
          ramp0: family.ramp[0],
          ramp1: family.ramp[1],
          ramp2: family.ramp[2],
          accent0: family.accent[0],
          accent1: family.accent[1],
          fillAlpha: rand(0.955, 0.988),
          tintAlphaA: rand(0.5, 0.76),
          tintAlphaB: rand(0.4, 0.66),
          whiteAlpha: rand(0.34, 0.56),
          accentAlpha: rand(0.12, 0.34),
          cloudAlpha: rand(0.18, 0.34),
          edgeAlpha: rand(0.16, 0.28),
          phase: rand(0, Math.PI * 2),
          seed0: Math.random(),
          seed1: Math.random(),
          seed2: Math.random(),
        };

        state.tiles.push(tile);

        for (let ry = row; ry < Math.min(rows, row + spanY); ry += 1) {
          for (let cx = col; cx < Math.min(cols, col + spanX); cx += 1) {
            occupancy[ry][cx] = true;
            refs[ry][cx] = tile;
          }
        }
      }
    }

    const tTile =
      state.tiles[Math.floor(state.tiles.length * 0.63)] ||
      state.tiles[state.tiles.length - 1];
    if (tTile) {
      state.tAnchor = {
        x: tTile.x + tTile.w * 0.5,
        y: tTile.y + tTile.h * 0.54,
        size: clamp(Math.min(tTile.w, tTile.h) * 0.17, 13, 18),
      };
    }
  }

  function buildOverlayPatches() {
    state.overlayPatches = [];
    const count = 7;
    for (let i = 0; i < count; i += 1) {
      state.overlayPatches.push({
        type: Math.random() < 0.58 ? "radial" : "linear",
        x: rand(0.08, 0.92),
        y: rand(0.08, 0.92),
        w: rand(0.24, 0.48),
        h: rand(0.18, 0.4),
        alpha: rand(0.08, 0.15),
        angle: rand(-Math.PI * 0.55, Math.PI * 0.55),
        seed: rand(0, Math.PI * 2),
        c0: choose([
          "rgba(214,240,255,0.18)",
          "rgba(198,231,252,0.16)",
          "rgba(182,222,251,0.14)",
        ]),
        c1: choose([
          "rgba(154,211,247,0.14)",
          "rgba(136,201,242,0.12)",
          "rgba(173,223,250,0.10)",
        ]),
      });
    }
  }

  function makeGradientForTile(tile) {
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
      seed0,
      seed1,
    } = tile;
    let grad;

    if (mode === "h") {
      grad = baseCtx.createLinearGradient(
        x,
        y + h * seed0,
        x,
        y + h * (0.2 + seed1 * 0.8),
      );
      grad.addColorStop(0, rgbaWithAlpha(ramp1, tintAlphaA));
      grad.addColorStop(0.28, rgbaWithAlpha(ramp0, whiteAlpha));
      grad.addColorStop(0.62, rgbaWithAlpha(ramp2, tintAlphaB));
      grad.addColorStop(1, rgbaWithAlpha(ramp1, tintAlphaA * 0.9));
      return grad;
    }

    if (mode === "v") {
      grad = baseCtx.createLinearGradient(
        x + w * seed0,
        y,
        x + w * (0.18 + seed1 * 0.78),
        y,
      );
      grad.addColorStop(0, rgbaWithAlpha(ramp1, tintAlphaA));
      grad.addColorStop(0.26, rgbaWithAlpha(ramp0, whiteAlpha));
      grad.addColorStop(0.58, rgbaWithAlpha(ramp2, tintAlphaB));
      grad.addColorStop(1, rgbaWithAlpha(ramp1, tintAlphaA * 0.88));
      return grad;
    }

    if (mode === "diagA" || mode === "diagB") {
      grad =
        mode === "diagA"
          ? baseCtx.createLinearGradient(x, y, x + w, y + h)
          : baseCtx.createLinearGradient(x + w, y, x, y + h);
      grad.addColorStop(0, rgbaWithAlpha(ramp1, tintAlphaA));
      grad.addColorStop(0.22, rgbaWithAlpha(ramp0, whiteAlpha));
      grad.addColorStop(0.52, rgbaWithAlpha(ramp2, tintAlphaB));
      grad.addColorStop(0.84, rgbaWithAlpha(ramp0, whiteAlpha * 0.9));
      grad.addColorStop(1, rgbaWithAlpha(ramp1, tintAlphaA * 0.88));
      return grad;
    }

    if (mode === "corner") {
      const gx = x + w * (seed0 > 0.5 ? 0.1 : 0.9);
      const gy = y + h * (seed1 > 0.5 ? 0.1 : 0.9);
      grad = baseCtx.createRadialGradient(
        gx,
        gy,
        0,
        gx,
        gy,
        Math.max(w, h) * 1.05,
      );
      grad.addColorStop(0, rgbaWithAlpha(ramp0, whiteAlpha));
      grad.addColorStop(0.22, rgbaWithAlpha(ramp2, tintAlphaB));
      grad.addColorStop(0.62, rgbaWithAlpha(ramp1, tintAlphaA));
      grad.addColorStop(1, rgbaWithAlpha(ramp0, 0.08));
      return grad;
    }

    if (mode === "sweep") {
      grad = baseCtx.createLinearGradient(
        x,
        y + h * (0.12 + seed0 * 0.2),
        x + w,
        y + h * (0.88 - seed1 * 0.2),
      );
      grad.addColorStop(0, rgbaWithAlpha(ramp0, whiteAlpha * 0.95));
      grad.addColorStop(0.18, rgbaWithAlpha(ramp2, tintAlphaB * 0.94));
      grad.addColorStop(0.5, rgbaWithAlpha(ramp1, tintAlphaA));
      grad.addColorStop(0.82, rgbaWithAlpha(ramp0, whiteAlpha));
      grad.addColorStop(1, rgbaWithAlpha(ramp2, tintAlphaB * 0.86));
      return grad;
    }

    if (mode === "band") {
      grad = baseCtx.createLinearGradient(x, y, x, y + h);
      grad.addColorStop(0, rgbaWithAlpha(ramp1, tintAlphaA * 0.88));
      grad.addColorStop(0.18, rgbaWithAlpha(ramp0, whiteAlpha));
      grad.addColorStop(0.36, rgbaWithAlpha(ramp2, tintAlphaB));
      grad.addColorStop(0.54, rgbaWithAlpha(ramp0, whiteAlpha * 0.98));
      grad.addColorStop(0.74, rgbaWithAlpha(ramp1, tintAlphaA * 0.84));
      grad.addColorStop(1, rgbaWithAlpha(ramp0, whiteAlpha * 0.92));
      return grad;
    }

    grad = baseCtx.createLinearGradient(x, y, x + w, y);
    grad.addColorStop(0, rgbaWithAlpha(ramp0, whiteAlpha));
    grad.addColorStop(0.26, rgbaWithAlpha(ramp1, tintAlphaA));
    grad.addColorStop(0.5, rgbaWithAlpha(ramp0, whiteAlpha * 0.96));
    grad.addColorStop(0.72, rgbaWithAlpha(ramp2, tintAlphaB));
    grad.addColorStop(1, rgbaWithAlpha(ramp0, whiteAlpha));
    return grad;
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
      mode,
      variant,
      seed0,
      seed1,
      seed2,
    } = tile;

    baseCtx.save();
    baseCtx.globalAlpha = tile.fillAlpha;
    baseCtx.fillStyle = base;
    baseCtx.fillRect(x, y, w, h);
    baseCtx.restore();

    baseCtx.save();
    baseCtx.fillStyle = makeGradientForTile(tile);
    baseCtx.fillRect(x, y, w, h);
    baseCtx.restore();

    if (variant === "ribbon" || mode === "band" || mode === "cross") {
      const ribbon = baseCtx.createLinearGradient(
        x,
        y + h * (0.12 + seed0 * 0.5),
        x,
        y + h * (0.32 + seed1 * 0.58),
      );
      ribbon.addColorStop(0, "rgba(255,255,255,0)");
      ribbon.addColorStop(0.2, rgbaWithAlpha(ramp0, 0.42));
      ribbon.addColorStop(0.48, rgbaWithAlpha(ramp2, 0.34));
      ribbon.addColorStop(0.78, rgbaWithAlpha(ramp0, 0.4));
      ribbon.addColorStop(1, "rgba(255,255,255,0)");
      baseCtx.fillStyle = ribbon;
      baseCtx.fillRect(x, y, w, h);
    }

    if (variant === "beam" || mode === "v" || mode === "cross") {
      const beam = baseCtx.createLinearGradient(
        x + w * (0.14 + seed2 * 0.58),
        y,
        x + w * (0.38 + seed1 * 0.46),
        y,
      );
      beam.addColorStop(0, "rgba(255,255,255,0)");
      beam.addColorStop(0.26, rgbaWithAlpha(ramp0, 0.32));
      beam.addColorStop(0.52, rgbaWithAlpha(accent1, 0.28));
      beam.addColorStop(0.8, rgbaWithAlpha(ramp0, 0.34));
      beam.addColorStop(1, "rgba(255,255,255,0)");
      baseCtx.fillStyle = beam;
      baseCtx.fillRect(x, y, w, h);
    }

    if (variant === "halo" || mode === "corner" || mode === "sweep") {
      const glowX = x + w * (0.15 + seed0 * 0.7);
      const glowY = y + h * (0.15 + seed1 * 0.7);
      const radial = baseCtx.createRadialGradient(
        glowX,
        glowY,
        0,
        glowX,
        glowY,
        Math.max(w, h) * (0.52 + seed2 * 0.42),
      );
      radial.addColorStop(0, rgbaWithAlpha(accent0, accentAlpha * 0.96));
      radial.addColorStop(0.26, rgbaWithAlpha(accent1, accentAlpha * 0.88));
      radial.addColorStop(0.68, rgbaWithAlpha(ramp0, cloudAlpha * 0.36));
      radial.addColorStop(1, "rgba(255,255,255,0)");
      baseCtx.save();
      baseCtx.globalCompositeOperation = "screen";
      baseCtx.fillStyle = radial;
      baseCtx.fillRect(x, y, w, h);
      baseCtx.restore();
    }

    const sideSheen = baseCtx.createLinearGradient(x, y, x + w, y);
    sideSheen.addColorStop(0, "rgba(255,255,255,0.04)");
    sideSheen.addColorStop(0.22, rgbaWithAlpha(ramp0, 0.28));
    sideSheen.addColorStop(0.46, rgbaWithAlpha(ramp1, 0.16));
    sideSheen.addColorStop(0.74, rgbaWithAlpha(accent1, accentAlpha * 0.9));
    sideSheen.addColorStop(1, "rgba(255,255,255,0.03)");
    baseCtx.fillStyle = sideSheen;
    baseCtx.fillRect(x, y, w, h);

    const cloud = baseCtx.createLinearGradient(
      x,
      y + h * (0.14 + seed1 * 0.28),
      x,
      y + h * (0.68 + seed0 * 0.2),
    );
    cloud.addColorStop(0, "rgba(255,255,255,0)");
    cloud.addColorStop(0.36, rgbaWithAlpha(ramp0, cloudAlpha * 0.92));
    cloud.addColorStop(0.58, rgbaWithAlpha(ramp2, cloudAlpha * 0.88));
    cloud.addColorStop(1, "rgba(255,255,255,0)");
    baseCtx.fillStyle = cloud;
    baseCtx.fillRect(x, y, w, h);

    baseCtx.save();
    baseCtx.strokeStyle = `rgba(228, 236, 238, ${edgeAlpha})`;
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
    bg.addColorStop(0.35, palette.paperWhite);
    bg.addColorStop(0.7, palette.bg2);
    bg.addColorStop(1, palette.bg1);
    baseCtx.fillStyle = bg;
    baseCtx.fillRect(0, 0, width, height);

    state.tiles.forEach(paintTile);
  }

  function paintGrain() {
    grainCtx.clearRect(0, 0, width, height);

    const dots = Math.round((width * height) / 210);
    for (let i = 0; i < dots; i += 1) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const s = Math.random() < 0.88 ? 1 : 1.4;
      grainCtx.fillStyle =
        Math.random() < 0.76 ? palette.grainDark : palette.grainLight;
      grainCtx.fillRect(x, y, s, s);
    }

    grainCtx.save();
    grainCtx.globalAlpha = 0.08;
    for (let i = 0; i < 30; i += 1) {
      const y = rand(0, height);
      grainCtx.fillStyle =
        Math.random() < 0.55
          ? "rgba(255,255,255,0.58)"
          : "rgba(112, 121, 129, 0.34)";
      grainCtx.fillRect(0, y, width, rand(0.45, 1.1));
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
    buildOverlayPatches();
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
      motion.targetX = Math.sin(time * 0.00018) * 5.1;
      motion.targetY = Math.cos(time * 0.00015) * 4.2;
    }
  }

  function drawOverlay(time) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    state.overlayPatches.forEach((patch, index) => {
      const dx =
        Math.sin(time * 0.00012 + patch.seed + index) * width * 0.018 +
        motion.x * 0.34;
      const dy =
        Math.cos(time * 0.0001 + patch.seed * 1.2 + index) * height * 0.015 +
        motion.y * 0.28;
      const px = patch.x * width + dx;
      const py = patch.y * height + dy;
      const pw = patch.w * width;
      const ph = patch.h * height;

      let grad;
      if (patch.type === "radial") {
        grad = ctx.createRadialGradient(px, py, 0, px, py, Math.max(pw, ph));
        grad.addColorStop(0, patch.c0);
        grad.addColorStop(0.42, patch.c1);
        grad.addColorStop(1, "rgba(255,255,255,0)");
      } else {
        const x1 = px + Math.cos(patch.angle) * pw * 0.6;
        const y1 = py + Math.sin(patch.angle) * ph * 0.6;
        const x2 = px - Math.cos(patch.angle) * pw * 0.6;
        const y2 = py - Math.sin(patch.angle) * ph * 0.6;
        grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, "rgba(255,255,255,0)");
        grad.addColorStop(0.28, patch.c1);
        grad.addColorStop(0.52, patch.c0);
        grad.addColorStop(0.78, patch.c1);
        grad.addColorStop(1, "rgba(255,255,255,0)");
      }

      ctx.fillStyle = grad;
      ctx.fillRect(px - pw, py - ph, pw * 2, ph * 2);
    });

    ctx.restore();
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

    drawOverlay(time);

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
