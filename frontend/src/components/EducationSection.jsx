"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Calendar,
  MapPin,
  Award,
  ExternalLink,
  BadgeCheck,
  ChevronRight,
} from "lucide-react";
import { publicApi } from "../utils/api";
import { portfolioData } from "../mock";
import SpiralTimeline from "./ui/RotatingTimeline";
import { motion, AnimatePresence } from "framer-motion";
import LetterGlitch from "./ui/LetterGlitch";
import GradientText from "@/ui/TextAnimations/GradientText/GradientText";
import ShinyText from "./ui/ShinyText";

const THEME = {
  neon: "#00ff41",
  glow: "rgba(0,255,65,0.22)",
  border: "rgba(0,255,65,0.10)",
  deep: "#021009",
};

// Normalize incoming api/mock into an array of entries
function normalizeEducation(data) {
  const raw = data || portfolioData.education || [];
  const asArray = Array.isArray(raw) ? raw : [raw];

  return asArray.filter(Boolean).map((e, i) => {
    // Accept a variety of possible fields
    const start = e.start || e.from || e.startYear || null;
    const end = e.end || e.to || e.year || null; // often a single year in original code
    return {
      id: e.id || `edu-${i}`,
      degree: e.degree || e.program || "Degree",
      program: e.program || "",
      institution: e.institution || e.school || "Institution",
      university: e.university || "",
      location: e.location || e.place || "",
      start,
      end,
      year: e.year || end || "",
      gpa: e.gpa || e.cgpa || null,
      progress: typeof e.progress === "number" ? e.progress : null, // if not provided, we calculate
      achievements: e.achievements || e.highlights || [],
      coursework: e.coursework || e.courses || [],
      link: e.link || e.url || null,
      logo: e.logo || null,
      verified: !!e.verified,
      type: e.type || null,
    };
  });
}

// If progress not provided, attempt a rough estimate from start/end years
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

