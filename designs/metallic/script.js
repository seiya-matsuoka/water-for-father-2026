(() => {
  const canvas = document.getElementById("metallic-canvas");
  const ctx = canvas.getContext("2d");

  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    pointer: { x: 0, y: 0, active: false },
    velocity: { x: 0, y: 0 },
    rotation: { x: 0, y: 0 },
    targetRotation: { x: 0, y: 0 },
    lastPoint: null,
    time: 0,
  };

  const palette = {
    deep: "#060711",
    night: "#0a1531",
    silver: "#ecf4ff",
    silverWarm: "#fff8ef",
    cyan: "#b6f5ff",
    blue: "#7cc8ff",
    lavender: "#d7c8ff",
    magenta: "#ff8fe3",
    gold: "#ffd58a",
    goldSoft: "#fff1c5",
    violet: "#7862ff",
  };

  const bandSpecs = [
    {
      yOffset: -0.22,
      thickness: 0.26,
      amp: 0.022,
      freq: 1.15,
      speed: 0.38,
      slope: 0.76,
      alpha: 0.92,
      edgeAlpha: 0.4,
      colors: ["#16223d", "#dff9ff", "#bfe6ff", "#5240ff"],
    },
    {
      yOffset: -0.08,
      thickness: 0.21,
      amp: 0.018,
      freq: 1.55,
      speed: 0.52,
      slope: 0.84,
      alpha: 0.78,
      edgeAlpha: 0.38,
      colors: ["#2a214a", "#ffd9f5", "#fefefe", "#6b4bcf"],
    },
    {
      yOffset: 0.16,
      thickness: 0.24,
      amp: 0.025,
      freq: 1.0,
      speed: 0.34,
      slope: 0.69,
      alpha: 0.82,
      edgeAlpha: 0.34,
      colors: ["#10142f", "#cfffff", "#fff2ce", "#61d6dc"],
    },
    {
      yOffset: 0.41,
      thickness: 0.17,
      amp: 0.019,
      freq: 1.75,
      speed: 0.56,
      slope: 0.88,
      alpha: 0.88,
      edgeAlpha: 0.44,
      colors: ["#180d3a", "#edf7ff", "#d6f0ff", "#ff9de3"],
    },
    {
      yOffset: 0.69,
      thickness: 0.24,
      amp: 0.021,
      freq: 1.18,
      speed: 0.43,
      slope: 0.78,
      alpha: 0.8,
      edgeAlpha: 0.36,
      colors: ["#100f32", "#d9f8ff", "#f8feff", "#8a6dff"],
    },
  ];

  const sharpSpecs = [
    {
      position: 0.14,
      width: 0.014,
      alpha: 0.66,
      colors: [
        "rgba(255,255,255,0)",
        "rgba(255,255,255,0.94)",
        "rgba(255,214,244,0.72)",
        "rgba(255,255,255,0)",
      ],
    },
    {
      position: 0.49,
      width: 0.012,
      alpha: 0.52,
      colors: [
        "rgba(255,255,255,0)",
        "rgba(188,247,255,0.9)",
        "rgba(255,255,255,0.6)",
        "rgba(255,255,255,0)",
      ],
    },
    {
      position: 0.78,
      width: 0.009,
      alpha: 0.62,
      colors: [
        "rgba(255,255,255,0)",
        "rgba(255,214,145,0.82)",
        "rgba(255,255,255,0.72)",
        "rgba(255,255,255,0)",
      ],
    },
  ];

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const lerp = (start, end, amount) => start + (end - start) * amount;
  const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3);

  function resize() {
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.width = window.innerWidth;
    state.height = window.innerHeight;

    canvas.width = Math.floor(state.width * state.dpr);
    canvas.height = Math.floor(state.height * state.dpr);
    canvas.style.width = `${state.width}px`;
    canvas.style.height = `${state.height}px`;

    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  }

  function onPointerDown(event) {
    const point = getPoint(event);
    state.pointer.active = true;
    state.lastPoint = point;
    state.pointer.x = point.x;
    state.pointer.y = point.y;
  }

  function onPointerMove(event) {
    const point = getPoint(event);
    state.pointer.x = point.x;
    state.pointer.y = point.y;

    if (!state.pointer.active || !state.lastPoint) return;

    const dx = point.x - state.lastPoint.x;
    const dy = point.y - state.lastPoint.y;

    state.velocity.x = dx * 0.0018;
    state.velocity.y = dy * 0.0018;

    state.targetRotation.y += dx * 0.0019;
    state.targetRotation.x += dy * 0.0014;
    state.targetRotation.x = clamp(state.targetRotation.x, -0.65, 0.65);
    state.targetRotation.y = clamp(state.targetRotation.y, -0.9, 0.9);

    state.lastPoint = point;
  }

  function onPointerUp() {
    state.pointer.active = false;
    state.lastPoint = null;
  }

  function getPoint(event) {
    if (event.touches && event.touches[0]) {
      return { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }

    return { x: event.clientX, y: event.clientY };
  }

  function update(deltaSeconds) {
    state.time += deltaSeconds;

    if (!state.pointer.active) {
      state.targetRotation.x += state.velocity.y;
      state.targetRotation.y += state.velocity.x;

      state.targetRotation.x *= 0.985;
      state.targetRotation.y *= 0.985;
      state.velocity.x *= 0.93;
      state.velocity.y *= 0.93;

      state.targetRotation.x += Math.sin(state.time * 0.52) * 0.0009;
      state.targetRotation.y += Math.cos(state.time * 0.43) * 0.0012;
    }

    state.targetRotation.x = clamp(state.targetRotation.x, -0.7, 0.7);
    state.targetRotation.y = clamp(state.targetRotation.y, -1.0, 1.0);

    state.rotation.x = lerp(state.rotation.x, state.targetRotation.x, 0.09);
    state.rotation.y = lerp(state.rotation.y, state.targetRotation.y, 0.09);
  }

  function render() {
    const { width, height, time } = state;

    ctx.clearRect(0, 0, width, height);

    drawBackdrop(width, height, time);
    drawGlowFields(width, height, time);

    bandSpecs.forEach((spec, index) =>
      drawBand(spec, index, width, height, time),
    );
    sharpSpecs.forEach((spec, index) =>
      drawSharpBand(spec, index, width, height, time),
    );

    drawOrbHighlight(width, height, time);
    drawHiddenT(width, height, time);
    drawSpecularDust(width, height, time);
  }

  function drawBackdrop(width, height, time) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#03040a");
    gradient.addColorStop(0.24, "#08122a");
    gradient.addColorStop(0.56, "#140e2d");
    gradient.addColorStop(1, "#04050c");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const sphereGlow = ctx.createRadialGradient(
      width * (0.55 + state.rotation.y * 0.08),
      height * (0.47 + state.rotation.x * 0.06),
      0,
      width * 0.55,
      height * 0.5,
      Math.max(width, height) * 0.58,
    );
    sphereGlow.addColorStop(0, "rgba(255,255,255,0.05)");
    sphereGlow.addColorStop(0.45, "rgba(131,151,255,0.03)");
    sphereGlow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sphereGlow;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.15;
    const sweep = ctx.createLinearGradient(
      0,
      height * 0.08,
      width,
      height * 0.9,
    );
    sweep.addColorStop(0, "rgba(255,255,255,0)");
    sweep.addColorStop(0.22, "rgba(210, 241, 255, 0.28)");
    sweep.addColorStop(0.52, "rgba(255, 184, 237, 0.16)");
    sweep.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sweep;
    ctx.translate(Math.sin(time * 0.19) * width * 0.04, 0);
    ctx.fillRect(-width * 0.2, 0, width * 1.4, height);
    ctx.restore();
  }

  function drawGlowFields(width, height, time) {
    const fields = [
      {
        x: width * (0.84 + state.rotation.y * 0.02),
        y: height * (0.12 + Math.sin(time * 0.37) * 0.02),
        r: Math.max(width, height) * 0.28,
        color: "rgba(255, 164, 233, 0.22)",
      },
      {
        x: width * (0.18 + Math.cos(time * 0.29) * 0.03),
        y: height * (0.86 + state.rotation.x * 0.03),
        r: Math.max(width, height) * 0.26,
        color: "rgba(183, 247, 255, 0.22)",
      },
      {
        x: width * 0.62,
        y: height * (0.52 + Math.sin(time * 0.22) * 0.04),
        r: Math.max(width, height) * 0.24,
        color: "rgba(255, 215, 143, 0.12)",
      },
    ];

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    fields.forEach((field) => {
      const gradient = ctx.createRadialGradient(
        field.x,
        field.y,
        0,
        field.x,
        field.y,
        field.r,
      );
      gradient.addColorStop(0, field.color);
      gradient.addColorStop(0.46, field.color.replace(/0\.\d+\)/, "0.06)"));
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(
        field.x - field.r,
        field.y - field.r,
        field.r * 2,
        field.r * 2,
      );
    });

    ctx.restore();
  }

  function drawBand(spec, index, width, height, time) {
    const topY = -height * 0.18;
    const bottomY = height * 1.18;
    const steps = Math.max(22, Math.floor(height / 42));
    const stepSize = (bottomY - topY) / steps;

    const baseCenterX = width * (-0.2 + spec.yOffset * 0.7);
    const baseShift =
      state.rotation.y * width * 0.24 +
      Math.sin(time * (0.16 + index * 0.03)) * width * 0.025;
    const verticalShift = state.rotation.x * height * 0.08;
    const bandWidthBase = Math.max(width, height) * spec.thickness;

    const leftPoints = [];
    const rightPoints = [];

    for (let step = 0; step <= steps; step += 1) {
      const y = topY + step * stepSize;
      const normY = (y + height * 0.3) / (height * 1.5);
      const sphereCurve = Math.sin((normY - 0.12) * Math.PI * 1.14);
      const diagonal = baseCenterX + y * spec.slope;
      const wobble =
        Math.sin(
          normY * Math.PI * spec.freq * 3 + time * spec.speed + index * 1.9,
        ) *
          width *
          spec.amp +
        Math.cos(
          normY * Math.PI * (spec.freq * 1.5) -
            time * (spec.speed * 0.45) +
            index,
        ) *
          width *
          spec.amp *
          0.45;
      const centerX =
        diagonal +
        baseShift +
        wobble +
        sphereCurve * width * state.rotation.y * 0.22;
      const widthPulse = 1 + Math.sin(time * 0.4 + normY * 9 + index) * 0.06;
      const sphereCompression = 1 - Math.abs(normY - 0.5) * 0.16;
      const half = bandWidthBase * widthPulse * sphereCompression * 0.5;
      const edgeWave =
        Math.sin(time * 0.85 + normY * 12 + index * 2.2) * width * 0.006;

      leftPoints.push({ x: centerX - half - edgeWave, y: y + verticalShift });
      rightPoints.push({ x: centerX + half + edgeWave, y: y + verticalShift });
    }

    ctx.save();
    ctx.beginPath();
    traceRibbon(leftPoints, rightPoints);
    ctx.closePath();
    ctx.clip();

    const gradient = ctx.createLinearGradient(
      leftPoints[0].x,
      topY,
      rightPoints[rightPoints.length - 1].x,
      bottomY,
    );

    gradient.addColorStop(0, spec.colors[0]);
    gradient.addColorStop(0.18, spec.colors[1]);
    gradient.addColorStop(0.56, spec.colors[2]);
    gradient.addColorStop(1, spec.colors[3]);

    ctx.globalAlpha = spec.alpha;
    ctx.fillStyle = gradient;
    ctx.fillRect(-width * 0.4, -height * 0.4, width * 1.8, height * 1.8);

    ctx.globalCompositeOperation = "screen";
    const sheen = ctx.createLinearGradient(
      width * (0.12 + state.rotation.y * 0.06),
      height * 0.12,
      width * (0.82 + state.rotation.y * 0.1),
      height * 0.88,
    );
    sheen.addColorStop(0, "rgba(255,255,255,0)");
    sheen.addColorStop(0.28, "rgba(255,255,255,0.04)");
    sheen.addColorStop(0.45, "rgba(255,255,255,0.3)");
    sheen.addColorStop(0.62, "rgba(255, 242, 195, 0.2)");
    sheen.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(-width * 0.3, 0, width * 1.6, height);

    ctx.globalCompositeOperation = "overlay";
    const tint = ctx.createLinearGradient(0, height * 0.2, width, height * 0.9);
    tint.addColorStop(0, "rgba(114, 170, 255, 0.12)");
    tint.addColorStop(0.44, "rgba(255, 129, 225, 0.16)");
    tint.addColorStop(0.72, "rgba(255, 211, 136, 0.12)");
    tint.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = tint;
    ctx.fillRect(-width * 0.1, 0, width * 1.2, height);

    ctx.restore();

    ctx.save();
    ctx.strokeStyle = `rgba(255,255,255,${spec.edgeAlpha})`;
    ctx.lineWidth = Math.max(1.1, Math.min(width, height) * 0.0032);
    ctx.beginPath();
    traceEdge(leftPoints);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255,255,255,${spec.edgeAlpha * 0.8})`;
    ctx.beginPath();
    traceEdge(rightPoints);
    ctx.stroke();
    ctx.restore();
  }

  function traceRibbon(leftPoints, rightPoints) {
    const start = leftPoints[0];
    ctx.moveTo(start.x, start.y);

    for (let i = 1; i < leftPoints.length; i += 1) {
      const prev = leftPoints[i - 1];
      const curr = leftPoints[i];
      const midX = (prev.x + curr.x) * 0.5;
      const midY = (prev.y + curr.y) * 0.5;
      ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
    }

    const lastLeft = leftPoints[leftPoints.length - 1];
    ctx.lineTo(lastLeft.x, lastLeft.y);

    for (let i = rightPoints.length - 1; i > 0; i -= 1) {
      const prev = rightPoints[i];
      const curr = rightPoints[i - 1];
      const midX = (prev.x + curr.x) * 0.5;
      const midY = (prev.y + curr.y) * 0.5;
      ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
    }

    ctx.lineTo(rightPoints[0].x, rightPoints[0].y);
  }

  function traceEdge(points) {
    if (!points.length) return;
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = (prev.x + curr.x) * 0.5;
      const midY = (prev.y + curr.y) * 0.5;
      ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
    }
  }

  function drawSharpBand(spec, index, width, height, time) {
    const phase = time * (0.32 + index * 0.08);
    const center =
      spec.position +
      Math.sin(phase + index) * 0.015 +
      state.rotation.y * 0.045;
    const left = width * (center - spec.width * 0.5);
    const right = width * (center + spec.width * 0.5);

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = spec.alpha;
    ctx.translate(width * 0.02, 0);
    ctx.rotate(((-18 + index * 4 + state.rotation.x * 14) * Math.PI) / 180);
    const gradient = ctx.createLinearGradient(left, 0, right, 0);
    gradient.addColorStop(0, spec.colors[0]);
    gradient.addColorStop(0.35, spec.colors[1]);
    gradient.addColorStop(0.62, spec.colors[2]);
    gradient.addColorStop(1, spec.colors[3]);
    ctx.fillStyle = gradient;
    ctx.fillRect(
      left,
      -height * 0.18,
      Math.max(10, right - left),
      height * 1.4,
    );
    ctx.restore();
  }

  function drawOrbHighlight(width, height, time) {
    const pointerInfluenceX =
      (state.pointer.x / Math.max(1, width) - 0.5) * 0.16;
    const pointerInfluenceY =
      (state.pointer.y / Math.max(1, height) - 0.5) * 0.12;

    const x =
      width *
      (0.54 +
        state.rotation.y * 0.06 +
        pointerInfluenceX +
        Math.sin(time * 0.3) * 0.015);
    const y =
      height *
      (0.46 +
        state.rotation.x * 0.05 +
        pointerInfluenceY +
        Math.cos(time * 0.28) * 0.02);
    const radius = Math.max(width, height) * 0.5;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    const glow = ctx.createRadialGradient(x, y, radius * 0.06, x, y, radius);
    glow.addColorStop(0, "rgba(255,255,255,0.32)");
    glow.addColorStop(0.12, "rgba(255,255,255,0.16)");
    glow.addColorStop(0.34, "rgba(185, 246, 255, 0.11)");
    glow.addColorStop(0.6, "rgba(255, 191, 231, 0.06)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);

    const rim = ctx.createLinearGradient(
      width * 0.18,
      height * 0.18,
      width * 0.86,
      height * 0.92,
    );
    rim.addColorStop(0, "rgba(255,255,255,0)");
    rim.addColorStop(0.4, "rgba(255,255,255,0.08)");
    rim.addColorStop(0.54, "rgba(255, 221, 155, 0.14)");
    rim.addColorStop(0.8, "rgba(255,255,255,0)");
    ctx.fillStyle = rim;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
  }

  function drawHiddenT(width, height, time) {
    const fontSize = Math.min(width, height) * 0.22;
    const x = width * 0.72;
    const y = height * 0.66;

    const sweepPhase =
      (Math.sin(time * 0.7 + state.rotation.y * 2.4) + 1) * 0.5;
    const reveal =
      0.075 +
      easeOutCubic(
        clamp(sweepPhase * 0.85 + Math.abs(state.rotation.y) * 0.22, 0, 1),
      ) *
        0.11;

    ctx.save();
    ctx.font = `700 ${fontSize}px "Times New Roman", "Cormorant Garamond", Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";

    ctx.globalCompositeOperation = "multiply";
    ctx.lineWidth = fontSize * 0.045;
    ctx.strokeStyle = `rgba(0, 0, 0, ${reveal * 0.8})`;
    ctx.strokeText("t", x + 2, y + 4);

    ctx.globalCompositeOperation = "screen";
    ctx.strokeStyle = `rgba(255, 255, 255, ${reveal})`;
    ctx.strokeText("t", x - 1.5, y - 2);

    const fill = ctx.createLinearGradient(
      x - fontSize * 0.34,
      y - fontSize * 0.5,
      x + fontSize * 0.26,
      y + fontSize * 0.42,
    );
    fill.addColorStop(0, `rgba(238, 248, 255, ${reveal * 0.16})`);
    fill.addColorStop(0.35, `rgba(255, 224, 154, ${reveal * 0.14})`);
    fill.addColorStop(0.72, `rgba(255, 175, 229, ${reveal * 0.11})`);
    fill.addColorStop(1, `rgba(255, 255, 255, ${reveal * 0.06})`);
    ctx.fillStyle = fill;
    ctx.fillText("t", x, y);

    const streakWidth = fontSize * 0.16;
    const streakX = x - fontSize * 0.25 + sweepPhase * fontSize * 0.45;
    ctx.beginPath();
    ctx.rect(
      x - fontSize * 0.38,
      y - fontSize * 0.48,
      fontSize * 0.76,
      fontSize * 0.9,
    );
    ctx.clip();
    const streak = ctx.createLinearGradient(
      streakX - streakWidth,
      y - fontSize * 0.5,
      streakX + streakWidth,
      y + fontSize * 0.4,
    );
    streak.addColorStop(0, "rgba(255,255,255,0)");
    streak.addColorStop(0.5, `rgba(255,255,255,${reveal * 0.36})`);
    streak.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = streak;
    ctx.fillRect(
      x - fontSize * 0.5,
      y - fontSize * 0.55,
      fontSize,
      fontSize * 1.1,
    );
    ctx.restore();
  }

  function drawSpecularDust(width, height, time) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    for (let i = 0; i < 18; i += 1) {
      const seed = i * 0.61803398875;
      const x =
        ((seed * width * 1.7 + time * 18 + i * 47) % (width + 120)) - 60;
      const y =
        ((seed * height * 2.3 + time * 11 + i * 71) % (height + 140)) - 70;
      const radius = 0.7 + (i % 4) * 0.45;
      ctx.fillStyle = `rgba(255,255,255,${0.04 + (i % 5) * 0.01})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  let animationFrameId = 0;
  let previousTime = performance.now();

  function animate(now) {
    const deltaSeconds = Math.min((now - previousTime) / 1000, 0.033);
    previousTime = now;

    update(deltaSeconds);
    render();

    animationFrameId = window.requestAnimationFrame(animate);
  }

  window.addEventListener("resize", resize);

  window.addEventListener("pointerdown", onPointerDown, { passive: true });
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerup", onPointerUp, { passive: true });
  window.addEventListener("pointercancel", onPointerUp, { passive: true });
  window.addEventListener("pointerleave", onPointerUp, { passive: true });

  window.addEventListener(
    "touchmove",
    (event) => {
      if (state.pointer.active) {
        event.preventDefault();
      }
    },
    { passive: false },
  );

  resize();
  animationFrameId = window.requestAnimationFrame(animate);

  window.addEventListener("beforeunload", () => {
    window.cancelAnimationFrame(animationFrameId);
  });
})();
