import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";

const ExperienceSection = lazy(() => import("../components/ExperienceSection")); // SAME PATH AS App.js

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

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function normalizeExperience(raw) {
  if (!raw) return [];
  const arr = Array.isArray(raw)
    ? raw
    : Array.isArray(raw.items)
    ? raw.items
    : raw.timeline
    ? raw.timeline
    : [];
  return arr.map((e, i) => {
    const tn = typeof e.t === "number" ? e.t : parseFloat(e.t);
    const t = Number.isFinite(tn)
      ? Math.max(0, Math.min(1, tn))
      : arr.length > 1
      ? i / (arr.length - 1)
      : 0.5;
    const id = e.id != null ? `${e.id}-${i}` : `xp-${i}`;

    return {
      id,
      title: e.title ?? e.role ?? "Untitled",
      company: e.company ?? e.org ?? e.organization ?? "",
      start:
        (e.start
          ? months[parseInt(String(e.start).slice(5, 7))] +
            " " +
            String(e.start).slice(0, 4)
          : e.from) ?? "",
      end:
        (e.end
          ? months[parseInt(String(e.end).slice(5, 7))] +
            " " +
            String(e.end).slice(0, 4)
          : e.to) ?? "Present",
      img: e.img ?? e.logo ?? e.companyLogo ?? null,
      description: e.description ?? e.details ?? "",
      t,
      year:
        e.year ??
        (e.start
          ? String(e.start).slice(0, 4)
          : e.from
          ? String(e.from).slice(0, 4)
          : `Y${i + 1}`),
      bullets: Array.isArray(e.bullets)
        ? e.bullets
        : Array.isArray(e.description)
        ? e.description
        : [],
      tech: e.tech ?? e.technologies ?? e.stack ?? [],
      raw: e,
    };
  });
}

export default function ExperienceKeepAlive({ show, data }) {
  const [mounted, setMounted] = useState(false);

  const experience = useMemo(() => normalizeExperience(data), [data]);

  // Pre-mount on idle (so first visit is smooth)
  useEffect(() => {
    if (mounted) return;
    const mount = () => setMounted(true);
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(mount, { timeout: 1500 });
      return () => window.cancelIdleCallback?.(id);
    } else {
      const id = setTimeout(mount, 800);
      return () => clearTimeout(id);
    }
  }, [mounted]);

  const [showTick, setShowTick] = useState(0);
  useEffect(() => {
    if (show) setShowTick((t) => t + 1);
  }, [show]);

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0"
      style={{
        zIndex: 9999, // above everything
        pointerEvents: show ? "auto" : "none",
        visibility: show ? "visible" : "hidden",
      }}
    >
      <ErrorBoundary fallback={<LoadingScreen />}>
        <Suspense fallback={<LoadingScreen />}>
          <ExperienceSection
            visible={show}
            showTick={showTick}
            data={experience}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
