"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
  useLayoutEffect,
} from "react";
import * as THREE from "three";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import {
  Html,
  Environment,
  Billboard,
  AdaptiveDpr,
  PerformanceMonitor,
} from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { animate, useMotionValue, motion, useAnimation } from "framer-motion";
import { portfolioData } from "@/mock";
import { publicApi } from "@/utils/api";
import { usePerfSettings } from "@/hooks/userPerf";
import ShinyText from "./ui/ShinyText";
import GradientText from "@/ui/TextAnimations/GradientText/GradientText";

const TRACK_CACHE = new Map();

function useAfterFirstFrame() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return ready;
}

function WarmupScene({ density = 1 } = {}) {
  return (
    <>
      <color attach="background" args={["#030907"]} />
      <hemisphereLight args={["#f5f7ff", "#0a0d14", 0.7]} />
    </>
  );
}

function PerformanceSafety() {
  const [low, setLow] = useState(false);
  return (
    <PerformanceMonitor
      onDecline={() => setLow(true)}
      onIncline={() => setLow(false)}
    />
  );
}

function samplePoseIntoRef(points, frames, cum, L, out, lastIdxRef) {
  const N = points.length - 1;
  if (L <= 0) {
    writePose(out, points[0], frames, 0);
    lastIdxRef.current = 0;
    return;
  }
  if (L >= cum[N]) {
    writePose(out, points[N], frames, N);
    lastIdxRef.current = N - 1;
    return;
  }
  let i = lastIdxRef.current;
  if (i < N - 1 && L >= cum[i + 1]) {
    while (i < N - 1 && L >= cum[i + 1]) i++;
  } else if (L < cum[i]) {
    while (i > 0 && L < cum[i]) i--;
  } else if (!(cum[i] <= L && L < cum[i + 1])) {
    i = lowerBound(cum, L, 0, N) - 1;
    if (i < 0) i = 0;
    if (i >= N) i = N - 1;
  }
  lastIdxRef.current = i;
  const t = (L - cum[i]) / Math.max(1e-6, cum[i + 1] - cum[i]);
  out.point.copy(points[i]).lerp(points[i + 1], t);
  out.tangent
    .copy(frames.tangents[i])
    .lerp(frames.tangents[i + 1], t)
    .normalize();
  out.normal
    .copy(frames.normals[i])
    .lerp(frames.normals[i + 1], t)
    .normalize();
  out.binormal
    .copy(frames.binormals[i])
    .lerp(frames.binormals[i + 1], t)
    .normalize();
}

function lowerBound(arr, x, lo = 0, hi = arr.length - 1) {
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
function writePose(out, point, frames, i) {
  out.point.copy(point);
  out.tangent.copy(frames.tangents[Math.max(0, i)]).normalize();
  out.normal.copy(frames.normals[Math.max(0, i)]).normalize();
  out.binormal.copy(frames.binormals[Math.max(0, i)]).normalize();
}

function computeApproxFrames(points) {
  const N = points.length;
  const tangents = new Array(N);
  const normals = new Array(N);
  const binormals = new Array(N);
  const worldUp = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i < N; i++) {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(N - 1, i + 1)];
    const tangent = b.clone().sub(a).normalize();
    let right = new THREE.Vector3().crossVectors(worldUp, tangent);
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
    else right.normalize();
    const up = new THREE.Vector3().crossVectors(tangent, right).normalize();
    tangents[i] = tangent;
    normals[i] = right; // treat “right” as normal (rail offset direction)
    binormals[i] = up; // treat “up” as binormal
  }
  return { tangents, normals, binormals };
}

function alignBinormalUp(frames) {
  const f = frames;
  const worldUp = new THREE.Vector3(0, 1, 0);
  const idxA = 0,
    idxB = Math.floor(f.binormals.length / 2),
    idxC = f.binormals.length - 1;
  const dotSum =
    f.binormals[idxA].dot(worldUp) +
    f.binormals[idxB].dot(worldUp) +
    f.binormals[idxC].dot(worldUp);
  if (dotSum < 0) {
    f.normals.forEach((n) => n.multiplyScalar(-1));
    f.binormals.forEach((b) => b.multiplyScalar(-1));
  }
  return f;
}

const RollerCoasterTimeline3D = React.memo(function RollerCoasterTimeline3D({
  waves = 5,
  minHeight = 100,
  neon = "#00ff41",
  black = "#000000",
  wheelSpeed = 0.000005,
  visible = true,
  showTick = 0,
  data,
}) {
  const perf = usePerfSettings();
  const [deferScene, setDeferScene] = useState(true);
  const containerRef = useRef(null);
  const pMV = useMotionValue(0); // progress 0..1
  const [p, setP] = useState(0);
  const [belowTrack, setBelowTrack] = useState(false);
  const scrollRef = useRef(null);
  const belowRef = useRef(false);
  const events = useMemo(() => data, [data]);
  const [resetTick, setResetTick] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const id = requestAnimationFrame(() => {
      // Close expanded view below the track
      setBelowTrack(false);
      scrollRef.current = null;
      animate(pMV, 0, { duration: 1.35, ease: "easeOut" });
      setResetTick((t) => t + 1);
    });
    return () => cancelAnimationFrame(id);
  }, [visible]);

  useEffect(() => {
    const schedule = () => setDeferScene(false);
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(schedule, { timeout: 800 });
      return () => window.cancelIdleCallback?.(id);
    } else {
      const id = setTimeout(schedule, 400);
      return () => clearTimeout(id);
    }
  }, []);

  useEffect(() => {
    belowRef.current = belowTrack;
  }, [belowTrack]);

  useEffect(() => {
    let raf = 0;
    const onChange = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setP(THREE.MathUtils.clamp(pMV.get(), 0, 1));
      });
    };
    const unsub = pMV.on("change", onChange);
    return () => {
      unsub?.();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [pMV]);

  // Virtual scroll: page doesn't move; wheel/touch drives progress with inertia
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.style.overscrollBehavior = "none";
    el.style.touchAction = "none";

    let v = 0;
    const friction = 0.92;
    const maxV = 0.015;
    let raf = 0;
    let lastT = performance.now();

    const step = (t) => {
      const dt = Math.min(0.05, (t - lastT) / 1000 || 0);
      lastT = t;

      // decay inertia
      v *= Math.pow(friction, dt * 60);

      if (Math.abs(v) > 1e-6) {
        const cur = pMV.get();
        let next = cur + v;
        const locked = belowRef.current && scrollRef.current;
        if (locked) {
          const { min, max } = scrollRef.current;
          const unclamped = next;
          next = THREE.MathUtils.clamp(next, min, max);
          // if we tried to go outside, stop inertia right away
          if (next !== unclamped) v = 0;
        } else {
          if (next > 1) next = next % 1;
          else if (next <= 0) {
            next = 0;
            v = 0;
          }
        }
        pMV.set(next);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    const onWheel = (e) => {
      e.preventDefault();
      const delta = THREE.MathUtils.clamp(e.deltaY * wheelSpeed, -maxV, maxV);
      const locked = belowRef.current && scrollRef.current;
      if (locked) {
        const cur = pMV.get();
        const { min, max } = scrollRef.current;
        if ((cur <= min && delta < 0) || (cur >= max && delta > 0)) return;
      }
      v += delta;
    };

    let lastY = null;
    const onTouchStart = (e) => (lastY = e.touches?.[0]?.clientY ?? null);
    const onTouchMove = (e) => {
      if (lastY == null) return;
      e.preventDefault();
      const y = e.touches?.[0]?.clientY ?? lastY;
      const delta = THREE.MathUtils.clamp(
        (lastY - y) * (wheelSpeed * 0.5),
        -maxV,
        maxV
      );

      const locked = belowRef.current && scrollRef.current;
      if (locked) {
        const cur = pMV.get();
        const { min, max } = scrollRef.current;
        if ((cur <= min && delta < 0) || (cur >= max && delta > 0)) return;
      }
      v += delta;
      lastY = y;
    };
    const onTouchEnd = () => (lastY = null);

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [pMV, wheelSpeed, resetTick]);

  const headerAnim = useAnimation();

  const t = { duration: 1.0, ease: [0.22, 1, 0.36, 1] };

  useLayoutEffect(() => {
    const hidden = () => {
      headerAnim.set({ opacity: 0, y: -10 });
    };

    if (!visible) {
      headerAnim.stop();
      hidden();
    }

    hidden();
  }, [visible, showTick]);

  useEffect(() => {
    if (!visible) return;
    headerAnim.start({ opacity: 1, y: 0, transition: t });
  }, [visible, showTick]);

  return (
    <section
      ref={containerRef}
      className="relative w-full h-screen flex flex-col overflow-hidden bg-[#030907] text-white select-none"
    >
      <motion.div
        initial={false}
        animate={headerAnim}
        className="absolute z-20 pt-6 pb-3 bg-transparent px-28"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded border text-xs font-mono border-[rgba(0,255,65,0.16)] text-[#00ff41] shadow-[inset_0_0_10px_rgba(0,255,65,0.2)]">
          ROLLER COASTER // EXPERIENCE
        </div>
        <GradientText className="drop-shadow-[0_0_16px_rgba(0,255,65,0.48)]" colors={["#00ff41", "#00ff4185", "#00ff41"]}>
          <h2 className="mt-2 text-3xl md:text-5xl font-extrabold tracking-tight">
            Summit to Valley
          </h2>
        </GradientText>
        <ShinyText className="text-sm text-emerald-200/70" text="Wheel / drag to ride. Click milestones to jump." />
      </motion.div>
      <Canvas
        dpr={perf.dpr}
        frameloop={visible ? "always" : "demand"}
        className="absolute inset-0"
        shadows={false}
        camera={{ position: [0, 60, 102], fov: 55, near: 0.1, far: 2000 }}
        gl={{
          alpha: false,
          antialias: perf.antialias,
          stencil: false,
          depth: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          powerPreference: "high-performance",
          outputColorSpace: THREE.SRGBColorSpace,
          preserveDrawingBuffer: false,
        }}
      >
        <PerformanceSafety />
        <ParallaxStars density={perf.density} pasused={!visible} />
        {deferScene ? (
          <WarmupScene density={perf.density} />
        ) : (
          <Suspense fallback={<WarmupScene density={perf.density} />}>
            <Scene
              events={events}
              pMV={pMV}
              p={p}
              waves={waves}
              minHeight={minHeight}
              neon={neon}
              black={black}
              belowTrack={belowTrack}
              setBelowTrack={setBelowTrack}
              scroll={scrollRef}
              density={perf.density}
              allowPost={perf.allowPost}
              allowShadows={perf.allowShadows}
              resetTick={resetTick}
              visible={visible}
            />
          </Suspense>
        )}
        <AdaptiveDpr pixelated />
      </Canvas>
    </section>
  );
});
export default RollerCoasterTimeline3D;

/* ---------------- Scene ---------------- */

