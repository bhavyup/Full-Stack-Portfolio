"use client";

import React, {
  Children,
  cloneElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";

const CRT_STYLE_ID = "crt-dock-styles";

const prefetched = new Set();
const prefetchMap = {
  "experience": () => import("@/components/ExperienceSection"),
  "skills": () => import("@/components/SkillsSection"),
  "projects": () => import("@/components/ProjectsSection"),
};
function prefetchRoute(href = "") {
  const key = Object.keys(prefetchMap).find((k) => href.includes(k));
  if (!key || prefetched.has(key)) return;
  prefetched.add(key);
  prefetchMap[key]().catch(() => prefetched.delete(key));
}
// CSS for the CRT effect + tiny overrides for vertical orientation
const CRT_STYLE = `
:root{
  --crt-green: #00ff41;
  --crt-teal-dock: #00d6b840;
  --crt-teal: #00d6b8;
  --dock-bg: rgba(2,6,2,0.45);
  --dock-border: rgba(0,255,65,0.08);
  --dock-inner: rgba(0,0,0,0.45);
}

.crt-noise {
  background-image: radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 6px 6px;
  opacity: 0.06;
  pointer-events: none;
}

.crt-dock {
  position: relative;
  background: linear-gradient(180deg, rgba(0,8,0,0.45), rgba(0,0,0,0.30));
  border: 1px solid var(--crt-teal-dock);
  box-shadow:
    0 10px 30px rgba(0,0,0,0.6),
    inset 0 1px 0 rgba(255,255,255,0.02);
  backdrop-filter: blur(6px) saturate(120%);
  z-index: 40;
}

.crt-dock::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(0,0,0,0) 50%, rgba(0,0,0,0.06) 50%),
    linear-gradient(90deg, rgba(255,0,0,0.02), rgba(0,255,0,0.02), rgba(0,0,255,0.02));
  background-size: 100% 4px, 3px 100%;
  mix-blend-mode: overlay;
  opacity: 0.35;
  pointer-events: none;
  border-radius: 12px;
}

.crt-item {
  position: relative;
  background: linear-gradient(180deg, rgba(0,8,0,0.9), rgba(0,0,0,0.7));
  border-radius: 9999px;
  border: 1px solid rgba(0,255,65,0.06);
  box-shadow:
    0 6px 18px rgba(0,0,0,0.6),
    inset 0 1px 0 rgba(255,255,255,0.02);
  transition: transform 140ms ease, box-shadow 140ms ease, border-color 120ms;
  will-change: transform;
  z-index: 2;
  overflow: visible;
}

.crt-item::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px);
  background-size: 100% 20px;
  opacity: 0.03;
  border-radius: inherit;
}

.crt-icon-wrap {
  width: 100%;
  height: 100%;
  display:flex;
  align-items:center;
  justify-content:center;
}
.crt-icon {
  color: var(--crt-green);
  display:flex;
  align-items:center;
  justify-content:center;
  filter: drop-shadow(0 3px 6px rgba(0,0,0,0.6));
}

.crt-item:focus,
.crt-item:hover,
.crt-item[aria-pressed="true"],
.crt-item.is-active {
  transform: translateY(-6px) scale(1.08);
  border-color: rgba(0,255,65,0.5);
  box-shadow:
    0 12px 30px rgba(0,0,0,0.65),
    0 0 18px rgba(0,255,65,0.06),
    inset 0 0 24px rgba(0,255,65,0.02);
  outline: 1px solid rgba(0,255,65,0.12);
}

.crt-item:after {
  content: "";
  position: absolute;
  inset: -6px;
  border-radius: 9999px;
  pointer-events: none;
  box-shadow: 0 0 30px rgba(0,255,65,0.06), 0 0 8px rgba(0,255,65,0.04);
  opacity: 0;
  transition: opacity 120ms;
}
.crt-item:hover:after, .crt-item.is-active:after { opacity: 1; }

.crt-item.is-active .crt-icon { color: var(--crt-teal); filter: drop-shadow(0 6px 12px rgba(0,214,184,0.14)); }

.crt-label {
  background: rgba(2,8,2,0.6);
  border: 1px solid rgba(0,255,65,0.06);
  color: var(--crt-green);
  font-family: "Fira Code", monospace;
  letter-spacing: 0.6px;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  text-shadow: 0 1px 0 rgba(0,0,0,0.5);
  z-index: 60;
  pointer-events: none;
}

/* --- Vertical dock specific overrides --- */
.crt-dock.vertical {
  border-radius: 14px;
}
.crt-dock.vertical .crt-item:focus,
.crt-dock.vertical .crt-item:hover,
.crt-dock.vertical .crt-item[aria-pressed="true"],
.crt-dock.vertical .crt-item.is-active {
  /* pop outward horizontally a little instead of moving vertically */
  transform: scale(1.18);
}

.crt-dock.vertical .crt-item:after {
  inset: -6px;
}

/* label for vertical: show to the right of icons */
.crt-dock.vertical .crt-label {
  left: calc(100% + 8px) !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
}

@media (prefers-reduced-motion: reduce) {
  .crt-item, .crt-dock { transition: none !important; transform: none !important; }
}
`;

function ensureCrtStyle() {
  if (typeof document === "undefined") return;
  if (document.getElementById(CRT_STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = CRT_STYLE_ID;
  s.textContent = CRT_STYLE;
  document.head.appendChild(s);
}

const CLICK_BEEP_BASE64 =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";

function DockItem({
  children,
  className = "",
  onClick,
  mouseY,
  spring,
  distance,
  magnification,
  baseItemSize,
  isActive = false,
  itemIndex,
  itemOnClickPlaySound = true,
  onMouseEnter,
  onTouchStart,
}) {
  const ref = useRef(null);
  const isHovered = useMotionValue(0);

  // compute vertical distance between mouse Y and item's center (for vertical dock)
  const mouseDistance = useTransform(mouseY, (val) => {
    const rect = ref.current?.getBoundingClientRect() ?? {
      top: 0,
      height: baseItemSize,
    };
    return val - rect.top - baseItemSize / 2;
  });

  // map distance to size (vertical axis)
  const targetSize = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [baseItemSize, magnification, baseItemSize]
  );
  const size = useSpring(targetSize, spring);

  const audioRef = useRef(null);
  useEffect(() => {
    if (typeof Audio !== "undefined") {
      audioRef.current = new Audio(CLICK_BEEP_BASE64);
      audioRef.current.volume = 0.08;
    }
  }, []);

  const handleClick = (e) => {
    if (audioRef.current && itemOnClickPlaySound) {
      try {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      } catch {}
    }
    if (typeof onClick === "function") onClick(e);
  };

  const inner = Children.map(children, (child) => {
    try {
      return cloneElement(child, { isHovered: isHovered, isActive });
    } catch {
      return child;
    }
  });

  return (
    <motion.div
      ref={ref}
      style={{
        width: size,
        height: size,
        minWidth: baseItemSize,
        minHeight: baseItemSize,
      }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onClick={handleClick}
      className={`relative flex items-center justify-center rounded-full crt-item ${className} ${
        isActive ? "is-active" : ""
      }`}
      tabIndex={0}
      role="button"
      aria-pressed={isActive}
      aria-label={`dock-item-${itemIndex}`}
      onMouseEnter={onMouseEnter}
      onTouchStart={onTouchStart}
    >
      {inner}
    </motion.div>
  );
}

function DockLabel({ children, className = "", isHovered }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isHovered || typeof isHovered.on !== "function") return;
    const unsubscribe = isHovered.on("change", (latest) => {
      setIsVisible(latest === 1);
    });
    return () => unsubscribe();
  }, [isHovered]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 0 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 0 }}
          transition={{ duration: 0.18 }}
          className={`${className} absolute left-1/2 w-fit whitespace-pre rounded-md crt-label`}
          role="tooltip"
          style={{ x: "-50%" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DockIcon({ children, className = "" }) {
  return (
    <div
      className={`flex items-center justify-center crt-icon-wrap ${className}`}
    >
      <div className="crt-icon">{children}</div>
    </div>
  );
}

// Main Dock component (vertical, left)
export default function Dock({
  items = [],
  className = "",
  spring = { mass: 0.1, stiffness: 140, damping: 12 },
  magnification = 72, // How large items get when hovered
  distance = 220, // The area of effect for magnification (vertical pixels)
  panelWidth = 64, // collapsed dock width
  dockWidth = 240, // expanded dock width when hovered
  baseItemSize = 54,
  matchModeDefault = "strict", // 'strict' or 'prefix' for URL matching
}) {
  const navBusy = useRef(false);

  useEffect(() => {
    ensureCrtStyle();
  }, []);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // release lock on path change
    navBusy.current = false;
  }, [location?.pathname, location?.hash]);

  const initialActive = useMemo(() => {
    const idx = items.findIndex((it) => !!it.isActive);
    return idx >= 0 ? idx : -1;
  }, [items]);

  const [activeIndex, setActiveIndex] = useState(initialActive);

  // vertical mouse value
  const mouseY = useMotionValue(Infinity);
  const isHovered = useMotionValue(0);

  const maxWidth = useMemo(
    () => Math.max(dockWidth, magnification + magnification / 2 + 4),
    [magnification, dockWidth]
  );
  const widthRow = useTransform(isHovered, [0, 1], [panelWidth, maxWidth]);
  useSpring(widthRow, spring);

  const dockRef = useRef(null);

  // how many pixels *outside* the dock should still count as "close".
  // reduce this to 0 if you want no tolerance. 5-8 was your problematic range,
  // so try 2 or 0 to eliminate that behavior.
  const proximity = 2;

  // replace previous onMouseMove inline handler with this function:
  const handleMouseMove = (e) => {
    // e is a MouseEvent (we'll rely on client coords)
    const rect = dockRef.current?.getBoundingClientRect();
    if (!rect) {
      isHovered.set(1);
      mouseY.set(e.clientY);
      return;
    }

    // For a vertical (left) dock:
    // require mouse to be within rect horizontally (left..right) ± proximity
    // and vertically between top..bottom ± proximity
    const withinX =
      e.clientX >= rect.left - proximity && e.clientX <= rect.right + proximity;
    const withinY =
      e.clientY >= rect.top - proximity && e.clientY <= rect.bottom + proximity;

    if (withinX && withinY) {
      isHovered.set(1);
      mouseY.set(e.clientY);
    } else {
      isHovered.set(0);
      mouseY.set(Infinity);
    }
  };

  // Normalize URL paths for matching (same as before)
  const normalizeForMatch = (raw) => {
    if (!raw) return "/";
    if (raw.startsWith("#")) {
      const base =
        (window?.location?.pathname || "/").replace(/\/+$/, "") || "/";
      return base + raw;
    }
    try {
      const url = new URL(raw, window.location.origin);
      raw = url.pathname + (url.hash || "");
    } catch (e) {}
    raw = raw.split("?")[0];
    const [pathPart, hashPart] = raw.split("#");
    let path = (pathPart || "").replace(/\/+$/, "");
    if (path === "") path = "/";
    return path + (hashPart ? "#" + hashPart : "");
  };

  const matchesHref = (itemHref, currentFull, matchMode = "strict") => {
    if (!itemHref) return false;
    const nh = normalizeForMatch(itemHref);
    const nc = normalizeForMatch(currentFull);

    if (matchMode === "strict") {
      return nh === nc;
    }
    if (nh === "/") return nc === "/";
    if (nc === nh) return true;
    if (nc.startsWith(nh + "/")) return true;
    return false;
  };

  useEffect(() => {
    const rawPathname =
      (location && location.pathname) || window.location.pathname || "/";
    const rawHash = (location && location.hash) || window.location.hash || "";
    const currentFull = rawPathname + (rawHash || "");

    const idx = items.findIndex((it) => {
      const mode = it?.match || matchModeDefault || "strict";
      return matchesHref(it.href, currentFull, mode);
    });

    setActiveIndex(idx >= 0 ? idx : -1);
  }, [location?.pathname, location?.hash, items, matchModeDefault]);

  const navigateToItem = (item, index) => {
    if (typeof item.onClick === "function") {
      try {
        item.onClick();
      } catch {}
      setActiveIndex(index);
      return;
    }

    if (item.href) {
      try {
        navigate(item.href);
        setActiveIndex(index);
        return;
      } catch (err) {
        window.location.href = item.href;
      }
    } else {
      setActiveIndex(index);
    }
  };

  return (
    // wrapper: fixed left, vertically centered
    <motion.div className="fixed left-4 top-1/2 z-50 transform -translate-y-1/2 pointer-events-none">
      <motion.div
        ref={dockRef}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          isHovered.set(0);
          mouseY.set(Infinity);
        }}
        className={`${className} flex flex-col items-start gap-4 rounded-2xl crt-dock vertical pointer-events-auto relative`}
        style={{ width: panelWidth }}
        role="toolbar"
        aria-label="Application dock"
      >
        <motion.div className="crt-noise absolute inset-0 pointer-events-none rounded-2xl" />

        {/* animate width of dock to accommodate magnified icons */}
        <motion.div
          style={{ width: widthRow }}
          className="overflow-visible p-3"
        >
          <div className="flex flex-col items-start gap-3">
            {items.map((item, index) => {
              const itemClass = item.className || "";
              const currentFull =
                (location?.pathname || "/") + (location?.hash || "");
              const currentPath = normalizeForMatch(currentFull);
              const targetPath = normalizeForMatch(item.href);
              const isCurrent = currentPath === targetPath;
              const clickCooldown = useRef(0);
              const btnOnClick = () => {
                const now = performance.now();
                if (now - clickCooldown.current < 250) return;
                clickCooldown.current = now;

                prefetchRoute(item.href);
                if (isCurrent || navBusy.current) return;
                navBusy.current = true;
                requestAnimationFrame(() => navigateToItem(item, index));
              };

              return (
                <DockItem
                  key={index}
                  onClick={btnOnClick}
                  onMouseEnter={() => prefetchRoute(item.href)}
                  onTouchStart={() => prefetchRoute(item.href)}
                  className={item.className || ""}
                  mouseY={mouseY}
                  spring={spring}
                  distance={distance}
                  magnification={magnification}
                  baseItemSize={baseItemSize}
                  isActive={index === activeIndex}
                  itemIndex={index}
                  itemOnClickPlaySound={item.itemOnClickPlaySound !== false}
                >
                  <DockIcon>{item.icon}</DockIcon>
                  <DockLabel>{item.label}</DockLabel>
                </DockItem>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
