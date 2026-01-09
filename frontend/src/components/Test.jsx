import React, { useEffect, useMemo, useRef, useState } from "react";

// Gemini paths and colors (from your SVG)
const GEMINI_PATHS = [
  {
    color: "#f0e676",
    d: "M-152 663C145.5 663 191 666.265 269 647C326.5 630 339.5 621 397.5 566C439 531.5 455 529.5 490 523C509.664 519.348 521 503.736 538 504.236C553.591 504.236 562.429 514.739 584.66 522.749C592.042 525.408 600.2 526.237 607.356 523.019C624.755 515.195 641.446 496.324 657 496.735C673.408 496.735 693.545 519.572 712.903 526.769C718.727 528.934 725.184 528.395 730.902 525.965C751.726 517.115 764.085 497.106 782 496.735C794.831 496.47 804.103 508.859 822.469 518.515C835.13 525.171 850.214 526.815 862.827 520.069C875.952 513.049 889.748 502.706 903.5 503.736C922.677 505.171 935.293 510.562 945.817 515.673C954.234 519.76 963.095 522.792 972.199 524.954C996.012 530.611 1007.42 534.118 1034 549C1077.5 573.359 1082.5 594.5 1140 629C1206 670 1328.5 662.5 1588 662.5",
  },
  {
    color: "#f3dfff",
    d: "M-152 587.5C147 587.5 277 587.5 310 573.5C348 563 392.5 543.5 408 535C434 523.5 426 526.235 479 515.235C494 512.729 523 510.435 534.5 512.735C554.5 516.735 555.5 523.235 576 523.735C592 523.735 616 496.735 633 497.235C648.671 497.235 661.31 515.052 684.774 524.942C692.004 527.989 700.2 528.738 707.349 525.505C724.886 517.575 741.932 498.33 757.5 498.742C773.864 498.742 791.711 520.623 810.403 527.654C816.218 529.841 822.661 529.246 828.451 526.991C849.246 518.893 861.599 502.112 879.5 501.742C886.47 501.597 896.865 506.047 907.429 510.911C930.879 521.707 957.139 519.639 982.951 520.063C1020.91 520.686 1037.5 530.797 1056.5 537C1102.24 556.627 1116.5 570.704 1180.5 579.235C1257.5 589.5 1279 587 1588 588",
  },
  {
    color: "#aacfff",
    d: "M-152 514C147.5 514.333 294.5 513.735 380.5 513.735C405.976 514.94 422.849 515.228 436.37 515.123C477.503 514.803 518.631 506.605 559.508 511.197C564.04 511.706 569.162 512.524 575 513.735C588 516.433 616 521.702 627.5 519.402C647.5 515.402 659 499.235 680.5 499.235C700.5 499.235 725 529.235 742 528.735C757.654 528.735 768.77 510.583 791.793 500.59C798.991 497.465 807.16 496.777 814.423 499.745C832.335 507.064 850.418 524.648 866 524.235C882.791 524.235 902.316 509.786 921.814 505.392C926.856 504.255 932.097 504.674 937.176 505.631C966.993 511.248 970.679 514.346 989.5 514.735C1006.3 515.083 1036.5 513.235 1055.5 513.235C1114.5 513.235 1090.5 513.235 1124 513.235C1177.5 513.235 1178.99 514.402 1241 514.402C1317.5 514.402 1274.5 512.568 1588 513.235",
  },
  {
    color: "#f0bfd4",
    d: "M-152 438.5C150.5 438.5 261 438.318 323.5 456.5C351 464.5 387.517 484.001 423.5 494.5C447.371 501.465 472 503.735 487 507.735C503.786 512.212 504.5 516.808 523 518.735C547 521.235 564.814 501.235 584.5 501.235C604.5 501.235 626 529.069 643 528.569C658.676 528.569 672.076 511.63 695.751 501.972C703.017 499.008 711.231 498.208 718.298 501.617C735.448 509.889 751.454 529.98 767 529.569C783.364 529.569 801.211 507.687 819.903 500.657C825.718 498.469 832.141 499.104 837.992 501.194C859.178 508.764 873.089 523.365 891 523.735C907.8 524.083 923 504.235 963 506.735C1034.5 506.735 1047.5 492.68 1071 481.5C1122.5 457 1142.23 452.871 1185 446.5C1255.5 436 1294 439 1588 439",
  },
  {
    color: "#f0a8f2",
    d: "M-152 364C145.288 362.349 195 361.5 265.5 378C322 391.223 399.182 457.5 411 467.5C424.176 478.649 456.916 491.677 496.259 502.699C498.746 503.396 501.16 504.304 503.511 505.374C517.104 511.558 541.149 520.911 551.5 521.236C571.5 521.236 590 498.736 611.5 498.736C631.5 498.736 652.5 529.236 669.5 528.736C685.171 528.736 697.81 510.924 721.274 501.036C728.505 497.988 736.716 497.231 743.812 500.579C761.362 508.857 778.421 529.148 794 528.736C810.375 528.736 829.35 508.68 848.364 502.179C854.243 500.169 860.624 500.802 866.535 502.718C886.961 509.338 898.141 519.866 916 520.236C932.8 520.583 934.5 510.236 967.5 501.736C1011.5 491 1007.5 493.5 1029.5 480C1069.5 453.5 1072 440.442 1128.5 403.5C1180.5 369.5 1275 360.374 1588 364",
  },
];