const Scene = React.memo(function Scene({
  events,
  pMV,
  waves,
  minHeight,
  neon,
  black,
  belowTrack,
  setBelowTrack,
  scroll,
  density,
  allowPost,
  allowShadows,
  resetTick = 0,
  visible = true,
}) {
  const { gl } = useThree();
  const leftrailsRef = useRef();
  const rightrailsRef = useRef();
  const [cardPos, setCardPos] = useState(null);
  const afterFirstFrame = useAfterFirstFrame();
  const [mountedHeavy, setMountedHeavy] = useState(false);
  const [hasEnv, setHasEnv] = useState(false);
  const pausedRef = useRef(!visible);

  useEffect(() => {
    pausedRef.current = !visible;
  }, [visible]);

  useEffect(() => {
    lastIdxRef.current = 0;
    glowIdxRef.current = 0;
    lastCountRef.current = 0;
    setGlowSleeperCount(0);

    mileIdxRef.current = -1;
    lastActiveRef.current = -2;
    setActiveIndex(-1);
  }, [resetTick]);

  useEffect(() => {
    const schedule = () => setMountedHeavy(true);
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(schedule, { timeout: 800 });
      return () => window.cancelIdleCallback?.(id);
    } else {
      const id = setTimeout(schedule, 400);
      return () => clearTimeout(id);
    }
  }, []);

  // Build center path & Frenet frames
  const SEGMENTS = Math.round(700 + 300 * density); // 800 on low tier, 1200 on high
  const { curve, points, totalLen } = useMemo(
    () => buildCurve(waves, minHeight, SEGMENTS),
    [waves, minHeight, SEGMENTS]
  );

  const [frames, setFrames] = useState(() => computeApproxFrames(points));
  useEffect(() => {
    let canceled = false;
    // reset to approximated frames for new points right away
    setFrames(computeApproxFrames(points));

    const build = () => {
      const f = curve.computeFrenetFrames(points.length - 1, false);
      if (!canceled) setFrames(alignBinormalUp(f));
    };

    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(build, { timeout: 600 });
      return () => {
        canceled = true;
        window.cancelIdleCallback?.(id);
      };
    } else {
      const id = setTimeout(build, 0);
      return () => {
        canceled = true;
        clearTimeout(id);
      };
    }
  }, [curve, points]);

  // Cumulative length array (0..totalLen at each point index)
  const cum = useMemo(() => {
    const N = points.length;
    const arr = new Float32Array(N);
    let acc = 0;
    arr[0] = 0;
    for (let i = 1; i < N; i++) {
      acc += points[i - 1].distanceTo(points[i]);
      arr[i] = acc;
    }
    return arr;
  }, [points]);

  // Live pose + length refs updated every frame (no React state)
  const poseRef = useRef({
    point: new THREE.Vector3(),
    tangent: new THREE.Vector3(1, 0, 0),
    normal: new THREE.Vector3(0, 1, 0),
    binormal: new THREE.Vector3(0, 0, 1),
  });
  const LRef = useRef(0);
  const lastIdxRef = useRef(0);

  useFrame(() => {
    if (pausedRef.current) return;
    // read latest progress directly from MotionValue
    const prog = THREE.MathUtils.clamp(pMV.get(), 0, 1);
    const L = prog * totalLen;
    LRef.current = L;

    // fill poseRef.current in-place (incremental search + lerp)
    samplePoseIntoRef(points, frames, cum, L, poseRef.current, lastIdxRef);
  });

  // Offset rails along normal
  const railOffset = 1.6;
  const leftPts = useMemo(
    () => offsetPoints(points, frames.normals, +railOffset),
    [points, frames.normals]
  );
  const rightPts = useMemo(
    () => offsetPoints(points, frames.normals, -railOffset),
    [points, frames.normals]
  );

  const leftCurve = useMemo(
    () => new THREE.CatmullRomCurve3(leftPts, false, "centripetal", 0.2),
    [leftPts]
  );
  const rightCurve = useMemo(
    () => new THREE.CatmullRomCurve3(rightPts, false, "centripetal", 0.2),
    [rightPts]
  );

  const leftRailPoints = useMemo(() => leftCurve.getPoints(600), [leftCurve]);
  // Sleepers every ~2.2 units
  const sleepers = useMemo(
    () => buildSleepers(points, frames, railOffset, 3.2, cum),
    [points, frames, railOffset, cum]
  );

  // Milestones pinned along track at t or spaced evenly
  const milestones = useMemo(() => {
    if (!events?.length) return [];
    const toNum = (v) => {
      const n = typeof v === "number" ? v : parseFloat(v);
      return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : null;
    };
    const sorted = [...events].sort((a, b) => {
      const ta = toNum(a.t);
      const tb = toNum(b.t);
      if (ta == null && tb == null) return 0;
      if (ta == null) return 1;
      if (tb == null) return -1;
      return ta - tb;
    });

    return sorted.map((e, i) => {
      const t = toNum(e.t) ?? (i + 1) / (sorted.length + 1);
      const { point, tangent, normal, len } = sampleAt(points, frames, t);
      const side = preferredSide({ point, normal }, 3.6);
      const anchor = point
        .clone()
        .add(normal.clone().multiplyScalar(side * 3.6))
        .add(new THREE.Vector3(0, side * 0.6, 0));
      return { ...e, t, point, tangent, normal, len, side, anchor };
    });
  }, [events, points, frames]);

  // Illuminated sleeper count
  const [glowSleeperCount, setGlowSleeperCount] = useState(0);
  const glowIdxRef = useRef(0);
  const lastCountRef = useRef(0);

  useFrame(() => {
    if (pausedRef.current) return;
    const L = LRef.current;
    let idx = glowIdxRef.current;
    while (idx < sleepers.length && sleepers[idx].len <= L) idx++;
    while (idx > 0 && sleepers[idx - 1].len > L) idx--;
    glowIdxRef.current = idx;
    if (idx !== lastCountRef.current) {
      lastCountRef.current = idx;
      setGlowSleeperCount(idx);
    }
  });

  // Active milestone index driven by length (not by path point index)
  const [activeIndex, setActiveIndex] = useState(-1);
  const mileIdxRef = useRef(-1);
  const lastActiveRef = useRef(-2); // force first update
  const tol = 5.5;

  // Precompute milestone lengths in render order (sorted already by t in your code)
  const mileLens = useMemo(() => milestones.map((m) => m.len), [milestones]);

  // Reset when milestones change
  useEffect(() => {
    mileIdxRef.current = -1;
    lastActiveRef.current = -2;
  }, [milestones]);

  useFrame(() => {
    if (pausedRef.current) return;
    const L = LRef.current;
    const N = mileLens.length;
    if (N === 0) {
      if (lastActiveRef.current !== -1) {
        lastActiveRef.current = -1;
        setActiveIndex(-1);
      }
      return;
    }
    let i = mileIdxRef.current;
    while (i + 1 < N && mileLens[i + 1] <= L + tol) i++;
    while (i >= 0 && mileLens[i] > L + tol) i--;
    mileIdxRef.current = i;
    if (i !== lastActiveRef.current) {
      lastActiveRef.current = i;
      setActiveIndex(i);
    }
  });

  const jumpTo = (t) => {
    const ctrl = animate(pMV, t, {
      ease: "easeInOut",
      duration: 2,
    });
    setBelowTrack(false);
    return () => ctrl.stop();
  };

  const jumpToBelow = useMemo(
    () => (m, pos) => {
      // Animate the scroll progress
      animate(pMV, m.t - 0.015, { ease: "easeInOut", duration: 2 });
      setCardPos(pos);
      setBelowTrack(true);
      scroll.current = {
        min: m.t - 0.015,
        max: Math.min(1, m.t + 0.04),
      };
    },
    [pMV, railOffset]
  );

  useEffect(() => {
    gl.setClearColor("#030907");
  }, [gl]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (allowShadows) {
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
      }
    });
    return () => cancelAnimationFrame(id);
  }, [gl, allowShadows]);

  return (
    <>
      {/* Lights & Environment */}
      <ambientLight intensity={hasEnv ? 0.05 : 0.5} color="#b8c7ff" />
      <hemisphereLight args={["#f5f7ff", "#0a0d14", hasEnv ? 0.45 : 0.9]} />
      <directionalLight
        position={[30, 60, 50]}
        intensity={1.0}
        castShadow={allowShadows}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <spotLight
        position={[-50, 45, 60]}
        intensity={0.6}
        angle={0.45}
        penumbra={0.5}
      />
      {mountedHeavy && (
        <Suspense fallback={null}>
          <Environment
            preset="warehouse"
            intensity={0.7}
            onLoad={() => setHasEnv(true)}
          />
        </Suspense>
      )}

      <SkyDome />

      {mountedHeavy && afterFirstFrame && (
        <>
          <RingedPlanet />
          <NebulaSheet
            position={[80, 40, -180]}
            size={[180, 120]}
            rotation={[0, -Math.PI / 12, 0]}
            hue="#7d9cff"
          />
          <NebulaSheet
            position={[-140, 55, -220]}
            size={[220, 140]}
            rotation={[0, Math.PI / 16, 0]}
            hue="#6effd1"
            paused={!visible}
          />
          <AsteroidField density={density} paused={!visible} />
        </>
      )}

      <ETGround neon={neon} density={density} />

      <RailExtrudeLazy ref={leftrailsRef} curve={leftCurve} />
      <RailExtrudeLazy ref={rightrailsRef} curve={rightCurve} />

      <GlowTrail
        points={leftRailPoints}
        pMV={pMV}
        color={neon}
        paused={!visible}
      />
      <Sleepers sleepers={sleepers} glowCount={glowSleeperCount} neon={neon} />
      <Cart
        poseRef={poseRef}
        LRef={LRef}
        neon={neon}
        black={black}
        visible={visible}
      />
      <FollowCamera
        poseRef={poseRef}
        pMV={pMV}
        belowTrack={belowTrack}
        cardPos={cardPos}
        visible={visible}
      />

      {/* Milestones */}
      {milestones.map((m, i) => {
        const active = i === activeIndex;
        const passed = i <= activeIndex;
        return (
          <group key={m.id}>
            {/* pin */}
            <MilestoneGlyph
              m={m}
              neon={neon}
              passed={passed}
              active={active}
              railOffset={railOffset}
              onPing={() => jumpTo(m.t)}
              onOpen={() =>
                jumpToBelow(m, cardPosition(m, railOffset, 2, -3, -4))
              }
              paused={!visible}
            />
            {/* anchored card */}
            {!belowTrack && (
              <Billboard
                position={cardPosition(m, railOffset, 3 + i * 0.5, 3.5, 0)}
                lockX
                lockY
              >
                <Html
                  center
                  transform
                  sprite
                  distanceFactor={4}
                  className="pointer-events-auto"
                  pointerEvents="auto"
                >
                  <Card
                    data={m}
                    active={active}
                    passed={passed}
                    neon={neon}
                    onView={() =>
                      jumpToBelow(m, cardPosition(m, railOffset, 2, -3, -4))
                    }
                  />
                </Html>
              </Billboard>
            )}
            {belowTrack && active && (
              <Billboard
                position={cardPosition(m, railOffset, 2, -3, -4)}
                lockX
                lockY
              >
                <Html
                  center
                  transform
                  sprite
                  distanceFactor={4}
                  className="pointer-events-auto"
                  pointerEvents="auto"
                >
                  <ExpandedExperienceCard
                    data={m}
                    active={active}
                    passed={passed}
                    neon={neon}
                    onClose={() => jumpTo(m.t)}
                  />
                </Html>
              </Billboard>
            )}
          </group>
        );
      })}

      {mountedHeavy && afterFirstFrame && allowPost && (
        <EffectComposer>
          <Bloom
            intensity={0.8}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.25} darkness={0.8} />
        </EffectComposer>
      )}
    </>
  );
});

/* ------- Geometry & Math helpers ------- */

function usePausedRef(paused) {
  const ref = useRef(paused);
  useEffect(() => {
    ref.current = paused;
  }, [paused]);
  return ref;
}

