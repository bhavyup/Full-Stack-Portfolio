import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { publicApi } from "../utils/api";
import { portfolioData } from "../mock";
import { useTypewriter } from "../hooks/useTypewriter";
import CRTTerminal from "./AboutCRTTerminal";
import { BackgroundBeams } from "./ui/AboutBG";
import GradientText from "@/ui/TextAnimations/GradientText/GradientText";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// Resize handle styles recreated with Tailwind classes + inline small styles

function TerminalWindow({ title = "[ ROOT TERMINAL ]", children }) {
  const mounted = typeof window !== "undefined";
  const initW = mounted
    ? Math.min(900, Math.round(window.innerWidth * 0.92))
    : 720;
  const initH = 500;

  const [pos, setPos] = React.useState(() => {
    if (!mounted) return { x: 80, y: 80 };
    const x = Math.round((window.innerWidth - initW) / 2);
    const y = Math.round(window.innerHeight * 0.15);
    return {
      x: clamp(x, 12, Math.max(12, window.innerWidth - initW - 12)),
      y: clamp(y, 12, Math.max(12, window.innerHeight - initH - 12)),
    };
  });
  const [size, setSize] = React.useState({ w: initW, h: initH });

  const dragState = React.useRef(null);
  const startDrag = (e) => {
    e.preventDefault();
    dragState.current = {
      dx: e.clientX - pos.x,
      dy: e.clientY - pos.y,
    };
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";
    window.addEventListener("mousemove", onDrag);
    window.addEventListener("mouseup", stopDrag);
  };
  const onDrag = (e) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const x = clamp(
      e.clientX - dragState.current.dx,
      8,
      Math.max(8, w - size.w - 8)
    );
    const y = clamp(
      e.clientY - dragState.current.dy,
      8,
      Math.max(8, h - size.h - 8)
    );
    setPos({ x, y });
  };
  const stopDrag = () => {
    dragState.current = null;
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
    window.removeEventListener("mousemove", onDrag);
    window.removeEventListener("mouseup", stopDrag);
  };

  const rs = React.useRef(null);
  const startResize = (e) => {
    e.preventDefault();
    rs.current = {
      sx: e.clientX,
      sy: e.clientY,
      w0: size.w,
      h0: size.h,
    };
    document.body.style.userSelect = "none";
    document.body.style.cursor = "nwse-resize";
    window.addEventListener("mousemove", onResize);
    window.addEventListener("mouseup", stopResize);
  };
  const onResize = (e) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = clamp(
      rs.current.w0 + (e.clientX - rs.current.sx),
      420,
      vw - pos.x - 8
    );
    const h = clamp(
      rs.current.h0 + (e.clientY - rs.current.sy),
      320,
      vh - pos.y - 8
    );
    setSize({ w, h });
  };
  const stopResize = () => {
    rs.current = null;
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
    window.removeEventListener("mousemove", onResize);
    window.removeEventListener("mouseup", stopResize);
  };

  React.useEffect(() => {
    const onWinResize = () => {
      setPos((p) => ({
        x: clamp(p.x, 8, Math.max(8, window.innerWidth - size.w - 8)),
        y: clamp(p.y, 8, Math.max(8, window.innerHeight - size.h - 8)),
      }));
    };
    window.addEventListener("resize", onWinResize);
    return () => window.removeEventListener("resize", onWinResize);
  }, [size.w, size.h]);

  const child = React.Children.only(children);
  const bodyHeight = Math.max(160, size.h - 160);
  const withHeight = React.cloneElement(child, { bodyHeight });

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.18 }}
      >
        <div
          className="relative flex flex-col overflow-hidden rounded-lg p-6"
          style={{
            background: "rgba(0,0,0,0.9)",
            border: "1px solid rgba(0,255,65,0.12)",
            height: size.h,
            color: "#bfffb8",
            backdropFilter: "blur(6px)",
            boxShadow:
              "0 6px 30px rgba(0,255,65,0.04), inset 0 1px 0 rgba(255,255,255,0.02)",
          }}
        >
          {/* panel header */}
          <h3
            onMouseDown={startDrag}
            className="text-green-400 font-semibold text-sm mb-3 pb-2 border-b"
            style={{
              borderBottomColor: "rgba(0,255,65,0.06)",
              cursor: "move",
              userSelect: "none",
            }}
          >
            {title}
          </h3>

          <div style={{ flex: 1, minHeight: 0 }}>{withHeight}</div>

          {/* resize handle */}
          <div
            onMouseDown={startResize}
            title="Resize"
            className="absolute"
            style={{
              right: 8,
              bottom: 8,
              width: 16,
              height: 16,
              cursor: "nwse-resize",
              opacity: 0.9,
              borderRight: "2px solid rgba(0,255,65,0.35)",
              borderBottom: "2px solid rgba(0,255,65,0.35)",
            }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

const ASCII_CATS = [`(^._.^)ﾉ`, `=^..^=`, `(=ↀωↀ=)✧`];

const FORTUNES = [
  "You will find a stray semicolon in production.",
  "A keyboard shortcut will save your life.",
  "Always commit before refactoring.",
];

const StatBar = ({ label, value, percent = 0.6 }) => {
  const width = `${Math.max(6, Math.min(100, Math.round(percent * 100)))}%`;
  return (
    <div>
      <div className="flex justify-between text-[12px] mb-1">
        <div className="text-[#00ff41]/85">{label}</div>
        <div className="text-[#00ff41]/85">{value}</div>
      </div>
      <div
        className="bg-black/30 h-2 rounded-full overflow-hidden border"
        style={{ borderColor: "rgba(0,255,65,0.06)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width,
            background:
              "linear-gradient(90deg, rgba(0,255,65,0.18), rgba(0,255,65,0.35))",
            boxShadow: "0 4px 18px rgba(0,255,65,0.04)",
          }}
        />
      </div>
    </div>
  );
};

const AboutSection = () => {
  const [profile, setProfile] = useState(portfolioData.profile || null);
  const [projects, setProjects] = useState([]);
  const [skills, setSkills] = useState({});
  const [loading, setLoading] = useState(true);
  const [flicker, setFlicker] = useState(true);

  // Easter egg "root mode" state
  const [rootMode, setRootMode] = useState(false);
  const [logs, setLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [uiTransform, setUiTransform] = useState({
    rotated: false,
    comic: false,
    inverted: false,
  });
  const [selfDestruct, setSelfDestruct] = useState(null);
  const cmdInputRef = useRef(null);

  useEffect(() => {
    if (loading) triggerAlert("ENCRYPTION ENABLED", 500);
  }, [loading]);

  const typedBio = useTypewriter(profile ? [profile.bio || ""] : [], {
    shouldLoop: false,
    multiLine: true,
    typeSpeed: 10,
  });
  const totalSkills = Object.values(skills || {}).reduce(
    (acc, arr) => acc + (arr?.length || 0),
    0
  );
  const projectCount = projects?.length || 0;

  const triggerAlert = (text, delay = 2000) => {
    const id = Date.now() + Math.random();
    setAlerts((s) => [...s, { id, text }]);
    setTimeout(() => {
      setAlerts((currentAlerts) => currentAlerts.filter((a) => a.id !== id));
    }, delay);
  };

  useEffect(() => {
    (async () => {
      try {
        const [p, pr, sk] = await Promise.allSettled([
          publicApi.getProfile(),
          publicApi.getProjects(),
          publicApi.getSkills(),
        ]);
        if (p.status === "fulfilled" && p.value?.success)
          setProfile(p.value.data);
        if (pr.status === "fulfilled" && pr.value?.success)
          setProjects(pr.value.data);
        if (sk.status === "fulfilled" && sk.value?.success)
          setSkills(sk.value.data);
      } catch (e) {
        console.error(e);
      }
      setTimeout(() => {
        setLoading(false);
        triggerAlert("DATA SYNC COMPLETED", 500);
        setTimeout(() => {
          triggerAlert("ACCESS GRANTED (WELCOME)", 1000);
        }, 1000);
      }, 1000);
      setTimeout(() => setFlicker(false), 1400);
    })();
  }, []);

  useEffect(() => {
    window.__ROOT_API = window.__ROOT_API || {};
    window.__ROOT_API.alert = (msg) => triggerAlert(msg);
    window.__ROOT_API.toggle = () => setRootMode((r) => !r);
  }, []);

  const addLog = useCallback((text) => {
    setLogs((s) => [
      ...s.slice(-30),
      `[${new Date().toLocaleTimeString()}] ${text}`,
    ]);
  }, []);

  // Hotkey to toggle root mode
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "h") {
        setRootMode((currentRootMode) => {
          const newRootMode = !currentRootMode;
          const msg = `ROOT MODE: ${newRootMode ? "ENABLED" : "DISABLED"}`;
          addLog(newRootMode ? "ROOT MODE: ENABLED" : "ROOT MODE: DISABLED");
          triggerAlert(msg, 2000);
          return newRootMode;
        });
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addLog, triggerAlert]);

  // Process fake terminal commands
  const processCommand = async (raw) => {
    const cmd = raw.trim().toLowerCase();
    addLog(`> ${raw}`);

    const dangerous = [
      "delete all data",
      "format disk",
      "shutdown server",
      "purge database",
    ];
    if (dangerous.includes(cmd)) {
      addLog("WARNING: destructive command detected");
      addLog("Starting destructive operation...");
      triggerAlert("Initiating destructive sequence");
      await sleep(1000);
      addLog("... 12%");
      await sleep(700);
      addLog("... 47%");
      await sleep(700);
      addLog("... 83%");
      await sleep(900);
      addLog("ERROR: Permission denied. You are not that powerful.");
      triggerAlert("Nice try. I didn't give you root.");
      return;
    }

    if (cmd === "optimize site" || cmd === "increase speed") {
      addLog("Optimizing site... this may take a long time.");
      triggerAlert("OPTIMIZING...");
      for (let i = 0; i < 6; i++) {
        addLog(`reticulating splines... ${i * 17}%`);
        await sleep(800);
      }
      addLog("still optimizing...");
      triggerAlert("Optimization paused. Try again later.");
      return;
    }

    if (cmd === "cats") {
      const cat = ASCII_CATS[Math.floor(Math.random() * ASCII_CATS.length)];
      addLog(cat);
      triggerAlert("meow");
      return;
    }

    if (cmd === "fortune") {
      const f = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
      addLog(f);
      triggerAlert("fortune delivered");
      return;
    }

    if (cmd === "hack") {
      triggerAlert("H4X0R MODE", 2500);
      addLog("Engaging hack overlay...");
      setUiTransform({ rotated: true, comic: false, inverted: true });
      setTimeout(
        () => setUiTransform({ rotated: false, comic: false, inverted: false }),
        3500
      );
      triggerAlert("HAHAHAHAHA", 1000);
      return;
    }

    if (cmd === "coffee") {
      addLog("☕ Coffee machine offline. Try again after reboot.");
      triggerAlert("No coffee for you");
      return;
    }

    if (cmd === "self-destruct") {
      addLog("SELF-DESTRUCT initiated");
      setSelfDestruct(10);
      triggerAlert("Self-destruct countdown started");
      const interval = setInterval(() => {
        setSelfDestruct((n) => {
          if (n === 1) {
            clearInterval(interval);
            addLog("...SELF-DESTRUCT CANCELLED");
            triggerAlert("Just kidding. System restored.");
            setSelfDestruct(null);
            return null;
          }
          addLog(`...${n - 1}...`);
          return n - 1;
        });
      }, 900);
      return;
    }

    if (cmd === "comic") {
      setUiTransform((s) => ({ ...s, comic: true }));
      addLog("Theme changed to Comic Sans (temporary)");
      triggerAlert("COMIC RELIEF ENABLED");
      setTimeout(() => setUiTransform((s) => ({ ...s, comic: false })), 4000);
      return;
    }

    if (cmd === "flip") {
      setUiTransform((s) => ({ ...s, rotated: true }));
      addLog("Screen flipped");
      setTimeout(() => setUiTransform((s) => ({ ...s, rotated: false })), 3500);
      return;
    }

    addLog(`Command not recognized: ${raw}`);
    triggerAlert("unknown command");
  };

  function sleep(ms) {
    return new Promise((res) => setTimeout(res, ms));
  }

  const prankSpeed = async () => {
    const wrapper = document.getElementById("contOutlet");
    if (!wrapper) return;

    addLog("Attempting to increase site speed...");
    triggerAlert("Speed boost initiated");
    wrapper.style.transition = "filter 0.9s ease";
    wrapper.style.filter = "blur(2px)";
    await sleep(1600);
    wrapper.style.filter = "";
    setTimeout(() => {
      wrapper.style.transition = "";
    }, 900);
    triggerAlert("Speed boost failed (took longer than expected)");
    addLog("Speed boost reverted");
  };

  const prankTheme = () => {
    addLog("Applying experimental theme");
    triggerAlert("Theme applied");
    setUiTransform((s) => ({ ...s, comic: true }));
    setTimeout(() => setUiTransform((s) => ({ ...s, comic: false })), 2500);
  };

  const uiStyle = {
    transform: uiTransform.rotated ? "rotate(180deg)" : "none",
    fontFamily: uiTransform.comic
      ? "Comic Sans MS, Comic Sans, cursive"
      : undefined,
    filter: uiTransform.inverted ? "invert(1) hue-rotate(180deg)" : undefined,
  };

  return (
    <section
      id="about"
      className="min-h-screen relative overflow-hidden px-5 py-8 font-mono text-green-400 bg-transparent"
      style={{ color: "var(--green)" }}
    >
      <div className="fixed w-screen h-screen inset-0 z-[-1]">
        <BackgroundBeams className="h-screen bg-[#021009]" />
        <div
          aria-hidden
          className="pointer-events-none w-screen h-screen absolute inset-0 rounded-lg"
          style={{
            background: `repeating-linear-gradient(to bottom, rgba(0,255,65,0.06) 0px, rgba(0,255,65,0.06) 1px, transparent 1px, transparent 3px)`,
            opacity: 0.18,
            mixBlendMode: "screen",
          }}
        />
      </div>
      {/* small blur glows (replaces radial backgrounds in original) */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-[30rem] h-[30rem] bg-emerald-500/10 rounded-full blur-3xl" />

      <div
        className="mx-auto max-w-[1200px] p-8 rounded-lg relative z-10"
        style={{ transform: "perspective(1200px) translateZ(0)", ...uiStyle }}
      >
      

        {/* scanline overlay (replaces ::after) */}

        <h2
          className={
            "font-[orbitron] text-[2rem] text-[#00ff41] text-center mb-8 " +
            "tracking-[1.2px] [text-shadow:0_0_10px_rgba(0,255,65,0.15)] " +
            "before:content-['//=='] before:text-[rgba(0,255,65,0.2)] before:mx-[0.6rem] " +
            "after:content-['//=='] after:text-[rgba(0,255,65,0.2)] after:mx-[0.6rem]"
          }
        >
          <GradientText className="!inline" colors={["#00ff41", "#00ff4155", "#00ff41"]} animationSpeed={6} showBorder={false}>
            [ AGENT_PROFILE: CLASSIFIED ]
          </GradientText>
        </h2>

        <div className="grid gap-4 grid-cols-1 lg:grid-cols-[2fr,1fr]">
          <div>
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1.3 }}
              className="bg-[rgba(0,18,0,0.36)] border-[1px_solid_rgba(0,255,65,0.12)] [box-shadow:0_6px_30px_rgba(0,255,65,0.04),inset_0_1px_0_rgba(255,255,255,0.02)] backdrop-blur-[6px] p-[1.4rem] rounded-[10px] text-[#bfffb8] relative overflow-hidden hover:[box-shadow:0_10px_40px_rgba(0,255,65,0.06)] before:content-[''] before:absolute before:left-0 before:top-[-50%] before:w-[1px] before:h-[200%] before:bg-[linear-gradient(180deg,transparent,rgba(0,255,65,0.02),transparent)] before:pointer-events-none"
              style={{
                background: "rgba(0,18,0,1)",
                border: "1px solid rgba(0,255,65,0.12)",
              }}
            >
              <h3
                className="text-[#00ff41] font-[700] text-[0.95rem] mb-3 pb-[0.5rem]"
                style={{ borderBottom: "1px solid rgba(0,255,65,0.06)" }}
              >
                [ BIOMETRIC_DATA.LOG ]
              </h3>

              <div style={{ fontFamily: "inherit" }}>
                <pre className="whitespace-pre-wrap text-[13px] leading-6 text-[rgba(190,255,184,0.95)]">
                  <AnimatePresence mode="wait">
                    {loading ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <span className="text-[#00ff41]/85 font-semibold text-[0.85rem]">
                          &gt; BOOT: initializing subsystems...
                        </span>
                        {"\n"}
                        <span className="text-[#00ff41]/85 font-semibold text-[0.85rem]">
                          &gt; LOADING: credentials...
                        </span>
                        {"\n"}
                        <span className="text-[#00ff41]/85 font-semibold text-[0.85rem]">
                          &gt; RUN: decompressing profile data...
                        </span>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="info"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.3 }}
                      >
                        <span className="text-[#00ff41]/85 font-semibold text-[0.85rem]">
                          &gt; NAME:
                        </span>{" "}
                        {profile?.name || "Anonymous"}
                        {"\n"}
                        <span className="text-[#00ff41]/85 font-semibold text-[0.85rem]">
                          &gt; ROLE:
                        </span>{" "}
                        {profile?.role || "Full-stack Specialist"}
                        {"\n"}
                        <span className="text-[#00ff41]/85 font-semibold text-[0.85rem]">
                          &gt; BIO:
                        </span>
                        <span className="inline mt-2 text-[rgba(190,255,184,0.95)]">
                          {" "}
                          {typedBio.displayText}
                          <span className="inline-block ml-1 w-2 h-[1em] bg-green-400 animate-blink" />
                        </span>
                        <motion.div className="mt-2 grid grid-cols-3 gap-4">
                          {[
                            { value: "5+", label: "Languages" },
                            { value: "10+", label: "Tools" },
                            { value: "∞", label: "Curiosity" },
                          ].map((item, idx) => (
                            <div
                              key={idx}
                              className="border border-green-500/30 p-4 rounded-lg text-center hover:bg-green-500/5 transition-colors duration-300"
                            >
                              <div className="text-2xl font-bold text-green-400">
                                {item.value}
                              </div>
                              <div className="text-sm text-green-300">
                                {item.label}
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </pre>
              </div>
            </motion.div>

            <div className="mt-3">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1.3 }}
                className="bg-[rgba(0,18,0,0.36)] border-[1px_solid_rgba(0,255,65,0.12)] [box-shadow:0_6px_30px_rgba(0,255,65,0.04),inset_0_1px_0_rgba(255,255,255,0.02)] backdrop-blur-[6px] p-[1.4rem] rounded-[10px] text-[#bfffb8] relative overflow-hidden hover:[box-shadow:0_10px_40px_rgba(0,255,65,0.06)] before:content-[''] before:absolute before:left-0 before:top-[-50%] before:w-[1px] before:h-[200%] before:bg-[linear-gradient(180deg,transparent,rgba(0,255,65,0.02),transparent)] before:pointer-events-none"
                style={{
                  background: "rgba(0,18,0,1)",
                  border: "1px solid rgba(0,255,65,0.12)",
                }}
              >
                <h3
                  className="text-[#00ff41] font-[700] text-[0.95rem] mb-3 pb-[0.5rem]"
                  style={{ borderBottom: "1px solid rgba(0,255,65,0.06)" }}
                >
                  [ RECENT_DEPLOYMENTS ]
                </h3>
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.div
                      key="projects_loading"
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-[#00ff41]/85 font-semibold text-[0.85rem]"
                    >
                      Loading deployments...
                    </motion.div>
                  ) : projects?.length ? (
                    <motion.div
                      key="projects"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="grid gap-2"
                    >
                      {projects.slice(0, 4).map((p, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between text-[13px]"
                        >
                          <div className="text-[rgba(216,255,208,1)]">
                            {p.title || p.name}
                          </div>
                          <div className="text-[rgba(0,255,65,0.7)]">
                            {p.status || "live"}
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-[rgba(0,255,65,0.7)] text-sm"
                    >
                      No recent projects.
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </div>

          <div>
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1.3 }}
              className="bg-[rgba(0,18,0,0.36)] border-[1px_solid_rgba(0,255,65,0.12)] [box-shadow:0_6px_30px_rgba(0,255,65,0.04),inset_0_1px_0_rgba(255,255,255,0.02)] backdrop-blur-[6px] p-[1.4rem] rounded-[10px] text-[#bfffb8] relative overflow-hidden hover:[box-shadow:0_10px_40px_rgba(0,255,65,0.06)] before:content-[''] before:absolute before:left-0 before:top-[-50%] before:w-[1px] before:h-[200%] before:bg-[linear-gradient(180deg,transparent,rgba(0,255,65,0.02),transparent)] before:pointer-events-none"
              style={{
                background: "rgba(0,18,0,1)",
                border: "1px solid rgba(0,255,65,0.12)",
              }}
            >
              <h3
                className="text-[#00ff41] font-[700] text-[0.95rem] mb-3 pb-[0.5rem]"
                style={{ borderBottom: "1px solid rgba(0,255,65,0.06)" }}
              >
                [ {!rootMode ? "SYSTEM_VITALS" : "ROOT_DIAGONOSIS"} ]
              </h3>
              <AnimatePresence mode="wait">
                {!rootMode ? (
                  <motion.div
                    key="system-vitals"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="grid gap-3"
                  >
                    <div>
                      <div className="text-[rgba(0,255,65,0.7)] text-sm">
                        PRIMARY_DIRECTIVE
                      </div>
                      <div className="font-bold text-[rgba(190,255,184,0.95)] ">
                        {profile?.highlights || "Build & innovate"}
                      </div>
                    </div>

                    <div
                      className="pt-2 border-t"
                      style={{ borderTopColor: "rgba(0,255,65,0.04)" }}
                    >
                      <div>
                        <StatBar
                          label="PROJECTS_DEPLOYED"
                          value={projectCount}
                          percent={Math.min(1, projectCount / 100)}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="mt-2">
                        <StatBar
                          label="SKILLS_INDEXED"
                          value={totalSkills}
                          percent={Math.min(1, totalSkills / 100)}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="mt-2">
                        <StatBar
                          label="SYSTEM_INTEGRITY"
                          value="100%"
                          percent={1}
                        />
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="root-diagnosis"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="grid gap-3 mt-2"
                  >
                    <div className="pt-[10px] border-t-[1px_solid_rgba(0,255,65,0.04)]">
                      <div className="text-[#00ff41]/85 text-[0.85rem]">
                        QUICK COMMANDS
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => {
                            prankSpeed();
                            addLog("User clicked INCREASE SPEED");
                          }}
                          className="bg-transparent p-[8px_10px] rounded-[8px] cursor-pointer border border-[rgba(0,255,65,0.08)] text-[#00ff41] text-[13px] hover:bg-[rgba(0,255,65,0.05)] hover:[box-shadow:0_8px_30px_rgba(0,255,65,0.03)] active:bg-[rgba(0,255,65,0.05)] outline-none focus:outline-none "
                        >
                          Increase site speed
                        </button>
                        <button
                          onClick={() => {
                            prankTheme();
                            addLog("User clicked CHANGE THEME");
                          }}
                          className="bg-transparent p-[8px_10px] rounded-[8px] cursor-pointer border border-[rgba(0,255,65,0.08)] text-[#00ff41] text-[13px] hover:bg-[rgba(0,255,65,0.05)] hover:[box-shadow:0_8px_30px_rgba(0,255,65,0.03)] active:bg-[rgba(0,255,65,0.05)] outline-none focus:outline-none "
                        >
                          Change theme
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="text-[#00ff41]/85 text-[0.85rem]">
                        TERMINAL
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => {
                            setTerminalOpen((s) => !s);
                            addLog("Terminal toggled");
                          }}
                          className="bg-transparent p-[8px_10px] rounded-[8px] cursor-pointer border border-[rgba(0,255,65,0.08)] text-[#00ff41] text-[13px] hover:bg-[rgba(0,255,65,0.05)] hover:[box-shadow:0_8px_30px_rgba(0,255,65,0.03)] active:bg-[rgba(0,255,65,0.05)] outline-none focus:outline-none "
                        >
                          {terminalOpen ? "Close" : "Open"} terminal
                        </button>
                        <button
                          onClick={() => {
                            triggerAlert("Manual test alert");
                            addLog("Manual alert triggered");
                          }}
                          className="bg-transparent p-[8px_10px] rounded-[8px] cursor-pointer border border-[rgba(0,255,65,0.08)] text-[#00ff41] text-[13px] hover:bg-[rgba(0,255,65,0.05)] hover:[box-shadow:0_8px_30px_rgba(0,255,65,0.03)] active:bg-[rgba(0,255,65,0.05)] outline-none focus:outline-none "
                        >
                          Test Alert
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <div className="mt-3">
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1.3 }}
                className="bg-[rgba(0,18,0,0.36)] border-[1px_solid_rgba(0,255,65,0.12)] [box-shadow:0_6px_30px_rgba(0,255,65,0.04),inset_0_1px_0_rgba(255,255,255,0.02)] backdrop-blur-[6px] p-[1.4rem] rounded-[10px] text-[#bfffb8] relative overflow-hidden hover:[box-shadow:0_10px_40px_rgba(0,255,65,0.06)] before:content-[''] before:absolute before:left-0 before:top-[-50%] before:w-[1px] before:h-[200%] before:bg-[linear-gradient(180deg,transparent,rgba(0,255,65,0.02),transparent)] before:pointer-events-none"
                style={{
                  background: "rgba(0,18,0,1)",
                  border: "1px solid rgba(0,255,65,0.12)",
                }}
              >
                <div className="text-[#00ff41]/85 text-[13px]">ENV</div>
                <div className="mt-2 text-[13px] text-[rgba(190,255,184,0.95)] ">
                  <span
                    className="animate-pulse"
                    style={{ color: "rgba(0,255,65,0.9)" }}
                  >
                    ONLINE
                  </span>{" "}
                  • <span style={{ color: "rgba(0,255,65,0.6)" }}>PROD</span>
                </div>
              </motion.div>
            </div>

            <div className="mt-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.3 }}
                className="bg-[rgba(0,18,0,0.36)] border-[1px_solid_rgba(0,255,65,0.12)] [box-shadow:0_6px_30px_rgba(0,255,65,0.04),inset_0_1px_0_rgba(255,255,255,0.02)] backdrop-blur-[6px] p-[1.4rem] rounded-[10px] text-[#bfffb8] relative overflow-hidden hover:[box-shadow:0_10px_40px_rgba(0,255,65,0.06)] before:content-[''] before:absolute before:left-0 before:top-[-50%] before:w-[1px] before:h-[200%] before:bg-[linear-gradient(180deg,transparent,rgba(0,255,65,0.02),transparent)] before:pointer-events-none"
                style={{
                  background: "rgba(0,18,0,1)",
                  border: "1px solid rgba(0,255,65,0.12)",
                }}
              >
                <div className="text-[#00ff41]/85 text-[0.85rem]">
                  {rootMode ? "EXIT" : "TOGGLE"} ROOT MODE
                </div>
                <div className="text-[13px] mt-[6px] text-[rgba(190,255,184,0.9)]">
                  Press{" "}
                  <code className="bg-black/50 p-[2px_6px] rounded">Ctrl</code>{" "}
                  +{" "}
                  <code className="bg-black/50 p-[2px_6px] rounded">Shift</code>{" "}
                  + <code className="bg-black/50 p-[2px_6px] rounded">H</code>
                </div>
                <AnimatePresence mode="wait">
                  {rootMode && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-2 p-3 rounded-md"
                      style={{
                        border: "1px dashed rgba(255,0,0,0.2)",
                        background: "transparent",
                      }}
                    >
                      <div
                        style={{
                          color: "rgba(255,100,100,0.9)",
                          fontWeight: 700,
                        }}
                      >
                        [ ROOT ACCESS GRANTED ]
                      </div>
                      <div className="text-[13px] mt-2">
                        Hidden controls enabled. Use carefully.
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => processCommand("delete all data")}
                          className="bg-transparent p-[8px_10px] rounded-[8px] cursor-pointer border border-[rgba(0,255,65,0.08)] text-[#00ff41] text-[13px] hover:bg-[rgba(0,255,65,0.05)] hover:[box-shadow:0_8px_30px_rgba(0,255,65,0.03)] active:bg-[rgba(0,255,65,0.05)] outline-none focus:outline-none "
                        >
                          Purge Database
                        </button>
                        <button
                          onClick={() => processCommand("optimize site")}
                          className="bg-transparent p-[8px_10px] rounded-[8px] cursor-pointer border border-[rgba(0,255,65,0.08)] text-[#00ff41] text-[13px] hover:bg-[rgba(0,255,65,0.05)] hover:[box-shadow:0_8px_30px_rgba(0,255,65,0.03)] active:bg-[rgba(0,255,65,0.05)] outline-none focus:outline-none "
                        >
                          Optimize Site
                        </button>
                        <button
                          onClick={() => processCommand("self-destruct")}
                          className="bg-transparent p-[8px_10px] rounded-[8px] cursor-pointer border border-[rgba(0,255,65,0.08)] text-[#00ff41] text-[13px] hover:bg-[rgba(0,255,65,0.05)] hover:[box-shadow:0_8px_30px_rgba(0,255,65,0.03)] active:bg-[rgba(0,255,65,0.05)] outline-none focus:outline-none "
                        >
                          Self-Destruct
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {terminalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              style={{
                position: "fixed",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                zIndex: 80,
                width: "min(900px,92%)",
              }}
            >
              <TerminalWindow
                title="[ ROOT TERMINAL ]"
                onClose={() => setTerminalOpen(false)}
              >
                <CRTTerminal
                  profile={profile}
                  projects={projects}
                  skills={skills}
                  systemLogs={logs}
                  onClose={() => setTerminalOpen(false)}
                  onUnknownCommand={processCommand}
                  triggerAlert={triggerAlert}
                  addLog={addLog}
                />
              </TerminalWindow>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selfDestruct !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 140,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                className="rounded-lg p-7"
                style={{
                  background: "rgba(0,0,0,0.95)",
                  border: "2px solid rgba(255,0,0,0.12)",
                }}
              >
                <div
                  style={{
                    color: "rgba(255,80,80,0.98)",
                    fontSize: 28,
                    fontWeight: 800,
                    textAlign: "center",
                  }}
                >
                  SELF-DESTRUCT
                </div>
                <div
                  style={{
                    color: "rgba(255,200,200,0.9)",
                    textAlign: "center",
                    marginTop: 10,
                  }}
                >
                  {selfDestruct}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {alerts.map((a) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
            className="fixed right-4 top-4 z-60 rounded-md p-[0.6rem_0.9rem] text-[#00ff41] text-[0.9rem]"
            style={{
              background: "rgba(0,0,0,0.85)",
              border: "1px solid rgba(0,255,65,0.12)",
              boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
              fontFamily: "inherit",
              borderRadius: "6px",
            }}
          >
            {a.text}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* minimal custom CSS for blink + glassReflection animation */}
      <style>
        {`
          @keyframes glassReflection { 0% { transform: translateY(-2px); opacity: 0.22; } 50% { transform: translateY(2px); opacity: 0.12; } 100% { transform: translateY(-2px); opacity: 0.22; } }
          .animate-blink { animation: blink 1s steps(2, start) infinite; }
          @keyframes blink { 50% { opacity: 0; } }
        `}
      </style>
    </section>
  );
};

export default AboutSection;
