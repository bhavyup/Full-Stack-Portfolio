"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useMotionValueEvent,
} from "framer-motion";
import { Calendar, School, MapPin } from "lucide-react";

// THEME
const THEME = {
  neon: "#00ff41",
  glow: "rgba(0,255,65,0.20)",
  border: "rgba(0,255,65,0.15)",
  deep: "#021009",
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

function ProgressRing({ value = 0, label = "Progress", neon = "#00ff41" }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="col-span-3 sm:col-span-1">
      <div className="relative w-20 h-20 mx-auto">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(${neon} ${clamped}%, rgba(255,255,255,0.06) 0)`,
            filter: "drop-shadow(0 0 8px rgba(0,255,65,0.2))",
          }}
        />
        <div
          className="absolute inset-2 rounded-full bg-black/70 border"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        />
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="text-base font-bold text-white">{clamped}%</div>
            <div className="text-[9px] font-mono text-emerald-300/70">
              {label}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBlock({ label, value }) {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center rounded border p-3"
      style={{
        borderColor: "rgba(0,255,65,0.12)",
        background: "rgba(0,0,0,0.35)",
      }}
    >
      <div className="text-[11px] font-mono text-emerald-300/60">{label}</div>
      <div className="text-base font-semibold text-white mt-1">{value}</div>
    </div>
  );
}

function computeProgress(entry) {
  if (typeof entry.progress === "number") return entry.progress;
  const currentYear = new Date().getFullYear();
  const s = parseInt(entry.start, 10);
  const e = parseInt(entry.end, 10);
  if (!isFinite(s) || !isFinite(e) || s >= e) return 100;
  const clamped = Math.max(0, Math.min(1, (currentYear - s) / (e - s)));
  return Math.round(clamped * 100);
}

function formatRange(entry) {
  if (entry.start && entry.end) return `${entry.start} – ${entry.end}`;
  return entry.year || "";
}

// Fallback card (replace with your Card if you have one)
const Card = ({ item, isActive }) => (
  <div
    className="h-full w-full flex flex-col rounded-xl border overflow-hidden backdrop-blur-sm transition-all duration-300"
    style={{
      borderColor: THEME.border,
      background: "linear-gradient(180deg, rgba(0,0,0,1), rgba(0,0,0,1))",
      boxShadow: isActive
        ? `0 0 24px ${THEME.glow}, inset 0 0 0 1px rgba(255,255,255,0.04)`
        : "inset 0 0 0 1px rgba(255,255,255,0.04)",
    }}
  >
    <div
      className="flex items-center justify-between px-4 md:px-5 py-3 border-b"
      style={{ borderColor: THEME.border }}
    >
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
        <span className="text-xs font-mono text-emerald-200/80">
          Status: Online
        </span>
      </div>
      <div className="text-[10px] md:text-xs font-mono text-emerald-200/60">
        EDU/CRT v1.0
      </div>
    </div>
    <div className="flex items-start p-3 gap-4">
      <div className="relative">
        <div className=" rounded-md  flex items-center justify-center">
          {item.logo ? (
            <img
              src={item.logo}
              alt="logo"
              className="w-8 h-8 object-contain opacity-90"
            />
          ) : (
            <School className="w-8 h-8" style={{ color: THEME.neon }} />
          )}
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-xs font-bold text-emerald-100/90">
          {item.degree} {item.program && `in ${item.program}`}
        </div>
        <div className="text-emerald-200/80 text-[11px]">
          {item.institution}

          <br />
          {item.location ? (
            <div className="text-[11px] text-emerald-200/80 inline-flex items-center gap-1">
              <MapPin className="w-2 h-2" />
              {item.location}
            </div>
          ) : null}
          <br />
          <div className="text-emerald-200/80 text-[11px] inline-flex items-center gap-1">
            <Calendar className="w-2 h-2" />
            {formatRange(item)}
          </div>
        </div>
      </div>
    </div>

    {/* Gauge + stats */}
    <div className=" p-3 w-full flex items-center gap-3">
      <ProgressRing
        value={computeProgress(item)}
        label="Progress"
        neon={THEME.neon}
      />
      <StatBlock label="GPA" value={item.gpa ?? "—"} />
      <StatBlock label="Verified" value={item.verified ? "Yes" : "Pending"} />
    </div>

    {/* Coursework chips */}
    {item.coursework?.length ? (
      <div className=" p-3">
        <div className="text-xs font-mono text-emerald-300/60 mb-2">
          Core Coursework
        </div>
        <div className="flex flex-wrap gap-2">
          {item.coursework.slice(0, 10).map((c) => (
            <span
              key={c}
              className="px-2 py-1 rounded border text-xs text-emerald-100/90"
              style={{
                borderColor: THEME.border,
                background: "rgba(0,0,0,0.35)",
              }}
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    ) : null}
  </div>
);

export default function SpiralTimeline({
  data,
  itemsPerTurn = 6, // cards per full revolution
  spacing = 200, // vertical distance between cards (px)
  radius = 200, // distance from center pole (px)
  perspective = 40000,
  cardWidth = 350,
  height = 720,
  wheelSpeed = 0.4,
  dragSpeed = 1.0,
  snapDelay = 340,
  rotatefactor = 6.0,
  maxFace = 70,
  flattenPower = 5.0, // ms idle before snapping to exact slot
}) {
  const stageRef = useRef(null);
  const [vh, setVh] = useState(800);
  useEffect(() => {
    const set = () => setVh(window.innerHeight || 800);
    set();
    window.addEventListener("resize", set);
    return () => window.removeEventListener("resize", set);
  }, []);

  // Virtual position (px) across the stack (0 .. (n-1)*spacing)
  const travel = Math.max(1, (data.length - 1) * spacing);
  const pos = useMotionValue(0);
  const posSpring = useSpring(pos, { stiffness: 140, damping: 30, mass: 0.35 });

  const [posPx, setPosPx] = useState(0);
  useMotionValueEvent(posSpring, "change", (v) => setPosPx(v));
  const floatIndex = posPx / spacing;
  const activeIndex = clamp(
    Math.round(floatIndex),
    0,
    Math.max(0, data.length - 1)
  );

  const [cw, setCw] = useState(cardWidth);
  useEffect(() => {
    const onResize = () =>
      setCw(Math.min(cardWidth, Math.floor(window.innerWidth * 0.86)));
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [cardWidth]);

  // Deck rotation = exact one step per item of vertical travel (true helix)
  const stepDeg = 360 / Math.max(1, itemsPerTurn);
  const deckRotate = useTransform(
    posSpring,
    (px) => `${-(px / spacing) * stepDeg}deg`
  );
  const deckTranslateY = useTransform(posSpring, (px) => -px);

  // Input handling (wheel / touch / drag) — page stays fixed
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    el.style.overscrollBehavior = "contain";
    el.style.touchAction = "none";
    el.tabIndex = 0;

    let idleTimer = 0;
    const scheduleSnap = () => {
      clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        const snapped = Math.round(pos.get() / spacing) * spacing;
        pos.set(clamp(snapped, 0, travel));
      }, snapDelay);
    };
    const nudge = (deltaPx) => {
      const next = clamp(pos.get() + deltaPx, 0, travel);
      pos.set(next);
      scheduleSnap();
    };

    // Wheel
    const onWheel = (e) => {
      e.preventDefault();
      nudge(e.deltaY * wheelSpeed);
    };

    // Touch
    let lastY = null;
    const onTouchStart = (e) => {
      if (e.touches?.length) lastY = e.touches[0].clientY;
      clearTimeout(idleTimer);
    };
    const onTouchMove = (e) => {
      if (lastY == null) return;
      e.preventDefault();
      const y = e.touches[0].clientY;
      const dy = (lastY - y) * dragSpeed;
      lastY = y;
      nudge(dy);
    };
    const onTouchEnd = () => {
      lastY = null;
      scheduleSnap();
    };

    // Pointer (mouse)
    let dragging = false;
    let lastPY = 0;
    const onPointerDown = (e) => {
      dragging = true;
      lastPY = e.clientY;
      el.setPointerCapture?.(e.pointerId);
      clearTimeout(idleTimer);
    };
    const onPointerMove = (e) => {
      if (!dragging) return;
      const dy = (lastPY - e.clientY) * dragSpeed;
      lastPY = e.clientY;
      nudge(dy);
    };
    const onPointerUp = (e) => {
      dragging = false;
      el.releasePointerCapture?.(e.pointerId);
      scheduleSnap();
    };

    // Keyboard
    const onKey = (e) => {
      const keys = [
        "ArrowUp",
        "ArrowDown",
        "PageUp",
        "PageDown",
        "Home",
        "End",
      ];
      if (!keys.includes(e.key)) return;
      e.preventDefault();
      const step =
        e.key === "ArrowUp"
          ? -spacing
          : e.key === "ArrowDown"
          ? spacing
          : e.key === "PageUp"
          ? -spacing * 3
          : e.key === "PageDown"
          ? spacing * 3
          : e.key === "Home"
          ? -travel
          : travel;
      nudge(step);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("pointerdown", onPointerDown, { passive: true });
    el.addEventListener("pointermove", onPointerMove, { passive: true });
    el.addEventListener("pointerup", onPointerUp, { passive: true });
    el.addEventListener("pointercancel", onPointerUp, { passive: true });
    el.addEventListener("keydown", onKey);

    return () => {
      clearTimeout(idleTimer);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
      el.removeEventListener("keydown", onKey);
    };
  }, [pos, spacing, travel, wheelSpeed, dragSpeed, snapDelay]);

  return (
    <section className="relative w-full bg-transparent">
      {/* scanlines */}

      {/* Fixed pole + dot */}
      <div
        className="mx-auto rounded-xl border bg-black/80"
        style={{
          width: Math.min(window?.innerWidth || 1000, 900), // fallback; see note below
          maxWidth: "95%",
          height: 600, // pick a fixed height you want the helix to live in
          overflow: "hidden", // <--- clip anything outside
          position: "relative", // children use absolute coordinates
          borderColor: THEME.border,
          perspective: `${perspective}px`, // <--- 3D projection belongs to this box
          perspectiveOrigin: "50% 50%",
        }}
      >
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center pointer-events-none z-50">
          <div
            className="px-3 py-1 rounded border text-xs font-mono backdrop-blur-sm"
            style={{
              borderColor: THEME.border,
              color: THEME.neon,
              background: "rgba(0,10,0,0.5)",
              textShadow: `0 0 8px ${THEME.glow}`,
            }}
          >
            Scroll to view
          </div>
        </div>

        {/* Pole: absolute and limited to the box height */}
        <div className="pointer-events-none">
          <div
            className={`absolute left-1/2 -translate-x-1/2 top-0 bottom-0 flex items-stretch bg-gradient-to-b from-transparent via-[#00ff41] to-transparent`}
            style={{
              width: 2,
              borderRadius: 999,
              boxShadow: `0 0 18px ${THEME.glow}, inset 0 0 8px rgba(255,255,255,0.02)`,
              opacity: 0.95,
              zIndex: 0, // behind cards if cards have higher z
            }}
          />
        </div>

        {/* Stage */}
        <div
          ref={stageRef}
          className="absolute inset-0 overflow-hidden outline-none"
          style={{
            perspective: `${perspective}px`,
            perspectiveOrigin: "50% 50%",
          }}
        >
          <div
            className="absolute inset-0 grid place-items-center"
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* Deck: real helix => move up and spin together */}
            <motion.div
              className="relative"
              style={{
                transformStyle: "preserve-3d",
                translateY: deckTranslateY,
                rotateY: deckRotate,
                willChange: "transform",
              }}
            >
              {data.map((item, i) => {
                const yLocal = i * spacing;
                const angleDeg = i * stepDeg;

                // visibility cull
                const yToCenter = yLocal - posPx;
                const visible = Math.abs(yToCenter) < 720 * 1.25;
                if (!visible) return null;

                const norm = clamp(yToCenter / (spacing * 1.5), -1, 1);

                // tuning knobs (expose as props if you want)
                const maxAngleOffset = 95; // degrees max extra curve offset (tweak larger for more curve)
                const zCurve = 0.65; // how much translateZ varies with distance (0 = fixed radius)
                const curvePower = 0.75; // <1: starts curving early, >1: more sudden curve near center

                // shape function (S-shaped easing) -> result in [-1..1]
                const shaped =
                  Math.sign(norm) * Math.pow(Math.abs(norm), curvePower);
                // alternative: use sinusoid for softer curve
                // const shaped = Math.sin(norm * Math.PI / 2);

                // base helix angle (original)
                const baseAngle = i * stepDeg;

                // compute angle offset driven by vertical offset (cards leave center with an offset)
                const angleOffset = shaped * maxAngleOffset;

                // final angle used to place card in world
                const angleDegCurved = baseAngle + angleOffset;

                // compute a dynamic radius (translateZ) so path arcs outward/inward
                // negative means push it away from camera (we used -radius previously)
                const radiusDelta =
                  radius * (1 + zCurve * Math.pow(Math.abs(norm), 1.0)); // >1 => larger radius farther from center
                const effectiveTranslateZ = -radiusDelta;

                // Weight for face counter-rotation (only near center => face camera)
                const lockRadius = spacing * 0.05; // distance within which we flatten the face
                const wbBase =
                  1 - smoothstep(0, lockRadius, Math.abs(yToCenter)); // 1 at center -> 0 away
                const w = Math.pow(wbBase, flattenPower);

                // World orientation (without counter-rotation)
                const thetaWorld = angleDegCurved - floatIndex * stepDeg; // deg
                const rawAngle = -thetaWorld * w * rotatefactor; // only flatten near center
                const faceRotateDeg = Math.max(
                  -maxFace,
                  Math.min(maxFace, rawAngle)
                );

                // Depth effects
                const nearCenter =
                  1 - Math.min(1, Math.abs(yToCenter) / (spacing * 1.2));
                const opacity = 0.25 + 0.75 * nearCenter;
                const scale = 0.9 + 0.12 * nearCenter;
                const isActive = Math.abs(yToCenter) < 0.5; // essentially centered after snap

                return (
                  <div
                    key={item.id ?? i}
                    className="absolute left-1/2 top-1/2"
                    style={{
                      width: cw,
                      transformStyle: "preserve-3d",
                      transform: `
                      translate(-50%,-50%)
                      rotateY(${angleDegCurved}deg)
                      translateZ(${-effectiveTranslateZ}px)
                      translateY(${yLocal}px)
                    `,
                      willChange: "transform",
                      zIndex: 300,
                    }}
                  >
                    <motion.div
                      key={item.id ?? i}
                      initial={{ opacity: 0, rotateY: faceRotateDeg, scale }}
                      animate={{
                        opacity, // computed earlier
                        rotateY: faceRotateDeg, // number (deg) — framer will apply as rotateY
                        scale, // number
                      }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{
                        opacity: { duration: 0.25 },
                        rotateY: {
                          type: "spring",
                          stiffness: 300,
                          damping: 78,
                        },
                        scale: { type: "spring", stiffness: 600, damping: 50 },
                      }}
                      className="h-full w-full"
                      style={{
                        transformStyle: "preserve-3d", // keep child 3D
                        willChange: "transform, opacity",
                      }}
                    >
                      <Card item={item} isActive={isActive} />
                    </motion.div>
                  </div>
                );
              })}
            </motion.div>
          </div>

          {/* HUD label */}
          {data[activeIndex] && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center pointer-events-none z-50">
              <div
                className="px-3 py-1 rounded border text-xs font-mono backdrop-blur-sm"
                style={{
                  borderColor: THEME.border,
                  color: THEME.neon,
                  background: "rgba(0,10,0,0.5)",
                  textShadow: `0 0 8px ${THEME.glow}`,
                }}
              >
                {data[activeIndex]?.year ?? ""} —{" "}
                {data[activeIndex]?.type ?? ""}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
