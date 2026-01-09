"use client";

import React, { useEffect, useRef, useState } from "react";
import { CardBody, CardContainer, CardItem } from "@/components/ui/3d-card";
import { motion } from "framer-motion";
import { CheckCircle, Clock, Github, Radio } from "lucide-react";
import StarParticle from "./StarParticle";

const THEME = {
  neon: "#00ff41",
  deep: "#021009",
  glow: "rgba(0,255,65,0.14)",
  border: "rgba(0,255,65,0.06)",
  text: "#c7ffd0",
  yellow: "#fbbf24",
};

/**
 * SitePreview
 * - tries to embed the live site via iframe
 * - if iframe does not load / is blocked, falls back to an image (p.thumb or screenshotUrl)
 *
 * props:
 *  - url: the site url (p.live)
 *  - fallbackSrc: image src to use when iframe blocked (p.thumb or your screenshot endpoint)
 *  - className / style
 */

/**
 * Always-mounted SitePreview (drop-in replacement)
 * - Always mounts an iframe when url is truthy (so you can see it in Elements)
 * - If url is falsy, shows fallback image
 * - Exposes console logs for debug
 */
export function SitePreview({ url, fallbackSrc, className = "", style = {}, timeline }) {
  const iframeRef = useRef(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [forceSnapshot, setForceSnapshot] = useState(true);
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function handleResize() {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const desktopWidth = 1280; // pretend full desktop width
        setScale(containerWidth / desktopWidth);
      }
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);


  useEffect(() => {
    // each time url changes, reset flags and log
    setIframeLoaded(false);
    setForceSnapshot(true);
    console.debug("[SitePreview] mount/check url:", url);
  }, [url]);

  const onIframeLoad = () => {
    console.debug("[SitePreview] iframe onLoad fired for", url, "iframeRef:", iframeRef.current);
    setIframeLoaded(true);
  };

  // If url is falsy, just render fallback image so you still get a visible element
  if (!url) {
    return (
      <img
        src={fallbackSrc}
        alt="preview"
        className={`w-full h-full object-fill rounded-t-lg ${className}`}
        style={style}
      />
    );
  }

  return (
    <div ref={containerRef} className={`relative h-full overflow-hidden bg-black/60 ${className}`} style={style}>
      {/* Always mount the iframe (unless user forced snapshot) */}
      {!forceSnapshot && (
        <iframe
          ref={iframeRef}
          src={url}
          title={`preview-${url}`}
          onLoad={onIframeLoad}
          sandbox="allow-forms allow-scripts allow-popups allow-same-origin"
          style={{
            width: "1280px",
            height: `${timeline ? "400px" : "700px"}`,
            border: "none",
            display: "block",
            position: "relative",
            zIndex: 999,               // high z-index to avoid overlays
            pointerEvents: "auto",
            transform: `translateZ(0) scale(${scale})`,
            transformOrigin: "top left",
            willChange: "transform, opacity",
          }}
        />
      )}

      {/* fallback snapshot image - visible if forced */}
      {forceSnapshot && (
        <img
          src={fallbackSrc}
          alt={`snapshot ${url}`}
          className="w-full h-full object-fill"
          style={{ display: "block" }}
          onError={(e) => {
            e.currentTarget.src =
              "data:image/svg+xml;charset=utf-8," +
              encodeURIComponent(
                `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='480'><rect fill='#020200' width='100%' height='100%'/><text fill='#7cff9a' font-size='20' x='24' y='40'>Preview not available</text></svg>`
              );
          }}
        />
      )}

      {/* Tiny status & controls */}
      <div style={{ position: "absolute", left: 8, bottom: 8, zIndex: 1000 }}>
        <div className={`px-2 py-0.5 text-xs rounded ${forceSnapshot ? "bg-green-600/80 text-black" : iframeLoaded ? "bg-green-600/80 text-black cursor-pointer" : "bg-yellow-600/80 text-black"}`}>
          <a href={url} target="_blank" rel="noopener noreferrer" className={`${forceSnapshot || !iframeLoaded ? "pointer-events-none" : ""} outline-none focus:outline-none`}>
          {forceSnapshot ? "Snapshot" : iframeLoaded ? "Live" : "Loading"}</a>
        </div>
      </div>

      <div style={{ position: "absolute", right: 8, bottom: 8, zIndex: 1000 }}>
        <button
          onClick={(e) => { e.stopPropagation(); setForceSnapshot((s) => !s); }}
          className="ml-2 px-2 py-1 text-xs rounded bg-black/70 text-[#bfffb8] outline-none focus:outline-none"
        >
          {forceSnapshot ? "Show Live" : "Show Snapshot"}
        </button>
      </div>
    </div>
  );
}