function SkyDome() {
  const domeTex = React.useMemo(() => {
    const size = 1024;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    const grd = ctx.createRadialGradient(
      size * 0.5,
      size * 0.55,
      size * 0.15,
      size * 0.5,
      size * 0.5,
      size * 0.7
    );
    grd.addColorStop(0, "#070b13");
    grd.addColorStop(0.55, "#040910");
    grd.addColorStop(1, "#01060a");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }, []);
  return (
    <mesh scale={[500, 500, 500]} raycast={null} renderOrder={-1000}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshBasicMaterial
        map={domeTex}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}

function RingedPlanet({
  position = [-140, 80, -220],
  planetRadius = 24,
  ringInner = 35,
  ringOuter = 58,
  hue = "#86a8ff",
}) {
  const ring = React.useRef();
  useFrame((_, dt) => {
    if (ring.current) ring.current.rotation.z += dt * 0.02;
  });
  return (
    <group position={position}>
      {/* planet */}
      <mesh castShadow raycast={null}>
        <sphereGeometry args={[planetRadius, 48, 48]} />
        <meshStandardMaterial
          color={hue}
          roughness={0.6}
          metalness={0.1}
          emissive="#0a0f1c"
          emissiveIntensity={0.1}
        />
      </mesh>
      {/* simple ring (additive, tilted) */}
      <mesh
        ref={ring}
        rotation={[
          THREE.MathUtils.degToRad(65),
          THREE.MathUtils.degToRad(15),
          0,
        ]}
        raycast={null}
      >
        <ringGeometry args={[ringInner, ringOuter, 96]} />
        <meshBasicMaterial
          color={hue}
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function NebulaSheet({
  position = [0, 0, 0],
  size = [180, 120],
  rotation = [0, 0, 0],
  hue = "#7d9cff",
  paused = false,
}) {
  const pausedRef = usePausedRef(paused);
  const mat = React.useRef();
  // Canvas texture: soft, cloud-like sheet
  const tex = React.useMemo(() => {
    const w = 512,
      h = 256;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(
      w * 0.4,
      h * 0.5,
      h * 0.1,
      w * 0.6,
      h * 0.5,
      h * 0.6
    );
    const c1 = new THREE.Color(hue).multiplyScalar(0.6).getStyle();
    const c2 = new THREE.Color(hue).multiplyScalar(0.15).getStyle();
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillRect(0, 0, w, h);
    g.addColorStop(0, c1);
    g.addColorStop(0.5, c2);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  }, [hue]);
  useFrame((state) => {
    if (pausedRef.current) return;
    if (mat.current) {
      const t = state.clock.getElapsedTime();
      mat.current.opacity = 0.22 + 0.08 * Math.sin(t * 0.6);
    }
  });
  return (
    <mesh position={position} rotation={rotation} raycast={null}>
      <planeGeometry args={[size[0], size[1]]} />
      <meshBasicMaterial
        map={tex}
        transparent
        opacity={0.26}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        ref={mat}
      />
    </mesh>
  );
}

function AsteroidField({
  radius = 180,
  thickness = 60,
  density = 1.0,
  color = "#1b2330",
  batch = 120, // fill per frame
  paused = false,
}) {
  const pausedRef = usePausedRef(paused);
  const grp = useRef();
  const inst = useRef();
  const count = Math.floor(180 * density); // a bit lower than before

  // Create empty instances once
  useEffect(() => {
    if (!inst.current) return;
    inst.current.count = 0; // start with zero visible instances
  }, []);

  useFrame(() => {
    if (pausedRef.current) return;
    if (grp.current) grp.current.rotation.y += 0.005;
  });

  useEffect(() => {
    if (!inst.current) return;
    let i = 0;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    let raf = 0;

    function fill() {
      const mesh = inst.current;
      if (!mesh) return;

      let wrote = 0;
      while (i < count && wrote < batch) {
        const r = radius + (Math.random() - 0.5) * thickness;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = (Math.random() * 0.6 - 0.3) * 40;
        const z = r * Math.sin(phi) * Math.sin(theta);

        const s = 0.6 + Math.random() * 1.8;
        q.setFromEuler(
          new THREE.Euler(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
          )
        );
        m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s, s));
        mesh.setMatrixAt(i, m);

        i++;
        wrote++;
      }

      mesh.count = i; // show newly written instances
      mesh.instanceMatrix.needsUpdate = true;

      if (i < count) {
        raf = requestAnimationFrame(fill);
      }
    }

    raf = requestAnimationFrame(fill);
    return () => cancelAnimationFrame(raf);
  }, [count, radius, thickness]);

  return (
    <group ref={grp} raycast={null}>
      <instancedMesh
        ref={inst}
        args={[null, null, count]}
        frustumCulled={false}
      >
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={color} roughness={0.9} metalness={0.05} />
      </instancedMesh>
    </group>
  );
}

function ETGround({ neon = "#00ff41", density = 1.0 }) {
  return (
    <group position={[0, -8, 0]}>
      {/* dark base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow raycast={null}>
        <planeGeometry args={[1200, 1200]} />
        <meshStandardMaterial
          color="#080c11"
          roughness={1}
          metalness={0}
          transparent={false}
          depthWrite={true}
          depthTest={true}
        />
      </mesh>
      {/* crater rims */}
      <CraterRims neon={neon} count={120} minR={3} maxR={12} area={450} />
      {/* scattered rocks */}
      <RocksInstanced
        count={Math.floor(300 * density)}
        area={420}
        minS={0.4}
        maxS={1.8}
      />
      {/* bioluminescent sprouts */}
      <GlowSprouts neon={neon} count={Math.floor(100 * density)} area={380} />
    </group>
  );
}

function CraterRims({
  neon = "#00ff41",
  count = 100,
  area = 400,
  minR = 3,
  maxR = 10,
}) {
  const inst = React.useRef();
  React.useEffect(() => {
    if (!inst.current) return;
    const m = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      const x = (Math.random() * 2 - 1) * area;
      const z = (Math.random() * 2 - 1) * area;
      const r = minR + Math.random() * (maxR - minR);
      m.compose(
        new THREE.Vector3(x, 0.02, z),
        new THREE.Quaternion().setFromEuler(
          new THREE.Euler(-Math.PI / 2, 0, 0)
        ),
        new THREE.Vector3(r, r, 1)
      );
      inst.current.setMatrixAt(i, m);
    }
    inst.current.instanceMatrix.needsUpdate = true;
    // Big bounds so it never disappears
    inst.current.geometry.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(0, 0, 0),
      area * 1.6
    );
  }, [count, area, minR, maxR]);

  return (
    <instancedMesh
      ref={inst}
      args={[null, null, count]}
      raycast={null}
      frustumCulled={false}
    >
      <ringGeometry args={[0.95, 1, 48]} />
      <meshBasicMaterial
        color={neon}
        transparent
        opacity={0.18}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

function RocksInstanced({
  count = 200,
  area = 380,
  minS = 0.5,
  maxS = 2.0,
  batch = 200,
}) {
  const inst = React.useRef();
  useEffect(() => {
    if (!inst.current) return;
    let i = 0;
    let raf = 0;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();

    function fill() {
      let wrote = 0;
      while (i < count && wrote < batch) {
        const x = (Math.random() * 2 - 1) * area;
        const z = (Math.random() * 2 - 1) * area;
        const y = 0.06 + Math.random() * 0.08;
        const s = minS + Math.random() * (maxS - minS);
        q.setFromEuler(
          new THREE.Euler(
            Math.random() * 0.2,
            Math.random() * Math.PI * 2,
            Math.random() * 0.2
          )
        );
        m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s, s));
        inst.current.setMatrixAt(i, m);
        i++;
        wrote++;
      }
      inst.current.count = i;
      inst.current.instanceMatrix.needsUpdate = true;
      if (i < count) raf = requestAnimationFrame(fill);
    }

    raf = requestAnimationFrame(fill);
    return () => cancelAnimationFrame(raf);
  }, [count, area, minS, maxS, batch]);

  return (
    <instancedMesh ref={inst} args={[null, null, count]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#0f141b" roughness={0.95} metalness={0.05} />
    </instancedMesh>
  );
}

function GlowSprouts({
  neon = "#00ff41",
  count = 120,
  area = 360,
  batch = 200,
}) {
  const inst = React.useRef();
  useEffect(() => {
    if (!inst.current) return;
    let i = 0;
    let raf = 0;
    const m = new THREE.Matrix4();

    function fill() {
      let wrote = 0;
      while (i < count && wrote < batch) {
        const x = (Math.random() * 2 - 1) * area;
        const z = (Math.random() * 2 - 1) * area;
        const h = 0.35 + Math.random() * 0.45;
        const s = 0.06 + Math.random() * 0.08;
        m.compose(
          new THREE.Vector3(x, h * 0.5, z),
          new THREE.Quaternion(),
          new THREE.Vector3(s, h, s)
        );
        inst.current.setMatrixAt(i, m);
        i++;
        wrote++;
      }
      inst.current.count = i;
      inst.current.instanceMatrix.needsUpdate = true;
      if (i < count) raf = requestAnimationFrame(fill);
    }

    raf = requestAnimationFrame(fill);
    return () => cancelAnimationFrame(raf);
  }, [count, area, batch]);

  return (
    <instancedMesh ref={inst} args={[null, null, count]} frustumCulled={false}>
      <cylinderGeometry args={[0.4, 0.12, 1, 8]} />
      <meshBasicMaterial
        color={neon}
        transparent
        opacity={0.45}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

function ParallaxStars({ density = 1, paused = false }) {
  return (
    <group>
      <StarLayer
        radius={420}
        count={Math.floor(2500 * density)}
        size={0.9}
        speed={0.005}
        opacity={0.6}
        minY={20}
        paused={paused}
      />
      <StarLayer
        radius={360}
        count={Math.floor(1800 * density)}
        size={1.1}
        speed={0.01}
        opacity={0.5}
        minY={20}
        paused={paused}
      />
      <StarLayer
        radius={300}
        count={Math.floor(1200 * density)}
        size={1.4}
        speed={0.015}
        opacity={0.45}
        minY={20}
        paused={paused}
      />
    </group>
  );
}

function StarLayer({
  radius = 400,
  count = 2000,
  size = 1,
  speed = 0.01,
  opacity = 0.6,
  minY = -6,
  batch = 600, // how many stars per frame
  paused = false,
}) {
  const pausedRef = usePausedRef(paused);
  const ref = React.useRef();

  const geometry = React.useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3); // start empty
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setDrawRange(0, 0);
    // Important: set a large bounding sphere up-front so it won't be frustum-culled as it fills
    g.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(0, 0, 0),
      radius * 1.3
    );
    return g;
  }, [count, radius]);

  // Incremental fill
  React.useEffect(() => {
    let i = 0;
    let raf = 0;
    const pos = geometry.attributes.position.array;

    function fill() {
      let wrote = 0;
      while (i < count && wrote < batch) {
        let x, y, z;
        // Only upper band
        do {
          const u = Math.random();
          const v = Math.random();
          const theta = 2 * Math.PI * u;
          const phi = Math.acos(2 * v - 1);
          const r = radius * (0.9 + 0.1 * Math.random());
          x = r * Math.sin(phi) * Math.cos(theta);
          y = r * Math.cos(phi);
          z = r * Math.sin(phi) * Math.sin(theta);
        } while (y < minY);
        pos[i * 3 + 0] = x;
        pos[i * 3 + 1] = y;
        pos[i * 3 + 2] = z;
        i++;
        wrote++;
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.setDrawRange(0, Math.max(1, i));

      if (i < count) {
        raf = requestAnimationFrame(fill);
      }
    }

    raf = requestAnimationFrame(fill);
    return () => cancelAnimationFrame(raf);
  }, [geometry, count, batch, radius, minY]);

  useFrame((_, dt) => {
    if (pausedRef.current) return;
    if (ref.current) ref.current.rotation.y += speed * dt;
  });

  return (
    <points ref={ref} renderOrder={-900} frustumCulled={false}>
      <primitive object={geometry} attach="geometry" />
      <pointsMaterial
        size={size}
        sizeAttenuation
        color="#eff6ff"
        transparent
        opacity={opacity}
        depthWrite={false}
        depthTest
      />
    </points>
  );
}

