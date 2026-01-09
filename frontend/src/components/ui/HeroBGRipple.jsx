"use client";
import { m } from "framer-motion";
import React, { useEffect, useRef } from "react";

/**
 * BackgroundRippleEffect
 * - Square grid canvas with ripple-on-click waves traveling through cells
 * - Fades at edges
 * - Layer beneath Gemini BG so grid shows only where Gemini isn't drawn
 *
 * Props:
 *  - cellSize: px size for square cells (default 28)
 *  - lineColor: grid line color (rgba string)
 *  - baseAlpha: base grid opacity (0..1) for the static grid (default 1 via lineColor alpha)
 *  - rippleColor: rgba string for ripple highlight (e.g., "rgba(0,255,65,0.9)")
 *  - speed: ripple speed px/s (default 520)
 *  - ringWidth: ring thickness in px (default 36)
 *  - edgeFade: 0..1 radial fade radius (fraction of min(width,height)/2) (default 0.72)
 *  - maxRipples: cap number of concurrent ripples for perf (default 5)
 *  - interactive: if true, listens to window clicks to spawn ripples (default true)
 *  - className, style: apply to outer container
 */
export function BackgroundRippleEffect({
  cellSize = 60,
  lineColor = "rgba(0,255,65,0.12)",
  rippleColor = "rgba(255,255,255,0.1)",
  speed = 520,
  ringWidth = 6,
  edgeFade = 0.05,
  maxRipples = 1,
  interactive = true,
  className = "",
  style = {},
}) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const stateRef = useRef({
    ripples: [],
    w: 0,
    h: 0,
    dpr: 1,
    pattern: null,
    gridW: 0,
    gridH: 0,
    mouseX: -1,
    mouseY: -1,
  });

  // Build offscreen pattern for the square grid
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
    // DPR setup
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      const w = Math.floor(canvas.clientWidth);
      const h = Math.floor(canvas.clientHeight);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stateRef.current.w = w;
      stateRef.current.h = h;
      stateRef.current.dpr = dpr;
      // Update pattern on resize
      stateRef.current.pattern = buildGridPattern(ctx, cellSize, lineColor);
      stateRef.current.gridW = Math.ceil(w / cellSize);
      stateRef.current.gridH = Math.ceil(h / cellSize);
    };

    const onResize = () => resize();
    resize();
    window.addEventListener("resize", onResize, { passive: true });

    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      stateRef.current.mouseX = e.clientX - rect.left;
      stateRef.current.mouseY = e.clientY - rect.top;
    };
    
    const onMouseLeave = () => {
      stateRef.current.mouseX = -1;
      stateRef.current.mouseY = -1;
    };

    // Attach listeners to the canvas
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mouseleave", onMouseLeave, { passive: true });

    const now = () => performance.now() / 1000;
    let last = now();

    // Pointer handler (global so it doesn't block other UI)
    const onPointer = (e) => {
      if (!interactive) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      spawnRipple(x, y);
    };
    if (interactive)
      window.addEventListener("pointerdown", onPointer, { passive: true });

    function spawnRipple(x, y) {
      const st = stateRef.current;
      // snap to cell center for that "grid" feel
      const cx = Math.floor(x / cellSize) * cellSize + cellSize / 2;
      const cy = Math.floor(y / cellSize) * cellSize + cellSize / 2;
      st.ripples.push({ x: cx, y: cy, t: now() });
      if (st.ripples.length > maxRipples) st.ripples.shift();
    }

    function drawGrid() {
      const st = stateRef.current;
      if (!st.pattern) return;
      ctx.fillStyle = st.pattern;
      ctx.fillRect(0, 0, st.w, st.h);
    }

    function drawRipples(dt) {
      const st = stateRef.current;
      const time = now();

      // For each grid cell, check if it's within the ring of any ripple
      // Optimize by computing bounds per ripple
      for (let gy = 0; gy < st.gridH; gy++) {
        for (let gx = 0; gx < st.gridW; gx++) {
          const cx = gx * cellSize + cellSize / 2;
          const cy = gy * cellSize + cellSize / 2;

          let a = 0; // accumulated alpha for this cell
          for (let r = 0; r < st.ripples.length; r++) {
            const rp = st.ripples[r];
            const age = time - rp.t;
            if (age < 0) continue;
            const radius = age * speed;
            const dist = Math.hypot(cx - rp.x, cy - rp.y);

            // ring falloff (peak at radius, fades within ringWidth)
            const d = Math.abs(dist - radius);
            if (d < ringWidth) {
              // also fade with age so old rings disappear
              const ageFade = Math.max(0, 1 - age / 2.0); // 2s lifetime shaping
              const local = 1 - d / ringWidth; // 0..1
              a = Math.max(a, local * ageFade);
            }
          }

          if (a > 0.01) {
            // draw filled square highlight for this cell
            const s = Math.max(1, cellSize - 2); // no overlap with grid lines
            const x = gx * cellSize + (cellSize - s) / 2;
            const y = gy * cellSize + (cellSize - s) / 2;
            ctx.fillStyle = rgbaWithAlpha(rippleColor, a);
            ctx.fillRect(x, y, s, s);
          }
        }
      }
    }

    function applyEdgeFade() {
      const st = stateRef.current;
      const { w, h } = st;
      if (!w || !h) return;

      // how much to fade from each side (in px)
      const fadeX = Math.max(1, Math.round(w * 0.12)); // 12% of width
      const fadeY = Math.max(1, Math.round(h * 0.18)); // 18% of height (stronger bottom/top)

      ctx.save();
      ctx.globalCompositeOperation = "destination-in";

      // Horizontal (left/right) fade
      const gX = ctx.createLinearGradient(0, 0, w, 0);
      gX.addColorStop(0, "rgba(0,0,0,0)");
      gX.addColorStop(fadeX / w, "rgba(0,0,0,1)");
      gX.addColorStop(1 - fadeX / w, "rgba(0,0,0,1)");
      gX.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gX;
      ctx.fillRect(0, 0, w, h);

      // Vertical (top/bottom) fade
      const gY = ctx.createLinearGradient(0, 0, 0, h);
      gY.addColorStop(0, "rgba(0,0,0,0)");
      gY.addColorStop(fadeY / h, "rgba(0,0,0,1)");
      gY.addColorStop(1 - fadeY / h, "rgba(0,0,0,1)");
      gY.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gY;
      ctx.fillRect(0, 0, w, h);

      ctx.restore();
    }

    function drawHoverHighlight() {
      const st = stateRef.current;
      if (st.mouseX < 0 || st.mouseY < 0) return; // Don't draw if mouse is outside

      // Find which grid cell the mouse is in
      const gx = Math.floor(st.mouseX / cellSize);
      const gy = Math.floor(st.mouseY / cellSize);

      // Calculate the position and size of the highlight
      const s = cellSize; // Slightly smaller than the cell
      const x = gx * cellSize + (cellSize - s) / 2;
      const y = gy * cellSize + (cellSize - s) / 2;
      
      // Draw the highlight with a subtle glow
      ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
      ctx.shadowBlur = 10;
      ctx.duration
      ctx.fillRect(x, y, s, s);
      
      // Reset shadow for other drawing operations
      ctx.shadowBlur = 0;
    }


    function frame() {
      const t = now();
      let dt = t - last;
      last = t;
      if (dt > 0.05) dt = 0.05;

      // Clear
      ctx.clearRect(0, 0, stateRef.current.w, stateRef.current.h);

      // Draw static grid
      drawGrid();

      // Draw ripple highlights
      drawRipples(dt);

      // Edge fade
      if (edgeFade > 0) applyEdgeFade();

      drawHoverHighlight();

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      if (interactive) window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [
    cellSize,
    lineColor,
    rippleColor,
    speed,
    ringWidth,
    edgeFade,
    maxRipples,
    interactive,
  ]);

  return (
    <div
      className={[
        "pointer-events-auto top-0 left-0 w-full h-[67%]",
        className,
      ].join(" ")}
      style={{
        ...style,
        mixBlendMode: "soft-light",
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{
          // Let us still listen globally to window clicks without blocking UI
          pointerEvents: "auto",
        }}
      />
    </div>
  );
}

// Helpers
function rgbaWithAlpha(rgbaString, aMul) {
  // accepts "rgba(r,g,b,a)" or "rgb(r,g,b)" or "#hex" -> returns an rgba with multiplied alpha
  if (rgbaString.startsWith("#")) {
    const [r, g, b] = hexToRgb(rgbaString);
    return `rgba(${r},${g},${b},${aMul})`;
  }
  const m = rgbaString.match(
    /rgba?KATEX_INLINE_OPEN([^)]+)KATEX_INLINE_CLOSE/i
  );
  if (!m) return rgbaString;
  const parts = m[1].split(",").map((s) => s.trim());
  const r = +parts[0],
    g = +parts[1],
    b = +parts[2];
  const a = parts[3] != null ? Math.max(0, Math.min(1, +parts[3])) : 1;
  const outA = Math.max(0, Math.min(1, a * aMul));
  return `rgba(${r},${g},${b},${outA})`;
}
function hexToRgb(hex) {
  const s = hex.replace("#", "");
  const v =
    s.length === 3
      ? s
          .split("")
          .map((c) => c + c)
          .join("")
      : s;
  const n = parseInt(v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
