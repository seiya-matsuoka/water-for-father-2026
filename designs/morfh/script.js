(() => {
  const canvas = document.getElementById("morfh-canvas");
  const ctx = canvas.getContext("2d", { alpha: true });

  const dprMax = 1.7;
  const baseCanvas = document.createElement("canvas");
  const baseCtx = baseCanvas.getContext("2d", { alpha: true });
  const grainCanvas = document.createElement("canvas");
  const grainCtx = grainCanvas.getContext("2d", { alpha: true });

  let width = 0;
  let height = 0;
  let dpr = 1;

  const pointer = { x: 0, y: 0, active: false };
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
    tintBlobs: [],
    tAnchor: null,
    lastTime: performance.now(),
  };

  const palette = {
    paper: "#eef3f2",
    white: "rgba(255,255,255,0.72)",
    ice: "rgba(219, 243, 248, 0.54)",
    cyan: "rgba(193, 237, 248, 0.52)",
    lavender: "rgba(198, 191, 236, 0.34)",
    mint: "rgba(214, 236, 228, 0.42)",
    yellow: "rgba(239, 236, 198, 0.22)",
    ink: "rgba(76, 92, 103, 0.16)",
    grain: "rgba(103, 118, 131, 0.065)",
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
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

  function buildTiles() {
    state.tiles = [];
    state.tintBlobs = [];

    const cols = clamp(Math.round(width / 132), 6, 10);
    const rows = clamp(Math.round(height / 132), 8, 14);

    const colEdges = [0];
    let cursorX = 0;
    for (let i = 0; i < cols; i += 1) {
      const remaining = width - cursorX;
      const slotsLeft = cols - i;
      let size = width / cols + rand(-26, 26);
      size = clamp(size, 72, remaining - 72 * (slotsLeft - 1));
      cursorX += size;
      colEdges.push(i === cols - 1 ? width : cursorX);
    }

    const rowEdges = [0];
    let cursorY = 0;
    for (let i = 0; i < rows; i += 1) {
      const remaining = height - cursorY;
      const slotsLeft = rows - i;
      let size = height / rows + rand(-22, 22);
      size = clamp(size, 66, remaining - 66 * (slotsLeft - 1));
      cursorY += size;
      rowEdges.push(i === rows - 1 ? height : cursorY);
    }

    const colors = [
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
        const x1 = colEdges[col];
        const y1 = rowEdges[row];
        const x2 = colEdges[col + 1];
        const y2 = rowEdges[row + 1];

        const padX = rand(-10, 8);
        const padY = rand(-8, 9);
        const w = Math.max(48, x2 - x1 + rand(-12, 10));
        const h = Math.max(48, y2 - y1 + rand(-10, 10));

        const tile = {
          x: x1 + padX,
          y: y1 + padY,
          w,
          h,
          color: choose(colors),
          opacity: rand(0.44, 0.76),
          blur: rand(0, 24),
          wobbleX: rand(-8, 8),
          wobbleY: rand(-8, 8),
          phase: rand(0, Math.PI * 2),
        };
        state.tiles.push(tile);

        if (Math.random() > 0.42) {
          state.tintBlobs.push({
            x: tile.x + rand(tile.w * 0.12, tile.w * 0.74),
            y: tile.y + rand(tile.h * 0.16, tile.h * 0.8),
            rx: rand(tile.w * 0.18, tile.w * 0.42),
            ry: rand(tile.h * 0.12, tile.h * 0.34),
            color: choose([
              palette.cyan,
              palette.lavender,
              palette.mint,
              palette.yellow,
            ]),
            alpha: rand(0.08, 0.22),
            phase: rand(0, Math.PI * 2),
            drift: rand(3, 12),
          });
        }
      }
    }

    const tTile =
      state.tiles[Math.floor(state.tiles.length * 0.58)] ||
      state.tiles[state.tiles.length - 1];
    state.tAnchor = tTile
      ? {
          x: tTile.x + tTile.w * 0.58,
          y: tTile.y + tTile.h * 0.6,
          size: Math.max(18, Math.min(tTile.w, tTile.h) * 0.22),
        }
      : null;
  }

  function paintBase() {
    baseCtx.clearRect(0, 0, width, height);

    const bg = baseCtx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, "#f1f5f4");
    bg.addColorStop(0.52, "#edf3f2");
    bg.addColorStop(1, "#e8efee");
    baseCtx.fillStyle = bg;
    baseCtx.fillRect(0, 0, width, height);

    state.tiles.forEach((tile) => {
      const { x, y, w, h, color, opacity, blur } = tile;
      baseCtx.save();
      baseCtx.globalAlpha = opacity;
      baseCtx.filter = `blur(${blur}px)`;
      baseCtx.fillStyle = color;
      baseCtx.fillRect(x, y, w, h);
      baseCtx.restore();

      const softEdge = baseCtx.createLinearGradient(x, y, x + w, y + h);
      softEdge.addColorStop(0, "rgba(255,255,255,0.22)");
      softEdge.addColorStop(0.5, "rgba(255,255,255,0)");
      softEdge.addColorStop(1, "rgba(186, 196, 204, 0.10)");
      baseCtx.fillStyle = softEdge;
      baseCtx.fillRect(x, y, w, h);
    });

    state.tintBlobs.forEach((blob) => {
      baseCtx.save();
      baseCtx.translate(blob.x, blob.y);
      baseCtx.scale(blob.rx, blob.ry);
      baseCtx.fillStyle = blob.color.replace(
        /rgba\(([^)]+),\s*([0-9.]+)\)/,
        (m, rgb) => `rgba(${rgb}, ${blob.alpha})`,
      );
      baseCtx.beginPath();
      baseCtx.ellipse(0, 0, 1, 1, rand(-0.3, 0.3), 0, Math.PI * 2);
      baseCtx.fill();
      baseCtx.restore();
    });

    // Soft print seams
    baseCtx.save();
    baseCtx.strokeStyle = "rgba(190, 202, 207, 0.15)";
    baseCtx.lineWidth = 1;
    for (let i = 0; i < state.tiles.length; i += 5) {
      const tile = state.tiles[i];
      baseCtx.strokeRect(tile.x + 0.5, tile.y + 0.5, tile.w, tile.h);
    }
    baseCtx.restore();
  }

  function paintGrain() {
    grainCtx.clearRect(0, 0, width, height);
    const count = Math.round((width * height) / 920);
    for (let i = 0; i < count; i += 1) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const s = Math.random() < 0.84 ? 1 : 1.8;
      grainCtx.fillStyle =
        Math.random() < 0.86 ? palette.grain : "rgba(232, 239, 240, 0.28)";
      grainCtx.fillRect(x, y, s, s);
    }

    grainCtx.save();
    grainCtx.globalAlpha = 0.06;
    for (let i = 0; i < 9; i += 1) {
      const x = rand(0, width);
      const w = rand(14, 36);
      const grad = grainCtx.createLinearGradient(x, 0, x + w, 0);
      grad.addColorStop(0, "rgba(255,255,255,0)");
      grad.addColorStop(0.5, "rgba(255,255,255,0.8)");
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

  function updateMotion() {
    motion.vx += (motion.targetX - motion.x) * 0.038;
    motion.vy += (motion.targetY - motion.y) * 0.038;
    motion.vx *= 0.84;
    motion.vy *= 0.84;
    motion.x += motion.vx;
    motion.y += motion.vy;

    if (!pointer.active) {
      const t = performance.now() * 0.00022;
      motion.targetX = Math.sin(t * 1.1) * 8;
      motion.targetY = Math.cos(t * 0.9) * 6;
    }
  }

  function drawSoftT(time) {
    if (!state.tAnchor) return;

    const pulse = 0.5 + 0.5 * Math.sin(time * 0.00065 + motion.x * 0.08);
    const dragAmount = Math.min(1, Math.hypot(motion.x, motion.y) / 18);
    const anchorX = state.tAnchor.x + motion.x * 0.22;
    const anchorY = state.tAnchor.y + motion.y * 0.18;
    const fontSize = state.tAnchor.size;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `600 ${fontSize}px "Helvetica Neue", "Arial Narrow", Arial, sans-serif`;

    ctx.fillStyle = `rgba(255,255,255,${0.08 + dragAmount * 0.03})`;
    ctx.fillText("t", anchorX, anchorY);

    ctx.fillStyle = `rgba(198, 223, 242, ${0.18 + pulse * 0.08})`;
    ctx.fillText(
      "t",
      anchorX + 1.6 + motion.x * 0.06,
      anchorY - 0.8 + motion.y * 0.05,
    );

    ctx.fillStyle = `rgba(201, 190, 236, ${0.12 + dragAmount * 0.08})`;
    ctx.fillText(
      "t",
      anchorX - 1.2 - motion.x * 0.04,
      anchorY + 1.2 - motion.y * 0.04,
    );
    ctx.restore();
  }

  function render(time) {
    updateMotion();

    ctx.clearRect(0, 0, width, height);

    const baseOffsetX = motion.x * 0.16;
    const baseOffsetY = motion.y * 0.12;
    ctx.drawImage(baseCanvas, baseOffsetX, baseOffsetY, width, height);

    // Breathing tint and print drift
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.14;
    const hueShift = 0.5 + 0.5 * Math.sin(time * 0.00035);
    const grad = ctx.createLinearGradient(
      width * (0.2 + motion.x * 0.0008),
      height * 0.18,
      width * 0.78,
      height * (0.84 + motion.y * 0.0008),
    );
    grad.addColorStop(0, `rgba(232,244,247,${0.22 + hueShift * 0.06})`);
    grad.addColorStop(0.4, `rgba(201,236,245,${0.1 + hueShift * 0.05})`);
    grad.addColorStop(
      0.72,
      `rgba(203,197,235,${0.08 + (1 - hueShift) * 0.06})`,
    );
    grad.addColorStop(1, "rgba(255,255,255,0.18)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    // Grain / print noise with tiny drift
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.drawImage(grainCanvas, motion.x * 0.12, motion.y * 0.12, width, height);
    ctx.restore();

    // Very soft overlay bands like paper pressure
    ctx.save();
    ctx.globalAlpha = 0.22;
    for (let i = 0; i < 4; i += 1) {
      const x =
        width * (0.16 + i * 0.22) +
        Math.sin(time * 0.00028 + i) * 6 +
        motion.x * 0.12;
      const band = ctx.createLinearGradient(x - 22, 0, x + 22, 0);
      band.addColorStop(0, "rgba(255,255,255,0)");
      band.addColorStop(0.5, "rgba(255,255,255,0.30)");
      band.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = band;
      ctx.fillRect(x - 22, 0, 44, height);
    }
    ctx.restore();

    drawSoftT(time);
    requestAnimationFrame(render);
  }

  function handlePointer(x, y, active = true) {
    pointer.x = x;
    pointer.y = y;
    pointer.active = active;

    const nx = (x / width - 0.5) * 2;
    const ny = (y / height - 0.5) * 2;
    motion.targetX = clamp(nx * 18, -18, 18);
    motion.targetY = clamp(ny * 15, -15, 15);
  }

  window.addEventListener("resize", resize);

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