function cardPosition(m, railOffset, x, y, z) {
  return new THREE.Vector3(
    m.point.x + railOffset + x,
    m.point.y + y,
    m.anchor.z + z
  );
}

function glyphPosition(m, railOffset, lift = 2.6, away = 2.0) {
  const n = (m.normal?.clone?.() || new THREE.Vector3(1, 0, 0)).normalize();
  return new THREE.Vector3(
    m.point.x + n.x * (railOffset + away),
    m.point.y + lift,
    m.point.z + n.z * (railOffset + away)
  );
}

function MilestoneGlyph({
  m,
  neon = "#00ff41",
  passed = false,
  active = false,
  railOffset = 1.6,
  onPing, // jumpTo(m.t)
  onOpen, // jumpToBelow(m)
  paused = false,
}) {
  const pausedRef = usePausedRef(paused);
  const grp = React.useRef();
  const ringA = React.useRef();
  const ringB = React.useRef();
  const core = React.useRef();
  const needle = React.useRef();
  const beam = React.useRef();
  const motes = React.useRef();
  const hover = React.useRef(false);

  const base = React.useMemo(
    () => glyphPosition(m, railOffset, 0, 2.5),
    [m, railOffset]
  );
  const railAttach = React.useMemo(() => {
    const n = (m.normal?.clone?.() || new THREE.Vector3(1, 0, 0)).normalize();
    return new THREE.Vector3(
      m.point.x + n.x * (railOffset + 0.25),
      m.point.y + 0.9,
      m.point.z + n.z * (railOffset + 0.25)
    );
  }, [m, railOffset]);

  // Arm cylinder from rail to base
  const arm = React.useMemo(() => {
    const dir = base.clone().sub(railAttach);
    const len = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize()
    );
    const mid = railAttach.clone().add(dir.multiplyScalar(0.5));
    return { mid, len, q };
  }, [base, railAttach]);

  // Small particle ring (motes)
  const moteCount = 24;
  const moteGeo = React.useMemo(() => {
    const g = new THREE.BufferGeometry();
    const r = 0.9;
    const pos = new Float32Array(moteCount * 3);
    for (let i = 0; i < moteCount; i++) {
      const a = (i / moteCount) * Math.PI * 2;
      pos[i * 3 + 0] = Math.cos(a) * r;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  // Materials/config
  const neonCol = React.useMemo(() => new THREE.Color(neon), [neon]);
  const steel = "#1a1f28";
  const chrome = "#cbd5e1";
  const glowBase = active ? 1 : passed ? 0.65 : 0.3;

  // Hover affordance
  const [hovered, setHovered] = React.useState(false);

  useFrame((state, dt) => {
    if (pausedRef.current) return;
    const t = state.clock.getElapsedTime();
    const spinA = (active ? 1.0 : passed ? 0.7 : 0.45) * 0.6;
    const spinB = (active ? -0.8 : -0.55) * 0.6;
    const bob = 0.05 * Math.sin(t * 1.8 + m.len * 0.01);

    if (ringA.current) ringA.current.rotation.y += spinA * dt;
    if (ringB.current) ringB.current.rotation.y += spinB * dt;
    if (core.current) {
      core.current.rotation.y += 0.7 * dt;
      core.current.position.y = 3.0 + bob;
    }
    if (needle.current) needle.current.rotation.y -= 0.4 * dt;
    if (beam.current) {
      const breathe =
        0.25 +
        (active ? 0.4 : passed ? 0.28 : 0.18) * (0.5 + 0.5 * Math.sin(t * 2.2));
      beam.current.material.opacity = breathe;
    }
    if (motes.current) {
      motes.current.rotation.y += 0.3 * dt;
      motes.current.material.opacity =
        0.35 * (glowBase + (hover.current ? 0.35 : 0));
    }
  });

  return (
    <group ref={grp} position={base}>
      {/* Arm from rail to glyph */}
      <mesh
        position={arm.mid}
        quaternion={arm.q}
        castShadow
        receiveShadow
        onClick={onPing}
        onPointerOver={() => {
          hover.current = true;
          setHovered(true);
        }}
        onPointerOut={() => {
          hover.current = false;
          setHovered(false);
        }}
      >
        <cylinderGeometry args={[0.04, 0.06, arm.len, 16]} />
        <meshStandardMaterial color={chrome} metalness={1} roughness={0.18} />
      </mesh>

      {/* Pedestal puck */}
      <mesh
        position={[0, -0.2, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        castShadow
        onClick={onPing}
      >
        <circleGeometry args={[0.9, 40]} />
        <meshStandardMaterial color={steel} roughness={0.6} metalness={0.5} />
      </mesh>

      {/* Soft underglow */}
      <mesh position={[0, -0.19, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.65, 0.95, 48]} />
        <meshBasicMaterial
          color={neon}
          transparent
          opacity={0.25 * (glowBase + (hovered ? 0.3 : 0))}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Vertical beam */}
      <mesh ref={beam} position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 2.4, 20]} />
        <meshBasicMaterial
          color={neon}
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Counter-rotating rings */}
      <mesh ref={ringA} position={[0, 2.6, 0]} castShadow>
        <torusGeometry args={[1.0, 0.03, 12, 60]} />
        <meshBasicMaterial
          color={neon}
          transparent
          opacity={0.55 * (glowBase + (hovered ? 0.3 : 0))}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh
        ref={ringB}
        position={[0, 2.6, 0]}
        rotation={[Math.PI / 3.5, 0, 0]}
        castShadow
      >
        <torusGeometry args={[0.75, 0.025, 12, 60]} />
        <meshBasicMaterial
          color={neon}
          transparent
          opacity={0.5 * (glowBase + (hovered ? 0.3 : 0))}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Orbiting motes */}
      <points ref={motes} position={[0, 2.6, 0]}>
        <primitive object={moteGeo} attach="geometry" />
        <pointsMaterial
          color={neon}
          size={0.045}
          sizeAttenuation
          transparent
          opacity={0.35 * glowBase}
        />
      </points>

      {/* Floating core crystal */}
      <group ref={core} position={[0, 3.0, 0]}>
        {/* glass shell */}
        <mesh castShadow onClick={onOpen}>
          <icosahedronGeometry args={[0.42, 0]} />
          <meshPhysicalMaterial
            color={neonCol.clone().multiplyScalar(0.2)}
            transmission={0.9}
            thickness={0.35}
            roughness={0.08}
            clearcoat={1}
            transparent
            envMapIntensity={1}
            emissive={active ? neon : "#000"}
            emissiveIntensity={active ? 0.35 : 0}
          />
        </mesh>
        {/* luminous heart */}
        <mesh>
          <icosahedronGeometry args={[0.18, 0]} />
          <meshBasicMaterial
            color={neon}
            transparent
            opacity={0.9 * (glowBase + (hovered ? 0.2 : 0))}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* Compass needle */}
      <mesh ref={needle} position={[0, 2.35, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 1.2, 10]} />
        <meshStandardMaterial color={chrome} metalness={1} roughness={0.2} />
      </mesh>
      <mesh position={[0, 2.96, 0]} castShadow>
        <coneGeometry args={[0.06, 0.18, 18]} />
        <meshStandardMaterial color={chrome} metalness={1} roughness={0.2} />
      </mesh>
    </group>
  );
}

// Construct long, realistic track path
function buildCurve(waves, minH, segments) {
  const key = `${waves}|${minH}|${segments}`;
  if (TRACK_CACHE.has(key)) return TRACK_CACHE.get(key);

  const anchors = [];
  const start = new THREE.Vector3(0, minH * 0.85, -70);
  const dropMid = new THREE.Vector3(6, minH * 0.55, -20);
  const dropEnd = new THREE.Vector3(12, minH * 0.35, 10);
  anchors.push(start, dropMid, dropEnd);

  const spanZ = 140;
  const maxX = 28;
  for (let i = 0; i < waves; i++) {
    const t = i / Math.max(1, waves - 1);
    const y = minH * (0.32 - 0.26 * t);
    const amp = maxX * (0.8 - 0.5 * t);
    const x = i % 2 === 0 ? -amp : amp;
    const z = 14 + t * spanZ;
    anchors.push(new THREE.Vector3(x, y, z));
  }

  const curve = new THREE.CatmullRomCurve3(anchors, false, "centripetal", 0.22);
  const points = curve.getSpacedPoints(segments);

  let total = 0;
  for (let i = 1; i < points.length; i++)
    total += points[i - 1].distanceTo(points[i]);

  const res = { curve, points, totalLen: total };
  TRACK_CACHE.set(key, res);
  return res;
}

// offset along normal at each point (frames.normals array)
function offsetPoints(points, normals, offset) {
  return points.map((p, i) =>
    p.clone().add(normals[i].clone().multiplyScalar(offset))
  );
}

// sleepers data: pos, right (normal), up (binormal), length
function buildSleepers(points, frames, railOffset, step, cum) {
  const sleepers = [];
  let carry = 0;
  for (let i = 1; i < points.length; i++) {
    const dl = points[i - 1].distanceTo(points[i]);
    carry += dl;
    if (carry >= step) {
      carry = 0;
      sleepers.push({
        pos: points[i].clone(),
        right: frames.normals[i].clone(),
        up: frames.binormals[i].clone(),
        len: cum[i], // O(1)
      });
    }
  }
  return sleepers;
}

function lengthUntil(points, i) {
  let L = 0;
  for (let k = 1; k <= i; k++) L += points[k - 1].distanceTo(points[k]);
  return L;
}

// sample at normalized t
function sampleAt(points, frames, t) {
  const idx = THREE.MathUtils.clamp(
    Math.round(t * (points.length - 1)),
    0,
    points.length - 1
  );
  const point = points[idx];
  const tangent = frames.tangents[idx];
  const normal = frames.normals[idx];
  const len = lengthUntil(points, idx);
  return { point, tangent, normal, len };
}

// sample at world length L
function sampleByLen(points, frames, L) {
  let acc = 0;
  for (let i = 1; i < points.length; i++) {
    const dl = points[i - 1].distanceTo(points[i]);
    if (acc + dl >= L) {
      const f = (L - acc) / dl;
      const point = points[i - 1].clone().lerp(points[i], f);
      const tangent = frames.tangents[i - 1]
        .clone()
        .lerp(frames.tangents[i], f)
        .normalize();
      const normal = frames.normals[i - 1]
        .clone()
        .lerp(frames.normals[i], f)
        .normalize();
      const binormal = frames.binormals[i - 1]
        .clone()
        .lerp(frames.binormals[i], f)
        .normalize();
      const curv = frames.tangents[i - 1]
        .clone()
        .sub(frames.tangents[i])
        .length();
      return { point, tangent, normal, binormal, curv };
    }
    acc += dl;
  }
  const last = points.length - 1;
  return {
    point: points[last],
    tangent: frames.tangents[last],
    normal: frames.normals[last],
    binormal: frames.binormals[last],
    curv: 0,
  };
}

// choose outside & screen-fit (basic heuristic)
function preferredSide({ point, normal }, offset) {
  // default to +normal; Html will occlude if behind geometry
  return +1;
}

/* ------- Rail, Glow, Sleepers, Cart, Camera ------- */

function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const hw = w / 2,
    hh = h / 2;
  s.moveTo(-hw + r, -hh);
  s.lineTo(hw - r, -hh);
  s.quadraticCurveTo(hw, -hh, hw, -hh + r);
  s.lineTo(hw, hh - r);
  s.quadraticCurveTo(hw, hh, hw - r, hh);
  s.lineTo(-hw + r, hh);
  s.quadraticCurveTo(-hw, hh, -hw, hh - r);
  s.lineTo(-hw, -hh + r);
  s.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  return s;
}

