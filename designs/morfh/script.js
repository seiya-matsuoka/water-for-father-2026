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
    bg0: "#edf4f4",
    bg1: "#eff6f4",
    paperWhite: "#f8fbfa",
    mist: "rgba(245, 249, 248, 0.92)",
    ice: "rgba(201, 240, 252, 0.84)",
    cyan: "rgba(170, 231, 250, 0.92)",
    sky: "rgba(187, 227, 247, 0.86)",
    lavender: "rgba(208, 199, 247, 0.86)",
    violet: "rgba(174, 158, 234, 0.76)",
    mint: "rgba(214, 237, 228, 0.84)",
    green: "rgba(201, 230, 216, 0.82)",
    yellow: "rgba(243, 239, 196, 0.72)",
    printGrey: "rgba(136, 146, 156, 0.10)",
    seam: "rgba(226, 234, 235, 0.88)",
    seamShadow: "rgba(183, 195, 204, 0.14)",
    grainDark: "rgba(102, 116, 128, 0.22)",
    grainLight: "rgba(255,255,255,0.22)",
    tBlue: "rgba(190, 229, 248, 0.50)",
    tLavender: "rgba(196, 187, 239, 0.34)",
  };

  const tileFamilies = [
    ["rgba(241,249,251,0.96)", palette.ice, palette.sky],
    ["rgba(244,249,250,0.95)", palette.cyan, palette.ice],
    ["rgba(248,249,251,0.95)", palette.lavender, palette.violet],
    ["rgba(243,248,246,0.95)", palette.mint, palette.green],
    ["rgba(248,248,241,0.94)", palette.yellow, palette.mist],
    ["rgba(247,250,249,0.96)", palette.sky, palette.lavender],
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

    const cols = clamp(Math.round(width / 62), 5, 8);
    const cell = width / cols;
    const rows = Math.ceil(height / cell) + 1;
    const occupancy = Array.from({ length: rows }, () =>
      Array(cols).fill(false),
    );

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        if (occupancy[row][col]) continue;

        const spanX = col < cols - 1 && Math.random() < 0.42 ? 2 : 1;
        const spanY = row < rows - 1 && Math.random() < 0.34 ? 2 : 1;

        for (let ry = row; ry < Math.min(rows, row + spanY); ry += 1) {
          for (let cx = col; cx < Math.min(cols, col + spanX); cx += 1) {
            occupancy[ry][cx] = true;
          }
        }

        const x = col * cell + rand(-1.6, 1.6);
        const y = row * cell + rand(-1.6, 1.6);
        const w = cell * spanX + rand(-2.4, 2.4);
        const h = cell * spanY + rand(-2.4, 2.4);
        const family = choose(tileFamilies);
        const tilt = choose(["x", "y", "diagA", "diagB"]);

        state.tiles.push({
          x,
          y,
          w,
          h,
          tilt,
          base: family[0],
          tintA: family[1],
          tintB: family[2],
          fillAlpha: rand(0.88, 0.98),
          tintAlphaA: rand(0.4, 0.62),
          tintAlphaB: rand(0.24, 0.44),
          cloudAlpha: rand(0.14, 0.26),
          blur: rand(0.35, 0.95),
          edgeAlpha: rand(0.26, 0.42),
          phase: rand(0, Math.PI * 2),
        });
      }
    }

    const tTile =
      state.tiles[Math.floor(state.tiles.length * 0.64)] ||
      state.tiles[state.tiles.length - 1];
    if (tTile) {
      state.tAnchor = {
        x: tTile.x + tTile.w * 0.52,
        y: tTile.y + tTile.h * 0.53,
        size: clamp(Math.min(tTile.w, tTile.h) * 0.18, 14, 20),
      };
    }
  }

  function createTileGradient(tile) {
    const { x, y, w, h, tilt, base, tintA, tintB, tintAlphaA, tintAlphaB } =
      tile;
    let grad;

    if (tilt === "x") {
      grad = baseCtx.createLinearGradient(x, y, x + w, y);
    } else if (tilt === "y") {
      grad = baseCtx.createLinearGradient(x, y, x, y + h);
    } else if (tilt === "diagB") {
      grad = baseCtx.createLinearGradient(x + w, y, x, y + h);
    } else {
      grad = baseCtx.createLinearGradient(x, y, x + w, y + h);
    }

    grad.addColorStop(0, rgbaWithAlpha(tintA, tintAlphaA));
    grad.addColorStop(rand(0.24, 0.42), base);
    grad.addColorStop(rand(0.58, 0.76), rgbaWithAlpha(tintB, tintAlphaB));
    grad.addColorStop(1, rgbaWithAlpha(tintA, tintAlphaA * 0.52));
    return grad;
  }

  function paintTile(tile) {
    const {
      x,
      y,
      w,
      h,
      base,
      fillAlpha,
      cloudAlpha,
      blur,
      edgeAlpha,
      tintA,
      tintB,
      phase,
    } = tile;

    baseCtx.save();
    baseCtx.globalAlpha = fillAlpha;
    baseCtx.fillStyle = base;
    baseCtx.fillRect(x, y, w, h);
    baseCtx.restore();

    baseCtx.save();
    baseCtx.filter = `blur(${blur}px)`;
    baseCtx.fillStyle = createTileGradient(tile);
    baseCtx.fillRect(x, y, w, h);
    baseCtx.restore();

    const band = baseCtx.createLinearGradient(
      x,
      y + h * rand(0.18, 0.32),
      x,
      y + h * rand(0.62, 0.88),
    );
    band.addColorStop(0, "rgba(255,255,255,0)");
    band.addColorStop(0.36, rgbaWithAlpha(tintA, cloudAlpha));
    band.addColorStop(0.64, rgbaWithAlpha(tintB, cloudAlpha * 0.84));
    band.addColorStop(1, "rgba(255,255,255,0)");
    baseCtx.fillStyle = band;
    baseCtx.fillRect(x, y, w, h);

    const glowX = x + w * rand(0.18, 0.82);
    const glowY = y + h * rand(0.18, 0.82);
    const radial = baseCtx.createRadialGradient(
      glowX,
      glowY,
      0,
      glowX,
      glowY,
      Math.max(w, h) * rand(0.44, 0.92),
    );
    radial.addColorStop(0, rgbaWithAlpha(tintA, cloudAlpha * 0.9));
    radial.addColorStop(0.42, rgbaWithAlpha(tintB, cloudAlpha * 0.64));
    radial.addColorStop(1, "rgba(255,255,255,0)");
    baseCtx.save();
    baseCtx.globalCompositeOperation = "screen";
    baseCtx.fillStyle = radial;
    baseCtx.fillRect(x, y, w, h);
    baseCtx.restore();

    const veil = baseCtx.createLinearGradient(x, y, x + w, y + h);
    veil.addColorStop(0, "rgba(255,255,255,0.14)");
    veil.addColorStop(0.46, "rgba(255,255,255,0.02)");
    veil.addColorStop(0.7, "rgba(255,255,255,0.12)");
    veil.addColorStop(1, "rgba(255,255,255,0)");
    baseCtx.fillStyle = veil;
    baseCtx.fillRect(x, y, w, h);

    baseCtx.save();
    baseCtx.strokeStyle = `rgba(232, 238, 240, ${edgeAlpha})`;
    baseCtx.lineWidth = 1;
    baseCtx.strokeRect(
      Math.round(x) + 0.5,
      Math.round(y) + 0.5,
      Math.round(w),
      Math.round(h),
    );
    baseCtx.restore();

    baseCtx.save();
    baseCtx.strokeStyle = rgbaWithAlpha(palette.seamShadow, edgeAlpha * 0.7);
    baseCtx.lineWidth = 0.7;
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
    bg.addColorStop(0.5, palette.paperWhite);
    bg.addColorStop(1, palette.bg1);
    baseCtx.fillStyle = bg;
    baseCtx.fillRect(0, 0, width, height);

    state.tiles.forEach(paintTile);
  }

  function paintGrain() {
    grainCtx.clearRect(0, 0, width, height);

    const dots = Math.round((width * height) / 260);
    for (let i = 0; i < dots; i += 1) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const s = Math.random() < 0.88 ? 1 : 1.4;
      grainCtx.fillStyle =
        Math.random() < 0.78 ? palette.grainDark : palette.grainLight;
      grainCtx.fillRect(x, y, s, s);
    }

    grainCtx.save();
    grainCtx.globalAlpha = 0.065;
    for (let i = 0; i < 24; i += 1) {
      const y = rand(0, height);
      grainCtx.fillStyle =
        Math.random() < 0.55
          ? "rgba(255,255,255,0.58)"
          : "rgba(114, 123, 131, 0.34)";
      grainCtx.fillRect(0, y, width, rand(0.55, 1.2));
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
    const alphaBase = 0.26 + pulse * 0.05;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `600 ${state.tAnchor.size}px "Helvetica Neue", Arial, sans-serif`;

    ctx.fillStyle = `rgba(255,255,255,${alphaBase})`;
    ctx.fillText("t", state.tAnchor.x + driftX, state.tAnchor.y + driftY);
    ctx.fillStyle = `rgba(194, 230, 247, ${0.22 + pulse * 0.04})`;
    ctx.fillText(
      "t",
      state.tAnchor.x + driftX + 1.0,
      state.tAnchor.y + driftY - 0.5,
    );
    ctx.fillStyle = `rgba(200, 190, 238, ${0.14 + pulse * 0.03})`;
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
    ctx.globalAlpha = 0.07;
    const shift = 0.5 + 0.5 * Math.sin(time * 0.00036);
    const glow = ctx.createLinearGradient(
      width * 0.14,
      0,
      width * 0.86,
      height,
    );
    glow.addColorStop(0, `rgba(205,238,248,${0.16 + shift * 0.05})`);
    glow.addColorStop(0.34, `rgba(255,255,255,${0.08 + shift * 0.03})`);
    glow.addColorStop(0.7, `rgba(204,194,236,${0.1 + (1 - shift) * 0.04})`);
    glow.addColorStop(1, "rgba(255,255,255,0.10)");
    ctx.fillStyle = glow;
    ctx.fillRect(motion.x * 0.16, motion.y * 0.12, width, height);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.96;
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
