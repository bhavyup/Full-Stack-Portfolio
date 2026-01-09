import React, { lazy, Suspense, useEffect, useMemo, useState, startTransition } from "react";
import { portfolioData } from "@/mock";

const Section = lazy(() => import("../components/SkillsSection"));

const makeSkillId = (catId, s, j) =>
  `${String(catId)}::${String(s.id || s.name || j).toLowerCase()}`;

/* Normalize incoming data (supports object map or array-of-categories) */
function normalizeSkills(info) {
  const data = info || portfolioData.skills || {};
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.map((c, i) => ({
      id: c.id || c.key || `cat-${i}`,
      label: (c.label || c.name || c.id || `Category ${i}`).replace(
        /[-_]/g,
        " "
      ),
      avg:
        c.skills && c.skills.length > 0
          ? Math.round(
              c.skills.reduce((a, b) => a + b.proficiency, 0) / c.skills.length
            )
          : 0,
      skills: (c.skills || c.items || []).map((s, j) => ({
        name: s.name || s.skill || `Skill ${j}`,
        proficiency: Number(s.proficiency ?? s.level ?? s.score ?? 0),
        desc: s.description || "",
        tags: s.tags || [],
        id: makeSkillId(c.id, s, j),
      })),
    }));
  }
  const cats = Object.keys(data || {});
  return cats.map((id) => ({
    id,
    label: id.replace(/[-_]/g, " "),
    avg:
      data[id] && data[id].length > 0
        ? Math.round(
            data[id].reduce((a, b) => a + b.proficiency, 0) / data[id].length
          )
        : 0,
    skills: (data[id] || []).map((s, j) => ({
      name: s.name || `Skill ${j}`,
      proficiency: Number(s.proficiency ?? s.level ?? s.score ?? 0),
      desc: s.description || "",
      tags: s.tags || [],
      id: makeSkillId(id, s, j),
    })),
  }));
}

function LoadingScreen() {
  return <div className="h-screen w-full bg-[#030907]" />;
}

function ErrorBoundary({ children, fallback = null }) {
  const [err, setErr] = useState(null);
  if (err) return fallback || <div className="h-screen w-full bg-[#030907]" />;
  return (
    <React.Suspense
      fallback={fallback}
      // Catch lazy-loading errors
      unstable_onError={(e) => {
        console.error("Experience lazy error:", e);
        setErr(e);
      }}
    >
      {children}
    </React.Suspense>
  );
}

export default function KeepAliveView({
  show,
  visible = true,
  zIndex = 20,
  hideMode = "visibility", // or "display"
  className = "",
  style = {},
  data,
}) {
  useEffect(() => {
    const prefetch = () => {
      import("@flodlc/nebula").catch(() => {});
      import("../components/SkillsSection").catch(() => {});
      import("@react-three/drei").then((n) => {n.Line, n.OrthographicCamera, n.Text}).catch(() => {});
      import("three").catch(() => {});
      import("@react-three/fiber").then((n) => {n.Canvas, n.useFrame, n.useThree}).catch(() => {});
    };
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(prefetch, { timeout: 1500 });
      return () => window.cancelIdleCallback?.(id);
    } else {
      const t = setTimeout(prefetch, 400);
      return () => clearTimeout(t);
    }
  }, []);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (mounted) return;
    const mount = () => setMounted(true);
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(mount, { timeout: 1500 });
      return () => window.cancelIdleCallback?.(id);
    } else {
      const t = setTimeout(mount, 800);
      return () => clearTimeout(t);
    }
  }, [mounted]);
  
  const categories = useMemo(() => normalizeSkills(data), [data]);


  // bump tick when showing again
  const [showTick, setShowTick] = useState(0);
  useEffect(() => {
    if (show) setShowTick((t) => t + 1);
  }, [show]);

  useEffect(() => {
    if (!mounted && show) {
      startTransition(() => {
        setMounted(true);
      });
    }
  }, [show, mounted]);

  if (!mounted) return null;

  const hiddenStyles =
    hideMode === "display"
      ? { display: show ? "block" : "none" }
      : {
          pointerEvents: show ? "auto" : "none",
          visibility: show ? "visible" : "hidden",
          opacity: show ? 1 : 0,
          contentVisibility: show ? "visible" : "auto",
        };

  return (
    <div
      key="skills-overlay"
      className={`fixed inset-0 ${className}`}
      style={{
        zIndex,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        // visibility: show ? "visible" : "hidden",
        // pointerEvents: show ? "auto" : "none",
        ...hiddenStyles,
        ...style,
        transition: "all 0.28s ease-out",
        //contain: "layout paint",
      }}
    >
      <ErrorBoundary fallback={<LoadingScreen />}>
        <Suspense fallback={<div className="h-screen w-full bg-[#030907]" />}>
          <Section visible={show} showTick={showTick} data={categories} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
