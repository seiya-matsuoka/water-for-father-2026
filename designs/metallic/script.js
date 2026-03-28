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
      yOffset: -0.48,
      thickness: 0.52,
      amp: 0.038,
      freq: 1.02,
      speed: 0.36,
      slope: 0.74,
      alpha: 0.98,
      edgeAlpha: 0.66,
      colors: ["#020713", "#f6fbff", "#c8d9ea", "#6d8eb6", "#10233f"],
    },
    {
      yOffset: -0.18,
      thickness: 0.34,
      amp: 0.03,
      freq: 1.64,
      speed: 0.48,
      slope: 0.9,
      alpha: 0.9,
      edgeAlpha: 0.5,
      colors: ["#030915", "#eef5ff", "#9fb9d7", "#57739c", "#08182e"],
    },
    {
      yOffset: 0.06,
      thickness: 0.62,
      amp: 0.044,
      freq: 0.92,
      speed: 0.31,
      slope: 0.62,
      alpha: 1,
      edgeAlpha: 0.7,
      colors: ["#030712", "#ffffff", "#c8d5e3", "#82a5cd", "#11284c"],
    },
    {
      yOffset: 0.24,
      thickness: 0.28,
      amp: 0.035,
      freq: 1.88,
      speed: 0.54,
      slope: 1.02,
      alpha: 0.9,
      edgeAlpha: 0.46,
      colors: ["#030711", "#f2f8ff", "#b7d4fb", "#7c93d6", "#0d1932"],
    },
    {
      yOffset: 0.42,
      thickness: 0.56,
      amp: 0.041,
      freq: 1.08,
      speed: 0.34,
      slope: 0.78,
      alpha: 0.95,
      edgeAlpha: 0.62,
      colors: ["#020812", "#eef7ff", "#cad4dc", "#9aa9c1", "#203658"],
    },
    {
      yOffset: 0.72,
      thickness: 0.4,
      amp: 0.032,
      freq: 1.26,
      speed: 0.42,
      slope: 0.86,
      alpha: 0.88,
      edgeAlpha: 0.44,
      colors: ["#030813", "#f5fbff", "#cfdcf0", "#87a2c5", "#152846"],
    },
  ];

  const sharpSpecs = [
    {
      position: 0.08,
      width: 0.018,
      alpha: 1,
      angle: -19,
      colors: [
        "rgba(255,255,255,0)",
        "rgba(255,255,255,1)",
        "rgba(197,222,255,0.86)",
        "rgba(255,255,255,0)",
      ],
    },
    {
      position: 0.22,
      width: 0.04,
      alpha: 0.54,
      angle: -14,
      colors: [
        "rgba(255,255,255,0)",
        "rgba(188,213,255,0.74)",
        "rgba(255,255,255,0.4)",
        "rgba(255,255,255,0)",
      ],
    },
    {
      position: 0.46,
      width: 0.02,
      alpha: 0.96,
      angle: -16,
      colors: [
        "rgba(255,255,255,0)",
        "rgba(255,255,255,1)",
        "rgba(255,220,153,0.64)",
        "rgba(255,255,255,0)",
      ],
    },
    {
      position: 0.68,
      width: 0.03,
      alpha: 0.7,
      angle: -18,
      colors: [
        "rgba(255,255,255,0)",
        "rgba(186,228,255,0.86)",
        "rgba(177,157,255,0.32)",
        "rgba(255,255,255,0)",
      ],
    },
    {
      position: 0.86,
      width: 0.016,
      alpha: 0.9,
      angle: -22,
      colors: [
        "rgba(255,255,255,0)",
        "rgba(255,255,255,0.98)",
        "rgba(147,201,255,0.82)",
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

    state.orbit.y = clamp(state.orbit.y + normX * 6.8, -4.2, 4.2);
    state.orbit.x = clamp(state.orbit.x + normY * 4.8, -2.8, 2.8);

    state.velocity.y = clamp(state.velocity.y + normX * 16.5, -5.4, 5.4);
    state.velocity.x = clamp(state.velocity.x + normY * 11.5, -4.4, 4.4);

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
        -2.8,
        2.8,
      );
      state.orbit.y = clamp(
        state.orbit.y + state.velocity.y * deltaSeconds,
        -4.2,
        4.2,
      );

      const frameDecay = Math.pow(0.9915, deltaSeconds * 60);
      state.velocity.x *= frameDecay;
      state.velocity.y *= frameDecay;

      state.orbit.x *= Math.pow(0.99975, deltaSeconds * 60);
      state.orbit.y *= Math.pow(0.99965, deltaSeconds * 60);
    }

    const ambientX =
      Math.sin(state.time * 0.16) * 0.08 + Math.cos(state.time * 0.08) * 0.05;
    const ambientY =
      Math.cos(state.time * 0.12) * 0.14 + Math.sin(state.time * 0.07) * 0.03;

    state.rotation.x = lerp(
      state.rotation.x,
      clamp(state.orbit.x + ambientX, -2.95, 2.95),
      0.06,
    );
    state.rotation.y = lerp(
      state.rotation.y,
      clamp(state.orbit.y + ambientY, -4.35, 4.35),
      0.06,
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
    gradient.addColorStop(0, "#01040a");
    gradient.addColorStop(0.22, "#081322");
    gradient.addColorStop(0.5, "#0d1c30");
    gradient.addColorStop(0.74, "#07111f");
    gradient.addColorStop(1, "#010309");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    const orbGlow = ctx.createRadialGradient(
      width * (0.52 + state.rotation.y * 0.032),
      height * (0.5 + state.rotation.x * 0.052),
      0,
      width * 0.52,
      height * 0.5,
      Math.max(width, height) * 0.82,
    );
    orbGlow.addColorStop(0, "rgba(255,255,255,0.12)");
    orbGlow.addColorStop(0.16, "rgba(206,226,255,0.12)");
    orbGlow.addColorStop(0.4, "rgba(126,171,229,0.08)");
    orbGlow.addColorStop(0.66, "rgba(90,103,205,0.035)");
    orbGlow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = orbGlow;
    ctx.fillRect(0, 0, width, height);

    const sweep = ctx.createLinearGradient(
      width * 0.02,
      0,
      width * 0.94,
      height,
    );
    sweep.addColorStop(0, "rgba(255,255,255,0)");
    sweep.addColorStop(0.24, "rgba(191,217,255,0.18)");
    sweep.addColorStop(0.42, "rgba(255,255,255,0.34)");
    sweep.addColorStop(0.64, "rgba(255,220,154,0.1)");
    sweep.addColorStop(0.78, "rgba(149,155,255,0.08)");
    sweep.addColorStop(1, "rgba(255,255,255,0)");
    ctx.globalAlpha = 0.7;
    ctx.translate(
      Math.sin(time * 0.13) * width * 0.065,
      Math.cos(time * 0.1) * height * 0.02,
    );
    ctx.fillStyle = sweep;
    ctx.fillRect(-width * 0.28, -height * 0.12, width * 1.6, height * 1.28);
    ctx.restore();
  }

  function drawMirrorGlow(width, height, time) {
    const fields = [
      {
        x:
          width *
          (0.14 + Math.cos(time * 0.2) * 0.025 + state.rotation.y * 0.012),
        y: height * (0.14 + state.rotation.x * 0.022),
        r: Math.max(width, height) * 0.26,
        color: "rgba(123, 184, 255, 0.24)",
      },
      {
        x: width * (0.84 + state.rotation.y * 0.012),
        y: height * (0.78 + Math.sin(time * 0.17) * 0.03),
        r: Math.max(width, height) * 0.3,
        color: "rgba(203, 226, 255, 0.18)",
      },
      {
        x: width * (0.72 + state.rotation.y * 0.014),
        y: height * 0.24,
        r: Math.max(width, height) * 0.2,
        color: "rgba(255, 212, 132, 0.11)",
      },
      {
        x: width * 0.28,
        y: height * (0.72 + state.rotation.x * 0.02),
        r: Math.max(width, height) * 0.18,
        color: "rgba(151, 149, 255, 0.085)",
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
      glow.addColorStop(0.36, field.color.replace(/0\.(\d+)\)/, "0.07)"));
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
    const topY = -height * 0.34;
    const bottomY = height * 1.34;
    const steps = Math.max(34, Math.floor(height / 26));
    const stepSize = (bottomY - topY) / steps;

    const baseCenterX = width * (-0.34 + spec.yOffset * 0.7);
    const motionShift =
      state.rotation.y * width * 0.5 +
      Math.sin(time * (0.14 + index * 0.03)) * width * 0.045;
    const verticalShift = state.rotation.x * height * 0.22;
    const bandWidthBase = Math.max(width, height) * spec.thickness;

    const leftPoints = [];
    const rightPoints = [];

    for (let step = 0; step <= steps; step += 1) {
      const y = topY + step * stepSize;
      const normY = (y + height * 0.34) / (height * 1.68);
      const sphereCurve = Math.sin((normY - 0.07) * Math.PI * 1.14);
      const diagonal = baseCenterX + y * spec.slope;
      const wobble =
        Math.sin(
          normY * Math.PI * spec.freq * 3.4 + time * spec.speed + index * 1.8,
        ) *
          width *
          spec.amp +
        Math.cos(
          normY * Math.PI * (spec.freq * 1.9) -
            time * (spec.speed * 0.5) +
            index * 1.3,
        ) *
          width *
          spec.amp *
          0.52;
      const centerX =
        diagonal +
        motionShift +
        wobble +
        sphereCurve * width * state.rotation.y * 0.23;
      const widthPulse = 1 + Math.sin(time * 0.5 + normY * 10 + index) * 0.11;
      const sphereCompression = 1 - Math.abs(normY - 0.5) * 0.16;
      const half = bandWidthBase * widthPulse * sphereCompression * 0.5;
      const edgeWave =
        Math.sin(time * 0.82 + normY * 13 + index * 2.2) * width * 0.012;

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
    gradient.addColorStop(0.14, spec.colors[1]);
    gradient.addColorStop(0.42, spec.colors[2]);
    gradient.addColorStop(0.72, spec.colors[3]);
    gradient.addColorStop(1, spec.colors[4]);

    ctx.globalAlpha = spec.alpha;
    ctx.fillStyle = gradient;
    ctx.fillRect(-width * 0.45, -height * 0.4, width * 1.9, height * 1.9);

    ctx.globalCompositeOperation = "screen";
    const sheen = ctx.createLinearGradient(
      width * (0.02 + state.rotation.y * 0.04),
      height * 0.02,
      width * (0.98 + state.rotation.y * 0.045),
      height * 0.98,
    );
    sheen.addColorStop(0, "rgba(255,255,255,0)");
    sheen.addColorStop(0.18, "rgba(255,255,255,0.14)");
    sheen.addColorStop(0.34, "rgba(255,255,255,0.66)");
    sheen.addColorStop(0.48, "rgba(204,226,255,0.34)");
    sheen.addColorStop(0.62, "rgba(255,213,136,0.18)");
    sheen.addColorStop(0.74, "rgba(165,156,255,0.12)");
    sheen.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(-width * 0.25, -height * 0.1, width * 1.6, height * 1.2);

    ctx.globalCompositeOperation = "overlay";
    const tint = ctx.createLinearGradient(0, 0, width, height);
    tint.addColorStop(0, "rgba(125, 176, 255, 0.2)");
    tint.addColorStop(0.34, "rgba(214, 227, 255, 0.12)");
    tint.addColorStop(0.58, "rgba(255, 221, 171, 0.08)");
    tint.addColorStop(0.74, "rgba(144, 150, 255, 0.07)");
    tint.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = tint;
    ctx.fillRect(-width * 0.15, 0, width * 1.3, height);

    ctx.restore();

    ctx.save();
    ctx.strokeStyle = `rgba(255,255,255,${spec.edgeAlpha})`;
    ctx.lineWidth = Math.max(1.3, Math.min(width, height) * 0.0044);
    ctx.beginPath();
    traceEdge(leftPoints);
    ctx.stroke();

    ctx.strokeStyle = `rgba(199,224,255,${spec.edgeAlpha * 0.8})`;
    ctx.beginPath();
    traceEdge(rightPoints);
    ctx.stroke();

    ctx.globalCompositeOperation = "screen";
    ctx.strokeStyle = `rgba(255, 214, 136, ${spec.edgeAlpha * 0.15})`;
    ctx.lineWidth = Math.max(0.8, Math.min(width, height) * 0.002);
    ctx.beginPath();
    traceEdge(leftPoints.filter((_, pointIndex) => pointIndex % 2 === 0));
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
      { y: 0.12, alpha: 0.16, width: 2.1, drift: 0.18 },
      { y: 0.32, alpha: 0.12, width: 1.4, drift: 0.14 },
      { y: 0.52, alpha: 0.24, width: 3.3, drift: 0.22 },
      { y: 0.72, alpha: 0.15, width: 1.8, drift: 0.18 },
      { y: 0.88, alpha: 0.12, width: 1.3, drift: 0.13 },
    ];

    arcs.forEach((arc, index) => {
      ctx.beginPath();
      for (let i = -1; i <= 34; i += 1) {
        const t = i / 34;
        const x = t * width * 1.22 - width * 0.11;
        const y =
          height * arc.y +
          Math.sin(
            t * Math.PI * (2.6 + index * 0.38) + time * (0.34 + index * 0.08),
          ) *
            height *
            0.022 +
          Math.cos(t * Math.PI * 2.2 - state.rotation.y * 0.92 + index) *
            height *
            0.018 +
          state.rotation.x * height * arc.drift;

        if (i === -1) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      const stroke = ctx.createLinearGradient(0, 0, width, 0);
      stroke.addColorStop(0, "rgba(255,255,255,0)");
      stroke.addColorStop(0.16, `rgba(198, 219, 255, ${arc.alpha * 0.8})`);
      stroke.addColorStop(0.42, `rgba(255,255,255,${arc.alpha * 1.9})`);
      stroke.addColorStop(0.62, "rgba(255, 223, 171, 0.09)");
      stroke.addColorStop(0.78, "rgba(154, 150, 255, 0.07)");
      stroke.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = stroke;
      ctx.lineWidth = arc.width;
      ctx.stroke();
    });

    ctx.restore();
  }

  function drawSharpBand(spec, index, width, height, time) {
    const phase = time * (0.28 + index * 0.06);
    const center =
      spec.position + Math.sin(phase + index) * 0.026 + state.rotation.y * 0.1;
    const left = width * (center - spec.width * 0.5);
    const right = width * (center + spec.width * 0.5);

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = spec.alpha;
    ctx.translate(width * 0.03, 0);
    ctx.rotate(
      ((spec.angle + state.rotation.x * 12 + state.rotation.y * 2.6) *
        Math.PI) /
        180,
    );

    const gradient = ctx.createLinearGradient(left, 0, right, 0);
    gradient.addColorStop(0, spec.colors[0]);
    gradient.addColorStop(0.3, spec.colors[1]);
    gradient.addColorStop(0.62, spec.colors[2]);
    gradient.addColorStop(1, spec.colors[3]);
    ctx.fillStyle = gradient;
    ctx.fillRect(
      left,
      -height * 0.28,
      Math.max(16, right - left),
      height * 1.7,
    );
    ctx.restore();
  }

  function drawOrbHighlight(width, height, time) {
    const pointerInfluenceX = state.pointer.x
      ? (state.pointer.x / width - 0.5) * 0.22
      : 0;
    const pointerInfluenceY = state.pointer.y
      ? (state.pointer.y / height - 0.5) * 0.14
      : 0;

    const x =
      width *
      (0.52 +
        state.rotation.y * 0.046 +
        pointerInfluenceX +
        Math.sin(time * 0.22) * 0.022);
    const y =
      height *
      (0.45 +
        state.rotation.x * 0.068 +
        pointerInfluenceY +
        Math.cos(time * 0.18) * 0.024);
    const radius = Math.max(width, height) * 0.68;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    const glow = ctx.createRadialGradient(x, y, radius * 0.025, x, y, radius);
    glow.addColorStop(0, "rgba(255,255,255,0.5)");
    glow.addColorStop(0.06, "rgba(255,255,255,0.24)");
    glow.addColorStop(0.24, "rgba(210,231,255,0.18)");
    glow.addColorStop(0.48, "rgba(255,222,163,0.08)");
    glow.addColorStop(0.62, "rgba(150,149,255,0.05)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);

    const rim = ctx.createLinearGradient(
      width * 0.06,
      height * 0.08,
      width * 0.96,
      height * 0.96,
    );
    rim.addColorStop(0, "rgba(255,255,255,0)");
    rim.addColorStop(0.28, "rgba(255,255,255,0.12)");
    rim.addColorStop(0.48, "rgba(255,255,255,0.24)");
    rim.addColorStop(0.6, "rgba(198,225,255,0.1)");
    rim.addColorStop(0.72, "rgba(255,223,174,0.08)");
    rim.addColorStop(0.82, "rgba(145,149,255,0.06)");
    rim.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = rim;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
  }

  function drawHiddenT(width, height, time) {
    const fontSize = Math.min(width, height) * 0.17;
    const anchorX =
      width * (0.6 + state.rotation.y * 0.16 + Math.sin(time * 0.1) * 0.015);
    const anchorY =
      height * (0.58 + state.rotation.x * 0.18 + Math.cos(time * 0.08) * 0.012);
    const perspectiveScale =
      1 + state.rotation.y * 0.03 - state.rotation.x * 0.016;
    const x = anchorX;
    const y = anchorY;

    if (
      x < -fontSize ||
      x > width + fontSize ||
      y < -fontSize ||
      y > height + fontSize
    ) {
      return;
    }

    const sweep = (Math.sin(time * 0.56 + state.rotation.y * 2.2) + 1) * 0.5;
    const revealBase =
      0.18 +
      Math.min(
        0.18,
        Math.abs(state.rotation.y) * 0.055 + Math.abs(state.rotation.x) * 0.04,
      );
    const reveal = clamp(revealBase + sweep * 0.1, 0.12, 0.34);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(
      ((-11 + state.rotation.y * 4 + state.rotation.x * 3) * Math.PI) / 180,
    );
    ctx.scale(perspectiveScale, 1 - state.rotation.x * 0.03);
    ctx.font = `700 ${fontSize}px "Eurostile", "Bank Gothic", "DIN Alternate", "Arial Narrow", "Helvetica Neue", Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "miter";

    ctx.globalCompositeOperation = "multiply";
    ctx.lineWidth = fontSize * 0.06;
    ctx.strokeStyle = `rgba(0, 0, 0, ${reveal * 0.92})`;
    ctx.strokeText("t", 3, 5);

    ctx.globalCompositeOperation = "screen";
    ctx.strokeStyle = `rgba(255, 255, 255, ${reveal})`;
    ctx.lineWidth = fontSize * 0.032;
    ctx.strokeText("t", -1.5, -1.5);

    const fill = ctx.createLinearGradient(
      -fontSize * 0.34,
      -fontSize * 0.5,
      fontSize * 0.34,
      fontSize * 0.42,
    );
    fill.addColorStop(0, `rgba(244, 248, 255, ${reveal * 0.16})`);
    fill.addColorStop(0.4, `rgba(180, 214, 255, ${reveal * 0.13})`);
    fill.addColorStop(0.72, `rgba(255, 218, 166, ${reveal * 0.11})`);
    fill.addColorStop(1, `rgba(164, 156, 255, ${reveal * 0.08})`);
    ctx.fillStyle = fill;
    ctx.fillText("t", 0, 0);

    const streakWidth = fontSize * 0.18;
    const streakX = -fontSize * 0.3 + sweep * fontSize * 0.62;
    ctx.beginPath();
    ctx.rect(
      -fontSize * 0.46,
      -fontSize * 0.52,
      fontSize * 0.92,
      fontSize * 1.04,
    );
    ctx.clip();
    const streak = ctx.createLinearGradient(
      streakX - streakWidth,
      -fontSize * 0.5,
      streakX + streakWidth,
      fontSize * 0.45,
    );
    streak.addColorStop(0, "rgba(255,255,255,0)");
    streak.addColorStop(0.5, `rgba(255,255,255,${reveal * 0.46})`);
    streak.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = streak;
    ctx.fillRect(
      -fontSize * 0.6,
      -fontSize * 0.6,
      fontSize * 1.2,
      fontSize * 1.2,
    );
    ctx.restore();
  }

  function drawSpecularDust(width, height, time) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    for (let i = 0; i < 26; i += 1) {
      const seed = i * 0.61803398875;
      const x =
        ((seed * width * 1.8 + time * 16 + i * 47) % (width + 150)) - 75;
      const y =
        ((seed * height * 2.4 + time * 10 + i * 67) % (height + 190)) - 95;
      const radius = 0.7 + (i % 4) * 0.46;
      ctx.fillStyle = `rgba(255,255,255,${0.04 + (i % 5) * 0.013})`;
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