// ViewBox from your SVG
const VB = { x: -152, y: 360, w: 1740, h: 340 };

function rgbaWithAlpha(rgbaString, aMul) {
  if (rgbaString.startsWith("#")) {
    const s = rgbaString.slice(1);
    const full =
      s.length === 3
        ? s
            .split("")
            .map((c) => c + c)
            .join("")
        : s;
    const n = parseInt(full, 16);
    const r = (n >> 16) & 255,
      g = (n >> 8) & 255,
      b = n & 255;
    return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, aMul))})`;
  }
  const m = rgbaString.match(/^rgba?\(([^)]+)\)/);

  if (!m) return rgbaString;
  const parts = m[1].split(",").map((s) => s.trim());
  const r = +parts[0],
    g = +parts[1],
    b = +parts[2];
  const a = parts[3] != null ? Math.max(0, Math.min(1, +parts[3])) : 1;
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a * aMul))})`;
}

const HeroFXCanvas = React.memo(function HeroFXCanvas({
  playing = true,
  reducedMotion = false,
  gridCellSize = 60,
  gridLineColor = "rgba(0,255,65,0.12)",
  rippleColor = "rgba(255,255,255,0.1)",
  rippleSpeed = 520,
  ringWidth = 6,
  edgeFade = 0.05,
  maxRipples = 1,
  interactive = true,
  gridTopRatio = 0.67,
  gridFadePx = 80,
  backgroundWaves = true,
  bgGlow = {
    alpha: 0.08, // overall opacity of underlay
    width: 6, // base stroke width
    blur: 0, // base shadowBlur
    rings: [0.8, 0.9, 0.8], // multiples to layer fatter/softer glow
    blend: "screen", // "lighter" or "screen"
  }, // grid only on top 67%

  // Waves
  pathLengths = [1, 1, 1, 1, 1], // external control; use numbers 0..1
  lineWidth = 2,
  glow = { enabled: true, blur: 2, alpha: 0.1, width: 8 }, // glow pass
  bottomOffset = -20,

  // Layout
  className = "",
  style = {},
}) {
  const ref = useRef(null);
  const rafRef = useRef(0);

  const st = useRef({
    w: 0,
    h: 0,
    dpr: 1,
    pattern: null,
    gridW: 0,
    gridH: 0,
    ripples: [],
    mouseX: -1,
    mouseY: -1,
    // waves
    wavePaths: [], // { p2d, len, color }
    wavesUnderlayCanvas: null, // offscreen canvas
    wavesUnderlayRect: { left: 0, top: 0, width: 0, height: 0 },
  });

  // Build grid pattern
  const buildGridPattern = (ctx, size, color) => {
    const p = document.createElement("canvas");
    p.width = size;
    p.height = size;
    const g = p.getContext("2d");
    g.clearRect(0, 0, size, size);
    g.strokeStyle = color;
    g.lineWidth = 1;
    // vertical
    g.beginPath();
    g.moveTo(0.5, 0);
    g.lineTo(0.5, size);
    g.stroke();
    // horizontal
    g.beginPath();
    g.moveTo(0, 0.5);
    g.lineTo(size, 0.5);
    g.stroke();
    return ctx.createPattern(p, "repeat");
  };

  // Prebuild Path2D and measure length via temporary SVG path

  const progressRef = useRef([1, 1, 1, 1, 1]); // latest pathLength numbers
  const glowRef = useRef({ alpha: 0.5, width: 8, blur: 8, pulse: 1 });

  // Subscribe to MotionValues (or numbers) once, no re-render on every tick
  useEffect(() => {
    const unsubs = [];

    // pathLengths can be numbers or MotionValues
    if (Array.isArray(pathLengths)) {
      pathLengths.forEach((v, i) => {
        if (typeof v === "number") {
          progressRef.current[i] = v;
        } else if (v && typeof v.on === "function") {
          progressRef.current[i] = v.get ? v.get() : 0;
          unsubs.push(v.on("change", (val) => (progressRef.current[i] = val)));
        }
      });
    }

    // glow.alpha | glow.width | glow.blur | glow.pulse can be numbers or MotionValues
    const keys = ["alpha", "width", "blur", "pulse"];
    keys.forEach((k) => {
      const mv = glow?.[k];
      if (typeof mv === "number") {
        glowRef.current[k] = mv;
      } else if (mv && typeof mv.on === "function") {
        glowRef.current[k] = mv.get ? mv.get() : glowRef.current[k];
        unsubs.push(mv.on("change", (val) => (glowRef.current[k] = val)));
      }
    });

    return () => unsubs.forEach((u) => u && u());
  }, [pathLengths, glow?.alpha, glow?.width, glow?.blur, glow?.pulse]);

  const runningRef = useRef(false);
  const maskRef = useRef({ w: 0, h: 0, canvas: null });
  useEffect(() => {
    const c = ref.current;
    if (!c) return;

    const ctx = c.getContext("2d", { alpha: true, desynchronized: true });
    const getDpr = () =>
      Math.min(
        document.visibilityState === "visible" ? 2 : 1,
        window.devicePixelRatio || 1
      );

    const S = st.current;
    runningRef.current = playing;
    rafRef.current = 0;

    function buildWavePaths() {
      const out = [];
      for (const it of GEMINI_PATHS) {
        const p2d = new Path2D(it.d);
        const svgPath = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );
        svgPath.setAttribute("d", it.d);
        const len = svgPath.getTotalLength ? svgPath.getTotalLength() : 0;
        out.push({ p2d, len, color: it.color, svgPath });
      }
      S.wavePaths = out;
    }

    function resize() {
      const dpr = getDpr();
      const w = Math.floor(c.clientWidth);
      const h = Math.floor(c.clientHeight);
      c.width = Math.floor(w * dpr);
      c.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      S.w = w;
      S.h = h;
      S.dpr = dpr;
      S.pattern = buildGridPattern(ctx, gridCellSize, gridLineColor);
      S.gridW = Math.ceil(w / gridCellSize);
      S.gridH = Math.ceil((h * gridTopRatio) / gridCellSize);

      if (S.wavePaths.length) buildWavesUnderlay();
    }

    // Mouse
    let mmId = 0;
    const onMouseMove = (e) => {
      if (mmId) return;
      mmId = requestAnimationFrame(() => {
        mmId = 0;
        const r = c.getBoundingClientRect();
        st.current.mouseX = e.clientX - r.left;
        st.current.mouseY = e.clientY - r.top;
      });
    };
    const onMouseLeave = () => {
      st.current.mouseX = -1;
      st.current.mouseY = -1;
    };
    const onPointerDown = (e) => {
      if (!interactive) return;
      const r = c.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      spawnRipple(x, y);
    };

    function spawnRipple(x, y) {
      const cell = gridCellSize;
      const cx = Math.floor(x / cell) * cell + cell / 2;
      const cy = Math.floor(y / cell) * cell + cell / 2;
      const now = performance.now() / 1000;
      st.current.ripples.push({ x: cx, y: cy, t: now });
      if (st.current.ripples.length > maxRipples) st.current.ripples.shift();
    }

    function ensureFadeMask() {
      const S = st.current;
      const mr = maskRef.current;
      if (mr.canvas && mr.w === S.w && mr.h === S.h) return mr.canvas;

      const m = document.createElement("canvas");
      m.width = Math.floor(S.w * S.dpr);
      m.height = Math.floor(S.h * S.dpr);
      const g = m.getContext("2d", { alpha: true });
      g.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);

      const fadeX = Math.max(1, Math.round(S.w * 0.04));
      const fadeY = Math.max(1, Math.round(S.h * 0.12));

      // Start full alpha
      g.fillStyle = "rgba(0,0,0,1)";
      g.fillRect(0, 0, S.w, S.h);

      g.globalCompositeOperation = "destination-in";

      // Horizontal mask
      const gx = g.createLinearGradient(0, 0, S.w, 0);
      gx.addColorStop(0, "rgba(0,0,0,0)");
      gx.addColorStop(fadeX / S.w, "rgba(0,0,0,1)");
      gx.addColorStop(1 - fadeX / S.w, "rgba(0,0,0,1)");
      gx.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gx;
      g.fillRect(0, 0, S.w, S.h);

      // Vertical mask
      const gy = g.createLinearGradient(0, 0, 0, S.h);
      gy.addColorStop(0, "rgba(0,0,0,0)");
      gy.addColorStop(fadeY / S.h, "rgba(0,0,0,1)");
      gy.addColorStop(1 - fadeY / (50 * S.h), "rgba(0,0,0,1)");
      gy.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gy;
      g.fillRect(0, 0, S.w, S.h);

      maskRef.current = { w: S.w, h: S.h, canvas: m };
      return m;
    }

    function drawGrid() {
      const S = st.current;
      const gh = Math.floor(S.h * gridTopRatio); // grid height (top band)
      ctx.save();
      // Draw only inside the grid band
      ctx.beginPath();
      ctx.rect(0, 0, S.w, gh);
      ctx.clip();

      // 1) Draw the grid pattern normally
      if (S.pattern) {
        ctx.fillStyle = S.pattern;
        ctx.fillRect(0, 0, S.w, gh);
      }

      const vb = VB;
      const scale = S.w / vb.w;
      const targetH = vb.h * scale;
      const wavesTop = S.h - targetH + (-bottomOffset || 0); // stick to your sign usage

      if (wavesTop < gh) {
        // Fade from [start -> gh], where start sits gridFadePx above wavesTop
        const startY = Math.max(0, Math.min(gh, wavesTop - (gridFadePx || 0)));
        ctx.save();
        ctx.globalCompositeOperation = "destination-in";
        const gY = ctx.createLinearGradient(0, 0, 0, gh);
        // Keep full grid up to startY
        gY.addColorStop(0, "rgba(0,0,0,1)");
        gY.addColorStop(startY / gh, "rgba(0,0,0,1)");
        // Fade to transparent by the bottom of the grid band
        gY.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gY;
        ctx.fillRect(0, 0, S.w, gh);
        ctx.restore();
      }

      ctx.restore();
    }

    function drawRipples() {
      const S = st.current;
      const t = performance.now() / 1000;
      if (!S.ripples.length) return; // ← skip entire pass when idle

      const gh = Math.floor(S.h * gridTopRatio);
      const cell = gridCellSize;

      // Optional: drop old ripples (lifetime ~2s)
      S.ripples = S.ripples.filter((rp) => t - rp.t < 2.2);
      if (!S.ripples.length) return;

      for (let gy = 0; gy < S.gridH; gy++) {
        for (let gx = 0; gx < S.gridW; gx++) {
          const cx = gx * cell + cell / 2;
          const cy = gy * cell + cell / 2;

          let a = 0;
          for (let r = 0; r < S.ripples.length; r++) {
            const rp = S.ripples[r];
            const age = t - rp.t;
            const radius = age * rippleSpeed;
            const dist = Math.hypot(cx - rp.x, cy - rp.y);
            const d = Math.abs(dist - radius);
            if (d < ringWidth) {
              const ageFade = Math.max(0, 1 - age / 2.0);
              const local = 1 - d / ringWidth;
              a = Math.max(a, local * ageFade);
              if (a > 0.99) break;
            }
          }

          if (a > 0.01) {
            const s = Math.max(1, cell - 2);
            const x = gx * cell + (cell - s) / 2;
            const y = gy * cell + (cell - s) / 2;
            ctx.fillStyle = rgbaWithAlpha(rippleColor, a);
            ctx.fillRect(x, y, s, s);
          }
        }
      }
    }

    function drawHoverHighlight() {
      const S = st.current;
      if (S.mouseX < 0 || S.mouseY < 0) return;
      const cell = gridCellSize;
      const gx = Math.floor(S.mouseX / cell);
      const gy = Math.floor(S.mouseY / cell);
      const s = cell;
      const x = gx * cell + (cell - s) / 2;
      const y = gy * cell + (cell - s) / 2;
      // only if in top area
      if (y + s > S.h * gridTopRatio) return;
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      ctx.shadowBlur = 10;
      ctx.fillRect(x, y, s, s);
      ctx.shadowBlur = 0;
    }

    function drawWaves() {
      const S = st.current;
      const vb = VB;

      // Fit by width, stick to bottom
      const scale = S.w / vb.w;
      const targetH = vb.h * scale;
      const left = 0;
      const top = S.h - targetH + (-bottomOffset || 0);

      ctx.save();
      ctx.translate(left, top);
      ctx.scale(scale, scale);
      ctx.translate(-vb.x, -vb.y);

      const t = performance.now() / 1000;
      for (let i = 0; i < S.wavePaths.length; i++) {
        const { p2d, len, color } = S.wavePaths[i];
        const prog = Math.max(0, Math.min(1, progressRef.current[i] ?? 1));
        const dash = len * prog;

        // Optional gentle pulse to the glow width (looks like energy flowing)
        const pulse =
          1 + 0.15 * Math.sin(t * 3 + i * 0.4) * (glowRef.current.pulse ?? 1);

        // Glow pass
        if (glow?.enabled !== false) {
          ctx.save();
          ctx.strokeStyle = color;
          ctx.globalAlpha = glowRef.current.alpha ?? 0.4;
          ctx.lineWidth = (glowRef.current.width ?? 10) * pulse;
          ctx.lineJoin = "round";
          ctx.lineCap = "round";
          ctx.shadowBlur = glowRef.current.blur ?? 10;
          ctx.shadowColor = color;
          ctx.setLineDash([dash, 1e7]);
          ctx.lineDashOffset = 0;
          ctx.stroke(p2d);
          ctx.restore();
        }

        // Crisp pass
        ctx.save();
        ctx.strokeStyle = color;
        ctx.globalAlpha = 1;
        ctx.lineWidth = lineWidth;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.setLineDash([dash, 1e7]);
        ctx.lineDashOffset = 0;
        ctx.stroke(p2d);
        ctx.restore();

        // Optional head highlight (bright dot at the path end)
        // Uncomment if you want a stronger “head” glow:
        const showHead = prog > 0.01 && prog < 0.99;
        if (!reducedMotion && showHead && S.wavePaths[i].svgPath) {
          const pos = S.wavePaths[i].svgPath.getPointAtLength(dash);
          ctx.save();
          const r = (glowRef.current.width ?? 10) * 0.5;
          const g = ctx.createRadialGradient(
            pos.x,
            pos.y,
            0,
            pos.x,
            pos.y,
            r * 3
          );
          g.addColorStop(0, `${color}`);
          g.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = g;
          ctx.globalAlpha = (glowRef.current.alpha ?? 0.4) * 0.8;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, r * 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      ctx.restore();
    }

    function buildWavesUnderlay() {
      const S = st.current;
      if (!backgroundWaves) {
        S.wavesUnderlayCanvas = null;
        return;
      }

      const vb = VB;
      const targetW = Math.ceil(S.w);
      const scale = S.w / vb.w;
      const targetH = Math.ceil(vb.h * scale);
      const left = 0;
      const top = S.h - targetH + (-bottomOffset || 0);

      // Create an offscreen canvas in device pixels
      const off = document.createElement("canvas");
      off.width = Math.max(1, Math.floor(targetW * S.dpr));
      off.height = Math.max(1, Math.floor(targetH * S.dpr));
      const g = off.getContext("2d", { alpha: true });

      // Work in CSS px on the offscreen
      g.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);

      // Map viewBox -> offscreen rect
      g.translate(0, 0);
      g.scale(targetW / vb.w, targetH / vb.h);
      g.translate(-vb.x, -vb.y);

      // Blend mode for a nice luminous stack
      g.globalCompositeOperation = bgGlow?.blend || "lighter";

      const rings =
        bgGlow?.rings && bgGlow.rings.length ? bgGlow.rings : [1.8, 1.25, 0.8];

      for (const { p2d, color } of S.wavePaths) {
        for (let ri = 0; ri < rings.length; ri++) {
          const mul = rings[ri];
          g.save();
          g.strokeStyle = color;
          g.globalAlpha = (bgGlow?.alpha ?? 0.16) * (ri === 0 ? 1 : 0.8);
          g.lineWidth = (bgGlow?.width ?? 16) * mul;
          g.lineJoin = "round";
          g.lineCap = "round";
          g.shadowBlur = (bgGlow?.blur ?? 16) * mul;
          g.shadowColor = color;
          g.setLineDash([]); // full length
          g.stroke(p2d);
          g.restore();
        }
      }

      S.wavesUnderlayCanvas = off;
      S.wavesUnderlayRect = { left, top, width: targetW, height: targetH };
    }

    function start() {
      if (!runningRef.current || rafRef.current) return;
      rafRef.current = requestAnimationFrame(frame);
    }
    function stop() {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    }

    function init() {
      resize();
      buildWavePaths();
      buildWavesUnderlay();
      start();
    }

    function frame() {
      if (!runningRef.current) return;
      const S = st.current;
      ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
      ctx.clearRect(0, 0, S.w, S.h);

      drawGrid();
      drawRipples();
      drawHoverHighlight();
      if (S.wavesUnderlayCanvas) {
        const r = S.wavesUnderlayRect;
        ctx.drawImage(S.wavesUnderlayCanvas, r.left, r.top, r.width, r.height);
      }
      drawWaves();

      if (edgeFade > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "destination-in";
        ctx.drawImage(ensureFadeMask(), 0, 0);
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(frame);
    }

    init();

    window.addEventListener("resize", resize, { passive: true });
    if (playing && interactive) {
      c.addEventListener("mousemove", onMouseMove, { passive: true });
      c.addEventListener("mouseleave", onMouseLeave, { passive: true });
      c.addEventListener("pointerdown", onPointerDown, { passive: true });
    }

    const onVis = () => {
      if (document.visibilityState !== "visible") {
        runningRef.current = false;
        stop();
      } else {
        runningRef.current = playing;
        resize(); // rebuild at current DPR
        buildWavesUnderlay();
        start();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
        if(mmId) {
          cancelAnimationFrame(mmId);
          mmId = 0;
        }
      runningRef.current = false;
      stop();
      window.removeEventListener("resize", resize);
      c.removeEventListener("mousemove", onMouseMove);
      c.removeEventListener("mouseleave", onMouseLeave);
      c.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [
    playing,
    interactive,
    gridCellSize,
    gridLineColor,
    rippleColor,
    rippleSpeed,
    ringWidth,
    edgeFade,
    maxRipples,
    gridTopRatio,
    gridFadePx,
    backgroundWaves,
    bgGlow?.alpha,
    bgGlow?.width,
    bgGlow?.blur,
    bgGlow?.blend,
    Array.isArray(bgGlow?.rings) ? bgGlow.rings.join(",") : "",
    lineWidth,
    glow?.enabled,
    glow?.alpha,
    glow?.width,
    glow?.blur,
    pathLengths?.join("|"),
    bottomOffset,
  ]);

  return (
    <div
      className={["relative w-full h-full", className].join(" ")}
      style={style}
    >
      <canvas
        ref={ref}
        className="w-full h-full block"
        style={{
          // If you want the old soft-light feel, you can put the whole canvas on mix-blend-mode: 'soft-light'
          // but that will also affect the waves. Better: keep a darker bg and tune alphas.
          pointerEvents: "auto",
        }}
      />
    </div>
  );
});

export default HeroFXCanvas;
