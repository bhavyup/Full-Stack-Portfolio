// src/components/Starfield.jsx
import React, { useEffect, useRef } from "react";

/**
 * Starfield canvas.
 *
 * Props:
 * - fullScreen (bool) : if true canvas is fixed to viewport; if false it will size to parent element.
 * - speedFactor (number): animation speed multiplier.
 * - backgroundColor (string): canvas background paint color (use "transparent" to not paint background).
 * - starColor ([r,g,b]) : RGB triplet for stars.
 * - starCount (number) : how many stars to generate.
 * - zIndex (number) : CSS z-index for canvas.
 * - className/style : passthrough for positioning.
 */
export default function Starfield({
  fullScreen = true,
  speedFactor = 0.05,
  backgroundColor = "transparent",
  starColor = [220, 245, 255],
  starCount = 700,
  zIndex = 0,
  className = "",
  style = {},
}) {
  const canvasRef = useRef(null);
  const parentRef = useRef(null);
  const animRef = useRef(null);
  const roRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;

    // scale to devicePixelRatio for crispness
    function setSize(width, height) {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      w = Math.max(1, Math.floor(width));
      h = Math.max(1, Math.floor(height));
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // If not fullScreen, size to parent element bounds
    function fitToParent() {
      if (!fullScreen) {
        const parent = canvas.parentElement;
        if (!parent) return;
        const rect = parent.getBoundingClientRect();
        setSize(rect.width, rect.height);
      } else {
        setSize(window.innerWidth, window.innerHeight);
      }
    }

    // create stars
    function makeStars(count) {
      // radial-biased distribution for nicer center density
      const out = new Array(count);
      for (let i = 0; i < count; i++) {
        // radius factor: more near center using pow
        const fx = (Math.random() - 0.5) * 2; // -1..1
        const fy = (Math.random() - 0.5) * 2;
        out[i] = {
          x: fx * 1000, // initial spread — actual projection will scale by z
          y: fy * 800,
          z: Math.random() * 1000 + 1,
          // some stars larger than others
          size: Math.random() < 0.92 ? 2 : 2 + Math.random() * 2,
          baseBrightness: 0.95 + Math.random() * 0.4,
        };
      }
      return out;
    }

    let stars = makeStars(starCount);

    function clear() {
      if (backgroundColor && backgroundColor !== "transparent") {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, w, h);
      } else {
        // clear to transparent
        ctx.clearRect(0, 0, w, h);
      }
    }

    function putPixel(x, y, brightness, size = 1) {
      // brightness 0..1
      const [r, g, b] = starColor;
      ctx.fillStyle = `rgba(${r},${g},${b},${Math.max(0, Math.min(1, brightness))})`;
      // draw tiny square or small circle depending on size for softness
      if (size <= 1.2) ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      else {
        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    function moveStars(distance) {
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.z -= distance;
        while (s.z <= 1) {
          s.z += 1000;
          // respawn with slightly different x/y to avoid rigid columns
          s.x = (Math.random() - 0.5) * 1600;
          s.y = (Math.random() - 0.5) * 900;
          s.size = Math.random() < 0.92 ? 1 : 2 + Math.random() * 2;
          s.baseBrightness = 0.6 + Math.random() * 0.4;
        }
      }
    }

    let prevTime = performance.now();
    function tick(now) {
      const elapsed = Math.max(0, now - prevTime);
      prevTime = now;

      moveStars(elapsed * speedFactor);

      clear();

      const cx = w / 2;
      const cy = h / 2;

      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        // perspective projection (similar to classic starfield)
        const scale = 0.001; // projection multiplier
        const x = cx + star.x / (star.z * scale);
        const y = cy + star.y / (star.z * scale);

        if (x < -50 || x > w + 50 || y < -50 || y > h + 50) continue;

        const d = star.z / 1000.0;
        const b = Math.max(0, Math.min(1, (1 - d * d) * star.baseBrightness));
        putPixel(x, y, b*1.2, star.size);
      }

      animRef.current = requestAnimationFrame(tick);
    }

    // init
    prevTime = performance.now();
    animRef.current = requestAnimationFrame(tick);

    // resize handling
    const onResize = () => {
      if (fullScreen) {
        fitToParent();
      } else {
        // when parent size changes, reinit canvas size
        fitToParent();
      }
    };

    fitToParent();

    if (fullScreen) {
      window.addEventListener("resize", onResize);
    } else {
      // ResizeObserver on parent
      const parent = canvas.parentElement;
      if (parent && typeof ResizeObserver !== "undefined") {
        roRef.current = new ResizeObserver(() => {
          fitToParent();
        });
        roRef.current.observe(parent);
      } else {
        window.addEventListener("resize", onResize);
      }
    }

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (fullScreen) window.removeEventListener("resize", onResize);
      else {
        if (roRef.current) roRef.current.disconnect();
        else window.removeEventListener("resize", onResize);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullScreen, speedFactor, String(starColor), starCount, backgroundColor]);

  // canvas style: controlled via inline style so you can pass zIndex/className
  const canvasStyle = {
    position: fullScreen ? "fixed" : "absolute",
    left: 0,
    top: 0,
    pointerEvents: "none",
    zIndex: zIndex,
    mixBlendMode: "screen",
    display: "block",
    ...style,
  };

  return (
    <canvas
      ref={canvasRef}
      id="starfield-canvas"
      className={className}
      style={canvasStyle}
    />
  );
}
