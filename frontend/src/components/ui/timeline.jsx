"use client";
import React, { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUp } from "lucide-react";

const THEME = {
  neon: "#00ff41",
  glow: "rgba(0,255,65,0.14)",
  border: "rgba(0,255,65,0.45)",
};

export default function Timeline({
  data = [],
  extraTop = 0,
  extraBottom = 0,
  fillDirection = "top-down", // "top-down" | "bottom-up"
  scroll, // ref to the scrollable parent element
  timelineOpen,
  closeTimeline,
}) {
  const containerRef = useRef(null);
  const contentRef = useRef(null);

  // Ref to each dot (the little circle on the line)
  const dotRefs = useRef([]);

  const [height, setHeight] = useState(0);

  const { scrollYProgress } = useScroll({
    container: scroll,
    target: containerRef,
    offset: ["start 25%", "end end"],
  });

  // Measure content height
  useEffect(() => {
    if (!contentRef.current) return;
    const el = contentRef.current;

    const measure = () => setHeight(el.scrollHeight);
    measure();

    let ro;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(measure);
      ro.observe(el);
    }
    window.addEventListener("resize", measure);

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [data.length]);

  const fullHeight = Math.max(0, height + extraTop + extraBottom);
  const progressHeight = useTransform(scrollYProgress, [0, 1], [0, fullHeight]);
  const progressOpacity = useTransform(scrollYProgress, [0, 0.08], [0, 1]);

  const [activeIndex, setActiveIndex] = useState(-1);

  // Activate when the gradient reaches the dot (center by default)
  useEffect(() => {
    if (!contentRef.current) return;

    // You can switch trigger alignment by changing this function:
    // - top: return rect.top - contentTop + extraTop
    // - center: return rect.top + rect.height/2 - contentTop + extraTop
    // - bottom: return rect.bottom - contentTop + extraTop
    const getDotTrigger = (rect, contentTop) =>
      rect.top + rect.height / 2 - contentTop + extraTop; // center

    const updateActive = (progressPx) => {
      const contentTop = contentRef.current.getBoundingClientRect().top;

      // Find last dot that the gradient has reached
      let idx = -1;
      for (let i = 0; i < dotRefs.current.length; i++) {
        const el = dotRefs.current[i];
        if (!el) continue;

        const rect = el.getBoundingClientRect();
        const dotY = getDotTrigger(rect, contentTop);

        const target =
          fillDirection === "bottom-up"
            ? fullHeight - dotY // frontier from bottom
            : dotY; // frontier from top

        if (progressPx >= target) idx = i;
      }

      setActiveIndex(idx);
    };

    // Subscribe to MotionValue changes for precise sync
    const unsub = progressHeight.on("change", updateActive);

    // Also update on resize/layout changes
    const ro = new ResizeObserver(() => {
      updateActive(progressHeight.get());
    });
    ro.observe(contentRef.current);

    const onResize = () => updateActive(progressHeight.get());
    window.addEventListener("resize", onResize);

    // Initial run
    requestAnimationFrame(() => updateActive(progressHeight.get()));

    return () => {
      unsub && unsub();
      ro.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [data.length, progressHeight, fillDirection, fullHeight, extraTop]);

  return (
    <div ref={containerRef} className="w-full font-sans md:px-10">
      <div className="flex items-center justify-between mt-4">
        <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{opacity: 1, x: 0 }} transition={{ duration: 1.0 }}>
          <h3
            style={{ color: THEME.neon, textShadow: `0 0 8px ${THEME.glow}` }}
            className="text-2xl font-bold"
          >
            Artifacts · Timeline
          </h3>
          <div className="text-xs font-mono text-sky-200/60">PROJECTS</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 1.0 }} className="flex items-center gap-2">
          <button
            onClick={async () => {
              if (!timelineOpen) {
                const rect = containerRef.current.getBoundingClientRect();
                const topAbs = rect.top + (window.scrollY || 0);
                window.scrollTo({ top: topAbs, behavior: "smooth" });
              } else {
                await closeTimeline();
              }
            }}
            className="font-mono text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-5 py-3 transition-all duration-300 transform hover:scale-105 flex items-center gap-2 shadow-sm shadow-cyan-500/25 outline-none focus:outline-none"
            style={{
              background:
                "linear-gradient(90deg, rgba(0,255,65,0.08), rgba(0,255,65,0.06))",
              border: `1px solid ${THEME.border}`,
              color: THEME.neon,
            }}
          >
            {timelineOpen ? "Back to Projects" : "Scroll to Timeline"}<ArrowUp className="w-4 h-4 animate-bounce" />
          </button>
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-10" />

      <div ref={contentRef} className="relative max-w-7xl mx-auto pb-20">
        {data.map((item, index) => (
          <div
            key={index}
            className="flex justify-start pt-10 md:pt-40 md:gap-10"
          >
            <div className="sticky flex flex-col md:flex-row z-40 items-center top-40 self-start max-w-xs lg:max-w-sm md:w-full">
              <div
                ref={(el) => (dotRefs.current[index] = el)}
                className="h-10 absolute left-3 md:left-3 w-10 rounded-full bg-inherit flex items-center justify-center"
              >
                <div className="h-4 w-4 rounded-full bg-neutral-800 border border-neutral-300 dark:border-neutral-700 p-2 shadow-[0_0_10px_rgba(168,85,247,0.7),0_0_20px_rgba(168,85,247,0.6)]" />
              </div>
              <motion.h3 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 1.5 }}
                className={`hidden md:block text-xl md:pl-20 md:text-5xl font-bold transition-all duration-300 ${
                  activeIndex === index ? "text-white" : "text-neutral-500"
                }`}
                style={
                  activeIndex === index
                    ? {
                        textShadow:
                          "0 0 8px rgba(168,85,247,0.7), 0 0 16px rgba(168,85,247,0.6)",
                      }
                    : undefined
                }
              >
                {item.title}
              </motion.h3>
            </div>

            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 1.5 }} className="relative pl-20 pr-4 md:pl-4 w-[692px]">
              {item.content}
            </motion.div>
          </div>
        ))}

        {/* Timeline line + animated gradient fill */}
        <div
          style={{ height: fullHeight, top: -extraTop }}
          className="pointer-events-none absolute z-10 md:left-8 left-8 w-[2px] bg-[linear-gradient(to_bottom,var(--tw-gradient-stops))] from-transparent to-transparent [mask-image:linear-gradient(to_bottom,transparent_0%,black_6%,black_94%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,black_6%,black_94%,transparent_100%)]"
        >
          <motion.div
            style={{ height: progressHeight, opacity: progressOpacity }}
            className={`absolute inset-x-0 w-[2px] rounded-full ${
              fillDirection === "bottom-up"
                ? "bottom-0 bg-gradient-to-t from-purple-500 via-purple-400 to-purple-200"
                : "top-0 bg-gradient-to-b from-purple-500 via-purple-400 to-purple-300"
            }`}
          />
        </div>
      </div>
    </div>
  );
}
