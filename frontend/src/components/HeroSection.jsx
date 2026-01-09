"use client";

import React, {
  useRef,
  useEffect,
  useMemo,
  useState,
  useCallback,
  Suspense,
  useLayoutEffect,
  useContext,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  motion,
  useMotionValue,
  useTransform,
  useSpring,
  AnimatePresence,
  animate,
  useMotionTemplate,
  useReducedMotion,
  useAnimation,
  easeOut,
} from "framer-motion";
import { useGlitchDecode } from "@/hooks/useGlitchDecode";
import { useTypewriter } from "@/hooks/useTypewriter";
import TargetCursor from "./ui/TargetCursor";
import { SocialFillRail } from "./ui/Socials";
import FlappyCatsGame from "./ui/FlappyCat";
import { X } from "lucide-react";
import { LoaderContext } from "@/pages/Home";
import HeroFXCanvas from "./Test";

const SCROLL_SENSITIVITY = 0.0001;

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

// Theme tokens (subtle CRT)
const THEME = {
  neon: "#00ff41",
  neonSoft: "rgba(0,255,65,0.14)",
  text: "rgba(191,255,184,0.95)",
  glow: "rgba(0,255,65,0.12)",
  deep: "#030907",
};

function OverlayPanel({ exit }) {
  const overlayConfig = useMemo(
    () => ({
      height: 600,
      width: 1000,
      props: "cursor-target",
    }),
    []
  );

  return (
    <motion.div
      key="console-overlay"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.4 }}
      className="fixed bg-black/80 inset-0 z-[1200]"
    >
      <motion.div
        key="console-overlay"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.4 }}
        className=" relative top-[7%] left-[15%] z-[1200] w-fit max-h-[90vh] overflow-auto rounded-[10px] border border-[rgba(0,255,65,0.08)] bg-[rgba(0,0,0,0.92)] p-[14px] shadow-[0_5px_20px_rgba(0,255,255,0.1)]"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="font-[FiraCode,monospace] font-bold text-[#00ff41]">
            GAME CONSOLE
          </div>
          <button
            onClick={exit}
            className="cursor-target border border-[rgba(0,255,65,0.08)] bg-[rgba(0,0,0,0.92)] hover:bg-[rgba(255,0,0,0.1)] hover:border-[rgba(255,0,0,0.8)] hover:shadow-[0_0_10px_rgba(255,255,255,0.5)] shadow-[0_0_5px_rgba(255,0,0,0.3)] transition-all duration-300 ease-in-out rounded-[10px] p-1 gap-2 text-red-500 text-sm outline-none focus:outline-none"
          >
            <X className="inline text-red-500" /> Close
          </button>
        </div>
        <div className="mt-2">
          <Suspense
            fallback={<div className="p-5">Loading console toy...</div>}
          >
            <FlappyCatsGame {...overlayConfig} />
          </Suspense>
        </div>
      </motion.div>
    </motion.div>
  );
}

