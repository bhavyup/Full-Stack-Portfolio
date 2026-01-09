import React, { useRef, useEffect } from "react";

export default function CanvasStarfield({
  starCount = 220,
  twinkle = true,
  parallax = true,
  color = "#bfffb8",
  speed = 0.6,
}) {
  const ref = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w = canvas.width = canvas.clientWidth;
    let h = canvas.height = canvas.clientHeight;
    let stars = [];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const actualCount = reduced ? Math.min(60, starCount) : starCount;

    function rand(min, max) { return Math.random() * (max - min) + min; }

    function initStars() {
      stars = new Array(actualCount).fill(0).map(() => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.6 + 0.3,
        alpha: Math.random() * 0.8 + 0.2,
        twink: Math.random() * 0.02 + 0.003,
      }));
    }

    let mouseX = w / 2, mouseY = h / 2;
    function resize() {
      w = canvas.width = canvas.clientWidth;
      h = canvas.height = canvas.clientHeight;
      initStars();
    }
    window.addEventListener("resize", resize);
    initStars();

    function draw() {
      ctx.clearRect(0, 0, w, h);
      // subtle backdrop to keep CRT look
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fillRect(0, 0, w, h);

      for (let s of stars) {
        // twinkle
        if (twinkle && !reduced) {
          s.alpha += s.twink * (Math.random() > 0.5 ? 1 : -1);
          s.alpha = Math.max(0.1, Math.min(1, s.alpha));
        }

        // parallax offset
        const px = parallax ? (mouseX - w/2) * (s.r*0.002) : 0;
        const py = parallax ? (mouseY - h/2) * (s.r*0.002) : 0;

        ctx.beginPath();
        const grad = ctx.createRadialGradient(s.x + px, s.y + py, 0, s.x + px, s.y + py, s.r*5);
        grad.addColorStop(0, colorWithAlpha(color, s.alpha));
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.arc(s.x + px, s.y + py, s.r * (1 + (speed*0.03)), 0, Math.PI*2);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    }
    draw();

    function onMove(e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
    }
    window.addEventListener("mousemove", onMove);

    // utility to convert hex to rgba with alpha
    function colorWithAlpha(hex, alpha=1) {
      // simple parse for #rgb or #rrggbb
      const c = hex.replace("#","");
      const bigint = parseInt(c.length===3 ? c.split("").map(ch=>ch+ch).join("") : c, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `rgba(${r},${g},${b},${alpha})`;
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
    };
  }, [starCount, twinkle, parallax, color, speed]);

  return (
    <canvas
      ref={ref}
      className="absolute inset-0 w-full h-full pointer-events-none -z-10"
      aria-hidden="true"
    />
  );
}