const RailExtrudeLazy = React.forwardRef(function RailExtrudeLazy(
  {
    curve,
    profileW = 0.22,
    profileH = 0.28,
    radius = 0.06,
    color = "#2e3a4a",
    steps = 300,
  },
  ref
) {
  const shape = useMemo(
    () => roundedRectShape(profileW, profileH, radius),
    [profileW, profileH, radius]
  );

  // Cheap placeholder: TubeGeometry (fast to create)
  const tubeGeo = useMemo(
    () =>
      new THREE.TubeGeometry(
        curve,
        Math.floor(steps * 0.75),
        Math.min(profileW, profileH) * 0.35,
        8,
        false
      ),
    [curve, steps, profileW, profileH]
  );

  const [extrudeGeo, setExtrudeGeo] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const build = () => {
      if (cancelled) return;
      const g = new THREE.ExtrudeGeometry(shape, {
        steps,
        extrudePath: curve,
        bevelEnabled: false,
        UVGenerator: THREE.ExtrudeGeometry.WorldUVGenerator,
      });
      g.computeVertexNormals();
      if (!cancelled) setExtrudeGeo(g);
    };
    // Defer heavy build so first paint isn’t blocked
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(build, { timeout: 300 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback?.(id);
      };
    } else {
      const id = requestAnimationFrame(build);
      return () => {
        cancelled = true;
        cancelAnimationFrame(id);
      };
    }
  }, [shape, curve, steps]);

  return (
    <mesh ref={ref} geometry={extrudeGeo || tubeGeo} receiveShadow>
      <meshStandardMaterial
        color={color}
        metalness={0.9}
        roughness={0.38}
        envMapIntensity={1}
      />
    </mesh>
  );
});

// Subtle LED-like glow along left rail up to progress
function GlowTrail({ points, pMV, color, paused = false }) {
  const pausedRef = usePausedRef(paused);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const arr = new Float32Array(points.length * 3);
    for (let i = 0; i < points.length; i++) {
      const v = points[i];
      arr[i * 3 + 0] = v.x;
      arr[i * 3 + 1] = v.y + 0.04;
      arr[i * 3 + 2] = v.z;
    }
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    g.setDrawRange(0, 2);
    return g;
  }, [points]);
  useFrame(() => {
    if (pausedRef.current) return;
    const p = THREE.MathUtils.clamp(pMV.get(), 0, 1);
    const n = Math.max(2, Math.floor(points.length * p));
    geo.setDrawRange(0, n);
  });
  return (
    <line geometry={geo}>
      <lineBasicMaterial color={color} linewidth={1} />
    </line>
  );
}

function Sleepers({ sleepers, glowCount, neon }) {
  const ref = useRef();
  const base = useMemo(() => new THREE.Color("#2b3442"), []);
  const glow = useMemo(() => new THREE.Color(neon), [neon]);
  const prev = useRef(0);

  useEffect(() => {
    if (!ref.current) return;
    const m = new THREE.Matrix4();
    const sleeperPalette = ["#2b3442", "#202a39", "#1f2734", "#232f3e"];
    const N = sleepers.length;
    let i = 0;
    let raf = 0;

    function step() {
      const end = Math.min(N, i + 250); // 250 per frame
      for (; i < end; i++) {
        const s = sleepers[i];
        const c = new THREE.Color(
          sleeperPalette[Math.floor(Math.random() * sleeperPalette.length)]
        );
        const right = s.right.clone().normalize();
        const up = s.up.clone().normalize();
        const forward = new THREE.Vector3().crossVectors(right, up).normalize();
        const basis = new THREE.Matrix4().makeBasis(right, up, forward);
        const T = new THREE.Matrix4().makeTranslation(
          s.pos.x,
          s.pos.y,
          s.pos.z
        );
        const S = new THREE.Matrix4().makeScale(3.6, 0.2, 0.5);
        m.copy(T).multiply(basis).multiply(S);
        ref.current.setMatrixAt(i, m);
        c.multiplyScalar(0.98 + Math.random() * 0.04);
        ref.current.setColorAt(i, c);
      }
      ref.current.count = i;
      ref.current.instanceMatrix.needsUpdate = true;
      ref.current.instanceColor &&
        (ref.current.instanceColor.needsUpdate = true);
      if (i < N) raf = requestAnimationFrame(step);
    }

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [sleepers]);

  useEffect(() => {
    if (!ref.current) return;
    const from = prev.current;
    const to = Math.max(0, Math.min(glowCount, sleepers.length));
    for (let i = Math.min(from, to); i < Math.max(from, to); i++) {
      ref.current.setColorAt(i, to > from ? glow : base);
    }
    prev.current = to;
    ref.current.instanceColor && (ref.current.instanceColor.needsUpdate = true);
  }, [glowCount, sleepers.length, base, glow]);

  return (
    <instancedMesh
      ref={ref}
      args={[null, null, sleepers.length]}
      frustumCulled={false}
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        metalness={0.55}
        roughness={0.62}
        envMapIntensity={0.85}
        emissive="#0b1220"
        emissiveIntensity={0.1}
      />
    </instancedMesh>
  );
}

function FollowCamera({ poseRef, pMV, belowTrack, cardPos, visible = true }) {
  const pausedRef = usePausedRef(!visible);
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3());
  const lookPos = useRef(new THREE.Vector3());
  const dirRef = useRef(1);
  const velLPF = useRef(0);
  const prevP = useRef(pMV.get());
  const rigAlpha = useRef(0);

  useFrame((_, dt) => {
    if (pausedRef.current) return;
    const pose = poseRef.current;
    if (!pose) return;

    let p = pMV.get();
    let dp = p - prevP.current;
    if (dp < -0.5) dp += 1;
    else if (dp > 0.5) dp -= 1;
    prevP.current = p;

    const kVel = 1 - Math.exp(-dt * 8);
    velLPF.current +=
      (dp / Math.max(dt || 1 / 120, 1 / 120) - velLPF.current) * kVel;

    const flipThreshold = 0.02;
    if (velLPF.current > flipThreshold) dirRef.current = 1;
    else if (velLPF.current < -flipThreshold) dirRef.current = -1;

    const dir = dirRef.current;
    const forward = pose.tangent.clone().normalize();
    const worldUp = new THREE.Vector3(0, 1, 0);
    let right = new THREE.Vector3().crossVectors(worldUp, forward);
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
    else right.normalize();
    const up = new THREE.Vector3().crossVectors(forward, right).normalize();

    const posA = pose.point
      .clone()
      .add(forward.clone().multiplyScalar(-12 * dir))
      .add(up.clone().multiplyScalar(4))
      .add(right.clone().multiplyScalar(4));
    const lookA = pose.point
      .clone()
      .add(forward.clone().multiplyScalar(4 * dir));

    const posB = pose.point
      .clone()
      .add(forward.clone().multiplyScalar(-6 * dir))
      .add(up.clone().multiplyScalar(-3))
      .add(right.clone().multiplyScalar(10));
    const lookB =
      cardPos && cardPos.clone ? cardPos.clone() : pose.point.clone();

    const target = belowTrack ? 1 : 0;
    const kRig = 1 - Math.exp(-dt * 8);
    rigAlpha.current += (target - rigAlpha.current) * kRig;

    targetPos.current.copy(posA).lerp(posB, rigAlpha.current);
    lookPos.current.copy(lookA).lerp(lookB, rigAlpha.current);

    const kPos = 1 - Math.exp(-dt * 10);
    camera.position.lerp(targetPos.current, kPos);
    camera.lookAt(lookPos.current);
  });
  return null;
}