const HeroCRT = React.memo(function HeroCRT({
  visible = false,
  profile,
  projects,
  skills,
  showTick = 0,
}) {
  const [glitchBurst, setGlitchBurst] = useState(0);
  const [burstActive, setBurstActive] = useState(false);
  const navigate = useNavigate();
  const [showConsole, setShowConsole] = useState(false);
  const [once, setOnce] = useState(false);
  const [flipped, setFlipped] = useState(false);

  const { isLoaded } = useContext(LoaderContext);

  const prefersReducedMotion = useReducedMotion();

  const scrollYProgress = useMotionValue(0);

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    mass: 0.4,
  });

  useEffect(() => {
    if (!visible) {
      setShowConsole(false);
      animate(scrollYProgress, 0, {
        duration: 2.0,
        ease: "easeInOut",
      });
    }
  }, [visible, scrollYProgress]);

  const handleCardClick = () => {
    if (tp6.isDone && !flipped) {
      setFlipped(true);
      setTimeout(() => setFlipped(false), 2000);
    }
  };

  const handleGameExit = () => {
    if (!showConsole) return;
    setShowConsole(false);
    animate(scrollYProgress, 0, {
      duration: 2.0,
      ease: "easeInOut",
    });
  };

  const handleWheel = useMemo(() => {
    let rafId = null;
    return (event) => {
      if (showConsole) return;

      // Cancel previous frame
      if (rafId) cancelAnimationFrame(rafId);

      // Schedule update on next frame
      rafId = requestAnimationFrame(() => {
        const currentProgress = scrollYProgress.get();
        const unit = event.deltaMode === 1 ? 16 : 1;
        const delta = event.deltaY * unit * SCROLL_SENSITIVITY;
        const newProgress = clamp(currentProgress + delta, 0, 1);
        scrollYProgress.set(newProgress);
      });
    };
  }, [showConsole, scrollYProgress]);

  const pathLengthFirst = useTransform(smoothProgress, [0, 0.8], [0.2, 1.0]);
  const pathLengthSecond = useTransform(smoothProgress, [0, 0.8], [0.15, 1.05]);
  const pathLengthThird = useTransform(smoothProgress, [0, 0.8], [0.1, 1.1]);
  const pathLengthFourth = useTransform(smoothProgress, [0, 0.8], [0.05, 1.15]);
  const pathLengthFifth = useTransform(smoothProgress, [0, 0.8], [0, 1.2]);

  const glowAlpha = useTransform(smoothProgress, [0, 0.8, 1], [0.1, 0.1, 0.1]);
  const glowWidth = useTransform(smoothProgress, [0, 1], [8, 8]);
  const glowBlur = useTransform(smoothProgress, [0, 1], [8, 8]);
  const glowPulse = useTransform(
    smoothProgress,
    [0, 1],
    [prefersReducedMotion ? 0 : 1, prefersReducedMotion ? 0 : 1]
  );

  useEffect(() => {
    const unsubscribe = smoothProgress.onChange((latest) => {
      if (latest >= 0.8) {
        setOnce((prevOnce) => {
          if (!prevOnce) {
            setShowConsole(true);
          }
          return true;
        });
      } else {
        setOnce(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [smoothProgress, setOnce, setShowConsole]); // Add setters to dependency array

  const triggerGlitch = () => {
    setGlitchBurst((n) => n + 1);
    setBurstActive(true);
    setTimeout(() => setBurstActive(false), 360);
  };

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      triggerGlitch();
    }, 1000);
    return () => clearInterval(interval);
  }, [visible]);

  const { displayText: glitchName, restartAnimation } = useGlitchDecode(
    profile?.name || "",
    { speed: 50, iterations: 1 }
  );

  const projectCount = projects?.length ?? 0;
  const totalSkills = useMemo(
    () =>
      Object.values(skills || {}).reduce(
        (acc, arr) => acc + (arr?.length || 0),
        0
      ),
    [skills]
  );

  const dline = useMemo(() => {
    const derivedLines = profile?.highlights
      ? profile.highlights.split(" · ")
      : [];
    if (!derivedLines.length) derivedLines.push("Booting secure session...");
    const t = derivedLines
      .map((l) => l.trim())
      .map((l) => {
        if (l === "") return l;
        return `> ${l}`;
      });
    return t;
  }, [profile]);

  const tp1 = useTypewriter(["System: Initialization..."], {
    shouldLoop: false,
    multiLine: true,
    speed: 26,
    pause: 1100,
    startWhen: isLoaded,
  });
  const tp2 = useTypewriter(["> Projects: "], {
    shouldLoop: false,
    multiLine: true,
    speed: 26,
    pause: 1100,
    startWhen: tp1.isDone,
  });
  const tp3 = useTypewriter([`${projectCount}`], {
    shouldLoop: false,
    multiLine: true,
    speed: 26,
    pause: 1100,
    startWhen: tp2.isDone,
  });
  const tp4 = useTypewriter(["   Skills: "], {
    shouldLoop: false,
    multiLine: true,
    speed: 26,
    pause: 1100,
    startWhen: tp3.isDone,
  });
  const tp5 = useTypewriter([`${totalSkills}`], {
    shouldLoop: false,
    multiLine: true,
    speed: 26,
    pause: 1100,
    startWhen: tp4.isDone,
  });
  const tp6 = useTypewriter(dline, {
    shouldLoop: false,
    multiLine: true,
    speed: 26,
    pauseDelay: 100,
    startWhen: tp5.isDone,
  });
  // Chips from profile.skills_primary or fallback
  const chips = useMemo(() => {
    const prim =
      Array.isArray(profile?.skills_primary) && profile.skills_primary.length
        ? profile.skills_primary
        : ["React", "JavaScript", "Node", "WebGL", "Systems", "Design"];
    return prim.slice(0, profile?.chipCount || 0);
  }, [profile]);

  const chipVariants = {
    hidden: { opacity: 0, y: 28, x: -18, scale: 1.46 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
      transition: {
        delay: i * 0.08, // stagger only entrance
        type: "spring",
        stiffness: 110,
        damping: 16,
      },
    }),
  };

  const imgAnim = useAnimation();
  const cardAnim = useAnimation();
  const canvasAnim = useAnimation();
  const nameAnim = useAnimation();
  const headlineAnim = useAnimation();
  const ctaAnim = useAnimation();
  const socialAnim = useAnimation();

  const animations = useMemo(
    () => ({
      imgAnim,
      cardAnim,
      canvasAnim,
      nameAnim,
      headlineAnim,
      ctaAnim,
      socialAnim,
    }),
    [imgAnim, cardAnim, canvasAnim, nameAnim, headlineAnim, ctaAnim, socialAnim]
  );

  const t = { duration: 1.01, ease: "easeInOut" };

  useLayoutEffect(() => {
    const hidden = () => {
      animations.imgAnim.set({ opacity: 0, y: -10 });
      animations.cardAnim.set({ opacity: 0, x: 10, scale: 0.98 });
      animations.canvasAnim.set({ opacity: 0 });
      animations.nameAnim.set({ opacity: 0, x: -10 });
      animations.headlineAnim.set({ opacity: 0, x: -10 });
      animations.ctaAnim.set({ opacity: 0, y: 10 });
      animations.socialAnim.set({ opacity: 0, y: 10 });
    };
    if (!visible && !isLoaded) {
      animations.imgAnim.stop();
      animations.cardAnim.stop();
      animations.canvasAnim.stop();
      animations.nameAnim.stop();
      animations.headlineAnim.stop();
      animations.ctaAnim.stop();
      animations.socialAnim.stop();
      hidden();
      return;
    }
    hidden();
  }, [visible, showTick, isLoaded]);

  useEffect(() => {
    if (!visible && !isLoaded) return;
    animations.imgAnim.start({ opacity: 1, y: 0, transition: t });
    animations.cardAnim.start({
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        opacity: t,
        x: t,
        scale: { type: "tween", duration: 0.5, ease: easeOut },
      },
    });
    animations.canvasAnim.start({ opacity: 1, transition: { duration: 0.3 } });
    animations.nameAnim.start({ opacity: 1, x: 0, transition: t });
    animations.headlineAnim.start({ opacity: 1, x: 0, transition: t });
    animations.ctaAnim.start({ opacity: 1, y: 0, transition: t });
    animations.socialAnim.start({ opacity: 1, y: 0, transition: t });
  }, [visible, showTick, isLoaded]);

  const socials = useMemo(
    () => [
      { key: "linkedin", label: "LinkedIn", href: profile?.linkedin },
      { key: "github", label: "GitHub", href: profile?.github },
      { key: "instagram", label: "Instagram", href: profile?.instagram },
      { key: "telegram", label: "Telegram", href: profile?.telegram },
      { key: "mail", label: "Mail", href: `mailto:${profile?.email}` },
    ],
    [profile]
  );

  const onContact = () => navigate("/portfolio/contact");

  const onCopyEmail = useCallback(async () => {
    const email = profile?.email ?? "";
    if (!email) {
      return;
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(email);
      } else {
        const ta = document.createElement("textarea");
        ta.value = email;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (!ok) throw new Error("execCommand failed");
      }

      triggerGlitch?.();
    } catch (err) {
      console.error("Copy failed", err);
    }
  }, [profile?.email, triggerGlitch]);

  const onDownloadResume = useCallback(async () => {
    const url = profile?.resume_url;
    if (!url) {
      console.warn("No resume URL available on profile");
      return;
    }

    const filename = `${(profile?.name || "resume")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase()}-resume.pdf`;

    const clickAnchor = (href, name) => {
      const a = document.createElement("a");
      a.href = href;
      a.download = name;
      a.rel = "noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
    };

    try {
      if (url.startsWith("data:")) {
        clickAnchor(url, filename);
        return;
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

        console.debug("[download] fetching", url);
        const res = await fetch(url, {
          method: "GET",
          mode: "cors",
          cache: "no-cache",
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (res && res.ok) {
          const ct = res.headers.get("content-type") || "";
          console.debug(
            "[download] fetched OK, content-type:",
            ct,
            "status:",
            res.status
          );
          const blob = await res.blob();
          if (!blob || blob.size === 0) {
            console.warn("[download] fetched blob is empty");
          } else {
            const blobUrl = URL.createObjectURL(blob);
            try {
              clickAnchor(blobUrl, filename);
              console.info("[download] started blob download");
            } finally {
              setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
            }
            return;
          }
        } else {
          console.warn(
            "[download] fetch returned non-ok:",
            res?.status,
            res?.type
          );
        }
      } catch (fetchErr) {
        console.warn("[download] fetch failed (network/CORS/auth?)", fetchErr);
      }

      try {
        const parsed = new URL(url, window.location.href);
        if (parsed.origin === window.location.origin) {
          clickAnchor(url, filename);
          console.info("[download] used same-origin anchor fallback");
          return;
        }
      } catch (parseErr) {
        console.warn("[download] could not parse resume URL:", parseErr);
      }

      console.info("[download] falling back to opening URL in new tab");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("Download resume unexpected error:", err);
      try {
        window.open(url, "_blank", "noopener,noreferrer");
      } catch (e) {}
    }
  }, [profile?.resume_url, profile?.name]);

  const ctas = useMemo(
    () => [
      { label: "COPY_EMAIL", onClick: onCopyEmail },
      { label: "DOWNLOAD_RESUME", onClick: onDownloadResume },
      { label: "CONTACT_ME", onClick: onContact },
    ],
    [onCopyEmail, onDownloadResume, onContact]
  );

  const ry = useMotionValue(0);
  const rySpring = useSpring(ry, {
    stiffness: 200, // Reduced from 260 for smoother motion
    damping: 35, // Increased from 28 to reduce vibration
    mass: 0.8, // Added mass for more natural movement
  });

  // Enhanced 3D depth with stronger values
  const zBump = useTransform(rySpring, [0, 90, 180], [0, 80, 0]); // Increased from 40
  const tiltX = useTransform(rySpring, [0, 90, 180], [0, -12, 0]); // Increased from -7
  const scaleEffect = useTransform(rySpring, [0, 90, 180], [1, 0.95, 1]); // Add scale for depth

  // Smoother parallax that completely stops during flip
  const flipProgress = useTransform(rySpring, [0, 180], [0, 1]);
  const shouldCalculateParallax = useTransform(
    flipProgress,
    (v) => v < 0.1 || v > 0.9
  );
  // Replace parallax intensity calculation (around line 1125)
  const parallaxIntensity = useTransform(
    rySpring,
    [0, 45, 90, 135, 180],
    [1, 0.3, 0, 0.3, 1] // Smoother curve
  );

  // Enhanced parallax depths (replace existing zHeader, zBody, zFooter)
  const zHeader = useTransform(parallaxIntensity, (v) =>
    shouldCalculateParallax.get() ? v * 12 : 0
  );
  const zBody = useTransform(parallaxIntensity, (v) =>
    shouldCalculateParallax.get() ? v * 24 : 0
  );
  const zFooter = useTransform(parallaxIntensity, (v) =>
    shouldCalculateParallax.get() ? v * 10 : 0
  );

  // Better 3D transform template
  const transform3D = useMotionTemplate`
  rotateY(${rySpring}deg) 
  rotateX(${tiltX}deg) 
  translateZ(${zBump}px) 
  scale(${scaleEffect})
`;

  const tHeader = useMotionTemplate`translateZ(${zHeader}px)`;
  const tBody = useMotionTemplate`translateZ(${zBody}px)`;
  const tFooter = useMotionTemplate`translateZ(${zFooter}px)`;

  // Rim highlight (peaks near 90°)
  const edgeOpacity = useTransform(
    ry,
    [0, 60, 90, 120, 180],
    [0, 0.7, 1, 0.7, 0]
  );

  useEffect(() => {
    if (flipped) {
      // Disable hover during animation
      const container = document.querySelector(".card-3d-container");
      if (container) container.style.pointerEvents = "none";

      animate(ry, 180, {
        type: "tween",
        duration: 0.6,
        ease: [0.25, 0.1, 0.25, 1], // Smoother cubic bezier
        onComplete: () => {
          if (container) container.style.pointerEvents = "auto";
        },
      });
    } else {
      animate(ry, 0, {
        type: "tween",
        duration: 0.6,
        ease: [0.25, 0.1, 0.25, 1],
      });
    }
  }, [flipped, ry]);

  const prevTick = useRef(showTick);
  useEffect(() => {
    if (!visible) return;
    if (prevTick.current === showTick) return;
    restartAnimation();
    prevTick.current = showTick;
  }, [showTick, restartAnimation]);

  return (
    <section
      onWheel={visible ? handleWheel : undefined}
      aria-label="Hero"
      className="relative w-full h-screen overflow-hidden select-none"
      style={{ background: THEME.deep }}
    >
      <style>{`
        @keyframes blink { 50% { opacity: 0; } }
        @keyframes neonFlicker {
          0% { text-shadow: 0 0 8px rgba(0,255,65,0.06), 0 0 24px rgba(0,255,65,0.02); opacity: 0.95; }
          50% { text-shadow: 0 0 14px rgba(0,255,65,0.12), 0 0 36px rgba(0,255,65,0.04); opacity: 1; }
          100% { text-shadow: 0 0 8px rgba(0,255,65,0.06), 0 0 24px rgba(0,255,65,0.02); opacity: 0.95; }
        }
        @keyframes jitter {
          0% { transform: translateX(0) skewX(0); }
          20% { transform: translateX(-1px) skewX(-0.5deg); }
          40% { transform: translateX(1px) skewX(0.5deg); }
          60% { transform: translateX(-0.5px) skewX(-0.25deg); }
          80% { transform: translateX(0.5px) skewX(0.25deg); }
          100% { transform: translateX(0) skewX(0); }
        }
        @keyframes glitchShift {
          0%   { transform: translate(0,0) skewX(0deg); opacity: 1; filter: none; }
          20%  { transform: translate(-10px,-6px) skewX(-30deg); opacity: 1; filter: blur(0.4px); }
          50%  { transform: translate(10px,5px) skewX(30deg); opacity: 1; filter: blur(0.6px); }
          80%  { transform: translate(-8px,2px) skewX(-20deg); opacity: 1; filter: blur(0.3px); }
          100% { transform: translate(0,0) skewX(0deg); opacity: 1; filter: none; }
        }
        @keyframes floatUp {
          0% { transform: translateY(12px) translateX(0) rotate(0deg); opacity: 0; }
          10% { opacity: 0.8; }
          100% { transform: translateY(-140px) translateX(10px) rotate(10deg); opacity: 0; }
        }
          .card-face-content {
    -webkit-transform: translateZ(0);
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
    will-change: contents;
  }
  
  /* Force GPU acceleration without blur */
  .card-3d-container {
    -webkit-transform-style: preserve-3d;
    transform-style: preserve-3d;
    -webkit-perspective: 1000px;
    perspective: 1000px;
  }
  
  /* Crisp text in 3D context */
  .card-3d-text {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    filter: none !important;
    transform: translateZ(0);
  }

        animate-jitter { animation: jitter 420ms linear 1; }
        .animate-floatUp { animation: floatUp 420ms linear 1; }
      `}</style>

      {visible && <TargetCursor />}
      <motion.div
        initial={false}
        animate={animations.canvasAnim}
        className="fixed inset-0 w-full h-full"
      >
        <HeroFXCanvas
          playing={visible}
          reducedMotion={prefersReducedMotion}
          className="absolute inset-0 z-0"
          style={{ background: "#030907" }}
          gridCellSize={60}
          gridLineColor="rgba(0,255,65,0.12)"
          rippleColor="rgba(255,255,255,0.10)"
          rippleSpeed={520}
          ringWidth={6}
          gridTopRatio={0.67}
          bottomOffset={-20} // matches your old -bottom-[20px]
          // Pass Framer Motion MotionValues directly:
          pathLengths={[
            pathLengthFirst,
            pathLengthSecond,
            pathLengthThird,
            pathLengthFourth,
            pathLengthFifth,
          ]}
          glow={{
            enabled: true,
            alpha: glowAlpha,
            width: glowWidth,
            blur: glowBlur,
            pulse: glowPulse,
          }}
        />
      </motion.div>

      <AnimatePresence mode="wait">
        {showConsole && <OverlayPanel exit={handleGameExit} />}
      </AnimatePresence>

      {/* Subtle glows + scanline */}
      <div className="absolute inset-0 -z-20 overflow-hidden">
        <div
          className="absolute -left-32 -top-32 w-96 h-96 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(0,255,65,0.06), transparent 40%)",
          }}
        />
        <div
          className="absolute -right-32 -bottom-32 w-[36rem] h-[36rem] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(0,212,184,0.04), transparent 40%)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.01) 0px, rgba(255,255,255,0.01) 1px, transparent 1px, transparent 4px)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.004), rgba(255,255,255,0.02))",
            mixBlendMode: "overlay",
            opacity: 0.08,
            animation: "scan-h 6s linear infinite",
          }}
        />
      </div>

      <div className="relative flex  justify-between h-screen z-0 w-full max-w-[80rem] mx-auto items-start pointer-events-none mt-32">
        <div className="flex-1 flex items-center justify-between !z-0">
          {/* Left: content */}
          <div className="flex">
            <div className="flex flex-col max-w-[650px]">
              <motion.div
                whileHover={{
                  scale: 1.04,
                  boxShadow: "0 1px 20px rgba(0,255,65,0.56)",
                }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.3 }}
                onClick={restartAnimation}
                aria-label="Avatar"
                title={profile?.name}
                className="w-fit rounded-full transition-transform duration-200 mt-4 outline-none focus:outline-none cursor-target z-20 pointer-events-auto"
              >
                <motion.img
                  initial={false}
                  animate={animations.imgAnim}
                  src={profile?.profileImage}
                  alt={profile?.name}
                  className="w-40 h-40 object-cover rounded-full block"
                />
              </motion.div>
              <motion.div
                initial={false}
                animate={animations.nameAnim}
                className="relative flex"
              >
                <h1
                  onClick={restartAnimation}
                  className="text-4xl font-extrabold leading-tight w-fit inline-block cursor-target pointer-events-auto"
                  style={{
                    color: THEME.neon,
                    textShadow: `0 0 10px ${THEME.glow}, 0 0 24px rgba(0,255,65,0.04)`,
                    fontFamily: "Orbitron, system-ui, sans-serif",
                  }}
                >
                  {glitchName}
                </h1>
                <span className=" text-xs text-[#00ff41] font-[Orbitron] flex-1 flex items-end mb-1">
                  {profile?.location}
                </span>
              </motion.div>
              <motion.p
                initial={false}
                animate={animations.headlineAnim}
                onMouseEnter={triggerGlitch}
                aria-live="polite"
                className="text-xl  mt-2 leading-[1.05] max-w-fit font-[Orbitron] tracking-[0.6px] text-[#b6feb6] animate-[neonFlicker_3.2s_ease-in-out_infinite]"
              >
                <span className="relative inline-block">
                  {profile?.headline}
                  {[-6, 0, 6].map((offsetX, i) => (
                    <span
                      key={`gl-${i}-${glitchBurst}`}
                      aria-hidden
                      className="absolute left-0 top-0 pointer-events-none inline-block origin-left-top"
                      style={{
                        opacity: burstActive ? 1 : 0,
                        animation: burstActive
                          ? "glitchShift 360ms cubic-bezier(0.2,0.9,0.2,1) 1 both"
                          : "none",
                        color:
                          i === 0
                            ? "rgba(0,255,65,0.12)"
                            : i === 1
                            ? "rgba(0,200,200,0.08)"
                            : "rgba(255,120,160,0.06)",
                        transform: `translate(${offsetX}px, ${
                          i === 1 ? -1 : -2
                        }px)`,
                        zIndex: i === 1 ? 1 : 0,
                      }}
                    >
                      {profile?.headline}
                    </span>
                  ))}
                </span>
              </motion.p>

              {/* Chips */}
              <div className="mt-3">
                <div
                  className="flex flex-wrap gap-2"
                  style={{ perspective: 800 }}
                >
                  {chips.map((t, i) => (
                    <motion.div
                      key={t}
                      custom={i}
                      variants={chipVariants}
                      initial="hidden"
                      animate={visible && isLoaded ? "visible" : "hidden"}
                      whileHover={{
                        translateY: -5,
                        scale: 1.05,
                        transition: {
                          duration: 0.3,
                          delay: 0,
                          ease: "easeInOut",
                        },
                      }}
                      className="cursor-target pointer-events-auto"
                      style={{
                        transformStyle: "preserve-3d",
                        willChange: "transform",
                        cursor: "pointer",
                      }}
                    >
                      <span
                        className="px-3 py-1 rounded-md text-xs font-mono"
                        style={{
                          border: `1px solid ${THEME.neonSoft}`,
                          background: "rgba(0,0,0,0.36)",
                          color: THEME.text,
                        }}
                      >
                        {t}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {!!ctas.length && (
                <motion.div
                  initial={false}
                  animate={animations.ctaAnim}
                  className="mt-4 flex items-center gap-3 flex-wrap"
                >
                  {ctas.map((c, idx) => (
                    <button
                      key={c.label + idx}
                      onClick={c.onClick}
                      className={[
                        "cursor-target pointer-events-auto inline-flex items-center justify-center relative overflow-hidden bg-[linear-gradient(180deg,rgba(0,255,65,0.06),rgba(0,0,0,0.02))] rounded-[6px] border text-[#00ff41] border-[rgba(0,255,65,0.18)] py-[10px] px-[16px] text-[0.95rem] cursor-pointer outline-none transition-transform duration-200 ease-out hover:animate-jitter hover:-translate-y-[3px] hover:bg-[linear-gradient(180deg,rgba(0,255,65,0.06),rgba(0,0,0,0.02))] ",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {c.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
          </div>

          {/* Right: compact terminal card */}
          <motion.div
            className="cursor-target relative w-full min-w-[450px] max-w-md pointer-events-auto"
            initial={false}
            animate={animations.cardAnim}
            style={{
              perspective: 1000, // Reduced from 480 for stronger 3D
              perspectiveOrigin: "50% 50%",
              height: 220,
              transformStyle: "preserve-3d",
              willChange: "perspective",
            }}
            onClick={handleCardClick}
          >
            {/* Remove the nested motion.div with whileHover - it's causing conflicts */}
            <motion.div
              className="relative w-full h-full rounded-xl"
              style={{
                transformStyle: "preserve-3d",
                willChange: "transform",
                transformOrigin: "50% 50%",
                transform: transform3D,
                pointerEvents: flipped ? "none" : "auto",
                // Move shadow here as a single source
                boxShadow: flipped
                  ? "0 10px 40px rgba(0,255,65,0.25), 0 0 60px rgba(0,255,65,0.15)"
                  : "0 4px 20px rgba(0,255,65,0.12), 0 0 30px rgba(0,255,65,0.08)",
              }}
              // Add hover only when not flipping
              whileHover={
                flipped
                  ? {}
                  : {
                      boxShadow:
                        "0 8px 32px rgba(0,255,65,0.22), 0 0 45px rgba(0,255,65,0.12)",
                      transition: { duration: 0.2 },
                    }
              }
              transition={{ boxShadow: { duration: 0.3, ease: "easeOut" } }}
            >
              {/* Rim highlight (feels like thickness near 90°) */}
              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-xl"
                style={{
                  opacity: edgeOpacity,
                  background:
                    "linear-gradient(90deg, rgba(0,0,0,0), rgba(255,255,255,0.18), rgba(0,0,0,0))",
                  mixBlendMode: "screen",
                  transform: "translateZ(0.3px)",
                }}
              />

              {/* FRONT FACE */}
              <div
                className="absolute inset-0 rounded-xl border overflow-hidden"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(0deg) translateZ(1px)", // Increased from 0.2px
                  transformStyle: "preserve-3d",
                  borderColor: THEME.neonSoft,
                  background:
                    "linear-gradient(135deg, rgba(0,0,0,0.85), rgba(0,20,10,0.92))",
                  zIndex: 2,
                  // Add subtle reflection
                  backgroundImage: `
      linear-gradient(135deg, rgba(0,0,0,0.85), rgba(0,20,10,0.92)),
      linear-gradient(45deg, transparent 30%, rgba(0,255,65,0.03) 50%, transparent 70%)
    `,
                  willChange: "transform",
                  WebkitFontSmoothing: "antialiased", // Changed from antialiased
                  backfaceVisibility: "hidden",
                  textRendering: "optimizeLegibility",
                  display: "flex",
                  flexDirection: "column",
                  MozOsxFontSmoothing: "grayscale",
                  willChange: "transform",
                  contain: "layout style paint",
                }}
              >
                {/* Side shading UNDER the border: inset by 1px so border stays visible */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute top-1 bottom-1 left-1 right-1 rounded-[10px]"
                  style={{
                    // Light falloff on edges to simulate thickness, but leave border visible
                    background:
                      "linear-gradient(90deg, rgba(0,0,0,0.35), transparent 15%, transparent 85%, rgba(0,0,0,0.35))",
                    mixBlendMode: "multiply",
                    transform: "translateZ(0.25px)",
                  }}
                />

                {/* header (parallax) */}
                <motion.div
                  className="flex items-center border-b border-b-[rgba(0,255,65,0.16)] justify-between mb-3 p-3"
                  style={{ transform: tHeader }}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-[#ff5757]" />
                    <span className="w-3 h-3 rounded-full bg-[#ffb86b]" />
                    <span className="w-3 h-3 rounded-full bg-[#2bd85a]" />
                  </div>
                  <div className="text-xs font-mono text-sky-200/60">
                    root@crt
                  </div>
                </motion.div>

                {/* body (parallax) */}
                <motion.div
                  className="bg-black/10 rounded px-4 min-h-[130px] flex-1"
                  style={{ transform: tBody, willChange: "transform" }}
                >
                  <div className="card-3d-text">
                    <div className="text-xs font-mono text-[#a7fdb0] leading-5">
                      <pre className="text-[#8dff9a]">
                        &gt; {tp1?.displayText ?? ""}
                      </pre>
                    </div>
                    <pre className="text-xs font-mono text-[#bfffb8] leading-5 mt-3">
                      <span className="text-[#8dff9a]">
                        {tp2?.displayText ?? ""}{" "}
                      </span>
                      <span className="text-amber-300/90">
                        {tp3?.displayText ?? ""}
                      </span>
                      <span className="text-[#8dff9a]">
                        {tp4?.displayText ?? ""}{" "}
                      </span>
                      <span className="text-amber-300/90">
                        {tp5?.displayText ?? ""}
                      </span>
                    </pre>
                    <pre className="mt-3 text-xs text-sky-200/60 font-mono">
                      {tp6?.displayText ?? ""}
                      {tp5?.isDone && !tp6?.isDone && (
                        <span className="inline-block w-2 h-[1rem] bg-green-400 align-middle animate-[blink_1s_steps(2,start)_infinite]" />
                      )}
                    </pre>
                  </div>
                </motion.div>

                {/* footer (parallax) */}
                <motion.div
                  className="mt-3 flex items-center justify-between px-3 py-1 border-t border-t-[rgba(0,255,65,0.16)]"
                  style={{ transform: tFooter }}
                >
                  <div className="text-[8px] text-sky-200/70 font-mono">
                    uptime
                  </div>
                  <div className="text-[8px] text-sky-200/70 font-mono">
                    tip:Click the card to flip
                  </div>
                  <div
                    className="text-[8px] font-semibold"
                    style={{ color: THEME.neon }}
                  >
                    99.98%
                  </div>
                </motion.div>
              </div>

              {/* BACK FACE - Complete optimized version */}
              <div
                className="absolute inset-0 rounded-xl border overflow-hidden"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transformStyle: "preserve-3d",
                  borderColor: THEME.neonSoft,
                  // Slightly different gradient for back face - darker/mysterious
                  background:
                    "linear-gradient(135deg, rgba(0,0,0,0.92), rgba(0,30,15,0.95))",
                  backgroundImage: `
      linear-gradient(135deg, rgba(0,0,0,0.92), rgba(0,30,15,0.95)),
      linear-gradient(225deg, transparent 30%, rgba(0,255,65,0.02) 50%, transparent 70%)
    `,
                  zIndex: 1, // Lower than front (2)
                  display: "flex",
                  flexDirection: "column",
                  willChange: "transform",
                  isolation: "isolate",
                  transform: "rotateY(180deg) translateZ(1px)", // Reduced Z
                  display: "flex",
                  flexDirection: "column",
                  WebkitFontSmoothing: "antialiased",
                  MozOsxFontSmoothing: "grayscale",
                  textRendering: "optimizeLegibility",
                  willChange: "transform",
                  contain: "layout style paint",
                  isolation: "isolate",
                  pointerEvents: flipped ? "auto" : "none",
                }}
              >
                {/* Enhanced side shading for depth illusion */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-xl"
                  style={{
                    // Stronger edge shadows for back face
                    background: `
        linear-gradient(90deg, 
          rgba(0,0,0,0.45) 0%, 
          transparent 12%, 
          transparent 88%, 
          rgba(0,0,0,0.45) 100%
        ),
        linear-gradient(180deg,
          rgba(0,0,0,0.3) 0%,
          transparent 10%,
          transparent 90%,
          rgba(0,0,0,0.3) 100%
        )
      `,
                    mixBlendMode: "multiply",
                    transform: "translateZ(0.5px)", // Slight offset for layering
                  }}
                />

                {/* Subtle inner glow for back face */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-xl"
                  style={{
                    background:
                      "radial-gradient(circle at 50% 50%, rgba(0,255,65,0.03) 0%, transparent 70%)",
                    mixBlendMode: "screen",
                    transform: "translateZ(0.3px)",
                    opacity: 0.6,
                  }}
                />

                {/* Header with parallax - Back Face */}
                <motion.div
                  className="flex items-center border-b justify-between mb-3 p-3 relative z-10"
                  style={{
                    transform: tHeader,
                    borderColor: "rgba(0,255,65,0.18)",
                    // Subtle glass effect
                    background:
                      "linear-gradient(180deg, rgba(0,255,65,0.02), transparent)",
                    backdropFilter: "blur(2px)",
                    WebkitBackdropFilter: "blur(2px)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    {/* Animated dots for back face */}
                    <motion.span
                      className="w-3 h-3 rounded-full bg-[#ff5757]"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <motion.span
                      className="w-3 h-3 rounded-full bg-[#ffb86b]"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, delay: 0.3, repeat: Infinity }}
                    />
                    <motion.span
                      className="w-3 h-3 rounded-full bg-[#2bd85a]"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, delay: 0.6, repeat: Infinity }}
                    />
                  </div>
                  <div className="text-xs font-mono text-sky-200/70 tracking-wider">
                    game@crt
                  </div>
                </motion.div>

                {/* Body with parallax - Back Face */}
                <motion.div
                  className="rounded px-4 min-h-[130px] flex-1 flex flex-col justify-between relative z-10"
                  style={{
                    transform: tBody,
                    willChange: "transform",
                    // Subtle gradient background
                    background:
                      "linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,255,65,0.01))",
                  }}
                >
                  <div className="card-3d-text">
                    {/* Game title with glow effect */}
                    <div className="text-sm font-mono leading-5">
                      <pre
                        className="text-[#8dff9a] font-bold tracking-wide"
                        style={{
                          textShadow:
                            "0 0 10px rgba(0,255,65,0.3), 0 0 20px rgba(0,255,65,0.1)",
                        }}
                      >
                        🙀 FlappyCat 🙀
                      </pre>
                    </div>

                    {/* Game description with typing animation feel */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: flipped ? 1 : 0 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                      className="text-xs font-mono leading-5 mt-3 space-y-1"
                    >
                      <p
                        className="text-amber-300/90"
                        style={{
                          textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                        }}
                      >
                        <span className="text-green-400/80">$</span> Wanna play
                        a quick game with kitties?
                      </p>
                      <p
                        className="text-amber-300/90"
                        style={{
                          textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                        }}
                      >
                        <span className="text-green-400/80">$</span> Piss off
                        the Catinator
                      </p>
                      <p
                        className="text-amber-300/90"
                        style={{
                          textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                        }}
                      >
                        <span className="text-green-400/80">$</span> Make'em cry
                      </p>
                    </motion.div>

                    {/* Instructions with pulsing cursor */}
                    <motion.pre
                      className="mt-3 text-xs text-sky-200/60 font-mono leading-5"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: flipped ? 1 : 0 }}
                      transition={{ delay: 0.5, duration: 0.5 }}
                    >
                      <span className="text-green-400/70">&gt;</span> Try
                      scrolling down on the page to power up the game engine!
                      {flipped && (
                        <motion.span
                          className="inline-block w-2 h-[1rem] bg-green-400 align-middle ml-1"
                          animate={{ opacity: [1, 0] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                      )}
                    </motion.pre>
                  </div>
                </motion.div>

                {/* Footer with parallax - Back Face */}
                <motion.div
                  className="mt-3 flex items-center justify-between px-3 py-1 border-t relative z-10"
                  style={{
                    transform: tFooter,
                    borderColor: "rgba(0,255,65,0.18)",
                    background:
                      "linear-gradient(180deg, transparent, rgba(0,255,65,0.01))",
                  }}
                >
                  <div className="text-[8px] text-sky-200/70 font-mono">
                    <span className="text-green-400/60">●</span> ready
                  </div>
                  <div className="text-[8px] text-sky-200/70 font-mono italic">
                    tip:scroll to charge the localeCompare
                  </div>
                  <div
                    className="text-[8px] font-semibold"
                    style={{
                      color: THEME.neon,
                      textShadow: "0 0 5px rgba(0,255,65,0.4)",
                    }}
                  >
                    GAME.RDY
                  </div>
                </motion.div>

                {/* Optional: Scanline effect for retro feel */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-xl"
                  style={{
                    background: `repeating-linear-gradient(
        0deg,
        transparent 0px,
        transparent 2px,
        rgba(0,255,65,0.01) 2px,
        rgba(0,255,65,0.01) 4px
      )`,
                    transform: "translateZ(1px)",
                    opacity: 0.3,
                    mixBlendMode: "overlay",
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={false}
        animate={animations.socialAnim}
        className="fixed bottom-[40px] left-[170px] right-40 animate-[scanline_2.6s_linear_infinite] z-20"
      >
        <SocialFillRail
          items={socials}
          orientation="row"
          props="cursor-target"
        />
      </motion.div>

      {/* Inline CSS for scan + blink */}
      <style>{`
        @keyframes scan-h {
          0% { transform: translateX(-120%); opacity: .18 }
          50% { opacity: .06 }
          100% { transform: translateX(120%); opacity: .18 }
        }
        @keyframes blink { 50% { opacity: 0 } }
      `}</style>
    </section>
  );
});

export default HeroCRT;
