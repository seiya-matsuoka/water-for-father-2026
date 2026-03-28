(() => {
  const canvas = document.getElementById("metallic-canvas");
  const ctx = canvas.getContext("2d");

  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    pointer: { x: 0, y: 0, active: false },
    orbit: { x: 0, y: 0 },
    rotation: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    lastPoint: null,
    time: 0,
  };

  const bandSpecs = [
    {
      yOffset: -0.32,
      thickness: 0.36,
      amp: 0.028,
      freq: 1.08,
      speed: 0.34,
      slope: 0.72,
      alpha: 0.98,
      edgeAlpha: 0.54,
      colors: ["#0a1222", "#f8fbff", "#bad9f7", "#244576"],
    },
    {
      yOffset: -0.12,
      thickness: 0.24,
      amp: 0.02,
      freq: 1.54,
      speed: 0.42,
      slope: 0.86,
      alpha: 0.9,
      edgeAlpha: 0.42,
      colors: ["#07101b", "#d7e7f6", "#7ea8d5", "#0d2444"],
    },
    {
      yOffset: 0.12,
      thickness: 0.42,
      amp: 0.032,
      freq: 0.92,
      speed: 0.3,
      slope: 0.64,
      alpha: 0.96,
      edgeAlpha: 0.5,
      colors: ["#0a111d", "#fbfdff", "#b1cbec", "#395d8e"],
    },
    {
      yOffset: 0.36,
      thickness: 0.2,
      amp: 0.024,
      freq: 1.72,
      speed: 0.5,
      slope: 0.92,
      alpha: 0.82,
      edgeAlpha: 0.34,
      colors: ["#08101c", "#dfe6ee", "#8fb7ea", "#0c1b35"],
    },
    {
      yOffset: 0.6,
      thickness: 0.3,
      amp: 0.027,
      freq: 1.18,
      speed: 0.38,
      slope: 0.76,
      alpha: 0.86,
      edgeAlpha: 0.38,
      colors: ["#0a1020", "#eef4f8", "#c7d4df", "#4f6991"],
    },
  ];

  const sharpSpecs = [
    {
      position: 0.13,
      width: 0.012,
      alpha: 0.92,
      angle: -18,
      colors: [
        "rgba(255,255,255,0)",
        "rgba(255,255,255,0.98)",
        "rgba(184,217,255,0.75)",
        "rgba(255,255,255,0)",
      ],
    },
    {
      position: 0.31,
      width: 0.03,
      alpha: 0.44,
      angle: -12,
      colors: [
        "rgba(255,255,255,0)",
        "rgba(166,203,255,0.5)",
        "rgba(255,255,255,0.34)",
        "rgba(255,255,255,0)",
      ],
    },
    {
      position: 0.58,
      width: 0.015,
      alpha: 0.84,
      angle: -15,
      colors: [
        "rgba(255,255,255,0)",
        "rgba(255,255,255,0.96)",
        "rgba(255,225,165,0.54)",
        "rgba(255,255,255,0)",
      ],
    },
    {
      position: 0.8,
      width: 0.012,
      alpha: 0.78,
      angle: -21,
      colors: [
        "rgba(255,255,255,0)",
        "rgba(196,230,255,0.92)",
        "rgba(255,214,233,0.42)",
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

  function getPoint(event) {
    if (event.touches && event.touches[0]) {
      return { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }

    return { x: event.clientX, y: event.clientY };
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
    const normX = dx / Math.max(1, state.width);
    const normY = dy / Math.max(1, state.height);

    state.orbit.y = clamp(state.orbit.y + normX * 3.6, -2.35, 2.35);
    state.orbit.x = clamp(state.orbit.x + normY * 2.2, -1.45, 1.45);

    state.velocity.y = clamp(state.velocity.y + normX * 8.8, -3.2, 3.2);
    state.velocity.x = clamp(state.velocity.x + normY * 5.4, -2.4, 2.4);

    state.lastPoint = point;
  }

  function onPointerUp() {
    state.pointer.active = false;
    state.lastPoint = null;
  }

  function update(deltaSeconds) {
    state.time += deltaSeconds;

    if (!state.pointer.active) {
      state.orbit.x = clamp(
        state.orbit.x + state.velocity.x * deltaSeconds,
        -1.45,
        1.45,
      );
      state.orbit.y = clamp(
        state.orbit.y + state.velocity.y * deltaSeconds,
        -2.35,
        2.35,
      );

      const frameDecay = Math.pow(0.986, deltaSeconds * 60);
      state.velocity.x *= frameDecay;
      state.velocity.y *= frameDecay;

      state.orbit.x *= Math.pow(0.9993, deltaSeconds * 60);
      state.orbit.y *= Math.pow(0.9991, deltaSeconds * 60);
    }

    const ambientX =
      Math.sin(state.time * 0.18) * 0.06 + Math.cos(state.time * 0.09) * 0.03;
    const ambientY =
      Math.cos(state.time * 0.16) * 0.09 + Math.sin(state.time * 0.11) * 0.02;

    state.rotation.x = lerp(
      state.rotation.x,
      clamp(state.orbit.x + ambientX, -1.52, 1.52),
      0.08,
    );
    state.rotation.y = lerp(
      state.rotation.y,
      clamp(state.orbit.y + ambientY, -2.45, 2.45),
      0.08,
    );
  }

  function render() {
    const { width, height, time } = state;

    ctx.clearRect(0, 0, width, height);

    drawBackdrop(width, height, time);
    drawMirrorGlow(width, height, time);
    bandSpecs.forEach((spec, index) =>
      drawBand(spec, index, width, height, time),
    );
    drawChromeVeins(width, height, time);
    sharpSpecs.forEach((spec, index) =>
      drawSharpBand(spec, index, width, height, time),
    );
    drawOrbHighlight(width, height, time);
    drawHiddenT(width, height, time);
    drawSpecularDust(width, height, time);
  }

  function drawBackdrop(width, height, time) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#02040a");
    gradient.addColorStop(0.18, "#07111f");
    gradient.addColorStop(0.55, "#0b1626");
    gradient.addColorStop(1, "#020409");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    const orbGlow = ctx.createRadialGradient(
      width * (0.54 + state.rotation.y * 0.025),
      height * (0.48 + state.rotation.x * 0.035),
      0,
      width * 0.54,
      height * 0.48,
      Math.max(width, height) * 0.72,
    );
    orbGlow.addColorStop(0, "rgba(255,255,255,0.08)");
    orbGlow.addColorStop(0.18, "rgba(198,222,255,0.08)");
    orbGlow.addColorStop(0.48, "rgba(102,154,220,0.05)");
    orbGlow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = orbGlow;
    ctx.fillRect(0, 0, width, height);

    const sweep = ctx.createLinearGradient(
      width * 0.08,
      0,
      width * 0.88,
      height,
    );
    sweep.addColorStop(0, "rgba(255,255,255,0)");
    sweep.addColorStop(0.32, "rgba(194,220,255,0.14)");
    sweep.addColorStop(0.5, "rgba(255,255,255,0.22)");
    sweep.addColorStop(0.68, "rgba(255,225,169,0.08)");
    sweep.addColorStop(1, "rgba(255,255,255,0)");
    ctx.globalAlpha = 0.55;
    ctx.translate(
      Math.sin(time * 0.15) * width * 0.05,
      Math.cos(time * 0.11) * height * 0.015,
    );
    ctx.fillStyle = sweep;
    ctx.fillRect(-width * 0.22, -height * 0.1, width * 1.4, height * 1.2);
    ctx.restore();
  }

  function drawMirrorGlow(width, height, time) {
    const fields = [
      {
        x: width * (0.17 + Math.cos(time * 0.22) * 0.02),
        y: height * (0.16 + state.rotation.x * 0.015),
        r: Math.max(width, height) * 0.22,
        color: "rgba(119, 180, 255, 0.18)",
      },
      {
        x: width * (0.82 + state.rotation.y * 0.008),
        y: height * (0.78 + Math.sin(time * 0.18) * 0.03),
        r: Math.max(width, height) * 0.28,
        color: "rgba(166, 210, 255, 0.16)",
      },
      {
        x: width * 0.72,
        y: height * 0.26,
        r: Math.max(width, height) * 0.18,
        color: "rgba(255, 215, 147, 0.07)",
      },
      {
        x: width * 0.28,
        y: height * 0.7,
        r: Math.max(width, height) * 0.16,
        color: "rgba(255, 194, 228, 0.05)",
      },
    ];

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    fields.forEach((field) => {
      const glow = ctx.createRadialGradient(
        field.x,
        field.y,
        0,
        field.x,
        field.y,
        field.r,
      );
      glow.addColorStop(0, field.color);
      glow.addColorStop(0.42, field.color.replace(/0\.\d+\)/, "0.05)"));
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
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
    const topY = -height * 0.24;
    const bottomY = height * 1.24;
    const steps = Math.max(26, Math.floor(height / 34));
    const stepSize = (bottomY - topY) / steps;

    const baseCenterX = width * (-0.26 + spec.yOffset * 0.72);
    const motionShift =
      state.rotation.y * width * 0.34 +
      Math.sin(time * (0.14 + index * 0.03)) * width * 0.025;
    const verticalShift = state.rotation.x * height * 0.14;
    const bandWidthBase = Math.max(width, height) * spec.thickness;

    const leftPoints = [];
    const rightPoints = [];

    for (let step = 0; step <= steps; step += 1) {
      const y = topY + step * stepSize;
      const normY = (y + height * 0.34) / (height * 1.58);
      const sphereCurve = Math.sin((normY - 0.08) * Math.PI * 1.12);
      const diagonal = baseCenterX + y * spec.slope;
      const wobble =
        Math.sin(
          normY * Math.PI * spec.freq * 3.2 + time * spec.speed + index * 1.8,
        ) *
          width *
          spec.amp +
        Math.cos(
          normY * Math.PI * (spec.freq * 1.7) -
            time * (spec.speed * 0.5) +
            index * 1.3,
        ) *
          width *
          spec.amp *
          0.48;
      const centerX =
        diagonal +
        motionShift +
        wobble +
        sphereCurve * width * state.rotation.y * 0.16;
      const widthPulse = 1 + Math.sin(time * 0.42 + normY * 10 + index) * 0.07;
      const sphereCompression = 1 - Math.abs(normY - 0.5) * 0.22;
      const half = bandWidthBase * widthPulse * sphereCompression * 0.5;
      const edgeWave =
        Math.sin(time * 0.74 + normY * 13 + index * 2.2) * width * 0.008;

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
    gradient.addColorStop(0.52, spec.colors[2]);
    gradient.addColorStop(1, spec.colors[3]);

    ctx.globalAlpha = spec.alpha;
    ctx.fillStyle = gradient;
    ctx.fillRect(-width * 0.4, -height * 0.4, width * 1.8, height * 1.8);

    ctx.globalCompositeOperation = "screen";
    const sheen = ctx.createLinearGradient(
      width * (0.06 + state.rotation.y * 0.03),
      height * 0.08,
      width * (0.92 + state.rotation.y * 0.04),
      height * 0.94,
    );
    sheen.addColorStop(0, "rgba(255,255,255,0)");
    sheen.addColorStop(0.24, "rgba(255,255,255,0.09)");
    sheen.addColorStop(0.44, "rgba(255,255,255,0.5)");
    sheen.addColorStop(0.58, "rgba(188,219,255,0.22)");
    sheen.addColorStop(0.68, "rgba(255,217,160,0.14)");
    sheen.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(-width * 0.2, -height * 0.08, width * 1.5, height * 1.1);

    ctx.globalCompositeOperation = "overlay";
    const tint = ctx.createLinearGradient(0, 0, width, height);
    tint.addColorStop(0, "rgba(125, 176, 255, 0.15)");
    tint.addColorStop(0.35, "rgba(206, 228, 255, 0.1)");
    tint.addColorStop(0.62, "rgba(255, 221, 171, 0.06)");
    tint.addColorStop(0.82, "rgba(255, 196, 226, 0.05)");
    tint.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = tint;
    ctx.fillRect(-width * 0.12, 0, width * 1.24, height);

    ctx.restore();

    ctx.save();
    ctx.strokeStyle = `rgba(255,255,255,${spec.edgeAlpha})`;
    ctx.lineWidth = Math.max(1.2, Math.min(width, height) * 0.0038);
    ctx.beginPath();
    traceEdge(leftPoints);
    ctx.stroke();

    ctx.strokeStyle = `rgba(193,220,255,${spec.edgeAlpha * 0.7})`;
    ctx.beginPath();
    traceEdge(rightPoints);
    ctx.stroke();
    ctx.restore();
  }

  function traceRibbon(leftPoints, rightPoints) {
    if (!leftPoints.length || !rightPoints.length) return;

    ctx.moveTo(leftPoints[0].x, leftPoints[0].y);

    for (let i = 1; i < leftPoints.length; i += 1) {
      const prev = leftPoints[i - 1];
      const curr = leftPoints[i];
      ctx.quadraticCurveTo(
        prev.x,
        prev.y,
        (prev.x + curr.x) * 0.5,
        (prev.y + curr.y) * 0.5,
      );
    }

    const lastLeft = leftPoints[leftPoints.length - 1];
    ctx.lineTo(lastLeft.x, lastLeft.y);

    for (let i = rightPoints.length - 1; i > 0; i -= 1) {
      const prev = rightPoints[i];
      const curr = rightPoints[i - 1];
      ctx.quadraticCurveTo(
        prev.x,
        prev.y,
        (prev.x + curr.x) * 0.5,
        (prev.y + curr.y) * 0.5,
      );
    }

    ctx.lineTo(rightPoints[0].x, rightPoints[0].y);
  }

  function traceEdge(points) {
    if (!points.length) return;

    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
      const prev = points[i - 1];
      const curr = points[i];
      ctx.quadraticCurveTo(
        prev.x,
        prev.y,
        (prev.x + curr.x) * 0.5,
        (prev.y + curr.y) * 0.5,
      );
    }
  }

  function drawChromeVeins(width, height, time) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.lineCap = "round";

    const arcs = [
      { y: 0.18, alpha: 0.12, width: 1.8, drift: 0.12 },
      { y: 0.46, alpha: 0.18, width: 2.8, drift: 0.18 },
      { y: 0.74, alpha: 0.12, width: 1.6, drift: 0.15 },
    ];

    arcs.forEach((arc, index) => {
      ctx.beginPath();
      for (let i = -1; i <= 30; i += 1) {
        const t = i / 30;
        const x = t * width * 1.15 - width * 0.08;
        const y =
          height * arc.y +
          Math.sin(
            t * Math.PI * (2.4 + index * 0.35) + time * (0.3 + index * 0.08),
          ) *
            height *
            0.018 +
          Math.cos(t * Math.PI * 2.1 - state.rotation.y * 0.75 + index) *
            height *
            0.014 +
          state.rotation.x * height * arc.drift;

        if (i === -1) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      const stroke = ctx.createLinearGradient(0, 0, width, 0);
      stroke.addColorStop(0, "rgba(255,255,255,0)");
      stroke.addColorStop(0.25, `rgba(198, 219, 255, ${arc.alpha})`);
      stroke.addColorStop(0.52, `rgba(255,255,255,${arc.alpha * 1.6})`);
      stroke.addColorStop(0.78, "rgba(255, 224, 171, 0.06)");
      stroke.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = stroke;
      ctx.lineWidth = arc.width;
      ctx.stroke();
    });

    ctx.restore();
  }

  function drawSharpBand(spec, index, width, height, time) {
    const phase = time * (0.26 + index * 0.06);
    const center =
      spec.position + Math.sin(phase + index) * 0.02 + state.rotation.y * 0.07;
    const left = width * (center - spec.width * 0.5);
    const right = width * (center + spec.width * 0.5);

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = spec.alpha;
    ctx.translate(width * 0.02, 0);
    ctx.rotate(
      ((spec.angle + state.rotation.x * 8 + state.rotation.y * 2.2) * Math.PI) /
        180,
    );

    const gradient = ctx.createLinearGradient(left, 0, right, 0);
    gradient.addColorStop(0, spec.colors[0]);
    gradient.addColorStop(0.35, spec.colors[1]);
    gradient.addColorStop(0.6, spec.colors[2]);
    gradient.addColorStop(1, spec.colors[3]);
    ctx.fillStyle = gradient;
    ctx.fillRect(
      left,
      -height * 0.22,
      Math.max(14, right - left),
      height * 1.55,
    );
    ctx.restore();
  }

  function drawOrbHighlight(width, height, time) {
    const pointerInfluenceX = state.pointer.x
      ? (state.pointer.x / width - 0.5) * 0.18
      : 0;
    const pointerInfluenceY = state.pointer.y
      ? (state.pointer.y / height - 0.5) * 0.12
      : 0;

    const x =
      width *
      (0.53 +
        state.rotation.y * 0.035 +
        pointerInfluenceX +
        Math.sin(time * 0.22) * 0.018);
    const y =
      height *
      (0.45 +
        state.rotation.x * 0.05 +
        pointerInfluenceY +
        Math.cos(time * 0.19) * 0.02);
    const radius = Math.max(width, height) * 0.58;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    const glow = ctx.createRadialGradient(x, y, radius * 0.03, x, y, radius);
    glow.addColorStop(0, "rgba(255,255,255,0.42)");
    glow.addColorStop(0.08, "rgba(255,255,255,0.22)");
    glow.addColorStop(0.28, "rgba(201,226,255,0.14)");
    glow.addColorStop(0.52, "rgba(255,225,169,0.06)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);

    const rim = ctx.createLinearGradient(
      width * 0.1,
      height * 0.12,
      width * 0.92,
      height * 0.94,
    );
    rim.addColorStop(0, "rgba(255,255,255,0)");
    rim.addColorStop(0.34, "rgba(255,255,255,0.08)");
    rim.addColorStop(0.5, "rgba(255,255,255,0.16)");
    rim.addColorStop(0.58, "rgba(196,222,255,0.08)");
    rim.addColorStop(0.72, "rgba(255,223,174,0.07)");
    rim.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = rim;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
  }

  function drawHiddenT(width, height, time) {
    const fontSize = Math.min(width, height) * 0.22;
    const x = width * 0.71;
    const y = height * 0.64;

    const highlightSweep =
      (Math.sin(time * 0.54 + state.rotation.y * 1.9) + 1) * 0.5;
    const reveal =
      0.1 +
      easeOutCubic(
        clamp(highlightSweep * 0.52 + Math.abs(state.rotation.y) * 0.16, 0, 1),
      ) *
        0.13;

    ctx.save();
    ctx.font = `700 ${fontSize}px "Times New Roman", "Cormorant Garamond", Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";

    ctx.globalCompositeOperation = "multiply";
    ctx.lineWidth = fontSize * 0.048;
    ctx.strokeStyle = `rgba(0, 0, 0, ${reveal * 0.9})`;
    ctx.strokeText("t", x + 2, y + 4);

    ctx.globalCompositeOperation = "screen";
    ctx.strokeStyle = `rgba(255, 255, 255, ${reveal * 0.92})`;
    ctx.strokeText("t", x - 1.5, y - 1.5);

    const fill = ctx.createLinearGradient(
      x - fontSize * 0.34,
      y - fontSize * 0.5,
      x + fontSize * 0.3,
      y + fontSize * 0.42,
    );
    fill.addColorStop(0, `rgba(238, 245, 255, ${reveal * 0.14})`);
    fill.addColorStop(0.46, `rgba(184, 214, 255, ${reveal * 0.12})`);
    fill.addColorStop(0.74, `rgba(255, 218, 166, ${reveal * 0.1})`);
    fill.addColorStop(1, `rgba(255, 208, 232, ${reveal * 0.08})`);
    ctx.fillStyle = fill;
    ctx.fillText("t", x, y);

    const streakWidth = fontSize * 0.16;
    const streakX = x - fontSize * 0.26 + highlightSweep * fontSize * 0.48;
    ctx.beginPath();
    ctx.rect(
      x - fontSize * 0.4,
      y - fontSize * 0.5,
      fontSize * 0.82,
      fontSize * 0.96,
    );
    ctx.clip();
    const streak = ctx.createLinearGradient(
      streakX - streakWidth,
      y - fontSize * 0.5,
      streakX + streakWidth,
      y + fontSize * 0.45,
    );
    streak.addColorStop(0, "rgba(255,255,255,0)");
    streak.addColorStop(0.5, `rgba(255,255,255,${reveal * 0.4})`);
    streak.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = streak;
    ctx.fillRect(
      x - fontSize * 0.54,
      y - fontSize * 0.58,
      fontSize * 1.1,
      fontSize * 1.16,
    );
    ctx.restore();
  }

  function drawSpecularDust(width, height, time) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    for (let i = 0; i < 22; i += 1) {
      const seed = i * 0.61803398875;
      const x =
        ((seed * width * 1.8 + time * 18 + i * 43) % (width + 140)) - 70;
      const y =
        ((seed * height * 2.4 + time * 12 + i * 61) % (height + 180)) - 90;
      const radius = 0.65 + (i % 4) * 0.42;
      ctx.fillStyle = `rgba(255,255,255,${0.03 + (i % 5) * 0.012})`;
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