function Cart({
  poseRef,
  LRef,
  neon = "#00ff41",
  paint = "#0b0c10",
  chrome = "#cbd5e1",
  leather = "#1b2230",
  bankStrength = 1.0,
  rollOffsetDeg = 1.2,
  smooth = 16,
  visible = true,
}) {
  const pausedRef = usePausedRef(!visible);
  const grp = useRef();

  const hullW = 3.05,
    hullH = 1.1,
    hullD = 3.25,
    bogieZ = 0.9;

  useFrame((_, dt) => {
    if (pausedRef.current) return;
    const pose = poseRef.current;
    if (!grp.current || !pose) return;

    const fwd = pose.tangent.clone().normalize();
    let rightF = pose.normal.clone().normalize();
    let upF = pose.binormal.clone().normalize();
    const worldUp = new THREE.Vector3(0, 1, 0);
    if (upF.dot(worldUp) < 0) {
      upF.multiplyScalar(-1);
      rightF.multiplyScalar(-1);
    }

    const rightW = new THREE.Vector3().crossVectors(worldUp, fwd).normalize();
    const upW = new THREE.Vector3().crossVectors(fwd, rightW).normalize();

    const qF = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(rightF, upF, fwd)
    );
    const qW = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(rightW, upW, fwd)
    );
    const qTarget = new THREE.Quaternion().slerpQuaternions(
      qW,
      qF,
      THREE.MathUtils.clamp(bankStrength, 0, 1)
    );
    if (rollOffsetDeg)
      qTarget.multiply(
        new THREE.Quaternion().setFromAxisAngle(
          fwd,
          THREE.MathUtils.degToRad(rollOffsetDeg)
        )
      );

    const kRot = 1 - Math.exp(-dt * smooth);
    grp.current.quaternion.slerp(qTarget, kRot);
    grp.current.position.copy(pose.point);
  });

  const railH = 0.28;

  return (
    <group ref={grp}>
      {/* soft shadow */}
      <mesh
        position={[0, -0.22, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <circleGeometry args={[1.5, 32]} />
        <meshBasicMaterial color="black" opacity={0.4} transparent />
      </mesh>

      {/* underglow */}
      <mesh position={[0, 0.36, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[hullW * 0.9, hullD * 0.65]} />
        <meshBasicMaterial
          color={neon}
          transparent
          opacity={0.22}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* BODY: luxury monocoque */}
      <group position={[0, 1.4, 0]}>
        {/* Lower hull (rounded box feel) */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[hullW, hullH, hullD]} />
          <meshPhysicalMaterial
            color={paint}
            metalness={0.85}
            roughness={0.28}
            clearcoat={1}
            clearcoatRoughness={0.08}
            sheen={0.15}
            sheenRoughness={0.6}
            envMapIntensity={1}
          />
        </mesh>

        {/* Front nose cap (forward Z) */}
        <mesh
          castShadow
          position={[0, 0.25, hullD * 0.7]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <coneGeometry args={[0.9, 1.2, 24, 1, false]} />
          <meshPhysicalMaterial
            color={paint}
            metalness={0.9}
            roughness={0.25}
            clearcoat={1}
          />
        </mesh>

        {/* Beltline chrome trim */}
        <ChromeTrim
          x1={-hullW * 0.48}
          x2={hullW * 0.48}
          y={0.16}
          z={hullD * 0.52}
          chrome={chrome}
        />
        <ChromeTrim
          x1={-hullW * 0.48}
          x2={hullW * 0.48}
          y={0.16}
          z={-hullD * 0.52}
          chrome={chrome}
        />

        {/* Twin roll hoops */}
        <RollHoop pos={[-0.08, 0.62, 0.58]} chrome={chrome} neon={neon} />
        <RollHoop pos={[-0.08, 0.62, -0.18]} chrome={chrome} neon={neon} />

        {/* Seats (lux) */}
        <LuxSeat pos={[-0.1, 0.68, 0.45]} leather={leather} />
        <LuxSeat pos={[-0.1, 0.68, -0.45]} leather={leather} />

        {/* DRL halo + front bar */}
        <DRLBar width={hullW * 0.86} y={0.18} z={hullD * 0.54} color={neon} />
        {/* Tail light bar */}
        <DRLBar
          width={hullW * 0.6}
          y={0.12}
          z={-hullD * 0.54}
          color="#ff2f2f"
          opacity={0.7}
        />

        {/* Side blades */}
        <SideBlade z={hullD * 0.48} x={hullW * 0.52} />
        <SideBlade z={-hullD * 0.48} x={hullW * 0.52} />
        <SideBlade z={hullD * 0.48} x={-hullW * 0.52} />
        <SideBlade z={-hullD * 0.48} x={-hullW * 0.52} />

        {/* Rear diffuser */}
        <Diffuser
          width={hullW * 0.85}
          depth={0.5}
          finCount={5}
          y={-0.28}
          z={-hullD * 0.48}
        />
      </group>

      {/* BOGIES (front/rear) */}
      <group position={[0, 0, bogieZ]}>
        <Bogie
          railW={0.22}
          railH={railH}
          neon={neon}
          LRef={LRef}
          visible={visible}
        />
      </group>
      <group position={[0, 0, -bogieZ]}>
        <Bogie
          railW={0.22}
          railH={railH}
          neon={neon}
          LRef={LRef}
          visible={visible}
        />
      </group>
    </group>
  );
}

/* ====== Luxury sub-components ====== */

// Slender chrome strip across the beltline
function ChromeTrim({ x1, x2, y = 0.16, z = 0, chrome = "#cbd5e1" }) {
  const len = Math.abs(x2 - x1);
  const mid = (x1 + x2) / 2;
  return (
    <mesh position={[mid, y, z]} castShadow>
      <boxGeometry args={[len, 0.03, 0.03]} />
      <meshStandardMaterial
        color={chrome}
        metalness={1}
        roughness={0.12}
        envMapIntensity={1}
      />
    </mesh>
  );
}

// Minimal DRL / light bar
function DRLBar({
  width = 2.4,
  y = 0.2,
  z = 1.0,
  color = "#00ff41",
  opacity = 0.95,
}) {
  return (
    <mesh position={[0, y, z]}>
      <boxGeometry args={[width, 0.06, 0.04]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  );
}

// Curved roll hoop with neon insert
function RollHoop({ pos = [0, 0, 0], chrome = "#cbd5e1", neon = "#00ff41" }) {
  return (
    <group position={pos}>
      <mesh rotation={[0, 0, Math.PI * 2]}>
        <torusGeometry args={[0.5, 0.05, 14, 30, Math.PI * 0.95]} />
        <meshStandardMaterial color={chrome} metalness={1} roughness={0.18} />
      </mesh>
      <mesh position={[0.0, -0.15, 0]}>
        <boxGeometry args={[0.1, 0.06, 0.36]} />
        <meshBasicMaterial color={neon} transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

// Luxury bucket seat with leather + sheen
function LuxSeat({ pos = [0, 0, 0], leather = "#1b2230" }) {
  return (
    <group position={pos}>
      {/* shell */}
      <mesh castShadow>
        <boxGeometry args={[0.62, 0.42, 0.5]} />
        <meshPhysicalMaterial color="#10141b" metalness={0.2} roughness={0.7} />
      </mesh>
      {/* cushion base */}
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[0.6, 0.08, 0.48]} />
        <meshPhysicalMaterial
          color={leather}
          roughness={0.55}
          metalness={0.1}
          sheen={0.35}
          sheenRoughness={0.6}
        />
      </mesh>
      {/* backrest */}
      <mesh position={[0, 0.25, -0.04]} rotation={[Math.PI / 10, 0, 0]}>
        <boxGeometry args={[0.58, 0.34, 0.22]} />
        <meshPhysicalMaterial
          color={leather}
          roughness={0.55}
          metalness={0.1}
          sheen={0.35}
          sheenRoughness={0.6}
        />
      </mesh>
      {/* headrest */}
      <mesh position={[0, 0.42, -0.1]} rotation={[Math.PI / 14, 0, 0]}>
        <boxGeometry args={[0.48, 0.1, 0.18]} />
        <meshPhysicalMaterial
          color={leather}
          roughness={0.5}
          metalness={0.1}
          sheen={0.3}
        />
      </mesh>
    </group>
  );
}

// Aerodynamic side blade
function SideBlade({ x = 1.6, z = 0.8 }) {
  return (
    <mesh position={[x, -0.12, z]} rotation={[0, 0, Math.PI / 18]} castShadow>
      <boxGeometry args={[0.06, 0.22, 0.5]} />
      <meshStandardMaterial color="#0f1319" metalness={0.6} roughness={0.45} />
    </mesh>
  );
}

// Rear diffuser with fins
function Diffuser({
  width = 2.6,
  depth = 0.5,
  finCount = 5,
  y = -0.28,
  z = -0.9,
}) {
  const fins = [];
  for (let i = 0; i < finCount; i++) {
    const t = finCount <= 1 ? 0.5 : i / (finCount - 1);
    const x = -width / 2 + t * width;
    fins.push(
      <mesh
        key={i}
        position={[x, y, z]}
        rotation={[0, 0, 0.1 - 0.2 * t]}
        castShadow
      >
        <boxGeometry args={[0.04, 0.28, depth]} />
        <meshStandardMaterial color="#151a22" metalness={0.5} roughness={0.5} />
      </mesh>
    );
  }
  return <group>{fins}</group>;
}
/* ---------- Sub-components ---------- */

// A single bogie assembles both left/right rail wheelsets + frame + shocks
function Bogie({
  railW = 0.22,
  railH = 0.28,
  neon = "#00ff41",
  LRef,
  visible = true,
}) {
  const railOffset = 1.6;
  const frame = useRef();

  // Pre-build material once
  const frameMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1a1e24",
        metalness: 0.7,
        roughness: 0.4,
      }),
    []
  );

  // Animate subtle suspension wobble in rAF (driven by distance along track)
  useFrame((state) => {
    if (!frame.current) return;
    const wheelCirc = 0.55 * Math.PI * 2; // match your WheelTorus major radius
    const L = LRef?.current ?? 0;
    // Angle from distance (fallback to time if needed)
    const angle =
      wheelCirc > 1e-6
        ? (L / wheelCirc) * (Math.PI * 2)
        : state.clock.getElapsedTime();

    const yWobble = Math.sin(angle * 0.7) * 0.015;
    frame.current.position.y = 0.45 + yWobble;
  });

  return (
    <group>
      {/* Frame spine */}
      <mesh ref={frame} position={[0, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 0.12, 0.18]} />
        <primitive object={frameMat} attach="material" />
      </mesh>
      {/* Shocks to chassis (visual only) */}
      <Shock start={[-1.1, 0.45, 0.15]} end={[-1.1, 0.9, 0.35]} neon={neon} />
      <Shock start={[+1.1, 0.45, -0.15]} end={[+1.1, 0.9, -0.35]} neon={neon} />

      {/* Left and right wheelsets around each rail */}
      <Wheelset
        railX={-railOffset}
        railW={railW}
        railH={railH}
        neon={neon}
        LRef={LRef}
        paused={!visible}
      />
      <Wheelset
        railX={+railOffset}
        railW={railW}
        railH={railH}
        neon={neon}
        LRef={LRef}
        paused={!visible}
      />
    </group>
  );
}

// Road + side + upstop wheels hugging the rail at x = railX
function Wheelset({
  railX,
  railW,
  railH,
  neon = "#00ff41",
  LRef,
  paused = false,
}) {
  const roadR = 0.55,
    roadTube = 0.14;
  const upR = 0.28,
    upTube = 0.08;
  const sideR = 0.22,
    sideTube = 0.08;

  const railHH = railH * 0.5,
    railHW = railW * 0.5;
  const roadGap = 0.06,
    upGap = 0.05,
    sideGap = 0.05;

  const yRoad = railHH + roadGap;
  const yUp = -railHH - upGap;
  const xSide = railHW + sideGap;

  return (
    <group position={[railX, 0.6, 0]}>
      {/* Road (top) and Up-stop (bottom) */}
      <WheelSpinX
        LRef={LRef}
        radius={roadR}
        tube={roadTube}
        pos={[0, yRoad, 0]}
        paused={paused}
      />
      <WheelSpinX
        LRef={LRef}
        radius={upR}
        tube={upTube}
        pos={[0, yUp, 0]}
        paused={paused}
      />

      {/* Side guides */}
      <WheelSpinY
        LRef={LRef}
        radius={sideR}
        tube={sideTube}
        pos={[+xSide, 0, 0]}
        paused={paused}
      />
      <WheelSpinY
        LRef={LRef}
        radius={sideR}
        tube={sideTube}
        pos={[-xSide, 0, 0]}
        paused={paused}
      />

      {/* yoke + accents */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[0.28, 0.28, 1.2]} />
        <meshStandardMaterial
          color="#20252e"
          metalness={0.7}
          roughness={0.45}
        />
      </mesh>
      <mesh position={[0, 0.35, 0.7]}>
        <boxGeometry args={[0.04, 0.04, 0.36]} />
        <meshBasicMaterial color={neon} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, 0.35, -0.7]}>
        <boxGeometry args={[0.04, 0.04, 0.36]} />
        <meshBasicMaterial color={neon} transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

// A general wheel (torus) that spins around specified local axis
const TWO_PI = Math.PI * 2;

function WheelSpinX({
  LRef,
  radius = 0.55, // must match your road wheel radius
  tube = 0.14,
  pos = [0, 0, 0],
  tireColor = "#0b0e13",
  rimColor = "#2b2f3a",
  innerRimColor = "#b8c2cc",
  paused = false,
}) {
  const pausedRef = usePausedRef(paused);
  const pivot = React.useRef();

  useFrame(() => {
    if (pausedRef.current) return;
    if (!pivot.current) return;
    const L = LRef?.current ?? 0;
    // θ = s / r (mod 2π)
    const angle = (L / Math.max(1e-6, radius)) % TWO_PI;
    pivot.current.rotation.x = -angle;
  });

  const innerRadius = Math.max(0.01, radius - tube * 0.65);
  const innerTube = tube * 0.38;

  return (
    <group ref={pivot} position={pos}>
      <mesh castShadow rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[radius, tube, 16, 36]} />
        <meshStandardMaterial
          color={tireColor}
          metalness={0.2}
          roughness={0.85}
        />
      </mesh>
      <mesh castShadow rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[innerRadius, innerTube, 16, 36]} />
        <meshStandardMaterial
          color={innerRimColor}
          metalness={0.85}
          roughness={0.25}
        />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, Math.PI / 4]}>
        <boxGeometry args={[0.08, radius * 1.25, 0.08]} />
        <meshStandardMaterial
          color={rimColor}
          metalness={0.45}
          roughness={0.55}
        />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, -Math.PI / 4]}>
        <boxGeometry args={[0.08, radius * 1.25, 0.08]} />
        <meshStandardMaterial
          color={rimColor}
          metalness={0.45}
          roughness={0.55}
        />
      </mesh>
    </group>
  );
}

