"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { X } from "lucide-react";
import { publicApi } from "../utils/api";
import { portfolioData } from "../mock";
import Timeline from "./ui/timeline";
import Pcard from "./ui/ProjectCard";
import { ArrowDown, Github, Radio } from "lucide-react";
import LightRays from "./ui/LightRays/LightRays";
import GradientText from "@/ui/TextAnimations/GradientText/GradientText";
import ShinyText from "./ui/ShinyText";

/* ---------------- helpers (unchanged) ---------------- */
function normalizeProjects(data) {
  if (!data) return [];
  const raw = Array.isArray(data) ? data : data?.data ?? data;
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((p, i) => {
      const images =
        p.images ?? (p.gallery ? p.gallery : p.image ? [p.image] : []);
      const tags = p.technologies ?? p.tags ?? p.tech ?? [];
      const year =
        p.year ?? (p.date ? new Date(p.date).getFullYear() : undefined);
      return {
        id: p.id ?? `project-${i}`,
        title: p.title ?? p.name ?? `Project ${i + 1}`,
        description: p.description ?? p.summary ?? "",
        details: p.details ?? p.long ?? p.description ?? "",
        images,
        thumb: images[0] ?? null,
        tags,
        repo: p.githubUrl ?? p.repo ?? p.code ?? null,
        live: p.liveUrl ?? p.live ?? p.url ?? null,
        status: p.status ?? (p.completed ? "completed" : "coming-soon"),
        year,
        featured: !!p.featured,
        score: p.score ?? Math.round((tags.length / 10) * 99 + 10),
      };
    });
  }
  return Object.keys(raw).map((k, i) => {
    const p = raw[k] || {};
    return {
      id: p.id ?? k,
      title: p.title ?? k,
      description: p.description ?? "",
      details: p.details ?? "",
      images: p.images ?? (p.image ? [p.image] : []),
      thumb: (p.images && p.images[0]) ?? p.image ?? null,
      tags: p.technologies ?? p.tags ?? [],
      repo: p.githubUrl ?? p.repo ?? null,
      live: p.liveUrl ?? p.live ?? null,
      status: p.status ?? (p.completed ? "completed" : "coming-soon"),
      year: p.year ?? undefined,
      featured: !!p.featured,
      score: p.score ?? Math.round(Math.random() * 80 + 10),
    };
  });
}

function useProjects(fetcher) {
  const [state, setState] = useState({
    loading: true,
    data: null,
    error: null,
  });
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let res = null;
        if (typeof fetcher === "function") res = await fetcher();
        else if (publicApi?.getProjects) res = await publicApi.getProjects();
        if (!alive) return;
        setState({
          loading: false,
          data: res ?? portfolioData.projects ?? [],
          error: null,
        });
      } catch (err) {
        if (!alive) return;
        setState({
          loading: false,
          data: portfolioData.projects ?? [],
          error: err?.message ?? "Failed",
        });
      }
    })();
    return () => (alive = false);
  }, [fetcher]);
  return state;
}

