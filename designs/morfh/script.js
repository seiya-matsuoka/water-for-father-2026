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

  const pointer = { active: false, lastX: 0, lastY: 0, lastTime: 0 };
  const motion = { x: 0, y: 0, targetX: 0, targetY: 0, vx: 0, vy: 0 };
  const overlayMotion = { flow: 0, flowTarget: 0 };

  const state = {
    tiles: [],
    refs: [],
    tAnchor: null,
    overlayPatches: [],
    ripples: [],
    autoRippleTime: 0,
  };

  const palette = {
    bg0: "#d3edf8",
    bg1: "#eff8fb",
    bg2: "#d9f0f9",
    paperWhite: "rgba(252, 254, 255, 0.99)",
    softWhite: "rgba(246, 251, 255, 0.95)",
    iceWhite: "rgba(236, 248, 255, 0.97)",
    blue0: "rgba(215, 241, 255, 0.95)",
    blue1: "rgba(183, 229, 255, 0.96)",
    blue2: "rgba(138, 214, 255, 0.95)",
    blue3: "rgba(96, 194, 255, 0.93)",
    blue4: "rgba(72, 178, 248, 0.90)",
    lavender0: "rgba(228, 217, 255, 0.95)",
    lavender1: "rgba(201, 178, 252, 0.95)",
    violet1: "rgba(165, 136, 243, 0.93)",
    mint0: "rgba(214, 244, 236, 0.91)",
    mint1: "rgba(177, 232, 216, 0.89)",
    yellow0: "rgba(247, 241, 191, 0.86)",
    yellow1: "rgba(240, 228, 144, 0.84)",
    seam: "rgba(224, 234, 238, 0.84)",
    seamShadow: "rgba(157, 168, 176, 0.16)",
    grainDark: "rgba(102, 113, 123, 0.26)",
    grainLight: "rgba(255, 255, 255, 0.30)",
  };

  const cornerPool = [
    { id: "b0", color: palette.blue0 },
    { id: "b1", color: palette.blue1 },
    { id: "b2", color: palette.blue2 },
    { id: "b3", color: palette.blue3 },
    { id: "b4", color: palette.blue4 },
    { id: "l0", color: palette.lavender0 },
    { id: "l1", color: palette.lavender1 },
    { id: "v1", color: palette.violet1 },
    { id: "m0", color: palette.mint0 },
    { id: "m1", color: palette.mint1 },
    { id: "y0", color: palette.yellow0 },
    { id: "y1", color: palette.yellow1 },
    { id: "w0", color: palette.paperWhite },
    { id: "w1", color: palette.iceWhite },
  ];

  const centerPool = [
    { id: "cw", color: palette.paperWhite },
    { id: "ci", color: palette.iceWhite },
    { id: "cb", color: palette.blue0 },
    { id: "cb1", color: palette.blue1 },
    { id: "cb2", color: palette.blue2 },
    { id: "cl", color: palette.lavender0 },
    { id: "cm", color: palette.mint0 },
    { id: "cy", color: palette.yellow0 },
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

  function sampleWeightedCorner() {
    const r = Math.random();
    if (r < 0.42) return choose(cornerPool.slice(0, 5));
    if (r < 0.64)
      return choose([
        cornerPool[0],
        cornerPool[1],
        cornerPool[2],
        cornerPool[3],
        cornerPool[4],
        cornerPool[5],
        cornerPool[6],
        cornerPool[12],
        cornerPool[13],
      ]);
    if (r < 0.78)
      return choose([
        cornerPool[5],
        cornerPool[6],
        cornerPool[7],
        cornerPool[12],
        cornerPool[13],
      ]);
    if (r < 0.89)
      return choose([
        cornerPool[8],
        cornerPool[9],
        cornerPool[0],
        cornerPool[1],
        cornerPool[2],
        cornerPool[12],
      ]);
    if (r < 0.95)
      return choose([
        cornerPool[10],
        cornerPool[11],
        cornerPool[0],
        cornerPool[12],
      ]);
    return choose([
      cornerPool[12],
      cornerPool[13],
      cornerPool[0],
      cornerPool[1],
      cornerPool[2],
    ]);
  }

  function makeCornerSet(excludeSignature) {
    for (let tries = 0; tries < 40; tries += 1) {
      const picked = [];
      while (picked.length < 4) {
        const candidate = sampleWeightedCorner();
        if (!picked.some((p) => p.id === candidate.id)) picked.push(candidate);
      }

      const hasWarm = picked.some(
        (p) => p.id.startsWith("y") || p.id.startsWith("m"),
      );
      const hasPurple = picked.some(
        (p) => p.id.startsWith("l") || p.id.startsWith("v"),
      );
      const blueCandidates = cornerPool.filter((p) => p.id.startsWith("b"));
      const hasBlue = picked.some((p) => p.id.startsWith("b"));
      if (!hasBlue) picked[0] = choose(blueCandidates);
      if (!hasPurple && Math.random() < 0.72)
        picked[1] = choose(
          cornerPool.filter(
            (p) => p.id.startsWith("l") || p.id.startsWith("v"),
          ),
        );
      if (!hasWarm && Math.random() < 0.42)
        picked[2] = choose(
          cornerPool.filter(
            (p) => p.id.startsWith("m") || p.id.startsWith("y"),
          ),
        );

      const center = choose([
        centerPool[0],
        centerPool[1],
        centerPool[2],
        centerPool[3],
        centerPool[4],
        centerPool[0],
        centerPool[2],
        centerPool[3],
      ]);
      const signature = `${picked.map((p) => p.id).join("-")}_${center.id}`;
      if (signature !== excludeSignature) {
        return {
          corners: picked.map((p) => p.color),
          signature,
          centerColor: center.color,
        };
      }
    }

    return {
      corners: [
        palette.blue3,
        palette.lavender1,
        palette.mint0,
        palette.paperWhite,
      ],
      centerColor: palette.blue0,
      signature: "fallback",
    };
  }

  function choosePattern(exclude) {
    const variants = [
      "cornerBlend",
      "crossLight",
      "edgeWash",
      "centerBloom",
      "softBands",
      "diagonalLift",
    ];
    const options = variants.filter((v) => v !== exclude);
    return choose(options.length ? options : variants);
  }

  function buildTiles() {
    state.tiles = [];

    state.tAnchor = {
      x: rand(width * 0.12, width * 0.88),
      y: rand(height * 0.12, height * 0.76),
      size: clamp(Math.min(width, height) * 0.05, 16, 20),
      pulse: rand(0, Math.PI * 2),
    };

    const idealCell = clamp(Math.round(Math.min(width, height) / 5.3), 72, 108);
    const cols = Math.max(4, Math.round(width / idealCell));
    const cell = width / cols;
    const rows = Math.ceil(height / cell) + 1;
    const occupancy = Array.from({ length: rows }, () =>
      Array(cols).fill(false),
    );
    state.refs = Array.from({ length: rows }, () => Array(cols).fill(null));

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        if (occupancy[row][col]) continue;

        const wide = col < cols - 1 && Math.random() < 0.44;
        const tall = row < rows - 1 && Math.random() < 0.18;
        const spanX = wide ? 2 : 1;
        const spanY = tall ? 2 : 1;

        const leftTile = col > 0 ? state.refs[row][col - 1] : null;
        const upTile = row > 0 ? state.refs[row - 1][col] : null;
        const excludeSig = [leftTile?.signature, upTile?.signature]
          .filter(Boolean)
          .join("|");
        const colorSet = makeCornerSet(excludeSig);
        const pattern = choosePattern(
          leftTile && upTile && leftTile.pattern === upTile.pattern
            ? leftTile.pattern
            : null,
        );

        const tile = {
          x: col * cell + rand(-1.2, 1.2),
          y: row * cell + rand(-1.2, 1.2),
          w: cell * spanX + rand(-2.0, 2.0),
          h: cell * spanY + rand(-2.0, 2.0),
          signature: colorSet.signature,
          corners: colorSet.corners,
          centerColor: colorSet.centerColor,
          pattern,
          baseAlpha: rand(0.94, 0.985),
          cornerAlpha: rand(0.46, 0.72),
          centerAlpha: rand(0.22, 0.42),
          beamAlpha: rand(0.12, 0.24),
          edgeAlpha: rand(0.12, 0.24),
          phase: rand(0, Math.PI * 2),
          seed0: Math.random(),
          seed1: Math.random(),
          seed2: Math.random(),
          seed3: Math.random(),
        };

        state.tiles.push(tile);

        for (let ry = row; ry < Math.min(rows, row + spanY); ry += 1) {
          for (let cx = col; cx < Math.min(cols, col + spanX); cx += 1) {
            occupancy[ry][cx] = true;
            state.refs[ry][cx] = tile;
          }
        }
      }
    }
  }

  function buildOverlayPatches() {
    state.overlayPatches = [];
    const count = 14;
    for (let i = 0; i < count; i += 1) {
      state.overlayPatches.push({
        x: rand(0.05, 0.95),
        y: rand(0.04, 0.96),
        w: rand(0.24, 0.56),
        h: rand(0.2, 0.46),
        alpha: rand(0.055, 0.13),
        angle: rand(-Math.PI * 0.75, Math.PI * 0.75),
        seed: rand(0, Math.PI * 2),
        spread: rand(0.8, 1.35),
        c0: choose([
          "rgba(220,246,255,0.24)",
          "rgba(208,241,255,0.22)",
          "rgba(198,235,255,0.20)",
          "rgba(188,229,252,0.19)",
          "rgba(214,242,255,0.23)",
        ]),
        c1: choose([
          "rgba(156,218,255,0.18)",
          "rgba(138,208,248,0.15)",
          "rgba(170,224,255,0.14)",
          "rgba(205,237,255,0.11)",
          "rgba(176,223,255,0.13)",
        ]),
      });
    }
  }

  function drawCornerConvergence(tile) {
    const {
      x,
      y,
      w,
      h,
      corners,
      centerColor,
      cornerAlpha,
      centerAlpha,
      seed0,
      seed1,
      seed2,
      seed3,
    } = tile;
    const r = Math.max(w, h) * (0.94 + seed0 * 0.28);
    const positions = [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ];

    positions.forEach(([cx, cy], index) => {
      const grad = baseCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
      const strength =
        cornerAlpha * (1.04 + [seed0, seed1, seed2, seed3][index] * 0.34);
      grad.addColorStop(0, rgbaWithAlpha(corners[index], strength));
      grad.addColorStop(0.34, rgbaWithAlpha(corners[index], strength * 0.62));
      grad.addColorStop(0.72, rgbaWithAlpha(corners[index], strength * 0.12));
      grad.addColorStop(1, "rgba(255,255,255,0)");
      baseCtx.fillStyle = grad;
      baseCtx.fillRect(x, y, w, h);
    });

    const cx = x + w * (0.48 + (seed0 - 0.5) * 0.1);
    const cy = y + h * (0.49 + (seed1 - 0.5) * 0.1);
    const center = baseCtx.createRadialGradient(
      cx,
      cy,
      0,
      cx,
      cy,
      Math.max(w, h) * 0.72,
    );
    center.addColorStop(0, rgbaWithAlpha(centerColor, centerAlpha * 1.34));
    center.addColorStop(0.28, rgbaWithAlpha(centerColor, centerAlpha * 0.88));
    center.addColorStop(0.72, rgbaWithAlpha(centerColor, centerAlpha * 0.14));
    center.addColorStop(1, "rgba(255,255,255,0)");
    baseCtx.fillStyle = center;
    baseCtx.fillRect(x, y, w, h);
  }

  function drawPatternAccent(tile) {
    const {
      x,
      y,
      w,
      h,
      pattern,
      corners,
      centerColor,
      beamAlpha,
      seed0,
      seed1,
      seed2,
    } = tile;
    const accent = corners[(seed2 * 4) | 0];

    if (pattern === "crossLight" || pattern === "softBands") {
      const bandH = baseCtx.createLinearGradient(
        x,
        y + h * (0.18 + seed0 * 0.46),
        x,
        y + h * (0.42 + seed1 * 0.34),
      );
      bandH.addColorStop(0, "rgba(255,255,255,0)");
      bandH.addColorStop(
        0.24,
        rgbaWithAlpha(palette.paperWhite, beamAlpha * 0.92),
      );
      bandH.addColorStop(0.5, rgbaWithAlpha(accent, beamAlpha * 0.72));
      bandH.addColorStop(0.78, rgbaWithAlpha(centerColor, beamAlpha * 0.58));
      bandH.addColorStop(1, "rgba(255,255,255,0)");
      baseCtx.fillStyle = bandH;
      baseCtx.fillRect(x, y, w, h);
    }

    if (pattern === "edgeWash" || pattern === "crossLight") {
      const bandV = baseCtx.createLinearGradient(
        x + w * (0.16 + seed1 * 0.48),
        y,
        x + w * (0.32 + seed2 * 0.42),
        y,
      );
      bandV.addColorStop(0, "rgba(255,255,255,0)");
      bandV.addColorStop(0.22, rgbaWithAlpha(centerColor, beamAlpha * 0.64));
      bandV.addColorStop(0.52, rgbaWithAlpha(accent, beamAlpha * 0.76));
      bandV.addColorStop(
        0.82,
        rgbaWithAlpha(palette.paperWhite, beamAlpha * 0.88),
      );
      bandV.addColorStop(1, "rgba(255,255,255,0)");
      baseCtx.fillStyle = bandV;
      baseCtx.fillRect(x, y, w, h);
    }

    if (pattern === "diagonalLift" || pattern === "cornerBlend") {
      const diag = baseCtx.createLinearGradient(
        x,
        y + h * 0.1,
        x + w,
        y + h * 0.9,
      );
      diag.addColorStop(0, "rgba(255,255,255,0)");
      diag.addColorStop(0.22, rgbaWithAlpha(corners[0], beamAlpha * 0.46));
      diag.addColorStop(
        0.48,
        rgbaWithAlpha(palette.paperWhite, beamAlpha * 0.74),
      );
      diag.addColorStop(0.76, rgbaWithAlpha(corners[2], beamAlpha * 0.44));
      diag.addColorStop(1, "rgba(255,255,255,0)");
      baseCtx.fillStyle = diag;
      baseCtx.fillRect(x, y, w, h);
    }

    if (pattern === "centerBloom") {
      const bloom = baseCtx.createRadialGradient(
        x + w * 0.52,
        y + h * 0.5,
        0,
        x + w * 0.52,
        y + h * 0.5,
        Math.max(w, h) * 0.52,
      );
      bloom.addColorStop(
        0,
        rgbaWithAlpha(palette.paperWhite, beamAlpha * 0.95),
      );
      bloom.addColorStop(0.32, rgbaWithAlpha(centerColor, beamAlpha * 0.56));
      bloom.addColorStop(0.74, rgbaWithAlpha(accent, beamAlpha * 0.18));
      bloom.addColorStop(1, "rgba(255,255,255,0)");
      baseCtx.fillStyle = bloom;
      baseCtx.fillRect(x, y, w, h);
    }
  }

  function paintTile(tile) {
    const { x, y, w, h, edgeAlpha } = tile;

    baseCtx.save();
    baseCtx.fillStyle = rgbaWithAlpha(palette.softWhite, tile.baseAlpha);
    baseCtx.fillRect(x, y, w, h);
    drawCornerConvergence(tile);
    drawPatternAccent(tile);
    baseCtx.restore();

    const sideSheen = baseCtx.createLinearGradient(x, y, x + w, y);
    sideSheen.addColorStop(0, "rgba(255,255,255,0.03)");
    sideSheen.addColorStop(0.28, "rgba(255,255,255,0.11)");
    sideSheen.addColorStop(0.52, "rgba(178,222,248,0.10)");
    sideSheen.addColorStop(0.76, "rgba(255,255,255,0.10)");
    sideSheen.addColorStop(1, "rgba(255,255,255,0.03)");
    baseCtx.fillStyle = sideSheen;
    baseCtx.fillRect(x, y, w, h);

    baseCtx.save();
    baseCtx.strokeStyle = `rgba(229, 237, 239, ${edgeAlpha})`;
    baseCtx.lineWidth = 1;
    baseCtx.strokeRect(
      Math.round(x) + 0.5,
      Math.round(y) + 0.5,
      Math.round(w),
      Math.round(h),
    );
    baseCtx.restore();

    baseCtx.save();
    baseCtx.strokeStyle = rgbaWithAlpha(palette.seamShadow, edgeAlpha * 0.88);
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
    bg.addColorStop(0.34, palette.paperWhite);
    bg.addColorStop(0.68, palette.bg2);
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
    state.ripples = [];
    state.autoRippleTime = performance.now() + rand(250, 900);
    paintBase();
    paintGrain();
  }

  function addRipple(x, y, strength = 1) {
    state.ripples.push({
      x,
      y,
      r: 10,
      alpha: clamp(0.12 + strength * 0.12, 0.12, 0.4),
      thickness: clamp(24 + strength * 30, 24, 72),
      stretchX: 1 + strength * 0.26,
      stretchY: 1 - strength * 0.08,
      vx: rand(-0.08, 0.08),
      vy: rand(-0.06, 0.06),
    });
    if (state.ripples.length > 22) state.ripples.shift();
  }

  function updateRipples() {
    for (let i = state.ripples.length - 1; i >= 0; i -= 1) {
      const ripple = state.ripples[i];
      ripple.r += 4.2;
      ripple.alpha *= 0.972;
      ripple.x += ripple.vx;
      ripple.y += ripple.vy;
      ripple.stretchX += 0.0032;
      ripple.stretchY += 0.0016;
      if (ripple.alpha < 0.01 || ripple.r > Math.max(width, height) * 0.24) {
        state.ripples.splice(i, 1);
      }
    }
  }

  function maybeAddAutoRipple(time) {
    if (pointer.active) return;
    if (time < state.autoRippleTime) return;

    let rx = rand(width * 0.18, width * 0.82);
    let ry = rand(height * 0.16, height * 0.84);

    if (state.tAnchor && Math.random() < 0.32) {
      rx = clamp(state.tAnchor.x + rand(-38, 38), width * 0.12, width * 0.88);
      ry = clamp(state.tAnchor.y + rand(-38, 38), height * 0.12, height * 0.84);
    }

    addRipple(rx, ry, rand(0.28, 0.52));
    state.autoRippleTime = time + rand(700, 1500);
  }

  function updateMotion(time) {
    motion.vx += (motion.targetX - motion.x) * 0.035;
    motion.vy += (motion.targetY - motion.y) * 0.035;
    motion.vx *= 0.82;
    motion.vy *= 0.82;
    motion.x += motion.vx;
    motion.y += motion.vy;

    if (!pointer.active) {
      motion.targetX = Math.sin(time * 0.00032) * 4.5;
      motion.targetY = Math.cos(time * 0.00027) * 4.0;
      overlayMotion.flowTarget = 0.14;
    }

    overlayMotion.flow +=
      (overlayMotion.flowTarget - overlayMotion.flow) * 0.08;
    overlayMotion.flow *= 0.992;
    overlayMotion.flow += 0.004;

    maybeAddAutoRipple(time);
    updateRipples();
  }

  function drawRippleField(time) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    state.ripples.forEach((ripple, index) => {
      ctx.save();
      ctx.translate(ripple.x, ripple.y);
      ctx.scale(ripple.stretchX, ripple.stretchY);
      const phase = time * 0.0014 + index * 0.55;

      const glow = ctx.createRadialGradient(
        0,
        0,
        0,
        0,
        0,
        ripple.r + ripple.thickness * 1.05,
      );
      glow.addColorStop(0, `rgba(244,251,255,${ripple.alpha * 0.2})`);
      glow.addColorStop(0.18, `rgba(232,247,255,${ripple.alpha * 0.16})`);
      glow.addColorStop(0.42, `rgba(192,230,255,${ripple.alpha * 0.12})`);
      glow.addColorStop(0.72, `rgba(182,225,255,${ripple.alpha * 0.05})`);
      glow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, ripple.r + ripple.thickness * 1.05, 0, Math.PI * 2);
      ctx.fill();

      const grad = ctx.createRadialGradient(
        0,
        0,
        ripple.r * 0.18,
        0,
        0,
        ripple.r + ripple.thickness,
      );
      grad.addColorStop(0, "rgba(255,255,255,0)");
      grad.addColorStop(0.3, `rgba(236,248,255,${ripple.alpha * 0.26})`);
      grad.addColorStop(0.52, `rgba(176,224,255,${ripple.alpha * 0.66})`);
      grad.addColorStop(0.7, `rgba(156,214,255,${ripple.alpha * 0.38})`);
      grad.addColorStop(0.86, `rgba(232,248,255,${ripple.alpha * 0.12})`);
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, ripple.r + ripple.thickness, 0, Math.PI * 2);
      ctx.fill();

      ctx.rotate(Math.sin(phase) * 0.14);
      ctx.strokeStyle = `rgba(214,241,255,${ripple.alpha * 0.18})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(0, 0, ripple.r * 1.0, ripple.r * 0.72, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });

    ctx.restore();
  }

  function drawOverlay(time) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    state.overlayPatches.forEach((patch, index) => {
      const breath =
        Math.sin(time * 0.00034 + patch.seed + index * 0.19) * 0.5 + 0.5;
      const drift = Math.sin(time * 0.00058 + patch.seed * 1.3) * 0.18;
      const px = patch.x * width;
      const py = patch.y * height;
      const pw = patch.w * width * patch.spread;
      const ph = patch.h * height * patch.spread;

      const membrane = ctx.createRadialGradient(
        px - pw * 0.12,
        py - ph * 0.1,
        0,
        px,
        py,
        Math.max(pw, ph) * 1.18,
      );
      membrane.addColorStop(0, patch.c0);
      membrane.addColorStop(
        0.22,
        `rgba(238,250,255,${patch.alpha * (0.72 + breath * 0.1)})`,
      );
      membrane.addColorStop(
        0.42,
        `rgba(202,236,255,${patch.alpha * (0.54 + breath * 0.1)})`,
      );
      membrane.addColorStop(0.68, patch.c1);
      membrane.addColorStop(0.86, "rgba(176,223,255,0.024)");
      membrane.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = membrane;
      ctx.fillRect(px - pw, py - ph, pw * 2, ph * 2);

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(patch.angle + drift * 0.08);

      const ribbon = ctx.createLinearGradient(-pw * 0.75, 0, pw * 0.75, 0);
      ribbon.addColorStop(0, "rgba(255,255,255,0)");
      ribbon.addColorStop(0.18, "rgba(208,239,255,0.018)");
      ribbon.addColorStop(0.42, "rgba(222,246,255,0.050)");
      ribbon.addColorStop(0.54, "rgba(248,253,255,0.076)");
      ribbon.addColorStop(0.72, "rgba(184,230,255,0.040)");
      ribbon.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = ribbon;
      ctx.beginPath();
      ctx.moveTo(-pw * 0.88, -ph * 0.18);
      ctx.bezierCurveTo(
        -pw * 0.44,
        -ph * 0.22,
        -pw * 0.08,
        ph * 0.18,
        pw * 0.26,
        -ph * 0.1,
      );
      ctx.bezierCurveTo(
        pw * 0.48,
        -ph * 0.22,
        pw * 0.68,
        ph * 0.18,
        pw * 0.9,
        ph * 0.06,
      );
      ctx.lineTo(pw * 0.9, ph * 0.22);
      ctx.bezierCurveTo(
        pw * 0.42,
        ph * 0.3,
        0,
        ph * 0.08,
        -pw * 0.88,
        ph * 0.24,
      );
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });

    drawRippleField(time);
    ctx.restore();
  }

  function drawT(time) {
    if (!state.tAnchor || !state.ripples.length) return;

    let strength = 0;
    for (const ripple of state.ripples) {
      const dx = state.tAnchor.x - ripple.x;
      const dy = state.tAnchor.y - ripple.y;
      const dist = Math.hypot(dx, dy);

      const ringCenter = ripple.r + ripple.thickness * 0.36;
      const ringWidth = ripple.thickness * 0.96;
      const ringHit = 1 - Math.abs(dist - ringCenter) / ringWidth;
      const glowHit = 1 - dist / (ripple.r + ripple.thickness * 0.85);
      const local = Math.max(ringHit * 0.95, glowHit * 0.28, 0) * ripple.alpha;
      if (local > strength) strength = local;
    }

    if (strength < 0.018) return;

    const pulse = 0.5 + 0.5 * Math.sin(time * 0.0012 + state.tAnchor.pulse);
    const alpha = clamp(strength * 5.4 + pulse * 0.08, 0.14, 0.88);
    const driftX = Math.sin(time * 0.001 + state.tAnchor.pulse) * 0.6;
    const driftY = Math.cos(time * 0.0011 + state.tAnchor.pulse) * 0.5;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `600 ${state.tAnchor.size}px "Avenir Next", "Helvetica Neue", Arial, sans-serif`;

    ctx.shadowColor = `rgba(248, 252, 255, ${alpha * 0.36})`;
    ctx.shadowBlur = 8;
    ctx.fillStyle = `rgba(242, 250, 255, ${alpha * 0.42})`;
    ctx.fillText(
      "t",
      state.tAnchor.x + driftX + 0.7,
      state.tAnchor.y + driftY + 0.2,
    );

    ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(122, 201, 246, ${alpha})`;
    ctx.fillText("t", state.tAnchor.x + driftX, state.tAnchor.y + driftY);
    ctx.restore();
  }

  function render(time) {
    updateMotion(time);
    ctx.clearRect(0, 0, width, height);

    // ベースのグリッド自体は固定し、ドラッグ・スワイプでは動かさない
    ctx.drawImage(baseCanvas, 0, 0, width, height);

    drawOverlay(time);

    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.drawImage(grainCanvas, 0, 0, width, height);
    ctx.restore();

    drawT(time);
    requestAnimationFrame(render);
  }

  function handlePointer(x, y, active = true) {
    pointer.active = active;
    const nx = (x / width - 0.5) * 2;
    const ny = (y / height - 0.5) * 2;
    motion.targetX = clamp(nx * 18, -18, 18);
    motion.targetY = clamp(ny * 15, -15, 15);
    overlayMotion.flowTarget = clamp(
      (Math.abs(nx) + Math.abs(ny)) * 0.7 + 0.35,
      0.35,
      1.2,
    );
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
    pointer.lastX = event.clientX;
    pointer.lastY = event.clientY;
    pointer.lastTime = performance.now();
    handlePointer(event.clientX, event.clientY, true);
    addRipple(event.clientX, event.clientY, 1.4);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!pointer.active) return;
    const now = performance.now();
    const dt = Math.max(8, now - pointer.lastTime);
    const dx = event.clientX - pointer.lastX;
    const dy = event.clientY - pointer.lastY;
    const speed = Math.sqrt(dx * dx + dy * dy) / dt;
    handlePointer(event.clientX, event.clientY, true);
    if (Math.abs(dx) + Math.abs(dy) > 3) {
      addRipple(event.clientX, event.clientY, clamp(speed * 5.8, 1.0, 3.0));
    }
    pointer.lastX = event.clientX;
    pointer.lastY = event.clientY;
    pointer.lastTime = now;
  });

  const releasePointer = () => {
    pointer.active = false;
    overlayMotion.flowTarget = 0.12;
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
