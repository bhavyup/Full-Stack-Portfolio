"use client";
import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export default function BackgroundBeamsWithCollisionFast({
  children,
  className,
  beamCount = 400,
  minSpeed = 180,
  maxSpeed = 480,
  minLen = 60,
  maxLen = 200,
  beamWidth = 1, // wider so the tail isn't hairline
  explosionParticles = 12,
  gravity = 900,
  groundHeight = 0,
  color = "#22c55e", // emerald-500
  bodyAlpha = 0.55, // opacity along most of the beam
  headAlpha = 1.0, // opacity at the bright end
  headBrightPortion = 0.18, // 18% of the bottom is brighter
  tailFadePortion = 0.12, // top fade-in
  addOuterGlow = true, // set true for a soft neon halo
  glowScale = 2.2, // how wide the glow is vs beam width
  glowAlpha = 0.18,
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const groundRef = useRef(null);
  const rafRef = useRef(0);
  const runningRef = useRef(true);

  const stateRef = useRef({
    w: 0,
    h: 0,
    dpr: 1,
    barrierY: 0,
    x: new Float32Array(0),
    y: new Float32Array(0),
    len: new Float32Array(0),
    speed: new Float32Array(0),
    particles: [],
    lastTs: 0,
    sprite: null,
    glowSprite: null,
  });

  const hexToRgb = (hex) => {
    const h = hex.replace("#", "").trim();
    const full =
      h.length === 3
        ? h
            .split("")
            .map((c) => c + c)
            .join("")
        : h;
    const num = parseInt(full, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  };

  // Build a 1 x spriteH vertical gradient sprite, then scale per-beam via drawImage.
  const buildSprites = (w = 1, spriteH = 256) => {
    const { r, g, b } = hexToRgb(color);

    // Main beam sprite: smooth tail fade-in -> body -> bright head
    const off = document.createElement("canvas");
    off.width = w;
    off.height = spriteH;
    const c2 = off.getContext("2d");

    const g1 = c2.createLinearGradient(0, 0, 0, spriteH);
    const tail = Math.max(0, Math.min(1, tailFadePortion));
    const head = Math.max(0, Math.min(1, headBrightPortion));
    const bodyStart = tail;
    const headStart = 1 - head;

    // Transparent at very top
    g1.addColorStop(0.0, `rgba(${r},${g},${b},0)`);
    // Fade-in tail
    g1.addColorStop(tail * 0.6, `rgba(${r},${g},${b},${bodyAlpha * 0.25})`);
    g1.addColorStop(tail, `rgba(${r},${g},${b},${bodyAlpha})`);
    // Body
    g1.addColorStop(
      headStart * 0.6 + tail * 0.4,
      `rgba(${r},${g},${b},${bodyAlpha})`
    );
    // Bright head zone
    g1.addColorStop(
      headStart,
      `rgba(${r},${g},${b},${Math.max(bodyAlpha, headAlpha * 0.8)})`
    );
    g1.addColorStop(1.0, `rgba(${r},${g},${b},${headAlpha})`);

    c2.fillStyle = g1;
    c2.fillRect(0, 0, w, spriteH);

    // Optional outer glow sprite (wider), very soft
    let glowCanvas = null;
    if (addOuterGlow) {
      glowCanvas = document.createElement("canvas");
      const gw = Math.max(2, Math.ceil(w * glowScale));
      glowCanvas.width = gw;
      glowCanvas.height = spriteH;
      const cg = glowCanvas.getContext("2d");

      const gradGlow = cg.createLinearGradient(0, 0, 0, spriteH);
      gradGlow.addColorStop(0.0, `rgba(${r},${g},${b},0)`);
      gradGlow.addColorStop(0.15, `rgba(${r},${g},${b},${glowAlpha * 0.35})`);
      gradGlow.addColorStop(0.85, `rgba(${r},${g},${b},${glowAlpha})`);
      gradGlow.addColorStop(1.0, `rgba(${r},${g},${b},${glowAlpha})`);
      cg.fillStyle = gradGlow;
      cg.filter = "blur(6px)";
      cg.fillRect(0, 0, gw, spriteH);
      cg.filter = "none";
    }

    return { sprite: off, glowSprite: glowCanvas };
  };

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });

    const setup = () => {
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const rect = wrap.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));

      stateRef.current.dpr = dpr;
      stateRef.current.w = w;
      stateRef.current.h = h;

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const gH = groundRef.current
        ? groundRef.current.offsetHeight
        : groundHeight;
      stateRef.current.barrierY = h - gH;

      // Build sprites once for this width
      const { sprite, glowSprite } = buildSprites(beamWidth);
      stateRef.current.sprite = sprite;
      stateRef.current.glowSprite = glowSprite || null;

      // Init beams
      const n = beamCount;
      stateRef.current.x = new Float32Array(n);
      stateRef.current.y = new Float32Array(n);
      stateRef.current.len = new Float32Array(n);
      stateRef.current.speed = new Float32Array(n);

      for (let i = 0; i < n; i++) {
        stateRef.current.x[i] = Math.random() * w;
        stateRef.current.len[i] = minLen + Math.random() * (maxLen - minLen);
        stateRef.current.speed[i] =
          minSpeed + Math.random() * (maxSpeed - minSpeed);
        stateRef.current.y[i] = -Math.random() * h - stateRef.current.len[i];
      }

      stateRef.current.particles.length = 0;
      stateRef.current.lastTs = 0;
    };

    const spawnExplosion = (x, y) => {
      for (let i = 0; i < explosionParticles; i++) {
        const angle = Math.random() * Math.PI - Math.PI / 2;
        const speed = 150 + Math.random() * 350;
        stateRef.current.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          ttl: 600 + Math.random() * 600,
          size: 2 + Math.random() * 1.5,
        });
      }
    };

    const draw = (ts) => {
      if (!runningRef.current) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      const st = stateRef.current;
      const { w, h, barrierY, sprite, glowSprite } = st;
      if (!sprite) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      if (!st.lastTs) st.lastTs = ts;
      let dt = (ts - st.lastTs) / 1000;
      st.lastTs = ts;
      dt = Math.min(dt, 0.05);

      ctx.clearRect(0, 0, w, h);

      // Draw beams using sprite (uniform thickness, full-length gradient)
      for (let i = 0; i < st.x.length; i++) {
        const len = st.len[i];
        const yBefore = st.y[i];
        const yAfter = yBefore + st.speed[i] * dt;
        const tailBefore = yBefore + len;
        const tailAfter = yAfter + len;

        // Collision
        if (tailBefore < barrierY && tailAfter >= barrierY) {
          spawnExplosion(st.x[i], barrierY);
        }

        st.y[i] = yAfter;

        // Respawn
        if (st.y[i] >= h) {
          st.x[i] = Math.random() * w;
          st.len[i] = minLen + Math.random() * (maxLen - minLen);
          st.speed[i] = minSpeed + Math.random() * (maxSpeed - minSpeed);
          st.y[i] = -st.len[i] - Math.random() * h;
        }

        const xDraw = Math.round(st.x[i] - beamWidth / 2);
        const yDraw = Math.round(st.y[i]);
        const lenDraw = Math.round(len);

        // Optional soft outer glow
        if (glowSprite) {
          const gw = Math.max(2, Math.ceil(beamWidth * glowScale));
          const gx = Math.round(st.x[i] - gw / 2);
          ctx.globalAlpha = 1.0;
          ctx.globalCompositeOperation = "lighter";
          ctx.drawImage(
            glowSprite,
            0,
            0,
            glowSprite.width,
            glowSprite.height,
            gx,
            yDraw,
            gw,
            lenDraw
          );
          ctx.globalCompositeOperation = "source-over";
        }

        // Main beam (full-length gradient)
        ctx.drawImage(
          sprite,
          0,
          0,
          sprite.width,
          sprite.height,
          xDraw,
          yDraw,
          beamWidth,
          lenDraw
        );
      }

      // Particles
      for (let i = st.particles.length - 1; i >= 0; i--) {
        const p = st.particles[i];
        p.life += dt * 1000;
        if (p.life >= p.ttl) {
          const last = st.particles.pop();
          if (i < st.particles.length) st.particles[i] = last;
          continue;
        }
        p.vy += gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        const t = 1 - p.life / p.ttl;
        const a = Math.max(0, Math.min(1, t));
        ctx.fillStyle = `rgba(34,197,94,${0.6 * a})`;
        const s = p.size; // thickness
        const len = p.size * 3; // length
        const angle = Math.atan2(p.vy, p.vx);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(angle);
        ctx.fillRect(-len / 2, -s / 2, len, s); // oriented streak
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    const handleResize = () => setup();

    const handleVis = () => {
      runningRef.current = !document.hidden;
      if (!runningRef.current) {
        cancelAnimationFrame(rafRef.current);
      } else {
        stateRef.current.lastTs = 0;
        rafRef.current = requestAnimationFrame(draw);
      }
    };

    setup();
    window.addEventListener("resize", handleResize, { passive: true });
    document.addEventListener("visibilitychange", handleVis);
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVis);
    };
  }, [
    beamCount,
    minSpeed,
    maxSpeed,
    minLen,
    maxLen,
    beamWidth,
    explosionParticles,
    gravity,
    groundHeight,
    color,
    bodyAlpha,
    headAlpha,
    headBrightPortion,
    tailFadePortion,
    addOuterGlow,
    glowScale,
    glowAlpha,
  ]);

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative w-full overflow-hidden flex items-center justify-center",
        className
      )}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
      />
      {children}
      <div
        ref={groundRef}
        className="absolute bottom-0 w-full pointer-events-none"
        style={{
          height: groundHeight,
          background: "rgba(255,255,255,0.02)",
          boxShadow:
            "0 0 24px rgba(34, 42, 53, 0.06), 0 1px 1px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(34, 42, 53, 0.04), 0 0 4px rgba(34, 42, 53, 0.08), 0 16px 68px rgba(47, 48, 55, 0.05), 0 1px 0 rgba(255, 255, 255, 0.1) inset",
        }}
      />
    </div>
  );
}