/* ---------------- small UI pieces (kept) ---------------- */
function CRTHeader({ title = "Projects", subtitle = "", hint = "" }) {
  return (
    <header className="mb-8 select-none">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.0 }}
        className="flex items-center gap-4"
      >
        <div>
          <h2
            className="text-4xl font-extrabold"
            style={{ color: THEME.neon, textShadow: `0 0 12px ${THEME.glow}` }}
          >
            <GradientText
              colors={["#00ff41", "#00ff4165", "#00ff41"]}
              animationSpeed={6}
              className="!text-4xl !font-extrabold"
              style={{
                color: THEME.neon,
                textShadow: `0 0 12px ${THEME.glow}`,
              }}
            >
              {title}
            </GradientText>
          </h2>
          <ShinyText
            className="text-sm text-sky-200/60 mt-1 max-w-2xl"
            text={subtitle}
          />
        </div>
      </motion.div>

      <div className="mt-4 h-0.5 relative overflow-hidden rounded">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-400/30 to-transparent opacity-60 animate-[scanline_2.6s_linear_infinite]" />
        <style>{`@keyframes scanline { 0% { transform: translateX(-120%);} 100% { transform: translateX(120%);} }`}</style>
      </div>

      {hint && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.0 }}
          className="mt-3 text-xs text-sky-200/50 font-mono"
        >
          <ShinyText text={hint} speed={3} className="text-xs text-sky-200/50 font-mono" />
        </motion.div>
      )}
    </header>
  );
}
function FilterChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative inline-flex items-center gap-2 px-3 py-1 rounded-md font-mono text-xs transition-all ${
        active ? "bg-[rgba(0,255,65,0.06)] border" : "bg-black/10 border"
      } outline-none focus:outline-none hover:bg-[rgba(0,255,65,0.06)] hover:border`}
      style={{
        borderColor: THEME.border,
        color: active ? THEME.neon : "rgba(200,255,220,0.8)",
      }}
    >
      <span className="truncate">{label}</span>
      {active && (
        <span
          style={{
            width: 8,
            height: 8,
            background: THEME.neon,
            boxShadow: `0 0 8px ${THEME.glow}`,
          }}
          className="rounded-full inline-block"
        />
      )}
    </button>
  );
}

/* ---------------- ProjectCard + Modal (unchanged) ---------------- */

const THEME = {
  neon: "#00ff41",
  deep: "#021009",
  glow: "rgba(0,255,65,0.14)",
  border: "rgba(0,255,65,0.06)",
  text: "#c7ffd0",
  yellow: "#fbbf24",
};

/**
 * SitePreview - iframe-first preview with snapshot fallback and controls
 * - Always mounts an iframe when url is truthy (so it appears in Elements)
 * - Allows forcing a snapshot image, and switching to images
 */
function SitePreviewm({
  url,
  fallbackSrc,
  className = "",
  style = {},
  onLoaded,
}) {
  const iframeRef = useRef(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [showSnapshot, setShowSnapshot] = useState(false);
  const [triedOnce, setTriedOnce] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    setIframeLoaded(false);
    setShowSnapshot(false);
    setTriedOnce(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // give iframe a chance to load; if it doesn't onLoad within timeout we mark "tried"
    timeoutRef.current = setTimeout(() => {
      setTriedOnce(true);
      console.debug("[SitePreview] iframe timeout reached for", url);
    }, 1800);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [url]);

  const onIframeLoad = () => {
    setIframeLoaded(true);
    setTriedOnce(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    console.debug("[SitePreview] iframe onLoad for", url);
    if (onLoaded) onLoaded();
  };

  return (
    <div
      className={`relative w-full h-[382px] overflow-hidden bg-black/20 ${className}`}
      style={style}
    >
      {/* Always mount iframe unless snapshot explicitly shown */}
      {url && !showSnapshot && (
        <iframe
          ref={iframeRef}
          src={url}
          className="border-0 overflow-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          title={`preview-${url}`}
          onLoad={onIframeLoad}
          sandbox="allow-forms allow-scripts allow-popups allow-same-origin"
          style={{
            width: "1280px",
            height: "500px",
            border: "none",
            display: "block",
            position: "relative",
            zIndex: 50,
            pointerEvents: "auto",
            transform: "translateZ(0) scale(0.77)",
            transformOrigin: "top left",
            willChange: "transform, opacity",
          }}
        />
      )}

      {/* Fallback snapshot (forced by user toggle) */}
      {(!url || showSnapshot) && (
        <img
          src={fallbackSrc}
          alt={`snapshot ${url}`}
          className="w-full h-full object-cover"
          style={{ display: "block", position: "relative", zIndex: 10 }}
          onError={(e) => {
            e.currentTarget.src =
              "data:image/svg+xml;charset=utf-8," +
              encodeURIComponent(
                `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='480'><rect fill='#020200' width='100%' height='100%'/><text fill='#7cff9a' font-size='20' x='24' y='40'>Preview not available</text></svg>`
              );
          }}
        />
      )}

      {/* Badges */}
      <div style={{ position: "absolute", left: 10, bottom: 10, zIndex: 60 }}>
        {showSnapshot ? (
          <div className="px-2 py-0.5 text-xs rounded bg-yellow-600/80 text-black">
            Snapshot
          </div>
        ) : iframeLoaded ? (
          <div className="px-2 py-0.5 text-xs rounded bg-green-600/80 text-black">
            Live
          </div>
        ) : (
          <div className="px-2 py-0.5 text-xs rounded bg-black/60 text-[#bfffb8]">
            Loading
          </div>
        )}
      </div>

      {/* Controls: Open / Toggle Snapshot */}
      <div
        style={{ position: "absolute", right: 8, bottom: 8, zIndex: 60 }}
        className="flex gap-2"
      >
        {url && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowSnapshot((s) => !s);
            }}
            className="px-2 py-1 text-xs rounded bg-black/70 text-[#bfffb8] outline-none focus:outline-none"
            title="Toggle snapshot"
          >
            {showSnapshot ? "Show Live" : "Snapshot"}
          </button>
        )}
      </div>
    </div>
  );
}

export function ProjectModal({ project, onClose }) {
  const [idx, setIdx] = useState(0);
  const [viewMode, setViewMode] = useState("images"); // "iframe" | "images"

  useEffect(() => {
    // reset index and default view when a project is provided
    if (project) {
      setIdx(0);
      setViewMode(project?.live ? "iframe" : "images");
    }
  }, [project]);

  // only attach keyboard listener while modal is open (improves responsiveness)
  useEffect(() => {
    if (!project) return; // don't attach when closed

    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIdx((i) => i + 1);
      if (e.key === "ArrowLeft") setIdx((i) => i - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [project, onClose]);

  const imgs =
    project?.images && project.images.length
      ? project.images
      : project?.thumb
      ? [project.thumb]
      : [];
  const safeIdx =
    imgs.length > 0
      ? ((idx % Math.max(1, imgs.length)) + imgs.length) % imgs.length
      : 0;

  const mdRender = (text) => {
    if (!text) return null;
    return text.split("\n\n").map((b, i) => (
      <p key={i} className="text-sm text-sky-200/85 mb-3">
        {b}
      </p>
    ));
  };

  // NOTE: we do NOT `return null` when project is falsy.
  // ProjectModal remains mounted so AnimatePresence can run exit animations.
  return (
    <AnimatePresence mode="wait">
      {project && (
        <motion.div
          key={project.id}
          className="fixed inset-0 z-[90] flex items-center justify-center p-6"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          transition={{ duration: 0.6 }}
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={onClose}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
            className="max-w-5xl w-full rounded-xl overflow-hidden bg-black/70 border"
            style={{ borderColor: THEME.border }}
          >
            <div className="grid grid-cols-1 gap-4 p-4">
              <div className="lg:col-span-3">
                <div className="relative bg-black/20 rounded overflow-hidden min-h-[382px]">
                  {project.live && viewMode === "iframe" ? (
                    <SitePreviewm
                      url={project.live}
                      fallbackSrc={imgs[safeIdx] || project.thumb}
                      className="w-full"
                    />
                  ) : imgs.length ? (
                    <>
                      <img
                        src={imgs[safeIdx]}
                        alt={`${project.title} ${safeIdx + 1}`}
                        className="w-full h-[400px]"
                      />
                      {imgs.length > 1 && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIdx((i) => i - 1);
                            }}
                            className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 p-2 rounded z-40"
                          >
                            ◀
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIdx((i) => i + 1);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 p-2 rounded z-40"
                          >
                            ▶
                          </button>
                        </>
                      )}
                      <div
                        className="absolute left-4 bottom-4 p-1 rounded bg-black/30 border z-40"
                        style={{ borderColor: THEME.border }}
                      >
                        <div className="text-xs font-mono text-sky-100/80">
                          {safeIdx + 1} / {imgs.length}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-72 flex items-center justify-center text-sky-200/40">
                      No preview
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="mt-4">
                      <h3 className="text-2xl font-semibold text-[#befcb6]">
                        {project.title}
                      </h3>
                      <div className="text-xs text-sky-200/60 font-mono mt-1">
                        {(project.tags || []).join(" · ")}
                      </div>
                    </div>

                    <div className="mt-4">
                      {mdRender(project.details || project.description)}
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-3">
                      {project.repo && (
                        <a
                          href={project.repo}
                          onClick={(e) => e.stopPropagation()}
                          target="_blank"
                          rel="noreferrer"
                          className="w-32 flex items-center justify-center gap-4 px-3 py-1.5 rounded-lg
                         bg-black/40 border border-sky-400/30
                         text-sky-200 text-xs font-mono font-medium
                         hover:bg-sky-500/10 hover:border-sky-400/60
                         hover:text-sky-100
                         transition-all duration-300 outline-none focus:outline-none"
                        >
                          <Github className="w-3.5 h-3.5" />
                          Repo
                        </a>
                      )}
                      <div className="text-xs text-sky-200/60">
                        Score: {Math.round(project.score)}%
                      </div>
                      {project.live && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(project.live, "_blank");
                          }}
                          className="w-32 flex items-center justify-center gap-4 px-3 py-1.5 rounded-lg
                         bg-gradient-to-r from-rose-500/80 to-red-500/80
                         text-black text-xs font-mono font-medium
                         shadow-md shadow-rose-500/30
                         hover:from-rose-400 hover:to-red-400
                         hover:shadow-rose-500/50
                         transition-all duration-300 outline-none focus:outline-none"
                        >
                          <Radio className="w-3.5 h-3.5 text-black" />
                          Live
                        </button>
                      )}
                    </div>
                  </div>
                  <div
                    className=" h-full rounded p-3 pb-0 border"
                    style={{ borderColor: THEME.border }}
                  >
                    <div className="text-xs text-sky-200/60 mb-2">
                      QUICK FACTS
                    </div>
                    <div className="text-sm text-sky-100/85">
                      <div>
                        <strong>Year:</strong> {project.year ?? "-"}
                      </div>
                      <div>
                        <strong>Status:</strong> {project.status}
                      </div>
                      <div>
                        <strong>Tech:</strong>{" "}
                        {(project.tags || []).join(", ") || "-"}
                      </div>
                    </div>
                    <div className="mt-7">
                      <button
                        onClick={onClose}
                        className="w-full flex items-center justify-center gap-3 px-3 py-2 rounded-lg
               bg-black/40 border border-emerald-400/30
               text-emerald-200 text-xs font-mono font-medium
               hover:bg-emerald-500/10 hover:border-emerald-400/60
               hover:text-emerald-100
               transition-all duration-300 outline-none focus:outline-none"
                      >
                        <X className="w-3.5 h-3.5" />
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ----------------- Main Component: timeline in-flow with placeholder & fixed-on-open ----------------- */
export default function ProjectsGodlyCRT({ fetcher = null }) {
  const { loading, data, error } = useProjects(fetcher);
  const projects = useMemo(() => normalizeProjects(data), [data]);
  const [page, setPage] = useState({ header: "", subtitle: "", tip: "" });

  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState(null);
  const [sort, setSort] = useState("featured");
  const [opened, setOpened] = useState(null);

  // timeline control
  const [timelineOpen, setTimelineOpen] = useState(false);
  const timelineRef = useRef(null);
  const placeholderRef = useRef(null);
  const savedScrollYRef = useRef(0);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await publicApi.getProjectsPage();
        if (response) {
          setPage({
            header: response.header,
            subtitle: response.subtitle,
            tip: response.tip,
          });
        }
      } catch (error) {
        console.error("Error fetching projects page content:", error);
      }
    };

    fetchContent();
  }, []);

  const tags = useMemo(() => {
    const map = new Map();
    projects.forEach((p) =>
      (p.tags || []).forEach((t) => map.set(t, (map.get(t) || 0) + 1))
    );
    return Array.from(map.keys()).sort();
  }, [projects]);

  const filtered = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    let list = projects.slice();
    if (tagFilter)
      list = list.filter((p) => (p.tags || []).includes(tagFilter));
    if (q)
      list = list.filter((p) =>
        (p.title + " " + (p.description || "") + " " + (p.tags || []).join(" "))
          .toLowerCase()
          .includes(q)
      );
    if (sort === "score") list.sort((a, b) => b.score - a.score);
    if (sort === "year") list.sort((a, b) => (b.year || 0) - (a.year || 0));
    if (sort === "alpha") list.sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }, [projects, tagFilter, query, sort]);

  const projectsByYear = projects.reduce((acc, project) => {
    const year = project.year || "Ongoing";
    if (!acc[year]) acc[year] = [];
    acc[year].push(project);
    return acc;
  }, {});
  const timelineData = Object.keys(projectsByYear)
    .sort((a, b) => b - a)
    .map((year) => ({
      title: year,
      content: (
        <div className="flex flex-col gap-8">
          {projectsByYear[year].map((p) => (
            <Pcard key={p.id} p={p} onInspect={setOpened} timeline={true} />
          ))}
        </div>
      ),
    }));

  /* ---------- helper: wait for smooth scroll to finish ---------- */
  function waitForScrollTo(targetY, timeout = 1000) {
    return new Promise((resolve) => {
      const start = performance.now();
      const check = () => {
        const cur = window.scrollY || window.pageYOffset || 0;
        if (Math.abs(cur - targetY) < 2) return resolve(true);
        if (performance.now() - start > timeout) return resolve(false);
        requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
  }

  useEffect(() => {
    if (!timelineOpen) return;

    // Wait until DOM paint so ref is available - use requestAnimationFrame to be sure
    let raf = requestAnimationFrame(async () => {
      if (!timelineRef.current) {
        // fallback: small delay / double-check
        await new Promise((r) => setTimeout(r, 8));
      }
      if (!timelineRef.current) return;

      // save scroll pos
      savedScrollYRef.current = window.scrollY || window.pageYOffset || 0;

      // compute absolute top of timeline element
      const rect = timelineRef.current.getBoundingClientRect();
      const topAbs = rect.top + (window.scrollY || 0);

      // smooth scroll there
      window.scrollTo({ top: topAbs, behavior: "smooth" });
      await waitForScrollTo(topAbs, 1000);

      // insert placeholder to keep layout
      const placeholder = document.createElement("div");
      const origHeight = timelineRef.current.getBoundingClientRect().height;
      placeholder.style.height = `${origHeight}px`;
      placeholder.setAttribute("data-timeline-placeholder", "true");
      timelineRef.current.parentNode.insertBefore(
        placeholder,
        timelineRef.current
      );
      placeholderRef.current = placeholder;

      // now make timeline fixed
      timelineRef.current.classList.add("pgc-timeline-fixed");
      // lock body scroll
      document.documentElement.style.scrollBehavior = "auto";
      document.body.style.overflow = "hidden";

      // restore smooth after a tick
      setTimeout(() => {
        document.documentElement.style.scrollBehavior = "";
      }, 60);
    });

    return () => cancelAnimationFrame(raf);
  }, [timelineOpen]);

  const openTimeline = useCallback(() => {
    setTimelineOpen(true);
  }, []);

  /* ---------- Close timeline: revert fixed -> re-enable body scroll -> smooth scroll up -> remove placeholder ---------- */
  const closeTimeline = useCallback(async () => {
    // If timelineRef not present just hide
    if (!timelineRef.current) {
      setTimelineOpen(false);
      return;
    }
    // Put timeline back into flow by removing fixed class (placeholder keeps layout)
    timelineRef.current.classList.remove("pgc-timeline-fixed");
    // re-enable body scroll BEFORE smooth-scrolling back
    document.body.style.overflow = "";

    // scroll back to previously saved position
    const prev = savedScrollYRef.current || 0;
    window.scrollTo({ top: prev, behavior: "smooth" });
    await waitForScrollTo(prev, 1000);

    // finally remove placeholder and hide timeline state
    if (placeholderRef.current && placeholderRef.current.parentNode) {
      placeholderRef.current.parentNode.removeChild(placeholderRef.current);
      placeholderRef.current = null;
    }
    setTimelineOpen(false);
  }, []);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (placeholderRef.current && placeholderRef.current.parentNode) {
        placeholderRef.current.parentNode.removeChild(placeholderRef.current);
      }
      document.body.style.overflow = "";
      document.documentElement.style.scrollBehavior = "";
    };
  }, []);

  const chipVariants = {
    hidden: { opacity: 0, y: -28, scale: 1.46 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        delay: i * 0.08, // stagger only entrance
        type: "spring",
        stiffness: 110,
        damping: 16,
      },
    }),
  };

  const ref = useRef(null);
  const isInView = useInView(ref, { amount: 0.99 });

  /* ---------------- render ---------------- */
  return (
    <section
      id="projects-godly-crt"
      className="relative w-full h-full text-sky-100"
      style={{ background: THEME.deep }}
    >
      {/* nebula / background */}
      <div
        className={`pointer-events-none fixed h-screen inset-0 bg-[#021000]`}
      >
        <LightRays
          raysOrigin="top-center"
          raysColor="#00ff41"
          raysSpeed={1.5}
          lightSpread={2}
          rayLength={1}
          fadeDistance={2}
          saturation={2}
          followMouse={true}
          mouseInfluence={0.9}
          noiseAmount={0.1}
          distortion={0.05}
        />
        <div className="fixed top-0 left-0 w-96 h-96 bg-green-500/10 rounded-full blur-3xl"></div>
        <div className="fixed -bottom-0 -right-0 w-[30rem] h-[30rem] bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="fixed -top-0 -right-0 w-96 h-96 bg-green-500/10 rounded-full blur-3xl"></div>
        <div className="fixed -bottom-0 -left-0 w-[30rem] h-[30rem] bg-emerald-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* subtle CRT scanlines & vignette */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `repeating-linear-gradient(0deg, rgba(255,255,255,0.01) 0px, rgba(255,255,255,0.01) 1px, transparent 1px, transparent 4px)`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 -z-9"
        style={{
          background: `radial-gradient(60% 40% at 20% 20%, rgba(0,255,65,0.02), transparent 15%), radial-gradient(40% 30% at 80% 70%, rgba(0,212,184,0.02), transparent 12%)`,
        }}
      />

      <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        <CRTHeader
          title={page.header}
          subtitle={page.subtitle}
          hint={page.tip}
        />

        {/* controls */}
        <div className="flex items-center gap-3 flex-wrap mb-6">
          <div className="flex items-center justify-between w-full gap-8">
            <motion.input
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1.0 }}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="search projects..."
              className="px-3 py-2 rounded bg-black/20 border border-green-500/15 focus:border-green-400/25 outline-none focus:outline-none w-full"
            />
            <motion.select
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1.0 }}
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="px-3 py-2 rounded bg-black/20 border outline-none focus:outline-none text-slate-400"
              style={{ borderColor: THEME.border }}
            >
              <option
                className="bg-[#021009] text-gray-200 border-black"
                value="score"
              >
                Top Score
              </option>
              <option className="bg-[#021009] text-gray-200" value="year">
                Newest
              </option>
              <option className="bg-[#021009] text-gray-200" value="alpha">
                A → Z
              </option>
            </motion.select>
          </div>

          <div
            className="flex items-center gap-2 flex-wrap"
            style={{ perspective: "800px" }} // 👈 apply perspective here
          >
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1.0 }}
            >
              <FilterChip
                label="All"
                active={!tagFilter}
                onClick={() => setTagFilter(null)}
              />
            </motion.div>

            {tags.slice(0, 12).map((t, i) => (
              <motion.div
                key={t}
                custom={i}
                variants={chipVariants}
                initial="hidden"
                animate="visible"
                whileHover={{
                  translateY: -2,
                  z: 10, // 👈 now this works
                  transition: { duration: 0.1, ease: "easeOut", delay: 0 },
                }}
                style={{
                  transformStyle: "preserve-3d", // keep 3D for children
                  willChange: "transform",
                }}
              >
                <FilterChip
                  key={t}
                  label={t}
                  active={tagFilter === t}
                  onClick={() => setTagFilter((x) => (x === t ? null : t))}
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* projects grid */}
        <div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.0 }}
            className="grid auto-rows-fr grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence initial={false} mode="wait">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-64 rounded-xl bg-black/20 animate-pulse"
                  />
                ))
              ) : filtered.length ? (
                filtered.map((p) => (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    key={p.id}
                    layout="preserve-aspect"
                  >
                    <Pcard key={p.id} p={p} onInspect={setOpened} />
                  </motion.div>
                ))
              ) : (
                <div className="text-sky-200/60">No matching projects.</div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Show Timeline button */}
          <motion.div
            ref={ref}
            animate={
              isInView
                ? { opacity: 1, y: 0, scale: 1 }
                : { opacity: 0, y: 20, scale: 0 }
            }
            initial={{ opacity: 0, y: 20, scale: 0 }}
            transition={{ duration: 0.6 }}
            className="mt-10 bottom-1 flex justify-center"
          >
            <button
              onClick={openTimeline}
              className="outline-none focus:outline-none font-mono text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-8 py-3 rounded-full transition-all duration-300 transform hover:scale-105 flex items-center gap-2 shadow-sm shadow-cyan-500/25"
              style={{
                background:
                  "linear-gradient(90deg, rgba(0,255,65,0.08), rgba(0,255,65,0.06))",
                border: `1px solid ${THEME.border}`,
                color: THEME.neon,
              }}
            >
              Explore My Timeline
              <ArrowDown className="w-4 h-4 animate-bounce" />
            </button>
          </motion.div>
        </div>
      </div>

      {/* TIMELINE (in-flow). We will toggle a CSS class to make it fixed-after-open */}
      <AnimatePresence mode="wait">
        {timelineOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={{ duration: 1.0 }}
            ref={timelineRef}
            className={`max-w-7xl mx-auto px-6 pb-12 pt-12 transition-all `}
            style={{ zIndex: 30 }}
          >
            <div className="rounded-xl border border-white/10 bg-black/40">
              <Timeline
                data={timelineData}
                scroll={timelineRef}
                timelineOpen={timelineOpen}
                closeTimeline={closeTimeline}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* project modal */}
      <ProjectModal project={opened} onClose={() => setOpened(null)} />

      {/* small CSS used to switch the timeline into a viewport-fixed, scrollable panel when open */}
      <style>{`
        .pgc-timeline-fixed {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          height: 100vh !important;
          overflow: auto !important;
          -webkit-overflow-scrolling: touch;
          z-index: 60 !important;
          background: transparent;
        }
      `}</style>
    </section>
  );
}
