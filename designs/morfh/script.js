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
    bg0: "#f2f6f4",
    bg1: "#edf3f1",
    white: "rgba(255,255,255,0.84)",
    softWhite: "rgba(250,252,252,0.92)",
    ice: "rgba(214, 239, 247, 0.56)",
    cyan: "rgba(193, 233, 245, 0.54)",
    lavender: "rgba(197, 193, 234, 0.42)",
    mint: "rgba(216, 237, 229, 0.46)",
    yellow: "rgba(243, 239, 202, 0.34)",
    printGrey: "rgba(114, 127, 139, 0.10)",
    grainDark: "rgba(98, 110, 122, 0.14)",
    grainLight: "rgba(255,255,255,0.22)",
    tBlue: "rgba(190, 221, 245, 0.30)",
    tLavender: "rgba(200, 189, 235, 0.22)",
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

    const cols = clamp(Math.round(width / 122), 5, 8);
    const rows = clamp(Math.round(height / 118), 8, 13);
    const baseW = width / cols;
    const baseH = height / rows;
    const colors = [
      palette.softWhite,
      palette.white,
      palette.white,
      palette.ice,
      palette.cyan,
      palette.lavender,
      palette.mint,
      palette.yellow,
    ];

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const wFactor = choose([1, 1, 1, 1.18, 1.25, 1.35]);
        const hFactor = choose([0.94, 1, 1.04, 1.1]);
        const x = col * baseW + rand(-10, 8);
        const y = row * baseH + rand(-9, 8);
        const w = baseW * wFactor + rand(-10, 12);
        const h = baseH * hFactor + rand(-10, 10);

        const tile = {
          x,
          y,
          w,
          h,
          baseColor: choose(colors),
          opacity: rand(0.78, 0.98),
          blur: rand(6, 16),
          edgeAlpha: rand(0.06, 0.16),
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
          ]),
          tintAlphaA: rand(0.12, 0.26),
          tintAlphaB: rand(0.08, 0.18),
          tintDir: Math.random() < 0.5 ? 0 : 1,
          wobbleX: rand(-5, 5),
          wobbleY: rand(-5, 5),
          phase: rand(0, Math.PI * 2),
        };

        state.tiles.push(tile);
      }
    }

    // add a few stacked panel fragments to better mimic the cover
    const fragmentCount = clamp(Math.round((width * height) / 110000), 5, 9);
    for (let i = 0; i < fragmentCount; i += 1) {
      state.tiles.push({
        x: rand(width * 0.06, width * 0.78),
        y: rand(height * 0.04, height * 0.9),
        w: rand(baseW * 0.7, baseW * 1.4),
        h: rand(baseH * 0.55, baseH * 1.15),
        baseColor: choose([
          palette.softWhite,
          palette.ice,
          palette.lavender,
          palette.mint,
        ]),
        opacity: rand(0.65, 0.84),
        blur: rand(8, 18),
        edgeAlpha: rand(0.04, 0.1),
        tintA: choose([
          palette.cyan,
          palette.lavender,
          palette.mint,
          palette.yellow,
        ]),
        tintB: choose([palette.softWhite, palette.ice, palette.lavender]),
        tintAlphaA: rand(0.12, 0.24),
        tintAlphaB: rand(0.06, 0.16),
        tintDir: Math.random() < 0.5 ? 0 : 1,
        wobbleX: rand(-4, 4),
        wobbleY: rand(-4, 4),
        phase: rand(0, Math.PI * 2),
      });
    }

    const tTile =
      state.tiles[Math.floor(state.tiles.length * 0.68)] ||
      state.tiles[state.tiles.length - 1];
    if (tTile) {
      state.tAnchor = {
        x: tTile.x + tTile.w * 0.54,
        y: tTile.y + tTile.h * 0.56,
        size: clamp(Math.min(tTile.w, tTile.h) * 0.22, 14, 24),
      };
    }
  }

  function paintBase() {
    baseCtx.clearRect(0, 0, width, height);

    const bg = baseCtx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, palette.bg0);
    bg.addColorStop(0.56, "#eef4f2");
    bg.addColorStop(1, palette.bg1);
    baseCtx.fillStyle = bg;
    baseCtx.fillRect(0, 0, width, height);

    const verticalMist = baseCtx.createLinearGradient(
      width * 0.45,
      0,
      width * 0.55,
      0,
    );
    verticalMist.addColorStop(0, "rgba(255,255,255,0)");
    verticalMist.addColorStop(0.5, "rgba(255,255,255,0.22)");
    verticalMist.addColorStop(1, "rgba(255,255,255,0)");
    baseCtx.fillStyle = verticalMist;
    baseCtx.fillRect(0, 0, width, height);

    state.tiles.forEach((tile) => {
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
      } = tile;

      baseCtx.save();
      baseCtx.globalAlpha = opacity;
      baseCtx.filter = `blur(${blur}px)`;
      baseCtx.fillStyle = baseColor;
      baseCtx.fillRect(x, y, w, h);
      baseCtx.restore();

      baseCtx.save();
      const grad =
        tintDir === 0
          ? baseCtx.createLinearGradient(x, y, x + w, y)
          : baseCtx.createLinearGradient(x, y, x, y + h);
      grad.addColorStop(0, rgbaWithAlpha(tintA, tintAlphaA));
      grad.addColorStop(rand(0.36, 0.58), "rgba(255,255,255,0)");
      grad.addColorStop(1, rgbaWithAlpha(tintB, tintAlphaB));
      baseCtx.fillStyle = grad;
      baseCtx.fillRect(x, y, w, h);
      baseCtx.restore();

      baseCtx.save();
      baseCtx.globalAlpha = 1;
      baseCtx.strokeStyle = `rgba(201, 210, 214, ${edgeAlpha})`;
      baseCtx.lineWidth = 1;
      baseCtx.strokeRect(
        Math.round(x) + 0.5,
        Math.round(y) + 0.5,
        Math.round(w),
        Math.round(h),
      );
      baseCtx.restore();
    });

    // print seams / scan edges
    baseCtx.save();
    baseCtx.globalAlpha = 0.11;
    for (let i = 0; i < 8; i += 1) {
      const x = width * (i / 7) + rand(-8, 8);
      const grad = baseCtx.createLinearGradient(x - 10, 0, x + 10, 0);
      grad.addColorStop(0, "rgba(255,255,255,0)");
      grad.addColorStop(0.5, "rgba(255,255,255,0.85)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      baseCtx.fillStyle = grad;
      baseCtx.fillRect(x - 10, 0, 20, height);
    }
    baseCtx.restore();
  }

  function paintGrain() {
    grainCtx.clearRect(0, 0, width, height);

    state.grainDots = Math.round((width * height) / 430);
    for (let i = 0; i < state.grainDots; i += 1) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const s = Math.random() < 0.84 ? 1 : 1.6;
      grainCtx.fillStyle =
        Math.random() < 0.78 ? palette.grainDark : palette.grainLight;
      grainCtx.fillRect(x, y, s, s);
    }

    grainCtx.save();
    grainCtx.globalAlpha = 0.09;
    for (let i = 0; i < 26; i += 1) {
      const x = rand(0, width);
      const w = rand(4, 11);
      const grad = grainCtx.createLinearGradient(x, 0, x + w, 0);
      grad.addColorStop(0, "rgba(255,255,255,0)");
      grad.addColorStop(0.5, "rgba(255,255,255,0.95)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      grainCtx.fillStyle = grad;
      grainCtx.fillRect(x, 0, w, height);
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
    const alphaBase = 0.16 + pulse * 0.04;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `600 ${state.tAnchor.size}px "Helvetica Neue", "Arial Narrow", Arial, sans-serif`;

    ctx.fillStyle = `rgba(255,255,255,${alphaBase})`;
    ctx.fillText("t", state.tAnchor.x + driftX, state.tAnchor.y + driftY);

    ctx.fillStyle = `rgba(195, 223, 245, ${0.18 + pulse * 0.05})`;
    ctx.fillText(
      "t",
      state.tAnchor.x + driftX + 1.4,
      state.tAnchor.y + driftY - 0.8,
    );

    ctx.fillStyle = `rgba(201, 190, 236, ${0.13 + pulse * 0.04})`;
    ctx.fillText(
      "t",
      state.tAnchor.x + driftX - 1.2,
      state.tAnchor.y + driftY + 1.1,
    );
    ctx.restore();
  }

  function render(time) {
    updateMotion(time);
    ctx.clearRect(0, 0, width, height);

    const baseOffsetX = motion.x * 0.12;
    const baseOffsetY = motion.y * 0.1;
    ctx.drawImage(baseCanvas, baseOffsetX, baseOffsetY, width, height);

    // subtle print-shift overlay
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.19;
    const shift = 0.5 + 0.5 * Math.sin(time * 0.00036);
    const glow = ctx.createLinearGradient(
      width * 0.18,
      0,
      width * 0.82,
      height,
    );
    glow.addColorStop(0, `rgba(215,239,246,${0.18 + shift * 0.06})`);
    glow.addColorStop(0.38, `rgba(255,255,255,${0.11 + shift * 0.04})`);
    glow.addColorStop(0.7, `rgba(202,194,234,${0.09 + (1 - shift) * 0.05})`);
    glow.addColorStop(1, "rgba(255,255,255,0.16)");
    ctx.fillStyle = glow;
    ctx.fillRect(motion.x * 0.18, motion.y * 0.12, width, height);
    ctx.restore();

    // grain / print texture
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
