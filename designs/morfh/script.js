(() => {
  const canvas = document.getElementById("morfh-canvas");
  const ctx = canvas.getContext("2d", { alpha: true });

  const dprMax = 1.6;
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
    grainDots: 0,
    tAnchor: null,
  };

  const palette = {
    bg0: "#edf4f1",
    bg1: "#e8f0ee",
    white: "rgba(255,255,255,0.92)",
    softWhite: "rgba(248,250,249,0.96)",
    ice: "rgba(204, 239, 250, 0.78)",
    cyan: "rgba(177, 233, 248, 0.84)",
    lavender: "rgba(185, 176, 232, 0.74)",
    violet: "rgba(153, 141, 225, 0.52)",
    mint: "rgba(214, 238, 226, 0.68)",
    yellow: "rgba(242, 238, 189, 0.52)",
    blueGlow: "rgba(94, 197, 255, 0.34)",
    printGrey: "rgba(126, 136, 143, 0.12)",
    grainDark: "rgba(94, 110, 126, 0.18)",
    grainLight: "rgba(255,255,255,0.24)",
    tBlue: "rgba(188, 226, 250, 0.42)",
    tLavender: "rgba(190, 182, 236, 0.30)",
  };

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

  function setCanvasSize(targetCanvas, targetCtx, w, h) {
    targetCanvas.width = w;
    targetCanvas.height = h;
    targetCtx.setTransform(1, 0, 0, 1, 0, 0);
    targetCtx.scale(dpr, dpr);
  }

  function rgbaWithAlpha(color, alpha) {
    return color.replace(
      /rgba\(([^)]+),\s*[0-9.]+\)/,
      (_, rgb) => `rgba(${rgb}, ${alpha})`,
    );
  }

  function buildTiles() {
    state.tiles = [];

    const cols = clamp(Math.round(width / 74), 5, 7);
    const rows = clamp(Math.round(height / 62), 12, 18);
    const cellW = width / cols;
    const cellH = height / rows;
    const occupancy = Array.from({ length: rows }, () =>
      Array(cols).fill(false),
    );
    const colors = [
      palette.softWhite,
      palette.softWhite,
      palette.white,
      palette.ice,
      palette.cyan,
      palette.lavender,
      palette.mint,
      palette.yellow,
    ];

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        if (occupancy[row][col]) continue;

        const spanX = col < cols - 1 && Math.random() < 0.36 ? 2 : 1;
        const spanY = row < rows - 1 && Math.random() < 0.16 ? 2 : 1;

        for (let ry = row; ry < Math.min(rows, row + spanY); ry += 1) {
          for (let cx = col; cx < Math.min(cols, col + spanX); cx += 1) {
            occupancy[ry][cx] = true;
          }
        }

        const x = col * cellW + rand(-1.5, 1.5);
        const y = row * cellH + rand(-1.5, 1.5);
        const w = cellW * spanX + rand(-2, 3);
        const h = cellH * spanY + rand(-2, 3);

        const tile = {
          x,
          y,
          w,
          h,
          baseColor: choose(colors),
          opacity: rand(0.92, 1),
          blur: rand(2.6, 6.6),
          edgeAlpha: rand(0.1, 0.2),
          tintA: choose([
            palette.ice,
            palette.cyan,
            palette.lavender,
            palette.mint,
            palette.yellow,
          ]),
          tintB: choose([
            palette.softWhite,
            palette.ice,
            palette.lavender,
            palette.mint,
            palette.yellow,
          ]),
          tintAlphaA: rand(0.18, 0.34),
          tintAlphaB: rand(0.12, 0.26),
          tintDir: Math.random() < 0.5 ? 0 : 1,
          phase: rand(0, Math.PI * 2),
          innerGlow: choose([
            palette.blueGlow,
            palette.violet,
            palette.cyan,
            palette.lavender,
            palette.yellow,
          ]),
          innerGlowAlpha: rand(0.12, 0.26),
        };

        state.tiles.push(tile);
      }
    }

    const tTile =
      state.tiles[Math.floor(state.tiles.length * 0.63)] ||
      state.tiles[state.tiles.length - 1];
    if (tTile) {
      state.tAnchor = {
        x: tTile.x + tTile.w * 0.56,
        y: tTile.y + tTile.h * 0.52,
        size: clamp(Math.min(tTile.w, tTile.h) * 0.18, 13, 20),
      };
    }
  }

  function paintTile(tile) {
    const {
      x,
      y,
      w,
      h,
      baseColor,
      opacity,
      blur,
      edgeAlpha,
      tintA,
      tintB,
      tintAlphaA,
      tintAlphaB,
      tintDir,
      innerGlow,
      innerGlowAlpha,
    } = tile;

    baseCtx.save();
    baseCtx.globalAlpha = opacity;
    baseCtx.filter = `blur(${blur}px)`;
    baseCtx.fillStyle = baseColor;
    baseCtx.fillRect(x, y, w, h);
    baseCtx.restore();

    const grad =
      tintDir === 0
        ? baseCtx.createLinearGradient(x, y, x + w, y)
        : baseCtx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, rgbaWithAlpha(tintA, tintAlphaA));
    grad.addColorStop(rand(0.24, 0.42), "rgba(255,255,255,0)");
    grad.addColorStop(0.7, rgbaWithAlpha(tintB, tintAlphaB));
    grad.addColorStop(1, rgbaWithAlpha(tintA, tintAlphaA * 0.36));
    baseCtx.fillStyle = grad;
    baseCtx.fillRect(x, y, w, h);

    baseCtx.save();
    baseCtx.globalCompositeOperation = "screen";
    baseCtx.globalAlpha = innerGlowAlpha;
    const rx = x + rand(w * 0.18, w * 0.82);
    const ry = y + rand(h * 0.18, h * 0.82);
    const radial = baseCtx.createRadialGradient(
      rx,
      ry,
      0,
      rx,
      ry,
      Math.max(w, h) * rand(0.45, 0.95),
    );
    radial.addColorStop(
      0,
      innerGlow.replace(/rgba\(([^)]+),\s*[0-9.]+\)/, "rgba($1, 0.95)"),
    );
    radial.addColorStop(0.45, rgbaWithAlpha(innerGlow, innerGlowAlpha * 0.9));
    radial.addColorStop(1, "rgba(255,255,255,0)");
    baseCtx.fillStyle = radial;
    baseCtx.fillRect(x, y, w, h);
    baseCtx.restore();

    baseCtx.save();
    baseCtx.globalAlpha = 0.36;
    const softBand = baseCtx.createLinearGradient(x, y, x + w, y + h);
    softBand.addColorStop(0, "rgba(255,255,255,0.22)");
    softBand.addColorStop(0.35, "rgba(255,255,255,0)");
    softBand.addColorStop(0.6, "rgba(255,255,255,0.08)");
    softBand.addColorStop(1, "rgba(255,255,255,0)");
    baseCtx.fillStyle = softBand;
    baseCtx.fillRect(x, y, w, h);
    baseCtx.restore();

    baseCtx.save();
    baseCtx.strokeStyle = `rgba(197, 208, 214, ${edgeAlpha})`;
    baseCtx.lineWidth = 0.9;
    baseCtx.strokeRect(
      Math.round(x) + 0.5,
      Math.round(y) + 0.5,
      Math.round(w),
      Math.round(h),
    );
    baseCtx.restore();
  }

  function paintBase() {
    baseCtx.clearRect(0, 0, width, height);

    const bg = baseCtx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, palette.bg0);
    bg.addColorStop(0.55, "#edf4f1");
    bg.addColorStop(1, palette.bg1);
    baseCtx.fillStyle = bg;
    baseCtx.fillRect(0, 0, width, height);

    const wash = baseCtx.createLinearGradient(
      width * 0.08,
      0,
      width * 0.92,
      height,
    );
    wash.addColorStop(0, "rgba(212,241,249,0.10)");
    wash.addColorStop(0.34, "rgba(255,255,255,0.08)");
    wash.addColorStop(0.7, "rgba(188,181,232,0.08)");
    wash.addColorStop(1, "rgba(255,255,255,0.05)");
    baseCtx.fillStyle = wash;
    baseCtx.fillRect(0, 0, width, height);

    state.tiles.forEach(paintTile);

    baseCtx.save();
    baseCtx.globalAlpha = 0.06;
    for (let i = 0; i < 10; i += 1) {
      const x = width * (i / 9) + rand(-5, 5);
      const grad = baseCtx.createLinearGradient(x - 6, 0, x + 6, 0);
      grad.addColorStop(0, "rgba(255,255,255,0)");
      grad.addColorStop(0.5, "rgba(255,255,255,0.65)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      baseCtx.fillStyle = grad;
      baseCtx.fillRect(x - 6, 0, 12, height);
    }
    baseCtx.restore();
  }

  function paintGrain() {
    grainCtx.clearRect(0, 0, width, height);

    state.grainDots = Math.round((width * height) / 360);
    for (let i = 0; i < state.grainDots; i += 1) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const s = Math.random() < 0.86 ? 1 : 1.4;
      grainCtx.fillStyle =
        Math.random() < 0.72 ? palette.grainDark : palette.grainLight;
      grainCtx.fillRect(x, y, s, s);
    }

    grainCtx.save();
    grainCtx.globalAlpha = 0.06;
    for (let i = 0; i < 28; i += 1) {
      const y = rand(0, height);
      grainCtx.fillStyle =
        Math.random() < 0.5
          ? "rgba(255,255,255,0.55)"
          : "rgba(95, 110, 125, 0.42)";
      grainCtx.fillRect(0, y, width, rand(0.5, 1.4));
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

    setCanvasSize(
      baseCanvas,
      baseCtx,
      Math.round(width * dpr),
      Math.round(height * dpr),
    );
    setCanvasSize(
      grainCanvas,
      grainCtx,
      Math.round(width * dpr),
      Math.round(height * dpr),
    );

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
      motion.targetX = Math.sin(time * 0.00018) * 6;
      motion.targetY = Math.cos(time * 0.00015) * 5;
    }
  }

  function drawT(time) {
    if (!state.tAnchor) return;

    const driftX = motion.x * 0.14;
    const driftY = motion.y * 0.12;
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.00045);
    const alphaBase = 0.22 + pulse * 0.05;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `600 ${state.tAnchor.size}px "Helvetica Neue", "Arial Narrow", Arial, sans-serif`;

    ctx.fillStyle = `rgba(255,255,255,${alphaBase})`;
    ctx.fillText("t", state.tAnchor.x + driftX, state.tAnchor.y + driftY);

    ctx.fillStyle = `rgba(195, 223, 245, ${0.24 + pulse * 0.05})`;
    ctx.fillText(
      "t",
      state.tAnchor.x + driftX + 1.2,
      state.tAnchor.y + driftY - 0.6,
    );

    ctx.fillStyle = `rgba(201, 190, 236, ${0.16 + pulse * 0.04})`;
    ctx.fillText(
      "t",
      state.tAnchor.x + driftX - 1.1,
      state.tAnchor.y + driftY + 1.0,
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
    ctx.globalAlpha = 0.1;
    const shift = 0.5 + 0.5 * Math.sin(time * 0.00036);
    const glow = ctx.createLinearGradient(
      width * 0.18,
      0,
      width * 0.82,
      height,
    );
    glow.addColorStop(0, `rgba(215,239,246,${0.15 + shift * 0.06})`);
    glow.addColorStop(0.38, `rgba(255,255,255,${0.09 + shift * 0.03})`);
    glow.addColorStop(0.7, `rgba(202,194,234,${0.1 + (1 - shift) * 0.05})`);
    glow.addColorStop(1, "rgba(255,255,255,0.12)");
    ctx.fillStyle = glow;
    ctx.fillRect(motion.x * 0.18, motion.y * 0.12, width, height);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.94;
    ctx.drawImage(grainCanvas, motion.x * 0.08, motion.y * 0.08, width, height);
    ctx.restore();

    drawT(time);
    requestAnimationFrame(render);
  }

  function handlePointer(x, y, active = true) {
    pointer.active = active;
    const nx = (x / width - 0.5) * 2;
    const ny = (y / height - 0.5) * 2;
    motion.targetX = clamp(nx * 10, -10, 10);
    motion.targetY = clamp(ny * 8, -8, 8);
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