export default function EducationSectionCRT() {
  const [education, setEducation] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await publicApi.getEducation?.();
        if (alive && res?.success && Array.isArray(res?.data)) {
          setEducation(normalizeEducation(res.data));
        } else {
          setEducation(normalizeEducation(portfolioData.education));
        }
      } catch (err) {
        // keep mock fallback
        console.error("Error fetching education:", err);
        setEducation(normalizeEducation(portfolioData.education));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const entries = useMemo(() => education || [], [education]);

  const active = entries[Math.max(0, Math.min(activeIdx, entries.length - 1))];

  const handleSelect = useCallback((idx) => setActiveIdx(idx), []);

  return (
    <section
      id="education"
      className="relative w-full overflow-hidden py-8 md:py-8 px-4 md:px-6"
      style={{ background: THEME.deep }}
    >
      <div
        className={`pointer-events-none fixed h-screen inset-0 bg-transparent`}
      >
        <LetterGlitch
          glitchSpeed={50}
          centerVignette={true}
          outerVignette={true}
          smooth={true}
        />
      </div>
      {/* CRT overlays */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 4px)",
          mixBlendMode: "soft-light",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(50% 60% at 50% 20%, rgba(0,255,65,0.05), transparent 60%)",
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="mb-4 !text-center select-none flex flex-col items-center justify-center"
        >
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded border text-xs font-mono"
            style={{
              borderColor: THEME.border,
              color: THEME.neon,
              boxShadow: `0 0 12px ${THEME.glow} inset`,
            }}
          >
            <BadgeCheck className="w-3.5 h-3.5 opacity-80" />
            ACADEMIC DOSSIER
          </div>
          <GradientText className="!text-center flex-1 flex justify-center" colors={["#00ff41", "#00ff4175", "#00ff41"]}>
            <h2
              className="mt-2 text-4xl md:text-5xl font-extrabold tracking-tight"
              style={{
                textShadow: `0 0 16px ${THEME.glow}`,
              }}
            >
              Education Matrix
            </h2>
          </GradientText>
          <ShinyText className="mt-2 text-sm text-emerald-200/60 font-mono" text="Verified credentials, coursework, and milestones"/>
          <div className="mt-6 h-px w-40 mx-auto bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="mb-8"
        >
          <SpiralTimeline data={entries} />
        </motion.div>

        {/* Layout: Left monitor + Right timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Status Monitor + Active Credential */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-7"
          >
            {entries.length > 1 && !loading ? (
              <div className="px-3 md:px-4 pb-4 ">
                <div
                  className="mt-2 border rounded-xl bg-black/80 p-3"
                  style={{ borderColor: THEME.border }}
                >
                  <div className="text-[11px] font-mono text-[#00ff41] mb-2">
                    Records
                  </div>
                  <div className="flex flex-col gap-2 max-h-48 overflow-auto pr-1">
                    {entries.map((e, idx) => {
                      const isActive = idx === activeIdx;
                      return (
                        <button
                          key={e.id}
                          onClick={() => handleSelect(idx)}
                          className={`w-full text-left px-2 py-2 rounded border transition ${
                            isActive
                              ? "bg-emerald-500/10"
                              : "hover:bg-emerald-500/5"
                          } outline-none focus:outline-none`}
                          style={{
                            borderColor: THEME.border,
                            boxShadow: isActive
                              ? `0 0 12px ${THEME.glow} inset`
                              : "none",
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm text-emerald-100/90 truncate">
                                {e.degree} {e.program && `in ${e.program}`}
                              </div>
                              <div className="text-[11px] text-emerald-300/60 truncate">
                                {e.institution}
                              </div>
                            </div>
                            <div className="text-[11px] text-emerald-300/60 flex items-center gap-1">
                              {formatRange(e)}
                              <ChevronRight className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </motion.div>

          {/* Right: Neon Timeline */}
          <div className="lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="rounded-xl border bg-black/40 backdrop-blur-md"
              style={{
                borderColor: THEME.border,
                boxShadow:
                  "0 0 0 1px rgba(255,255,255,0.04) inset, 0 12px 80px rgba(0,0,0,0.5)",
              }}
            >
              {/* Monitor header */}
              <div
                className="flex items-center justify-between px-4 md:px-5 py-3 border-b"
                style={{ borderColor: THEME.border }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                  <span className="text-xs font-mono text-[#00ff41] ">
                    Status: Online
                  </span>
                </div>
                <div className="text-[10px] md:text-xs font-mono text-[#00ff41]">
                  EDU/CRT v1.0
                </div>
              </div>

              {/* Active credential body */}
              <div className="p-5 md:p-6">
                {loading ? (
                  <MonitorSkeleton />
                ) : active ? (
                  <>
                    <div className="flex flex-col items-start justify-between">
                      <div className="text-lg w-full flex justify-center items-center font-bold text-emerald-100/80 ">
                        {active.degree}{" "}
                        {active.program && `in ${active.program}`}
                      </div>
                      <div className="text-emerald-300/50 w-full flex items-center justify-center text-sm gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatRange(active)}
                      </div>
                      <div className="relative w-full my-2 flex items-center justify-center">
                        {/* soft colored glow behind (purely decorative) */}
                        <div
                          aria-hidden
                          className="absolute inset-0 -z-10 rounded-md pointer-events-none"
                        />
                        {/* image with silhouette shadow */}
                        <img
                          src={active.logo}
                          alt="logo"
                          className="relative w-16 h-16 bg-black/40 object-contain opacity-100"
                        />
                      </div>
                      <div className="text-emerald-100/80 w-full flex flex-col items-center justify-center text-sm md:text-base">
                        {active.institution}
                        <br />
                        {active.university ? (
                          <span className="text-emerald-200/80 inline-flex items-center gap-1">
                            {active.university}
                          </span>
                        ) : null}
                        {active.location ? (
                          <span className=" text-emerald-300/40 inline-flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {active.location}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Gauge + stats */}
                    <div className="mt-6 grid grid-cols-3 gap-3">
                      <ProgressRing
                        value={computeProgress(active)}
                        label="Progress"
                        neon={THEME.neon}
                      />
                      <StatBlock label="GPA" value={active.gpa ?? "—"} />
                      <StatBlock
                        label="Verified"
                        value={active.verified ? "Yes" : "Pending"}
                      />
                    </div>

                    {/* Coursework chips */}
                    {active.coursework?.length ? (
                      <div className="mt-6">
                        <div className="text-xs font-mono text-emerald-300/60 mb-2">
                          Core Coursework
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {active.coursework.slice(0, 10).map((c) => (
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

                    {/* Achievements */}
                    {active.achievements?.length ? (
                      <div className="mt-6">
                        <div className="text-xs font-mono text-emerald-300/60 mb-2">
                          Highlights
                        </div>
                        <ul className="space-y-2">
                          {active.achievements.slice(0, 4).map((a, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <Award className="w-4 h-4 mt-0.5 text-emerald-400" />
                              <span className="text-sm text-emerald-100/90">
                                {a}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {/* Actions */}
                    <div className="mt-6 flex items-center justify-end">
                      <div className="text-[10px] font-mono text-emerald-300/50">
                        ID: {active.id}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-emerald-200/70">
                    No education data.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Style: glitch + scan */}
      <style>{`
        @keyframes crt-flicker { 
          0%, 100% { opacity: 0.98; } 
          50% { opacity: 1; } 
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 0 rgba(0,255,65,0); }
          50% { box-shadow: 0 0 22px ${THEME.glow}; }
        }
      `}</style>
    </section>
  );
}

function ProgressRing({ value = 0, label = "Progress", neon = "#00ff41" }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="col-span-3 sm:col-span-1">
      <div className="relative w-28 h-28 mx-auto">
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
            <div className="text-xl font-bold text-white">{clamped}%</div>
            <div className="text-[11px] font-mono text-emerald-300/70">
              {label}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StatBlock({ label, value }) {
  return (
    <div
      className="col-span-3 sm:col-span-1 rounded border p-3"
      style={{
        borderColor: "rgba(0,255,65,0.12)",
        background: "rgba(0,0,0,0.35)",
      }}
    >
      <div className="text-[11px] font-mono text-emerald-300/60">{label}</div>
      <div className="text-lg font-semibold text-white mt-1">{value}</div>
    </div>
  );
}

function TimelineItem({ entry }) {
  const progress = computeProgress(entry);
  return (
    <div className="relative pl-14 group">
      {/* Node */}
      <div
        className="absolute left-5 top-1.5 w-4 h-4 rounded-full bg-emerald-500/30 border"
        style={{
          borderColor: "rgba(0,255,65,0.35)",
          boxShadow: "0 0 18px rgba(0,255,65,0.25)",
        }}
      />
      <div className="absolute left-[22px] top-2 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />

      {/* Content */}
      <div
        className="rounded-lg border p-4 md:p-5 transition hover:-translate-y-0.5 hover:border-emerald-400/40"
        style={{
          borderColor: "rgba(0,255,65,0.12)",
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.35))",
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-base md:text-lg font-bold text-white">
              {entry.degree}
            </div>
            <div className="text-sm text-emerald-300/80">
              {entry.institution}
              {entry.location ? (
                <span className="ml-2 text-emerald-300/50 inline-flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {entry.location}
                </span>
              ) : null}
            </div>
            <div className="text-xs text-emerald-300/60 mt-1 inline-flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatRange(entry)}
            </div>
          </div>

          {/* Mini progress */}
          <div className="flex items-center gap-2">
            <div className="h-2 w-28 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, ${THEME.neon}, rgba(0,255,65,0.5))`,
                  boxShadow: `0 0 12px ${THEME.glow}`,
                }}
              />
            </div>
            <div className="text-xs font-mono text-emerald-200/70">
              {progress}%
            </div>
          </div>
        </div>

        {/* Chips */}
        {entry.coursework?.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {entry.coursework.slice(0, 6).map((c) => (
              <span
                key={c}
                className="px-2 py-1 rounded border text-[11px] text-emerald-100/90"
                style={{
                  borderColor: "rgba(0,255,65,0.12)",
                  background: "rgba(0,0,0,0.35)",
                }}
              >
                {c}
              </span>
            ))}
          </div>
        ) : null}

        {/* Achievements */}
        {entry.achievements?.length ? (
          <div className="mt-4 space-y-1.5">
            {entry.achievements.slice(0, 3).map((a, i) => (
              <div
                key={i}
                className="text-sm text-emerald-100/90 flex items-start gap-2"
              >
                <Award className="w-4 h-4 text-emerald-400 mt-0.5" />
                <span>{a}</span>
              </div>
            ))}
          </div>
        ) : null}

        {/* Link */}
        {entry.link ? (
          <div className="mt-4">
            <a
              href={entry.link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-xs font-mono text-emerald-300/80 hover:text-emerald-200"
            >
              Open record
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* Skeletons */
function MonitorSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-5 w-3/4 bg-white/10 rounded mb-3" />
      <div className="h-4 w-1/2 bg-white/10 rounded mb-2" />
      <div className="h-3 w-1/3 bg-white/10 rounded mb-6" />
      <div className="grid grid-cols-3 gap-3">
        <div className="h-28 bg-white/10 rounded" />
        <div className="h-16 bg-white/10 rounded" />
        <div className="h-16 bg-white/10 rounded" />
      </div>
      <div className="mt-6 h-8 bg-white/10 rounded" />
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="relative pl-14">
      <div className="absolute left-5 top-1.5 w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-400/20" />
      <div
        className="rounded-lg border p-5"
        style={{
          borderColor: "rgba(0,255,65,0.12)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <div className="h-5 w-1/2 bg-white/10 rounded mb-2" />
        <div className="h-4 w-1/3 bg-white/10 rounded mb-2" />
        <div className="h-3 w-1/4 bg-white/10 rounded mb-5" />
        <div className="h-2 w-1/2 bg-white/10 rounded" />
      </div>
    </div>
  );
}
