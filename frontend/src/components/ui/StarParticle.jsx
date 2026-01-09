// src/components/ui/StarParticle.jsx
import React, { useEffect, useRef } from "react";

/**
 * StarParticle
 * - Single RAF that persists across prop updates.
 * - Props are mirrored to refs so draw loop reads latest values.
 *
 * Props:
 * - size (number): base core size px (default 18)
 * - color (string): hex color (default "#bfffb8")
 * - phase (number): twinkle phase offset (default 0)
 * - twinkle (bool): enable twinkle (default true)
 * - twinkleSpeed (number): speed multiplier (default 0.9)
 * - twinkleAmount (number): amplitude (default 0.28)
 * - speckleCount (number): default 12
 * - spikeCount (number): default 4
 * - corona (number): corona thickness factor (default 0.14)
 * - haloRatio (number): halo diameter relative to size (default 2.0)
 * - seed (number): optional deterministic seed (default random)
 */
function hexToRgb(hex) {
  if (!hex) return [255, 255, 255];
  const s = hex.replace("#", "");
  if (s.length === 3) {
    return [parseInt(s[0] + s[0], 16), parseInt(s[1] + s[1], 16), parseInt(s[2] + s[2], 16)];
  }
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

function seededRng(seed) {
  // simple mulberry32
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function makeSpeckles(seed, count, haloR, center) {
  const rng = seededRng(seed >>> 0);
  const out = [];
  for (let i = 0; i < count; i++) {
    const a = rng() * Math.PI * 2;
    const r = (0.35 + rng() * 0.65) * haloR;
    out.push({
      x: center + Math.cos(a) * r,
      y: center + Math.sin(a) * r,
      s: 0.4 + rng() * 1.8,
      a: 0.06 + rng() * 0.22,
    });
  }
  return out;
}

function StarParticle(props) {
  const {
    size = 18,
    color = "#bfffb8",
    phase = 0,
    twinkle = true,
    twinkleSpeed = 0.9,
    twinkleAmount = 0.28,
    speckleCount = 12,
    spikeCount = 4,
    corona = 0.14,
    haloRatio = 2.0,
    style = {},
    className = "",
    seed = Math.floor(Math.random() * 1e9),
  } = props;

  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const paramsRef = useRef({
    size,
    color,
    phase,
    twinkle,
    twinkleSpeed,
    twinkleAmount,
    spikeCount,
    corona,
    haloRatio,
  });
  const specklesRef = useRef([]);
  const mountedRef = useRef(false);

  // update params ref on prop changes (cheap)
  useEffect(() => {
    paramsRef.current.size = size;
    paramsRef.current.color = color;
    paramsRef.current.phase = phase;
    paramsRef.current.twinkle = twinkle;
    paramsRef.current.twinkleSpeed = twinkleSpeed;
    paramsRef.current.twinkleAmount = twinkleAmount;
    paramsRef.current.spikeCount = spikeCount;
    paramsRef.current.corona = corona;
    paramsRef.current.haloRatio = haloRatio;
  }, [size, color, phase, twinkle, twinkleSpeed, twinkleAmount, spikeCount, corona, haloRatio]);

  // compute speckles once (deterministic via seed)
  useEffect(() => {
    const cssSize = Math.max(4, size);
    const haloDiameter = Math.ceil(cssSize * haloRatio);
    const padding = Math.ceil(Math.max(12, cssSize * 0.8));
    const full = haloDiameter + padding;
    const center = full / 2;
    const haloR = haloDiameter / 2;
    specklesRef.current = makeSpeckles(seed, speckleCount, haloR, center);
  }, [speckleCount, size, haloRatio, seed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let ctx = canvas.getContext("2d", { alpha: true });
    const dpr = window.devicePixelRatio || 1;
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function resizeCanvasIfNeeded() {
      const p = paramsRef.current;
      const cssSize = Math.max(4, p.size);
      const haloDiameter = Math.ceil(cssSize * (p.haloRatio || 2.0));
      const padding = Math.ceil(Math.max(12, cssSize * 0.8));
      const fullCss = haloDiameter + padding;
      // update CSS and backing pixel buffer only when needed (or first mount)
      const needWidth = Math.ceil(fullCss * dpr);
      const needHeight = Math.ceil(fullCss * dpr);
      if (canvas.width !== needWidth || canvas.height !== needHeight || !mountedRef.current) {
        canvas.style.width = `${fullCss}px`;
        canvas.style.height = `${fullCss}px`;
        canvas.width = needWidth;
        canvas.height = needHeight;
        ctx = canvas.getContext("2d", { alpha: true });
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        mountedRef.current = true;
      }
      return { fullCss, center: fullCss / 2, haloR: haloDiameter / 2, coreR: Math.max(1.6, p.size * 0.38) };
    }

    function drawFrame(ts) {
      const { fullCss, center, haloR, coreR } = resizeCanvasIfNeeded();
      ctx.clearRect(0, 0, fullCss, fullCss);
      const p = paramsRef.current;
      const [rC, gC, bC] = hexToRgb(p.color || "#bfffb8");

      // twinkle factor
      let tw = 1;
      if (p.twinkle && !prefersReduced) {
        const t = (ts / 1000) * (p.twinkleSpeed || 0.9) * Math.PI * 2 + (p.phase || 0) * 2.0;
        tw = 1 + Math.sin(t) * (p.twinkleAmount || 0.28);
      }

      // additive blend for glow
      ctx.globalCompositeOperation = "lighter";

      const baseGlow = Math.max(6, p.size * 0.9);

      // HALO
      const haloGrad = ctx.createRadialGradient(center, center, 0, center, center, haloR);
      haloGrad.addColorStop(0, `rgba(${rC},${gC},${bC},${Math.min(1, 0.85 * tw)})`);
      haloGrad.addColorStop(0.12, `rgba(${rC},${gC},${bC},${0.6 * tw})`);
      haloGrad.addColorStop(0.3, `rgba(${rC},${gC},${bC},${0.28 * tw})`);
      haloGrad.addColorStop(0.6, `rgba(${rC},${gC},${bC},${0.08 * tw})`);
      haloGrad.addColorStop(1, `rgba(0,0,0,0)`);
      ctx.save();
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.shadowBlur = baseGlow * 0.9 * tw;
      ctx.shadowColor = `rgba(${rC},${gC},${bC},${0.85 * tw})`;
      ctx.fillRect(center - haloR, center - haloR, haloR * 2, haloR * 2);
      ctx.restore();

      // CORONA ring
      const coronaWidth = Math.max(0.8, haloR * (p.corona || 0.14));
      ctx.save();
      ctx.beginPath();
      ctx.lineWidth = coronaWidth;
      ctx.strokeStyle = `rgba(${rC},${gC},${bC},${0.28 * tw})`;
      ctx.shadowBlur = baseGlow * 0.4 * tw;
      ctx.shadowColor = `rgba(${rC},${gC},${bC},${0.35 * tw})`;
      ctx.arc(center, center, haloR - coronaWidth * 0.55, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // CORE
      const coreGrad = ctx.createRadialGradient(center, center, 0, center, center, coreR * 2);
      coreGrad.addColorStop(0, `rgba(255,255,255,${1 * tw})`);
      coreGrad.addColorStop(0.35, `rgba(${rC},${gC},${bC},${0.95 * tw})`);
      coreGrad.addColorStop(1, `rgba(${rC},${gC},${bC},${0.6 * tw})`);
      ctx.save();
      ctx.beginPath();
      ctx.fillStyle = coreGrad;
      ctx.shadowBlur = baseGlow * 0.6 * tw;
      ctx.shadowColor = `rgba(${rC},${gC},${bC},${0.75 * tw})`;
      ctx.arc(center, center, coreR * (1 + 0.04 * Math.sin(ts / 400 + (p.phase || 0))), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // SPIKES
      if (p.spikeCount > 0) {
        ctx.save();
        ctx.translate(center, center);
        for (let i = 0; i < p.spikeCount; i++) {
          const ang = (i / p.spikeCount) * Math.PI * 2 + ((p.phase || 0) % 1) * Math.PI * 2;
          ctx.rotate(ang);
          ctx.beginPath();
          ctx.moveTo(coreR * 0.6, -0.5);
          ctx.lineTo(coreR * 3.1, -0.5 - (i % 2) * 0.8);
          ctx.lineTo(coreR * 0.6, 0.5);
          ctx.closePath();
          ctx.fillStyle = `rgba(255,255,255,${0.08 * tw})`;
          ctx.globalAlpha = 0.9 * tw * (i % 2 ? 0.9 : 0.65);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.rotate(-ang);
        }
        ctx.restore();
      }

      // SPECKLES
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const specks = specklesRef.current;
      if (specks && specks.length) {
        specks.forEach((sp, i) => {
          const jitter = Math.sin((ts / 1000) * (0.6 + ((i % 7) * 0.1)) + (p.phase || 0) + i) * 0.4;
          ctx.beginPath();
          ctx.fillStyle = `rgba(${rC},${gC},${bC},${sp.a * tw * (0.6 + 0.4 * jitter)})`;
          ctx.arc(sp.x, sp.y, sp.s * (1 + 0.4 * jitter), 0, Math.PI * 2);
          ctx.fill();
        });
      }
      ctx.restore();

      ctx.globalCompositeOperation = "source-over";
    }

    // RAF loop
    function loop(now) {
      try {
        drawFrame(now);
      } catch (err) {
        // swallow errors in canvas draw (prevents RAF crash loop)
        // console.error("StarParticle draw err", err);
      }
      rafRef.current = requestAnimationFrame(loop);
    }

    if (!prefersReduced) {
      rafRef.current = requestAnimationFrame(loop);
    } else {
      // draw one frame and stop
      drawFrame(performance.now());
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // We intentionally do not include paramsRef in deps because it is a ref updated by prop changes
    // only canvas DOM node is needed here.
  }, [canvasRef.current, specklesRef.current]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        display: "block",
        width: undefined,
        height: undefined,
        pointerEvents: "none",
        userSelect: "none",
        ...style,
      }}
      aria-hidden
    />
  );
}

export default React.memo(StarParticle);
