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
    bg0: "#dff1fb",
    bg1: "#ebf7fb",
    bg2: "#e4f3f7",
    paperWhite: "#f8fcfd",
    whiteTint: "rgba(252, 254, 255, 0.98)",
    ice: "rgba(217, 244, 255, 0.97)",
    sky: "rgba(183, 228, 251, 0.96)",
    cyan: "rgba(135, 214, 250, 0.95)",
    aqua: "rgba(108, 204, 246, 0.94)",
    lavender: "rgba(209, 193, 252, 0.95)",
    violet: "rgba(168, 147, 241, 0.92)",
    mint: "rgba(203, 235, 223, 0.92)",
    mintDeep: "rgba(166, 224, 206, 0.90)",
    yellow: "rgba(241, 233, 165, 0.90)",
    warmWhite: "rgba(255, 250, 235, 0.95)",
    seam: "rgba(229, 238, 242, 0.94)",
    seamShadow: "rgba(162, 176, 185, 0.18)",
    grainDark: "rgba(98, 111, 120, 0.25)",
    grainLight: "rgba(255,255,255,0.28)",
  };

  const tileFamilies = [
    {
      base: "rgba(220,242,252,0.985)",
      ramp: [palette.whiteTint, palette.sky, palette.cyan],
      accents: [
        palette.lavender,
        palette.violet,
        palette.whiteTint,
        palette.yellow,
      ],
    },
    {
      base: "rgba(224,244,252,0.985)",
      ramp: [palette.paperWhite, palette.ice, palette.aqua],
      accents: [
        palette.violet,
        palette.lavender,
        palette.whiteTint,
        palette.mint,
      ],
    },
    {
      base: "rgba(226,244,250,0.985)",
      ramp: [palette.whiteTint, palette.cyan, palette.sky],
      accents: [
        palette.mint,
        palette.mintDeep,
        palette.lavender,
        palette.warmWhite,
      ],
    },
    {
      base: "rgba(222,242,249,0.985)",
      ramp: [palette.paperWhite, palette.sky, palette.aqua],
      accents: [
        palette.yellow,
        palette.lavender,
        palette.whiteTint,
        palette.mintDeep,
      ],
    },
  ];

  const patternTypes = [
    "h-band",
    "v-band",
    "diag-a",
    "diag-b",
    "crossfade",
    "corner-bloom",
    "ribbon",
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

  function choosePattern(prevRowPattern, prevColPattern) {
    const choices = patternTypes.filter(
      (pattern) => pattern !== prevRowPattern && pattern !== prevColPattern,
    );
    return choose(choices.length ? choices : patternTypes);
  }

  function buildTiles() {
    state.tiles = [];

    const idealCell = clamp(Math.round(width / 5.85), 64, 92);
    const cols = Math.max(4, Math.round(width / idealCell));
    const cell = width / cols;
    const rows = Math.ceil(height / cell) + 1;
    const occupancy = Array.from({ length: rows }, () =>
      Array(cols).fill(false),
    );
    const patternGrid = Array.from({ length: rows }, () =>
      Array(cols).fill(null),
    );

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        if (occupancy[row][col]) continue;

        const wide = col < cols - 1 && Math.random() < 0.44;
        const tall = row < rows - 1 && Math.random() < 0.24;
        const spanX = wide ? 2 : 1;
        const spanY = tall ? 2 : 1;

        for (let ry = row; ry < Math.min(rows, row + spanY); ry += 1) {
          for (let cx = col; cx < Math.min(cols, col + spanX); cx += 1) {
            occupancy[ry][cx] = true;
          }
        }

        const family = choose(tileFamilies);
        const prevRowPattern = col > 0 ? patternGrid[row][col - 1] : null;
        const prevColPattern = row > 0 ? patternGrid[row - 1][col] : null;
        const pattern = choosePattern(prevRowPattern, prevColPattern);

        for (let ry = row; ry < Math.min(rows, row + spanY); ry += 1) {
          for (let cx = col; cx < Math.min(cols, col + spanX); cx += 1) {
            patternGrid[ry][cx] = pattern;
          }
        }

        const x = col * cell + rand(-1.1, 1.1);
        const y = row * cell + rand(-1.1, 1.1);
        const w = cell * spanX + rand(-1.8, 1.8);
        const h = cell * spanY + rand(-1.8, 1.8);

        const accentA = choose(family.accents);
        let accentB = choose(family.accents);
        if (accentB === accentA) {
          accentB = choose([
            palette.violet,
            palette.lavender,
            palette.mint,
            palette.yellow,
            palette.whiteTint,
          ]);
        }

        state.tiles.push({
          x,
          y,
          w,
          h,
          pattern,
          base: family.base,
          ramp0: family.ramp[0],
          ramp1: family.ramp[1],
          ramp2: family.ramp[2],
          accent0: accentA,
          accent1: accentB,
          fillAlpha: rand(0.955, 0.992),
          tintAlphaA: rand(0.52, 0.76),
          tintAlphaB: rand(0.36, 0.62),
          whiteAlpha: rand(0.3, 0.48),
          accentAlpha: rand(0.2, 0.42),
          hazeAlpha: rand(0.16, 0.3),
          edgeAlpha: rand(0.16, 0.26),
          phase: rand(0, Math.PI * 2),
          pivotX: rand(0.18, 0.82),
          pivotY: rand(0.18, 0.82),
        });
      }
    }

    const tTile =
      state.tiles[Math.floor(state.tiles.length * 0.62)] ||
      state.tiles[state.tiles.length - 1];
    if (tTile) {
      state.tAnchor = {
        x: tTile.x + tTile.w * 0.54,
        y: tTile.y + tTile.h * 0.56,
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
      pattern,
      ramp0,
      ramp1,
      ramp2,
      accent0,
      accent1,
      tintAlphaA,
      tintAlphaB,
      whiteAlpha,
    } = tile;
    let grad;

    switch (pattern) {
      case "h-band":
        grad = baseCtx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, rgbaWithAlpha(ramp1, tintAlphaA));
        grad.addColorStop(rand(0.24, 0.36), rgbaWithAlpha(ramp0, whiteAlpha));
        grad.addColorStop(
          rand(0.48, 0.6),
          rgbaWithAlpha(accent0, tintAlphaB * 0.85),
        );
        grad.addColorStop(1, rgbaWithAlpha(ramp2, tintAlphaB));
        break;
      case "v-band":
        grad = baseCtx.createLinearGradient(x, y, x + w, y);
        grad.addColorStop(0, rgbaWithAlpha(ramp2, tintAlphaB));
        grad.addColorStop(rand(0.22, 0.34), rgbaWithAlpha(ramp0, whiteAlpha));
        grad.addColorStop(
          rand(0.58, 0.7),
          rgbaWithAlpha(accent1, tintAlphaB * 0.8),
        );
        grad.addColorStop(1, rgbaWithAlpha(ramp1, tintAlphaA));
        break;
      case "diag-a":
        grad = baseCtx.createLinearGradient(x, y, x + w, y + h);
        grad.addColorStop(0, rgbaWithAlpha(ramp1, tintAlphaA));
        grad.addColorStop(
          rand(0.18, 0.26),
          rgbaWithAlpha(accent0, tintAlphaB * 0.7),
        );
        grad.addColorStop(rand(0.46, 0.6), rgbaWithAlpha(ramp0, whiteAlpha));
        grad.addColorStop(1, rgbaWithAlpha(ramp2, tintAlphaB));
        break;
      case "diag-b":
        grad = baseCtx.createLinearGradient(x + w, y, x, y + h);
        grad.addColorStop(0, rgbaWithAlpha(ramp2, tintAlphaB));
        grad.addColorStop(rand(0.16, 0.3), rgbaWithAlpha(ramp0, whiteAlpha));
        grad.addColorStop(
          rand(0.5, 0.66),
          rgbaWithAlpha(accent1, tintAlphaB * 0.72),
        );
        grad.addColorStop(1, rgbaWithAlpha(ramp1, tintAlphaA));
        break;
      case "crossfade":
        grad = baseCtx.createLinearGradient(
          x,
          y + h * 0.22,
          x + w,
          y + h * 0.78,
        );
        grad.addColorStop(0, rgbaWithAlpha(accent0, tintAlphaB * 0.7));
        grad.addColorStop(rand(0.26, 0.42), rgbaWithAlpha(ramp1, tintAlphaA));
        grad.addColorStop(rand(0.56, 0.7), rgbaWithAlpha(ramp0, whiteAlpha));
        grad.addColorStop(1, rgbaWithAlpha(accent1, tintAlphaB * 0.66));
        break;
      case "corner-bloom":
        grad = baseCtx.createRadialGradient(
          x + w * tile.pivotX,
          y + h * tile.pivotY,
          0,
          x + w * tile.pivotX,
          y + h * tile.pivotY,
          Math.max(w, h) * 0.95,
        );
        grad.addColorStop(0, rgbaWithAlpha(ramp0, whiteAlpha + 0.04));
        grad.addColorStop(0.34, rgbaWithAlpha(accent0, tintAlphaB * 0.76));
        grad.addColorStop(0.68, rgbaWithAlpha(ramp1, tintAlphaA));
        grad.addColorStop(1, rgbaWithAlpha(ramp2, tintAlphaB * 0.92));
        break;
      case "ribbon":
      default:
        grad = baseCtx.createLinearGradient(x, y, x + w, y + h);
        grad.addColorStop(0, rgbaWithAlpha(ramp1, tintAlphaA));
        grad.addColorStop(rand(0.2, 0.28), rgbaWithAlpha(ramp0, whiteAlpha));
        grad.addColorStop(
          rand(0.42, 0.54),
          rgbaWithAlpha(accent0, tintAlphaB * 0.7),
        );
        grad.addColorStop(
          rand(0.64, 0.78),
          rgbaWithAlpha(accent1, tintAlphaB * 0.62),
        );
        grad.addColorStop(1, rgbaWithAlpha(ramp2, tintAlphaB));
        break;
    }

    return grad;
  }

  function paintPatternOverlays(tile) {
    const {
      x,
      y,
      w,
      h,
      pattern,
      ramp0,
      ramp1,
      accent0,
      accent1,
      hazeAlpha,
      whiteAlpha,
      accentAlpha,
    } = tile;

    if (pattern === "h-band" || pattern === "crossfade") {
      const bandY = y + h * rand(0.24, 0.72);
      const band = baseCtx.createLinearGradient(
        x,
        bandY - h * 0.18,
        x,
        bandY + h * 0.18,
      );
      band.addColorStop(0, "rgba(255,255,255,0)");
      band.addColorStop(0.42, rgbaWithAlpha(ramp0, whiteAlpha * 0.8));
      band.addColorStop(0.66, rgbaWithAlpha(accent0, accentAlpha * 0.74));
      band.addColorStop(1, "rgba(255,255,255,0)");
      baseCtx.fillStyle = band;
      baseCtx.fillRect(x, y, w, h);
    }

    if (pattern === "v-band" || pattern === "ribbon") {
      const bandX = x + w * rand(0.22, 0.78);
      const band = baseCtx.createLinearGradient(
        bandX - w * 0.18,
        y,
        bandX + w * 0.18,
        y,
      );
      band.addColorStop(0, "rgba(255,255,255,0)");
      band.addColorStop(0.42, rgbaWithAlpha(ramp1, hazeAlpha));
      band.addColorStop(0.66, rgbaWithAlpha(ramp0, whiteAlpha * 0.78));
      band.addColorStop(1, "rgba(255,255,255,0)");
      baseCtx.fillStyle = band;
      baseCtx.fillRect(x, y, w, h);
    }

    if (pattern === "diag-a" || pattern === "diag-b" || pattern === "ribbon") {
      const diag = baseCtx.createLinearGradient(x, y, x + w, y + h);
      diag.addColorStop(0, "rgba(255,255,255,0)");
      diag.addColorStop(0.34, rgbaWithAlpha(ramp0, whiteAlpha * 0.72));
      diag.addColorStop(0.48, rgbaWithAlpha(accent1, accentAlpha * 0.7));
      diag.addColorStop(0.64, rgbaWithAlpha(accent0, accentAlpha * 0.66));
      diag.addColorStop(1, "rgba(255,255,255,0)");
      baseCtx.fillStyle = diag;
      baseCtx.fillRect(x, y, w, h);
    }

    if (pattern === "corner-bloom" || Math.random() < 0.28) {
      const glowX = x + w * tile.pivotX;
      const glowY = y + h * tile.pivotY;
      const radial = baseCtx.createRadialGradient(
        glowX,
        glowY,
        0,
        glowX,
        glowY,
        Math.max(w, h) * rand(0.48, 0.94),
      );
      radial.addColorStop(0, rgbaWithAlpha(ramp0, whiteAlpha * 0.86));
      radial.addColorStop(0.34, rgbaWithAlpha(accent0, accentAlpha * 0.72));
      radial.addColorStop(0.68, rgbaWithAlpha(accent1, accentAlpha * 0.56));
      radial.addColorStop(1, "rgba(255,255,255,0)");
      baseCtx.save();
      baseCtx.globalCompositeOperation = "screen";
      baseCtx.fillStyle = radial;
      baseCtx.fillRect(x, y, w, h);
      baseCtx.restore();
    }
  }

  function paintTile(tile) {
    const { x, y, w, h, base, edgeAlpha } = tile;

    baseCtx.save();
    baseCtx.globalAlpha = tile.fillAlpha;
    baseCtx.fillStyle = base;
    baseCtx.fillRect(x, y, w, h);
    baseCtx.restore();

    baseCtx.save();
    baseCtx.fillStyle = makePrimaryGradient(tile);
    baseCtx.fillRect(x, y, w, h);
    baseCtx.restore();

    paintPatternOverlays(tile);

    const softHaze = baseCtx.createLinearGradient(
      x,
      y + h * rand(0.16, 0.3),
      x,
      y + h * rand(0.72, 0.9),
    );
    softHaze.addColorStop(0, "rgba(255,255,255,0)");
    softHaze.addColorStop(
      0.38,
      rgbaWithAlpha(tile.ramp0, tile.whiteAlpha * 0.66),
    );
    softHaze.addColorStop(
      0.58,
      rgbaWithAlpha(tile.accent1, tile.accentAlpha * 0.52),
    );
    softHaze.addColorStop(1, "rgba(255,255,255,0)");
    baseCtx.fillStyle = softHaze;
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
    baseCtx.strokeStyle = rgbaWithAlpha(palette.seamShadow, edgeAlpha * 0.75);
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
    grainCtx.globalAlpha = 0.085;
    for (let i = 0; i < 32; i += 1) {
      const y = rand(0, height);
      grainCtx.fillStyle =
        Math.random() < 0.55
          ? "rgba(255,255,255,0.62)"
          : "rgba(116, 126, 136, 0.34)";
      grainCtx.fillRect(0, y, width, rand(0.5, 1.1));
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
    ctx.globalAlpha = 0.06;
    const shift = 0.5 + 0.5 * Math.sin(time * 0.00036);
    const glow = ctx.createLinearGradient(
      width * 0.14,
      0,
      width * 0.86,
      height,
    );
    glow.addColorStop(0, `rgba(214,240,251,${0.16 + shift * 0.05})`);
    glow.addColorStop(0.34, `rgba(255,255,255,${0.1 + shift * 0.03})`);
    glow.addColorStop(0.7, `rgba(207,196,238,${0.12 + (1 - shift) * 0.04})`);
    glow.addColorStop(1, "rgba(255,255,255,0.10)");
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