export default function Pcard({
  className = "",
  containerClassName = "",
  p,
  onInspect,
  timeline
}) {
  return (
    <div onClick={() => onInspect(p)}>
      <CardContainer
        containerClassName={`py-0 ${containerClassName}`}
        className={`w-full ${className} shadow-[0_0px_4px_1px_rgba(0,255,55,0.12)] hover:shadow-[0_0px_12px_4px_rgba(0,255,255,0.12)] rounded-xl`}
      >
        <CardBody className="group/card relative w-full h-[365px] bg-black/95 rounded-xl border border-white/10 shadow-lg shadow-black/60">
          {/* Header / Thumbnail -> replaced with SitePreview */}
          <CardItem translateZ={50} className="w-full h-52 rounded-t overflow-hidden">
            <SitePreview
              url={p.live}
              fallbackSrc={p.thumb}
              className=""
              style={{ borderRadius: 8 }}
              onClick={(e) => onInspect(p)}
              timeline={timeline}
            />
          </CardItem>

          {/* Status pill (top-right) */}
          <CardItem translateZ={51} className="absolute top-3 right-3">
            <div className="rounded px-2 py-1 text-xs font-mono bg-black/40 backdrop-blur-sm border border-white/20">
              {p.status === "completed" ? (
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" /> Completed
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-400" /> In Dev
                </span>
              )}
            </div>
          </CardItem>

          {/* Sparkle (top-left) */}
          <CardItem
            translateZ={51}
            className="absolute left-3 top-2 pointer-events-none"
          >
            <StarParticle
              size={12}
              color={p.status === "completed" ? THEME.neon : THEME.yellow}
              haloRatio={2.2}
              spikeCount={4}
              speckleCount={5}
              twinkleAmount={0.18}
            />
          </CardItem>

          {/* Body */}
          <CardItem
            translateZ={24}
            className="p-4 flex flex-col h-[calc(365px-220px)] w-full"
          >
            {/* Title + meta */}
            <div className="w-full relative">
              <div className="min-w-0 pr-20">
                <div className="text-sm font-semibold text-[#dfffe6] truncate">
                  {p.title}
                </div>
                <div className="text-xs text-sky-200/70 mt-1 line-clamp-2">
                  {p.description}
                </div>
              </div>
              <div className="absolute top-1 right-1 flex flex-col items-end gap-0.5">
                <div className="text-xs font-mono text-sky-200/70">
                  {p.year ?? "-"}
                </div>
                <div className="text-xs font-mono text-[#befcb6]">
                  {Math.round(p.score)}%
                </div>
              </div>
            </div>

            {/* Tags + Buttons */}
            <div
              className={`${
                p.live && p.repo ? "mt-2" : "mt-auto"
              } flex flex-col gap-3`}
            >
              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {(p.tags || []).slice(0, 4).map((t) => (
                  <span
                    key={t}
                    className="text-[11px] px-2 py-0.5 rounded bg-black/30 border border-white/20 text-sky-100/80"
                  >
                    {t}
                  </span>
                ))}
              </div>

              {/* Buttons */}
              <div className="flex justify-between gap-3 items-center">
                {p.live && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(p.live, "_blank");
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
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

                {p.repo && (
                  <a
                    href={p.repo}
                    onClick={(e) => e.stopPropagation()}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
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
              </div>
            </div>
          </CardItem>
        </CardBody>
      </CardContainer>
    </div>
  );
}
