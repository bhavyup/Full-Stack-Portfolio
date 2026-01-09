import React, { lazy, Suspense, useEffect, useMemo, useState, startTransition } from "react";

const Section = lazy(() => import("../components/HeroSection"));

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
  zIndex = 20,
  hideMode = "visibility", // or "display"
  className = "",
  style = {},
  profile,
  skills,
  projects,
}) {
  useEffect(() => {
    const prefetch = () => {
      import("@/components/ui/Socials").catch(() => {});
      import("../components/HeroSection").catch(() => {});
      import("@/components/ui/FlappyCat").catch(() => {});
      import("@/components/ui/TargetCursor").catch(() => {});
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
      {...(!show ? { inert: "" } : {})}
      style={{
        zIndex,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        ...hiddenStyles,
        ...style,
        transition: "all 0.28s ease-out",
        isolation: "isolate",
      }}
    >
      <ErrorBoundary fallback={<LoadingScreen />}>
        <Suspense fallback={<div className="h-screen w-full bg-[#030907]" />}>
          <Section visible={show} showTick={showTick} profile={profile} skills={skills} projects={projects} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
