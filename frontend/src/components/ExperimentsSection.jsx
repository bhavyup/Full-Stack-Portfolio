"use client";
import React, { useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";

export function HeroCanvasBackground({
  // Grid props
  cellSize = 60,
  lineColor = "rgba(0,255,65,0.12)",
  rippleColor = "rgba(255,255,255,0.1)",
  speed = 520,
  ringWidth = 6,
  edgeFade = 0.05,
  maxRipples = 1,
  interactive = true,
  
  // Path props
  pathColors = [
    "#f0e676",
    "#f3dfff", 
    "#aacfff",
    "#f0bfd4",
    "#f0a8f2"
  ],
  pathAnimationDuration = 3, // seconds for each path to complete
  pathStrokeWidth = 2,
  pathGlow = true,
  showPaths = true,
  
  // Common props
  className = "",
  style = {},
}) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const stateRef = useRef({
    // Grid state
    ripples: [],
    w: 0,
    h: 0,
    dpr: 1,
    pattern: null,
    gridW: 0,
    gridH: 0,
    mouseX: -1,
    mouseY: -1,
    
    // Path state
    paths: [],
    pathProgress: [0, 0, 0, 0, 0],
    pathStartTime: 0,
    animationTime: 0,
  });

  // SVG path data - converted to be used with Path2D
  const pathData = useMemo(() => [
    // Path 1 - Yellow
    "M-152 663C145.5 663 191 666.265 269 647C326.5 630 339.5 621 397.5 566C439 531.5 455 529.5 490 523C509.664 519.348 521 503.736 538 504.236C553.591 504.236 562.429 514.739 584.66 522.749C592.042 525.408 600.2 526.237 607.356 523.019C624.755 515.195 641.446 496.324 657 496.735C673.408 496.735 693.545 519.572 712.903 526.769C718.727 528.934 725.184 528.395 730.902 525.965C751.726 517.115 764.085 497.106 782 496.735C794.831 496.47 804.103 508.859 822.469 518.515C835.13 525.171 850.214 526.815 862.827 520.069C875.952 513.049 889.748 502.706 903.5 503.736C922.677 505.171 935.293 510.562 945.817 515.673C954.234 519.76 963.095 522.792 972.199 524.954C996.012 530.611 1007.42 534.118 1034 549C1077.5 573.359 1082.5 594.5 1140 629C1206 670 1328.5 662.5 1588 662.5",
    
    // Path 2 - Purple
    "M-152 587.5C147 587.5 277 587.5 310 573.5C348 563 392.5 543.5 408 535C434 523.5 426 526.235 479 515.235C494 512.729 523 510.435 534.5 512.735C554.5 516.735 555.5 523.235 576 523.735C592 523.735 616 496.735 633 497.235C648.671 497.235 661.31 515.052 684.774 524.942C692.004 527.989 700.2 528.738 707.349 525.505C724.886 517.575 741.932 498.33 757.5 498.742C773.864 498.742 791.711 520.623 810.403 527.654C816.218 529.841 822.661 529.246 828.451 526.991C849.246 518.893 861.599 502.112 879.5 501.742C886.47 501.597 896.865 506.047 907.429 510.911C930.879 521.707 957.139 519.639 982.951 520.063C1020.91 520.686 1037.5 530.797 1056.5 537C1102.24 556.627 1116.5 570.704 1180.5 579.235C1257.5 589.5 1279 587 1588 588",
    
    // Path 3 - Blue
    "M-152 514C147.5 514.333 294.5 513.735 380.5 513.735C405.976 514.94 422.849 515.228 436.37 515.123C477.503 514.803 518.631 506.605 559.508 511.197C564.04 511.706 569.162 512.524 575 513.735C588 516.433 616 521.702 627.5 519.402C647.5 515.402 659 499.235 680.5 499.235C700.5 499.235 725 529.235 742 528.735C757.654 528.735 768.77 510.583 791.793 500.59C798.991 497.465 807.16 496.777 814.423 499.745C832.335 507.064 850.418 524.648 866 524.235C882.791 524.235 902.316 509.786 921.814 505.392C926.856 504.255 932.097 504.674 937.176 505.631C966.993 511.248 970.679 514.346 989.5 514.735C1006.3 515.083 1036.5 513.235 1055.5 513.235C1114.5 513.235 1090.5 513.235 1124 513.235C1177.5 513.235 1178.99 514.402 1241 514.402C1317.5 514.402 1274.5 512.568 1588 513.235",
    
    // Path 4 - Pink
    "M-152 438.5C150.5 438.5 261 438.318 323.5 456.5C351 464.5 387.517 484.001 423.5 494.5C447.371 501.465 472 503.735 487 507.735C503.786 512.212 504.5 516.808 523 518.735C547 521.235 564.814 501.235 584.5 501.235C604.5 501.235 626 529.069 643 528.569C658.676 528.569 672.076 511.63 695.751 501.972C703.017 499.008 711.231 498.208 718.298 501.617C735.448 509.889 751.454 529.98 767 529.569C783.364 529.569 801.211 507.687 819.903 500.657C825.718 498.469 832.141 499.104 837.992 501.194C859.178 508.764 873.089 523.365 891 523.735C907.8 524.083 923 504.235 963 506.735C1034.5 506.735 1047.5 492.68 1071 481.5C1122.5 457 1142.23 452.871 1185 446.5C1255.5 436 1294 439 1588 439",
    
    // Path 5 - Magenta
    "M-152 364C145.288 362.349 195 361.5 265.5 378C322 391.223 399.182 457.5 411 467.5C424.176 478.649 456.916 491.677 496.259 502.699C498.746 503.396 501.16 504.304 503.511 505.374C517.104 511.558 541.149 520.911 551.5 521.236C571.5 521.236 590 498.736 611.5 498.736C631.5 498.736 652.5 529.236 669.5 528.736C685.171 528.736 697.81 510.924 721.274 501.036C728.505 497.988 736.716 497.231 743.812 500.579C761.362 508.857 778.421 529.148 794 528.736C810.375 528.736 829.35 508.68 848.364 502.179C854.243 500.169 860.624 500.802 866.535 502.718C886.961 509.338 898.141 519.866 916 520.236C932.8 520.583 934.5 510.236 967.5 501.736C1011.5 491 1007.5 493.5 1029.5 480C1069.5 453.5 1072 440.442 1128.5 403.5C1180.5 369.5 1275 360.374 1588 364"
  ], []);

  // Helper function to build grid pattern
  const buildGridPattern = (ctx, size, color) => {
    const p = document.createElement("canvas");
    p.width = size;
    p.height = size;
    const g = p.getContext("2d");
    g.clearRect(0, 0, size, size);
    g.strokeStyle = color;
    g.lineWidth = 1;
    // vertical line
    g.beginPath();
    g.moveTo(0.5, 0);
    g.lineTo(0.5, size);
    g.stroke();
    // horizontal line
    g.beginPath();
    g.moveTo(0, 0.5);
    g.lineTo(size, 0.5);
    g.stroke();
    return ctx.createPattern(p, "repeat");
  };

  // Helper function for rgba with alpha
  const rgbaWithAlpha = (rgbaString, aMul) => {
    if (rgbaString.startsWith("#")) {
      const hex = rgbaString.replace("#", "");
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      return `rgba(${r},${g},${b},${aMul})`;
    }
    const match = rgbaString.match(/rgba?KATEX_INLINE_OPEN([^)]+)KATEX_INLINE_CLOSE/i);
    if (!match) return rgbaString;
    const parts = match[1].split(",").map(s => s.trim());
    const r = +parts[0];
    const g = +parts[1];
    const b = +parts[2];
    const a = parts[3] != null ? +parts[3] : 1;
    const outA = Math.max(0, Math.min(1, a * aMul));
    return `rgba(${r},${g},${b},${outA})`;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { 
      alpha: true, 
      desynchronized: true 
    });
    
    // Create Path2D objects from SVG path strings
    stateRef.current.paths = pathData.map(d => new Path2D(d));
    
    // DPR and resize setup
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
      stateRef.current.pattern = buildGridPattern(ctx, cellSize, lineColor);
      stateRef.current.gridW = Math.ceil(w / cellSize);
      stateRef.current.gridH = Math.ceil(h / cellSize);
    };

    const onResize = () => resize();
    resize();
    window.addEventListener("resize", onResize, { passive: true });

    // Mouse tracking
    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      stateRef.current.mouseX = e.clientX - rect.left;
      stateRef.current.mouseY = e.clientY - rect.top;
    };
    
    const onMouseLeave = () => {
      stateRef.current.mouseX = -1;
      stateRef.current.mouseY = -1;
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mouseleave", onMouseLeave, { passive: true });

    // Click handler for ripples
    const onPointer = (e) => {
      if (!interactive) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      spawnRipple(x, y);
    };
    
    if (interactive) {
      window.addEventListener("pointerdown", onPointer, { passive: true });
    }

    const now = () => performance.now() / 1000;
    let last = now();
    stateRef.current.pathStartTime = now();

    function spawnRipple(x, y) {
      const st = stateRef.current;
      const cx = Math.floor(x / cellSize) * cellSize + cellSize / 2;
      const cy = Math.floor(y / cellSize) * cellSize + cellSize / 2;
      st.ripples.push({ x: cx, y: cy, t: now() });
      if (st.ripples.length > maxRipples) st.ripples.shift();
    }

    // Drawing functions
    function drawGrid(ctx, st) {
      if (!st.pattern) return;
      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = st.pattern;
      ctx.fillRect(0, 0, st.w, st.h);
      ctx.restore();
    }

    function drawPaths(ctx, st, time) {
      if (!showPaths) return;
      
      ctx.save();
      
      // Transform to match SVG viewBox
      // Original viewBox: -152 360 1740 340
      const viewBoxWidth = 1740;
      const viewBoxHeight = 340;
      const viewBoxX = -152;
      const viewBoxY = 360;
      
      // Scale to fit canvas
      const scaleX = st.w / viewBoxWidth;
      const scaleY = (st.h * 0.67) / viewBoxHeight; // Use 67% of height like original
      const scale = Math.max(scaleX, scaleY) * 1.1; // Slightly larger to fill
      
      // Position at bottom like original SVG
      ctx.translate(0, st.h - viewBoxHeight * scale);
      ctx.scale(scale, scale);
      ctx.translate(-viewBoxX, -viewBoxY);
      
      // Calculate animation progress
      const animTime = time - st.pathStartTime;
      const totalDuration = pathAnimationDuration * st.paths.length;
      const loopTime = animTime % totalDuration;
      
      // Draw each path
      st.paths.forEach((path, i) => {
        const pathStart = i * pathAnimationDuration;
        const pathEnd = pathStart + pathAnimationDuration;
        
        // Calculate progress for this path
        let progress = 0;
        if (loopTime >= pathStart && loopTime <= pathEnd) {
          progress = (loopTime - pathStart) / pathAnimationDuration;
        } else if (loopTime > pathEnd) {
          progress = 1;
        }
        
        st.pathProgress[i] = progress;
        
        // Check for ripple interaction
        let rippleBoost = 0;
        st.ripples.forEach(ripple => {
          const age = time - ripple.t;
          const radius = age * speed;
          // Simple proximity check for glow boost
          const rippleY = ripple.y;
          const pathY = viewBoxY + (i * 75); // Approximate Y position
          if (Math.abs(rippleY - (st.h - viewBoxHeight * scale + pathY * scale)) < radius && radius < st.w) {
            rippleBoost = Math.max(rippleBoost, 1 - age / 2);
          }
        });
        
        // Draw blurred background for glow
        if (pathGlow) {
          ctx.save();
          ctx.globalAlpha = 0.3 + rippleBoost * 0.2;
          ctx.strokeStyle = pathColors[i];
          ctx.lineWidth = pathStrokeWidth * 3;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.filter = "blur(8px)";
          
          if (progress < 1) {
            // Animate path drawing
            const pathLength = 2000; // Approximate
            const drawnLength = pathLength * progress;
            ctx.setLineDash([drawnLength, pathLength]);
          } else {
            ctx.setLineDash([]);
          }
          
          ctx.stroke(path);
          ctx.restore();
        }
        
        // Draw main path
        ctx.save();
        ctx.globalAlpha = 0.8 + rippleBoost * 0.2;
        ctx.strokeStyle = pathColors[i];
        ctx.lineWidth = pathStrokeWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        
        if (pathGlow) {
          ctx.shadowBlur = 15 + rippleBoost * 10;
          ctx.shadowColor = pathColors[i];
        }
        
        if (progress < 1) {
          const pathLength = 2000;
          const drawnLength = pathLength * progress;
          ctx.setLineDash([drawnLength, pathLength]);
        } else {
          ctx.setLineDash([]);
        }
        
        ctx.stroke(path);
        ctx.restore();
      });
      
      ctx.restore();
    }

    function drawRipples(ctx, st, time) {
      ctx.save();
      
      for (let gy = 0; gy < st.gridH; gy++) {
        for (let gx = 0; gx < st.gridW; gx++) {
          const cx = gx * cellSize + cellSize / 2;
          const cy = gy * cellSize + cellSize / 2;

          let a = 0;
          for (let r = 0; r < st.ripples.length; r++) {
            const rp = st.ripples[r];
            const age = time - rp.t;
            if (age < 0) continue;
            const radius = age * speed;
            const dist = Math.hypot(cx - rp.x, cy - rp.y);

            const d = Math.abs(dist - radius);
            if (d < ringWidth) {
              const ageFade = Math.max(0, 1 - age / 2.0);
              const local = 1 - d / ringWidth;
              a = Math.max(a, local * ageFade);
            }
          }

          if (a > 0.01) {
            const s = Math.max(1, cellSize - 2);
            const x = gx * cellSize + (cellSize - s) / 2;
            const y = gy * cellSize + (cellSize - s) / 2;
            ctx.fillStyle = rgbaWithAlpha(rippleColor, a);
            ctx.fillRect(x, y, s, s);
          }
        }
      }
      
      ctx.restore();
    }

    function drawHoverHighlight(ctx, st) {
      if (st.mouseX < 0 || st.mouseY < 0) return;

      const gx = Math.floor(st.mouseX / cellSize);
      const gy = Math.floor(st.mouseY / cellSize);

      const s = cellSize;
      const x = gx * cellSize + (cellSize - s) / 2;
      const y = gy * cellSize + (cellSize - s) / 2;
      
      ctx.save();
      ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
      ctx.shadowBlur = 10;
      ctx.shadowColor = "rgba(255, 255, 255, 0.1)";
      ctx.fillRect(x, y, s, s);
      ctx.restore();
    }

    function applyEdgeFade(ctx, st) {
      const { w, h } = st;
      if (!w || !h) return;

      const fadeX = Math.max(1, Math.round(w * 0.12));
      const fadeY = Math.max(1, Math.round(h * 0.18));

      ctx.save();
      ctx.globalCompositeOperation = "destination-in";

      // Horizontal fade
      const gX = ctx.createLinearGradient(0, 0, w, 0);
      gX.addColorStop(0, "rgba(0,0,0,0)");
      gX.addColorStop(fadeX / w, "rgba(0,0,0,1)");
      gX.addColorStop(1 - fadeX / w, "rgba(0,0,0,1)");
      gX.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gX;
      ctx.fillRect(0, 0, w, h);

      // Vertical fade
      const gY = ctx.createLinearGradient(0, 0, 0, h);
      gY.addColorStop(0, "rgba(0,0,0,0)");
      gY.addColorStop(fadeY / h, "rgba(0,0,0,1)");
      gY.addColorStop(1 - fadeY / h, "rgba(0,0,0,1)");
      gY.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gY;
      ctx.fillRect(0, 0, w, h);

      ctx.restore();
    }

    // Main animation loop
    function frame() {
      const t = now();
      let dt = t - last;
      last = t;
      if (dt > 0.05) dt = 0.05;

      const st = stateRef.current;
      
      // Clear canvas
      ctx.clearRect(0, 0, st.w, st.h);

      // Layer 1: Grid background
      drawGrid(ctx, st);

      // Layer 2: Animated paths (Gemini effect)
      drawPaths(ctx, st, t);

      // Layer 3: Ripple effects
      drawRipples(ctx, st, t);

      // Layer 4: Mouse hover highlight
      drawHoverHighlight(ctx, st);

      // Layer 5: Edge fade
      if (edgeFade > 0) applyEdgeFade(ctx, st);

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);

    // Cleanup
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
      if (interactive) {
        window.removeEventListener("pointerdown", onPointer);
      }
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
    pathColors,
    pathAnimationDuration,
    pathStrokeWidth,
    pathGlow,
    showPaths,
    pathData,
  ]);

  return (
    <div
      className={cn(
        "pointer-events-auto top-0 left-0 w-full h-full",
        className
      )}
      style={{
        ...style,
        mixBlendMode: "soft-light",
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{
          pointerEvents: "auto",
        }}
      />
    </div>
  );
}

export default HeroCanvasBackground;