function WheelSpinY({
  LRef,
  radius = 0.22,
  tube = 0.08,
  pos = [0, 0, 0],
  tireColor = "#0b0e13",
  rimColor = "#2b2f3a",
  innerRimColor = "#b8c2cc",
  paused = false,
}) {
  const pausedRef = usePausedRef(paused);
  const pivot = React.useRef();

  useFrame(() => {
    if (pausedRef.current) return;
    if (!pivot.current) return;
    const L = LRef?.current ?? 0;
    const angle = (L / Math.max(1e-6, radius)) % TWO_PI;
    pivot.current.rotation.y = -angle;
  });

  const innerRadius = Math.max(0.01, radius - tube * 0.65);
  const innerTube = tube * 0.38;

  return (
    <group ref={pivot} position={pos}>
      <mesh castShadow rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, tube, 16, 36]} />
        <meshStandardMaterial
          color={tireColor}
          metalness={0.2}
          roughness={0.85}
        />
      </mesh>
      <mesh castShadow rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[innerRadius, innerTube, 16, 36]} />
        <meshStandardMaterial
          color={innerRimColor}
          metalness={0.85}
          roughness={0.25}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
        <boxGeometry args={[0.08, radius * 1.25, 0.08]} />
        <meshStandardMaterial
          color={rimColor}
          metalness={0.45}
          roughness={0.55}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, -Math.PI / 4]}>
        <boxGeometry args={[0.08, radius * 1.25, 0.08]} />
        <meshStandardMaterial
          color={rimColor}
          metalness={0.45}
          roughness={0.55}
        />
      </mesh>
    </group>
  );
}

// Visual shock absorber between bogie frame and chassis
function Shock({ start = [0, 0, 0], end = [0, 1, 0], neon = "#00ff41" }) {
  const s = new THREE.Vector3(...start);
  const e = new THREE.Vector3(...end);
  const mid = s.clone().lerp(e, 0.5);
  const dir = e.clone().sub(s);
  const len = dir.length();
  const quat = new THREE.Quaternion();
  quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());

  return (
    <group position={mid} quaternion={quat}>
      {/* outer tube */}
      <mesh castShadow>
        <cylinderGeometry args={[0.07, 0.07, len, 12]} />
        <meshStandardMaterial color="#1f242c" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* inner glow rod */}
      <mesh>
        <cylinderGeometry args={[0.03, 0.03, len * 0.95, 12]} />
        <meshBasicMaterial color={neon} transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

/* -------- 2D Card (HTML) -------- */

function Card({
  data = {},
  auraColor = "#00ffff",
  active = false,
  passed = false,
  onView,
  className = "",
  style = {},
}) {
  const {
    id,
    title = "Untitled",
    company = "—",
    start = "—",
    end = "Present",
    img = null,
    description = "",
    tech = [],
  } = data || {};

  // Inject keyframes once
  React.useEffect(() => {
    const id = "mini-aurora-anim";
    if (document.getElementById(id)) return;
    const css = `
      @keyframes miniAurora {
        0% { transform: translate(-10%, -12%) rotate(0deg) scale(1); }
        50% { transform: translate(4%, 6%) rotate(18deg) scale(1.03); }
        100% { transform: translate(-10%, -12%) rotate(0deg) scale(1); }
      }
      @keyframes miniShine {
        0% { transform: translateX(-120%); }
        100% { transform: translateX(120%); }
      }
    `;
    const style = document.createElement("style");
    style.id = id;
    style.innerHTML = css;
    document.head.appendChild(style);
  }, []);

  // Tilt
  const [tilt, setTilt] = React.useState({ rx: 0, ry: 0, dz: 0 });
  const onMove = (e) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rx = (py - 0.5) * 6;
    const ry = (0.5 - px) * 8;
    const dz = 6 * (0.5 - Math.hypot(px - 0.5, py - 0.5));
    setTilt({ rx, ry, dz });
  };
  const onLeave = () => setTilt({ rx: 0, ry: 0, dz: 0 });

  // Colors and tints for readability over rails
  const panelTop = "rgba(15, 19, 16, 0.66)";
  const panelBot = "rgba(6, 10, 8, 0.58)";
  const panelHi = "rgba(255,255,255,0.05)";
  const borderCol = toRgba("#ffffff", active ? 0.12 : 0.08);
  const titleTxt = "rgba(240,255,244,0.98)";
  const metaTxt = "rgba(196,255,206,0.88)";
  const bodyTxt = "rgba(224,255,235,0.96)";
  const aura = toRgba(auraColor, 0.18);
  const auraSoft = toRgba(auraColor, 0.1);
  const chipGlow = toRgba(auraColor, 0.08);

  // Small description snippet (2 lines)
  const snippet = String(description || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

  // Visible rules (keep small card readable after pass)
  const visible = active ? 1 : passed ? 0.45 : 0;

  // Wrapper 3D
  const wrap = {
    transformStyle: "preserve-3d",
    transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateZ(${tilt.dz}px)`,
    transition: "transform 160ms ease",
  };

  return (
    <div
      className={`relative w-[300px] max-w-[86vw] select-none pointer-events-auto ${className} outline-none focus:outline-none`}
      style={{ perspective: 1100, ...style }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      //onClick={() => onView?.(data)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onView?.(data)}
      title={title}
    >
      {/* Outer aura glow */}
      <div
        aria-hidden
        className="absolute -inset-4 rounded-[22px] pointer-events-none"
        style={{
          background: `
            radial-gradient(60% 50% at 0% 0%, ${aura}, transparent 58%),
            radial-gradient(50% 40% at 100% 100%, ${auraSoft}, transparent 60%)
          `,
          filter: "blur(22px)",
          opacity: active ? 1 : 0.75,
          zIndex: 0,
        }}
      />

      {/* Card */}
      <div
        className="relative rounded-2xl overflow-hidden border"
        style={{
          ...wrap,
          borderColor: borderCol,
          background: `linear-gradient(180deg, ${panelHi} 0%, ${panelTop} 10%, ${panelBot} 100%)`,
          backdropFilter: "blur(14px) saturate(140%)",
          WebkitBackdropFilter: "blur(14px) saturate(140%)",
          boxShadow: active
            ? `0 20px 56px ${toRgba(
                auraColor,
                0.15
              )}, inset 0 1px 0 rgba(255,255,255,0.06)`
            : "0 10px 28px rgba(2,6,10,0.6)",
          opacity: visible,
          pointerEvents: visible ? "auto" : "none",
        }}
      >
        {/* Aurora wash */}
        <div
          aria-hidden
          className="absolute -inset-1 pointer-events-none"
          style={{
            background: `
              radial-gradient(110% 80% at 0% 0%, ${toRgba(
                auraColor,
                0.16
              )}, transparent 55%),
              conic-gradient(from 180deg at 30% 0%, ${toRgba(
                auraColor,
                0.1
              )}, transparent 20%, ${toRgba(
              "#7dd3fc",
              0.08
            )}, transparent 60%, ${toRgba(auraColor, 0.08)})
            `,
            mixBlendMode: "screen",
            filter: "blur(5px) saturate(120%)",
            animation: "miniAurora 10s ease-in-out infinite",
            opacity: 0.8,
            zIndex: 1,
          }}
        />

        {/* Shine scan */}
        <div
          aria-hidden
          className="absolute top-0 bottom-0 w-[28%] pointer-events-none"
          style={{
            left: 0,
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.16), transparent)",
            filter: "blur(7px)",
            mixBlendMode: "screen",
            animation: "miniShine 6s ease-in-out infinite",
            zIndex: 2,
          }}
        />

        {/* Content */}
        <div className="relative z-10 p-3.5">
          {/* header row */}
          <div className="flex items-start gap-3">
            {/* logo */}
            <div
              className="relative rounded-xl overflow-hidden"
              style={{
                width: 52,
                height: 52,
                border: `1px solid ${toRgba("#ffffff", 0.1)}`,
                background: "rgba(0,0,0,0.25)",
                boxShadow: `0 8px 22px ${toRgba(auraColor, 0.14)}`,
                transform: "translateZ(16px)",
                flexShrink: 0,
              }}
            >
              {img ? (
                <img
                  src={img}
                  alt={title}
                  className="w-full h-full object-cover"
                  style={{ filter: "saturate(106%) contrast(105%)" }}
                />
              ) : (
                <div className="w-full h-full grid place-items-center">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                    <rect width="24" height="24" rx="6" fill="#06100b" />
                    <path d="M4 15l4-4 3 3 5-6 4 6v2H4z" fill={auraColor} />
                  </svg>
                </div>
              )}
              {/* ring */}
              <div
                aria-hidden
                className="absolute inset-0 rounded-xl pointer-events-none"
                style={{
                  boxShadow: `inset 0 0 0 2px ${toRgba(auraColor, 0.25)}`,
                  mixBlendMode: "screen",
                }}
              />
            </div>

            {/* text block */}
            <div className="min-w-0 flex-1">
              <div
                className="text-[11px] font-mono truncate"
                style={{
                  color: metaTxt,
                  textShadow: "0 1px 1px rgba(0,0,0,0.35)",
                }}
              >
                {company}
              </div>
              <div
                className="mt-0.5 font-extrabold truncate"
                style={{
                  fontSize: 16,
                  lineHeight: 1.1,
                  color: titleTxt,
                  textShadow: "0 1px 1px rgba(0,0,0,0.45)",
                }}
                title={title}
              >
                {title}
              </div>
              <div
                className="text-[11px] mt-0.5"
                style={{
                  color: metaTxt,
                  textShadow: "0 1px 1px rgba(0,0,0,0.35)",
                }}
              >
                {start} — {end}
              </div>
            </div>

            {/* pulse dot */}
            <span
              aria-hidden
              className="mt-1 block rounded-full"
              style={{
                width: 10,
                height: 10,
                background: active ? auraColor : toRgba("#ffffff", 0.08),
                boxShadow: active
                  ? `0 0 12px ${toRgba(auraColor, 0.55)}`
                  : "none",
                transform: active ? "scale(1.06)" : "scale(0.95)",
                transition: "all 220ms ease",
                flexShrink: 0,
              }}
            />
          </div>

          {/* snippet */}
          {snippet && (
            <div
              className="mt-2 text-[12px] leading-snug"
              style={{
                color: bodyTxt,
                textShadow: "0 1px 1px rgba(0,0,0,0.35)",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {snippet}
            </div>
          )}

          {/* footer row */}
          <div className="mt-2.5 flex justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {tech.slice(0, 6).map((t, i) => (
                <span
                  key={i}
                  className="text-[10px] px-2 py-[3px] rounded-md"
                  style={{
                    border: `1px solid ${toRgba("#ffffff", 0.1)}`,
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(0,0,0,0.42))",
                    color: bodyTxt,
                    boxShadow: `0 6px 14px ${chipGlow}`,
                    textShadow: "0 1px 1px rgba(0,0,0,0.35)",
                  }}
                >
                  {String(t)}
                </span>
              ))}
            </div>

            <div className="flex-1 flex items-end">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onView?.(data);
                }}
                className="text-[10px] px-2.5 py-1 rounded-md font-mono outline-none focus:outline-none"
                style={{
                  border: `1px solid ${toRgba(auraColor, 0.22)}`,
                  color: auraColor,
                  background: "rgba(0,0,0,0.42)",
                  boxShadow: `0 8px 18px ${toRgba(auraColor, 0.08)}`,
                  textShadow: "0 1px 1px rgba(0,0,0,0.35)",
                  transform: "translateZ(8px)",
                }}
                title="View"
              >
                VIEW
              </button>
            </div>
          </div>
        </div>

        {/* bottom glow line */}
        <div
          aria-hidden
          className="absolute left-0 right-0 bottom-0 h-[2px] pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent, ${toRgba(
              auraColor,
              0.85
            )}, transparent)`,
            filter: "blur(1px)",
          }}
        />
      </div>
    </div>
  );
}

// util
function toRgba(hex, a = 1) {
  if (!hex) return `rgba(0,0,0,${a})`;
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}

function ExpandedExperienceCard({
  data = {},
  auraColor = "#00ff41",
  onClose,
  onPrimary,
  primaryLabel = "OPEN",
  className = "",
  style = {},
}) {
  const {
    id,
    title = "Untitled",
    company = "—",
    start = "—",
    end = "Present",
    img = null,
    description = "",
    bullets = [],
    tech = [],
    year = "",
  } = data || {};

  const [tilt, setTilt] = React.useState({ rx: 0, ry: 0, dz: 0 });

  const onMove = (e) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rx = (py - 0.5) * 8; // rotateX
    const ry = (0.5 - px) * 10; // rotateY
    const dz = 8 * (0.5 - Math.hypot(px - 0.5, py - 0.5)); // subtle pop
    setTilt({ rx, ry, dz });
  };
  const onLeave = () => setTilt({ rx: 0, ry: 0, dz: 0 });

  // normalize bullets to array of strings
  const bulletsArr = Array.isArray(bullets)
    ? bullets
    : typeof bullets === "string"
    ? bullets
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean)
    : [];

  const techArr = Array.isArray(tech) ? tech : [];

  // colors
  const aura = toRgba(auraColor, 0.18);
  const aura2 = toRgba(auraColor, 0.1);
  const panelTop = "rgba(15, 19, 16, 0.65)";
  const panelBot = "rgba(6, 10, 8, 0.58)";
  const highlight = "rgba(255,255,255,0.06)";
  const borderCol = toRgba("#ffffff", 0.12);
  const titleTxt = "rgba(240,255,244,0.98)";
  const metaTxt = "rgba(196,255,206,0.86)";
  const bodyTxt = "rgba(224,255,235,0.98)";

  const wrapperStyle = {
    transformStyle: "preserve-3d",
    transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateZ(${tilt.dz}px)`,
    transition: "transform 180ms ease",
  };

  // animated aurora keyframes (once per page)
  React.useEffect(() => {
    const id = "exp-aurora-anim";
    if (document.getElementById(id)) return;
    const css = `
      @keyframes auroraShift {
        0% { transform: translate(-10%, -10%) rotate(0deg) scale(1); }
        50% { transform: translate(5%, 6%) rotate(25deg) scale(1.05); }
        100% { transform: translate(-10%, -10%) rotate(0deg) scale(1); }
      }
      @keyframes shineScan {
        0% { transform: translateX(-120%); }
        100% { transform: translateX(120%); }
      }
    `;
    const style = document.createElement("style");
    style.id = id;
    style.innerHTML = css;
    document.head.appendChild(style);
    return () => {
      // keep it around; if you need cleanup, uncomment:
      // document.getElementById(id)?.remove();
    };
  }, []);

  return (
    <div
      className={`relative w-[820px] max-w-[95vw] select-none pointer-events-auto ${className}`}
      style={{ perspective: 1200, ...style }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {/* Outer aura glow */}
      <div
        aria-hidden
        className="absolute -inset-8 rounded-[28px] pointer-events-none"
        style={{
          background: `
            radial-gradient(60% 50% at 0% 0%, ${aura}, transparent 55%),
            radial-gradient(40% 40% at 100% 100%, ${aura2}, transparent 60%)
          `,
          filter: "blur(26px)",
          opacity: 1,
          zIndex: 0,
        }}
      />

      {/* Card body */}
      <div
        className="relative rounded-2xl overflow-hidden border"
        style={{
          ...wrapperStyle,
          borderColor: borderCol,
          background: `linear-gradient(180deg, ${highlight} 0%, ${panelTop} 10%, ${panelBot} 100%)`,
          backdropFilter: "blur(16px) saturate(140%)",
          WebkitBackdropFilter: "blur(16px) saturate(140%)",
          boxShadow: `
            0 30px 80px ${toRgba(auraColor, 0.16)},
            inset 0 1px 0 rgba(255,255,255,0.06)
          `,
        }}
      >
        {/* Aurora layer */}
        <div
          aria-hidden
          className="absolute -inset-1 pointer-events-none"
          style={{
            background: `
              radial-gradient(120% 80% at 0% 0%, ${toRgba(
                auraColor,
                0.2
              )}, transparent 50%),
              conic-gradient(from 180deg at 30% 0%, ${toRgba(
                auraColor,
                0.12
              )}, transparent 20%, ${toRgba(
              "#7dd3fc",
              0.08
            )}, transparent 60%, ${toRgba(auraColor, 0.1)})
            `,
            mixBlendMode: "screen",
            filter: "blur(6px) saturate(120%)",
            animation: "auroraShift 9s ease-in-out infinite",
            opacity: 0.8,
            zIndex: 1,
          }}
        />

        {/* Shine scan */}
        <div
          aria-hidden
          className="absolute top-0 bottom-0 w-[30%] pointer-events-none"
          style={{
            left: 0,
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)",
            filter: "blur(8px)",
            mixBlendMode: "screen",
            animation: "shineScan 5.5s ease-in-out infinite",
            zIndex: 2,
          }}
        />

        {/* Header */}
        <div className="relative z-10 p-6 pb-4">
          <div className="flex items-start gap-5">
            {/* Logo / avatar with ring */}
            <div
              className="relative rounded-2xl overflow-hidden"
              style={{
                width: 84,
                height: 84,
                border: `1px solid ${toRgba("#ffffff", 0.12)}`,
                background: "rgba(0,0,0,0.25)",
                boxShadow: `0 10px 26px ${toRgba(auraColor, 0.16)}`,
                transform: "translateZ(20px)",
              }}
            >
              {img ? (
                <img
                  src={img}
                  alt={title}
                  className="w-full h-full object-cover"
                  style={{ filter: "saturate(105%) contrast(105%)" }}
                />
              ) : (
                <div className="w-full h-full grid place-items-center text-white/70">
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
                    <rect width="24" height="24" rx="6" fill="#06100b" />
                    <path d="M4 15l4-4 3 3 5-6 4 6v2H4z" fill={auraColor} />
                  </svg>
                </div>
              )}
              {/* ring */}
              <div
                aria-hidden
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                  boxShadow: `inset 0 0 0 2px ${toRgba(auraColor, 0.28)}`,
                  mixBlendMode: "screen",
                }}
              />
            </div>

            {/* Titles */}
            <div className="min-w-0 flex-1">
              <div
                className="text-[12px] font-mono"
                style={{
                  color: metaTxt,
                  textShadow: "0 1px 1px rgba(0,0,0,0.35)",
                }}
              >
                {company}
              </div>
              <div
                className="mt-1 font-extrabold truncate"
                style={{
                  fontSize: 26,
                  lineHeight: 1.1,
                  color: titleTxt,
                  textShadow: "0 1px 1px rgba(0,0,0,0.45)",
                }}
                title={title}
              >
                {title}
              </div>
              <div
                className="mt-1 text-[13px]"
                style={{
                  color: metaTxt,
                  textShadow: "0 1px 1px rgba(0,0,0,0.35)",
                }}
              >
                {start} — {end}
              </div>
            </div>

            {/* Close */}
            <button
              onClick={onClose}
              className="shrink-0 rounded-md outline-none focus:outline-none"
              style={{
                border: `1px solid ${toRgba("#ffffff", 0.12)}`,
                background: "rgba(0,0,0,0.35)",
                color: toRgba("#ffffff", 0.9),
                padding: "6px 10px",
                textShadow: "0 1px 1px rgba(0,0,0,0.35)",
                boxShadow: `0 10px 28px ${toRgba("#000", 0.45)}`,
              }}
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Divider */}
        <div
          aria-hidden
          className="relative z-10 mx-6 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)",
            opacity: 0.7,
          }}
        />

        {/* Body */}
        <div className="relative z-10 p-6 grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Description / Bullets */}
          <div className="md:col-span-3">
            {description ? (
              <div
                className="text-[14px] leading-relaxed"
                style={{
                  color: bodyTxt,
                  textShadow: "0 1px 1px rgba(0,0,0,0.35)",
                }}
              >
                {description}
              </div>
            ) : null}

            {bulletsArr.length > 0 && (
              <ul className="mt-3 space-y-2">
                {bulletsArr.slice(0, 8).map((b, i) => (
                  <li key={i} className="flex gap-2 items-start">
                    <span
                      aria-hidden
                      className="mt-1.5 shrink-0"
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        background: auraColor,
                        boxShadow: `0 0 14px ${toRgba(auraColor, 0.45)}`,
                      }}
                    />
                    <span
                      className="text-[13px] leading-snug"
                      style={{ color: bodyTxt }}
                    >
                      {String(b)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Tech + Meta */}
          <div className="md:col-span-2">
            <div className="text-[12px]" style={{ color: metaTxt }}>
              Tech Stack
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {techArr.slice(0, 12).map((t, i) => (
                <span
                  key={i}
                  className="text-[11px] px-2.5 py-1.5 rounded-md"
                  style={{
                    border: `1px solid ${toRgba("#ffffff", 0.1)}`,
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(0,0,0,0.42))",
                    color: bodyTxt,
                    textShadow: "0 1px 1px rgba(0,0,0,0.35)",
                    boxShadow: `0 8px 18px ${toRgba(auraColor, 0.08)}`,
                  }}
                >
                  {String(t)}
                </span>
              ))}
            </div>

            {/* Meta chips */}
            <div className="mt-4 flex flex-wrap gap-2">
              <div className="flex flex-col">
                <div className="text-[12px]" style={{ color: metaTxt }}>
                  Year
                </div>
                {year ? (
                  <span
                    className="text-[11px] px-2.5 py-1.5 rounded-md mt-2"
                    style={{
                      border: `1px solid ${toRgba("#ffffff", 0.1)}`,
                      color: metaTxt,
                      background: "rgba(0,0,0,0.35)",
                      textShadow: "0 1px 1px rgba(0,0,0,0.35)",
                      boxShadow: `0 8px 18px ${toRgba(auraColor, 0.08)}`,
                    }}
                  >
                    {year}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-col">
                <div className="text-[12px]" style={{ color: metaTxt }}>
                  Duration
                </div>
                <span
                  className="text-[11px] px-2.5 py-1.5 rounded-md mt-2"
                  style={{
                    border: `1px solid ${toRgba("#ffffff", 0.1)}`,
                    color: metaTxt,
                    background: "rgba(0,0,0,0.35)",
                    textShadow: "0 1px 1px rgba(0,0,0,0.35)",
                    boxShadow: `0 8px 18px ${toRgba(auraColor, 0.08)}`,
                  }}
                >
                  {start} → {end}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 p-6 pt-2 flex items-center justify-between gap-3">
          <div className="text-[12px]" style={{ color: metaTxt }}>
            ID: {id || "—"}
          </div>
          <div className="flex items-center gap-2">
            {onPrimary && (
              <button
                onClick={() => onPrimary?.(data)}
                className="text-xs px-3 py-1.5 rounded-md font-mono"
                style={{
                  border: `1px solid ${toRgba(auraColor, 0.22)}`,
                  color: auraColor,
                  background: "rgba(0,0,0,0.42)",
                  boxShadow: `0 8px 20px ${toRgba(auraColor, 0.1)}`,
                  textShadow: "0 1px 1px rgba(0,0,0,0.35)",
                }}
                title={primaryLabel}
              >
                {primaryLabel}
              </button>
            )}
            <button
              onClick={onClose}
              className="text-xs px-3 py-1.5 rounded-md font-mono outline-none focus:outline-none"
              style={{
                border: `1px solid ${toRgba("#ffffff", 0.14)}`,
                color: toRgba("#ffffff", 0.9),
                background: "rgba(0,0,0,0.42)",
              }}
              title="Close"
            >
              CLOSE
            </button>
          </div>
        </div>

        {/* bottom glow line */}
        <div
          aria-hidden
          className="absolute left-0 right-0 bottom-0 h-[2px] pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent, ${toRgba(
              auraColor,
              0.9
            )}, transparent)`,
            filter: "blur(1px)",
          }}
        />
      </div>
    </div>
  );
}
