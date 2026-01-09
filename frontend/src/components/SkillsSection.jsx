import React, {
  Suspense,
  useMemo,
  useRef,
  useEffect,
  useState,
  useCallback,
  useDeferredValue,
  useLayoutEffect,
  useContext,
  startTransition,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { Line, OrthographicCamera, Text } from "@react-three/drei";
import * as THREE from "three";
const ReactNebula = React.lazy(() =>
  import("@flodlc/nebula").then((m) => ({ default: m.ReactNebula }))
);
import GradientText from "@/ui/TextAnimations/GradientText/GradientText";
import ShinyText from "./ui/ShinyText";
import { LoaderContext } from "@/pages/Home";

const materialPool = new Map();
function getPooledMaterial(key, factory) {
  if (!materialPool.has(key)) {
    materialPool.set(key, factory());
  }
  return materialPool.get(key);
}

const T = {
  neon: "#00ff41",
  glow: "rgba(0,255,65,0.25)",
  bg: "#030907",
  grid: "rgba(0,255,65,0.16)",
  faint: "rgba(0,255,65,0.09)",
  text: "rgba(190,255,184,0.95)",
};

const vertexShader = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }`;

const fragmentShader = `precision highp float;
uniform float uTime;
uniform float uQuality;
uniform vec3 uResolution;
uniform vec2 uFocal;
uniform vec2 uRotation;
uniform float uStarSpeed;
uniform float uDensity;
uniform float uHueShift;
uniform float uSpeed;
uniform vec2 uMouse;
uniform float uGlowIntensity;
uniform float uSaturation;
uniform bool uMouseRepulsion;
uniform float uTwinkleIntensity;
uniform float uRotationSpeed;
uniform float uRepulsionStrength;
uniform float uMouseActiveFactor;
uniform float uAutoCenterRepulsion;
uniform bool uTransparent;
varying vec2 vUv;
#define NUM_LAYER (uQuality > 0.5 ? 4.0 : 2.0)
#define STAR_COLOR_CUTOFF 0.2
#define MAT45 mat2(0.7071, -0.7071, 0.7071, 0.7071)
#define PERIOD 3.0

float Hash21(vec2 p) {
p = fract(p * vec2(123.34, 456.21));
p += dot(p, p + 45.32);
return fract(p.x * p.y);
}

float tri(float x) {
return abs(fract(x) * 2.0 - 1.0);
}

float tris(float x) {
float t = fract(x);
return 1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0));
}

float trisn(float x) {
float t = fract(x);
return 2.0 * (1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0))) - 1.0;
}

vec3 hsv2rgb(vec3 c) {
vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float Star(vec2 uv, float flare) {
float d = length(uv);
float m = (0.05 * uGlowIntensity) / d;
float rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
m += rays * flare * uGlowIntensity;
uv *= MAT45;
rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
m += rays * 0.3 * flare * uGlowIntensity;
m *= smoothstep(1.0, 0.2, d);
return m;
}

vec3 StarLayer(vec2 uv) {
vec3 col = vec3(0.0);

vec2 gv = fract(uv) - 0.5;
vec2 id = floor(uv);

for (int y = -1; y <= 1; y++) {
for (int x = -1; x <= 1; x++) {
vec2 offset = vec2(float(x), float(y));
vec2 si = id + vec2(float(x), float(y));
float seed = Hash21(si);
float size = fract(seed * 345.32);
float glossLocal = tri(uStarSpeed / (PERIOD * seed + 1.0));
float flareSize = smoothstep(0.9, 1.0, size) * glossLocal;

float red = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 1.0)) + STAR_COLOR_CUTOFF;
float blu = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 3.0)) + STAR_COLOR_CUTOFF;
float grn = min(red, blu) * seed;
vec3 base = vec3(red, grn, blu);

float hue = atan(base.g - base.r, base.b - base.r) / (2.0 * 3.14159) + 0.5;
hue = fract(hue + uHueShift / 360.0);
float sat = length(base - vec3(dot(base, vec3(0.299, 0.587, 0.114)))) * uSaturation;
float val = max(max(base.r, base.g), base.b);
base = hsv2rgb(vec3(hue, sat, val));

vec2 pad = vec2(tris(seed * 34.0 + uTime * uSpeed / 10.0), tris(seed * 38.0 + uTime * uSpeed / 30.0)) - 0.5;

float star = Star(gv - offset - pad, flareSize);
vec3 color = base;

float twinkle = trisn(uTime * uSpeed + seed * 6.2831) * 0.5 + 1.0;
twinkle = mix(1.0, twinkle, uTwinkleIntensity);
star *= twinkle;

col += star * size * color;
}
}

return col;
}

void main() {
vec2 focalPx = uFocal * uResolution.xy;
vec2 uv = (vUv * uResolution.xy - focalPx) / max(1.0, uResolution.y);

vec2 mouseNorm = uMouse - vec2(0.5);

if (uAutoCenterRepulsion > 0.0) {
vec2 centerUV = vec2(0.0, 0.0); // Center in UV space
float centerDist = length(uv - centerUV);
vec2 repulsion = normalize(uv - centerUV) * (uAutoCenterRepulsion / (centerDist + 0.1));
uv += repulsion * 0.05;
} else if (uMouseRepulsion) {
vec2 mousePosUV = (uMouse * uResolution.xy - focalPx) / max(1.0, uResolution.y);
float mouseDist = length(uv - mousePosUV);
vec2 repulsion = normalize(uv - mousePosUV) * (uRepulsionStrength / (mouseDist + 0.1));
uv += repulsion * 0.05 * uMouseActiveFactor;
} else {
vec2 mouseOffset = mouseNorm * 0.1 * uMouseActiveFactor;
uv += mouseOffset;
}

float autoRotAngle = uTime * uRotationSpeed;
mat2 autoRot = mat2(cos(autoRotAngle), -sin(autoRotAngle), sin(autoRotAngle), cos(autoRotAngle));
uv = autoRot * uv;

uv = mat2(uRotation.x, -uRotation.y, uRotation.y, uRotation.x) * uv;

vec3 col = vec3(0.0);

for (float i = 0.0; i < 1.0; i += 1.0 / NUM_LAYER) {
float depth = fract(i + uStarSpeed * uSpeed);
float scale = mix(20.0 * uDensity, 0.5 * uDensity, depth);
float fade = depth * smoothstep(1.0, 0.9, depth);
col += StarLayer(uv * scale + i * 453.32) * fade;
}

if (uTransparent) {
float alpha = length(col);
alpha = smoothstep(0.0, 0.3, alpha); // Enhance contrast
alpha = min(alpha, 1.0); // Clamp to maximum 1.0
gl_FragColor = vec4(col, alpha);
} else {
gl_FragColor = vec4(col, 1.0);
}
}`;

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

export default React.memo(
  function SkillsCanvas({
    visible = true,
    className = "",
    style = {},
    showTick = 0,
    data,
  }) {
    const [activeCat, setActiveCat] = useState(0);
    const [hoverNode, setHoverNode] = useState(null);
    const [selectedSkill, setSelectedSkill] = useState(null);
    const [isInViewport, setIsInViewport] = useState(true);

    const [query, setQuery] = useState("");
    const [sort, setSort] = useState("desc"); // or "az", "asc", "desc"

    const { isLoaded } = useContext(LoaderContext);

    const categories = data;
    const dpr = useMemo(
      () => [1, Math.min(window.devicePixelRatio || 1, 2)],
      []
    );
    const nebulaConfig = useMemo(
      () => ({
        starsRotationSpeed: 20,
        cometFrequence: 100,
        nebulasIntensity: 5,
        sunScale: 0,
        planetsScale: 1,
      }),
      []
    );

    const headerAnim = useAnimation();
    const mainRailAnim = useAnimation();
    const centerTopAnim = useAnimation();
    const centerBottomAnim = useAnimation();
    const rightTopAnim = useAnimation();
    const rightBottomAnim = useAnimation();

    const animations = useMemo(
      () => ({
        headerAnim,
        mainRailAnim,
        centerTopAnim,
        centerBottomAnim,
        rightTopAnim,
        rightBottomAnim,
      }),
      [
        headerAnim,
        mainRailAnim,
        centerTopAnim,
        centerBottomAnim,
        rightTopAnim,
        rightBottomAnim,
      ]
    );

    const t = { duration: 1.0, ease: [0.22, 1, 0.36, 1] };

    useLayoutEffect(() => {
      // Always prepose to hidden BEFORE the first visible paint
      const toHidden = () => {
        animations.headerAnim.set({ opacity: 0, y: -10 });
        animations.mainRailAnim.set({ opacity: 0, x: -10 });
        animations.centerTopAnim.set({ opacity: 0, y: -10 });
        animations.centerBottomAnim.set({ opacity: 0, y: 10 });
        animations.rightTopAnim.set({ opacity: 0, x: 10 });
        animations.rightBottomAnim.set({ opacity: 0, x: 10 });
      };
      // When hiding, prepare the next show
      if (!visible && !isLoaded) {
        animations.headerAnim.stop();
        animations.mainRailAnim.stop();
        animations.centerTopAnim.stop();
        animations.centerBottomAnim.stop();
        animations.rightTopAnim.stop();
        animations.rightBottomAnim.stop();
        toHidden();
        return;
      }
      // When showing, prepose to hidden before paint
      toHidden();
    }, [visible, showTick, isLoaded]); // showTick ensures re-animating on re-show

    useEffect(() => {
      if (!visible && !isLoaded) return;
      animations.headerAnim.start({ opacity: 1, y: 0, transition: t });
      animations.mainRailAnim.start({ opacity: 1, x: 0, transition: t });
      animations.centerTopAnim.start({ opacity: 1, y: 0, transition: t });
      animations.centerBottomAnim.start({ opacity: 1, y: 0, transition: t });
      animations.rightTopAnim.start({ opacity: 1, x: 0, transition: t });
      animations.rightBottomAnim.start({ opacity: 1, x: 0, transition: t });
    }, [visible, showTick, isLoaded]);

    useEffect(() => {
      if (!visible) {
        setSelectedSkill(null);
        setHoverNode(null);
        setQuery("");
        setSort("desc");
        setActiveCat(0);
      }
    }, [visible, isLoaded]);

    useEffect(() => {
      if (categories.length && activeCat > categories.length - 1)
        setActiveCat(0);
    }, [categories.length, activeCat]);

    const current = useMemo(
      () =>
        categories[activeCat] ?? {
          id: "empty",
          label: "Empty",
          skills: [],
          avg: 0,
        },
      [activeCat, categories]
    );

    const nodesForCurrent = useMemo(
      () =>
        (current.skills || [])
          .map((s) => ({ label: s.name, value: s.proficiency, id: s.id }))
          .slice(0, 28),
      [current]
    );

    const selectedCat = useMemo(() => {
      if (!selectedSkill) return null;
      const cat = categories.find((c) =>
        c.skills.some((s) => s.id === selectedSkill.id)
      );
      if (cat) return cat;
      return null;
    }, [selectedSkill, categories]);

    // hover handler
    const handleHover = useCallback((n) => setHoverNode(n), []);

    useEffect(() => {
      if (!hoverNode) return;
      const by = current.skills.find((x) => x.name === hoverNode.label);
      if (by) setSelectedSkill(by);
    }, [hoverNode, current.skills]);

    const handleSelect = useCallback(
      (n) => {
        if (!n) return;
        const by = current.skills.find((x) => x.name === n.label);
        if (by) setSelectedSkill(by);
      },
      [current.skills]
    );

    const categoryActions = useMemo(
      () => ({
        setActive: (index) => {
          setActiveCat(index);
          setSelectedSkill(null);
        },
        findByLabel: (label) => {
          const index = categories.findIndex((cat) => cat.label === label);
          if (index !== -1) setActiveCat(index);
        },
      }),
      [categories]
    );

    // filtered / sorted
    const allSkills = useMemo(
      () =>
        categories.flatMap((c) =>
          c.skills.map((s) => ({ ...s, _cat: c.label }))
        ),
      [categories]
    );

    const deferredQuery = useDeferredValue(query);
    const filtered = useMemo(() => {
      const q = deferredQuery.trim().toLowerCase();
      let list = current.skills || [];
      if (q) {
        list = allSkills.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s._cat.toLowerCase().includes(q) ||
            (s.tags || []).some((t) => t.toLowerCase().includes(q))
        );
      }
      if (sort === "az")
        list = list.slice().sort((a, b) => a.name.localeCompare(b.name));
      if (sort === "desc")
        list = list.slice().sort((a, b) => b.proficiency - a.proficiency);
      if (sort === "asc")
        list = list.slice().sort((a, b) => a.proficiency - b.proficiency);
      return list;
    }, [deferredQuery, allSkills, current, sort]);

    const topSkills = useMemo(
      () =>
        (current.skills || [])
          .slice()
          .sort((a, b) => b.proficiency - a.proficiency)
          .slice(0, 8),
      [current]
    );

    const handleSortChange = useCallback((newSort) => {
      startTransition(() => {
        setSort(newSort);
      });
    }, []);

    // Add cleanup for material pool
    useEffect(() => {
      return () => {
        // Clean up materials on unmount
        materialPool.forEach((mat) => {
          mat.dispose?.();
          if (mat.uniforms) {
            Object.values(mat.uniforms).forEach((u) => {
              if (u.value?.dispose) u.value.dispose();
            });
          }
        });
        materialPool.clear();
      };
    }, []);

    useEffect(() => {
      if (
        process.env.NODE_ENV === "development" &&
        typeof window !== "undefined" &&
        "PerformanceObserver" in window
      ) {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 100) {
              console.warn("Long task detected:", entry.name, entry.duration);
            }
          }
        });

        observer.observe({ entryTypes: ["measure", "navigation"] });
        return () => observer.disconnect();
      }
    }, []);

    // Pause animations when component is not visible in viewport
    useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          // entry.isIntersecting is true when element is visible
          setIsInViewport(entry.isIntersecting);

          if (!entry.isIntersecting) {
            console.log("Skills section out of view - pausing animations");
          } else {
            console.log("Skills section in view - resuming animations");
          }
        },
        {
          threshold: 0.1, // Trigger when 10% of component is visible
          rootMargin: "50px", // Start 50px before element comes into view
        }
      );
      // Find the main container div
      const element = document.getElementById("skills-main-container");
      if (element) {
        observer.observe(element);
      }

      return () => {
        if (element) {
          observer.unobserve(element);
        }
      };
    }, []);

    const usedMaterialsRef = useRef(new Set());
    useEffect(() => {
      const cleanup = setInterval(() => {
        if (materialPool.size > 20) {
          const currentUsed = new Set(usedMaterialsRef.current);
          const toDelete = [];

          materialPool.forEach((mat, key) => {
            // Keep materials used in last interval
            if (!currentUsed.has(key) && materialPool.size > 10) {
              toDelete.push(key);
            }
          });

          toDelete.forEach((key) => {
            const mat = materialPool.get(key);
            if (mat) {
              mat.dispose();
              if (mat.uniforms) {
                Object.values(mat.uniforms).forEach((u) => {
                  if (u.value?.dispose) u.value.dispose();
                });
              }
            }
            materialPool.delete(key);
          });

          // Clear the tracking set for next interval
          usedMaterialsRef.current.clear();
        }
      }, 30000); // Every 30 seconds

      return () => clearInterval(cleanup);
    }, []);

    return (
      <div
        id="skills-main-container"
        className="relative w-full h-full"
        style={{
          ...style,
          willChange: "auto",
          isolation: "isolate",
        }}
      >
        {/* 1) Fullscreen Galaxy (z-0) */}
        <div className="fixed inset-0 z-0">
          <Canvas
            dpr={dpr}
            gl={{
              alpha: false,
              antialias: true,
              preserveDrawingBuffer: false,
              powerPreference: "high-performance",
              stencil: false,
              depth: false,
              failIfMajorPerformanceCaveat: false,
            }}
            frameloop={visible && isInViewport ? "always" : "demand"}
            className="absolute inset-0"
          >
            <Suspense fallback={null}>
              <GalaxyQuad
                playing={visible && isInViewport}
                useWindowPointer
                hueShift={0}
                density={2}
                glowIntensity={0.4}
                saturation={0.5}
                twinkleIntensity={0.35}
                rotationSpeed={1}
                repulsionStrength={1.5}
                starSpeed={0.8}
                transparent={false}
                showTick={showTick}
              />
            </Suspense>
          </Canvas>
        </div>
        <motion.div
          initial={false}
          animate={animations.headerAnim}
          className="w-full relative z-20 max-w-7xl ml-28 pt-5 pb-5 bg-transparent pointer-events-none select-none"
        >
          <div
            className="[letter-spacing:1.8px] text-[#00ff41]/60 select-none [text-shadow:0_0_20px_rgba(0,255,65,0.9)]"
            style={{ fontSize: 11 }}
          >
            H O L O / C A P A B I L I T I E S
          </div>
          <h1
            className="text-3xl md:text-4xl"
            style={{
              color: T.neon,
              textShadow: `0 0 8px ${T.glow}, 0 0 20px ${T.glow}`,
            }}
          >
            <GradientText
              className="!cursor-default drop-shadow-[0_0_10px_#ffaa4060] drop-shadow-[0_0_10px_#9c40ff60] drop-shadow-[0_0_10px_#ffaa4060]"
              colors={["#ffaa40", "#9c40ff", "#ffaa40"]}
            >
              CONSTELLATION · SKILLS
            </GradientText>
          </h1>
          <ShinyText
            className="mt-1 text-sm text-sky-200/60"
            text="Explore skills as a living diagnostics constellation"
          />
        </motion.div>
        <div className="max-w-full relative h-full z-20 ml-32 px-4 pb-12 pointer-events-none grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-3">
            <motion.div
              initial={false}
              animate={animations.mainRailAnim}
              className="pointer-events-auto rounded-xl border border-[rgba(0,255,65,0.15)] p-3 bg-black/60 shadow-[0_6px_30px_rgba(0,255,65,0.04),inset_0_1px_0_rgba(255,255,255,0.02)] hover:shadow-[0_10px_40px_rgba(0,255,65,0.06)]"
            >
              <div className="text-sky-200/70 mb-2 pb-2 border-b border-[rgba(0,255,65,0.1)]">
                Categories
              </div>
              <div className="space-y-2">
                {categories.map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActiveCat(i);
                      setSelectedSkill(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setActiveCat(i);
                    }}
                    className={`relative w-full text-left px-3 py-2 rounded flex items-center gap-3 overflow-hidden * ${
                      i === activeCat
                        ? "bg-green-500/5 border border-green-400/40 shadow-[inset_0_0_30px_rgba(0,255,65,0.03)]"
                        : "border border-transparent"
                    } outline-none focus:outline-none transition-all duration-300 ease-out before:absolute before:inset-0 before:bg-[radial-gradient(circle,transparent_0%,rgba(0,255,65,0.05)_40%)] before:bg-center before:bg-no-repeat before:scale-0 before:transition-transform before:duration-1000 before:ease-out hover:before:scale-150`}
                  >
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center"
                      style={{
                        background:
                          "radial-gradient(circle at 20% 20%, rgba(0,255,65,0.12), rgba(0,255,65,0.03))",
                      }}
                    >
                      {c.label.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div
                        className="truncate text-[#befcb6]"
                        style={{ fontWeight: 700 }}
                      >
                        {c.label}
                      </div>
                      <div className="text-[11px] text-sky-200/60 font-mono">
                        {c.skills.length} skills · avg {c.avg}%
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
          <div className="lg:col-span-5 flex flex-col .justify-center">
            <motion.div
              initial={false}
              animate={animations.centerTopAnim}
              className="pointer-events-auto rounded-xl border border-[#00ff41]/15 p-4 bg-black/60 mt-4 shadow-[0_6px_30px_rgba(0,255,65,0.04),inset_0_1px_0_rgba(255,255,255,0.02)] hover:shadow-[0_10px_40px_rgba(0,255,65,0.06)]"
            >
              <div className="flex items-center justify-between pb-2 border-b-[#00ff41]/10 border-b">
                <div className="text-sky-200/70">Active</div>
                <div className="text-xs text-sky-200/60">Overview</div>
              </div>
              <AnimatePresence initial={false} mode="wait">
                {selectedSkill ? (
                  <motion.div
                    key={`mid-top-skill-${selectedSkill.id}`}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center gap-3 mt-2"
                  >
                    <div className="shrink-0">
                      <Gauge value={selectedSkill.proficiency} size={88} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-baseline">
                        <div className="flex-col">
                          <div
                            className={`text-lg font-semibold text-[#00ff41]/55`}
                          >
                            {selectedSkill.name}
                          </div>
                          <div className="text-[10px] text-sky-200/70 -mt-1">
                            Skill
                          </div>
                        </div>
                        <div className="text-xs text-sky-200/60 font-mono ml-1">
                          {Math.round(selectedSkill.proficiency) + "%"}
                        </div>
                      </div>
                      <div
                        onClick={() =>
                          categoryActions.findByLabel(selectedCat.label)
                        }
                        className={`text-sm text-sky-200/70 cursor-pointer`}
                      >
                        {`${selectedCat.label} (${selectedCat.skills.length} skills)`}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    key={`mid-top-${current.id}`}
                    className="flex items-center gap-3 mt-2"
                  >
                    <div className="shrink-0">
                      <Gauge value={current.avg} size={88} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-baseline">
                        <div className="flex-col">
                          <div
                            className={`text-lg font-semibold text-[#befcb6]`}
                          >
                            {current.label}
                          </div>
                          <div className="text-[10px] text-sky-200/70 -mt-1">
                            Category
                          </div>
                        </div>
                      </div>
                      <div className={`text-sm text-sky-200/70`}>
                        {`${current.skills.length} skills`}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <motion.div
              key="mid-bottm"
              initial={false}
              animate={animations.centerBottomAnim}
              className="pointer-events-auto rounded-xl border border-[#00ff41]/15 flex flex-col items-center relative overflow-hidden mt-4 shadow-[0_6px_30px_rgba(0,255,65,0.04),inset_0_1px_0_rgba(255,255,255,0.02)] hover:shadow-[0_10px_40px_rgba(0,255,65,0.06)]"
              style={{
                width: "100%",
                height: 560,
                overflow: "hidden",
              }}
            >
              {visible && (
                <Suspense fallback={null}>
                  <ReactNebula config={nebulaConfig} />
                </Suspense>
              )}

              <AnimatePresence initial={false} mode="wait">
                <motion.div
                  key={`mid-bottom-${current.id}`}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col"
                >
                  <div className=" w-full text-center mb-3 mt-1 text-sky-200/70 z-10">
                    Constellation · {current.label}
                  </div>

                  <div
                    className="absolute z-20"
                    style={{
                      width: 500,
                      height: 500,
                      left: "50%",
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <Canvas
                      dpr={dpr}
                      gl={{
                        alpha: true,
                        antialias: true,
                        preserveDrawingBuffer: false,
                        powerPreference: "high-performance",
                      }}
                      frameloop={visible && isInViewport ? "always" : "demand"}
                      className="absolute inset-0"
                    >
                      <Suspense fallback={null}>
                        <ConstellationR3F
                          items={nodesForCurrent}
                          onHover={handleHover}
                          activeId={selectedSkill?.name}
                          onSelect={handleSelect}
                          size={480}
                          starScale={0.5}
                          layout="radial"
                          seed={200}
                          jitter={14}
                          visible={visible && isInViewport}
                          matRefTracker={usedMaterialsRef}
                        />
                      </Suspense>
                    </Canvas>
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="absolute bottom-1 mb-1 text-xs text-sky-200/60 z-10">
                Hover a node to inspect
              </div>
            </motion.div>
          </div>
          <div className="lg:col-span-4">
            <motion.div
              initial={false}
              animate={animations.rightTopAnim}
              className="pointer-events-auto relative rounded-xl border border-[rgba(0,255,65,0.15)] p-3 bg-black/60 shadow-[0_6px_30px_rgba(0,255,65,0.04),inset_0_1px_0_rgba(255,255,255,0.02)] hover:shadow-[0_10px_40px_rgba(0,255,65,0.06)] "
            >
              <div className=" flex gap-2">
                <input
                  placeholder="Search or Filter"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 bg-black/20 border border-[#00ff41]/10 outline-none focus:outline-none focus:border-[#00ff41]/20 rounded px-3 py-2"
                />
                <select
                  value={sort}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="bg-black/20 border border-[#00ff41]/10 outline-none focus:outline-none rounded text-sky-200/70"
                >
                  <option className="bg-black" value="desc">
                    Top
                  </option>
                  <option className="bg-black" value="az">
                    A→Z
                  </option>
                  <option className="bg-black" value="asc">
                    Low
                  </option>
                </select>
              </div>

              <div className="mt-4">
                <AnimatePresence initial={false} mode="wait">
                  <motion.div
                    key={`right-top-${
                      filtered.length
                        ? query === ""
                          ? current.id
                          : filtered.length
                        : `-${String(current.id)}`
                    }`}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="text-sky-200/70 mb-2 text-sm">
                      {filtered.length
                        ? query === ""
                          ? "Current Category: " +
                            current.label +
                            " (" +
                            current.skills.length +
                            " skills)"
                          : filtered.length + " Results found"
                        : "No results found. Showing Current Category: " +
                          current.label +
                          " (" +
                          current.skills.length +
                          " skills)"}
                    </div>
                    <div className="grid grid-cols-1 gap-2 max-h-[262px] overflow-auto pr-1">
                      {(filtered.length ? filtered : current.skills)
                        .slice(0, 100)
                        .map((s) => (
                          <SkillMini
                            key={s.id}
                            s={s}
                            cat={
                              filtered.length
                                ? query === ""
                                  ? current.label
                                  : s._cat
                                : current.label
                            }
                            onSelect={(ss) => setSelectedSkill(ss)}
                            active={selectedSkill?.id === s.id}
                          />
                        ))}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>

            {/* snapshot card */}
            <motion.div
              initial={false}
              animate={animations.rightBottomAnim}
              className="pointer-events-auto flex-1 rounded-xl border border-[#00ff41]/15 p-4 bg-black/60 mt-4 shadow-[0_6px_30px_rgba(0,255,65,0.04),inset_0_1px_0_rgba(255,255,255,0.02)] hover:shadow-[0_10px_40px_rgba(0,255,65,0.06)]"
            >
              <div className="flex items-center justify-between pb-2 border-b-[#00ff41]/10 border-b">
                <div className="text-sky-200/70">Snapshot</div>
                <div className="text-xs text-sky-200/60">Overview</div>
              </div>

              <AnimatePresence initial={false} mode="wait">
                <motion.div
                  key={`right-bottom-${current.id}`}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-3 mt-2">
                    <div className="shrink-0">
                      <Gauge value={current.avg} size={88} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-baseline justify-between">
                        <div className="flex-col">
                          <div className="text-lg font-semibold text-[#befcb6]">
                            {current.label}
                          </div>
                          <div className="text-[10px] text-sky-200/70 -mt-1">
                            {"Category"}
                          </div>
                        </div>
                      </div>
                      <div className=" text-sm text-sky-200/70">
                        {current.skills.length}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    {/* use PingChart-like mini: list of top skills with pulse */}
                    <div className="grid grid-cols-2 gap-2">
                      {topSkills.map((t, i) => (
                        <div
                          onClick={() => setSelectedSkill(t)}
                          key={t.id}
                          className="rounded p-2 cursor-pointer bg-black/20 border border-[#00ff41]/10 flex items-center gap-2"
                        >
                          <div
                            style={{ width: 44, height: 44 }}
                            className="rounded flex items-center justify-center"
                          >
                            <Gauge swidth={3} value={t.proficiency} size={44} />
                          </div>
                          <div className="min-w-0">
                            <div
                              className="truncate text-[#00ff41]/55"
                              style={{ fontWeight: 700 }}
                            >
                              {t.name}
                            </div>
                            <div className="text-[11px] text-sky-200/60 font-mono">
                              {Math.round(t.proficiency)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-3">
                    <div className="flex flex-col h-full rounded border border-[#00ff41]/10 p-2 text-center">
                      <div className="text-xs text-sky-200/60">Skills</div>
                      <div
                        style={{
                          color: T.neon,
                          textShadow: `0 0 8px ${T.glow}`,
                        }}
                        className="font-mono flex-1 flex items-center justify-center"
                      >
                        {current.skills.length}
                      </div>
                    </div>
                    <div className="flex flex-col h-full rounded border border-[#00ff41]/10 p-2 text-center">
                      <div className="text-xs text-sky-200/60">AVG</div>
                      <div
                        style={{
                          color: T.neon,
                          textShadow: `0 0 8px ${T.glow}`,
                        }}
                        className="font-mono flex-1 flex items-center justify-center"
                      >
                        {current.avg}%
                      </div>
                    </div>
                    <div className="flex flex-col h-full rounded border border-[#00ff41]/10 p-2 text-center">
                      <div className="text-xs text-sky-200/60">TOP</div>
                      <div
                        style={{
                          color: T.neon,
                          textShadow: `0 0 8px ${T.glow}`,
                        }}
                        className="font-mono flex-1 flex items-center justify-center"
                      >
                        {topSkills[0]?.name || "-"}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
        <div className="h-12 w-full" />"{/* Optional tint */}
        <div
          className="fixed inset-0 z-30 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,10,12,0.06), rgba(0,0,0,0.25))",
          }}
        />
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    return (
      prevProps.visible === nextProps.visible &&
      prevProps.showTick === nextProps.showTick &&
      prevProps.data === nextProps.data &&
      prevProps.className === nextProps.className &&
      JSON.stringify(prevProps.style) === JSON.stringify(nextProps.style)
    );
  }
);

function setResolution(u, size) {
  const w = Math.max(1, Math.floor(size.width));
  const h = Math.max(1, Math.floor(size.height));
  u.value.set(w, h, w / h);
}

const GalaxyQuad = React.memo(function GalaxyQuad({
  playing = true,
  focal = [0.5, 0.5],
  rotation = [1.0, 0.0],
  starSpeed = 0.5,
  density = 1,
  hueShift = 0,
  speed = 1.0,
  glowIntensity = 0.3,
  saturation = 0.2,
  mouseRepulsion = true,
  twinkleIntensity = 0.4,
  rotationSpeed = 0.1,
  repulsionStrength = 1.5,
  autoCenterRepulsion = 0.0,
  transparent = false,
  useWindowPointer = true,
  showTick = 0,
}) {
  const playingRef = useRef(playing);
  const isMobile = useMemo(
    () => /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent),
    []
  );
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uQuality: { value: isMobile ? 0.5 : 1.0 },
      uResolution: { value: new THREE.Vector3(1, 1, 1) },
      uFocal: { value: new Float32Array(focal) },
      uRotation: { value: new Float32Array(rotation) },
      uStarSpeed: { value: starSpeed },
      uDensity: { value: density },
      uHueShift: { value: hueShift },
      uSpeed: { value: speed },
      uMouse: { value: new Float32Array([0.5, 0.5]) },
      uGlowIntensity: { value: glowIntensity },
      uSaturation: { value: saturation },
      uMouseRepulsion: { value: mouseRepulsion },
      uTwinkleIntensity: { value: twinkleIntensity },
      uRotationSpeed: { value: rotationSpeed },
      uRepulsionStrength: { value: repulsionStrength },
      uMouseActiveFactor: { value: 0.0 },
      uAutoCenterRepulsion: { value: autoCenterRepulsion },
      uTransparent: { value: transparent },
    }),
    [
      focal,
      rotation,
      starSpeed,
      density,
      hueShift,
      speed,
      glowIntensity,
      saturation,
      mouseRepulsion,
      twinkleIntensity,
      rotationSpeed,
      repulsionStrength,
      autoCenterRepulsion,
      transparent,
    ]
  );

  const { size, gl, invalidate, clock } = useThree();

  const meshRef = useRef();

  useEffect(() => {
    playingRef.current = playing;
    if (playing) {
      clock.start();
      invalidate?.();
    }

    if (playing && meshRef.current) {
      meshRef.current.frustumCulled = false;

      if (meshRef.current.material) {
        meshRef.current.material.needsUpdate = true;
      }
    }
  }, [playing, invalidate, clock]);

  useEffect(() => {
    if (typeof showTick === "undefined") return;
    if (!meshRef.current) return;
    // bump when the parent signals re-show
    meshRef.current.material && (meshRef.current.material.needsUpdate = true);
    meshRef.current.frustumCulled = false;
    invalidate?.();
  }, [showTick, invalidate]);

  // Keep resolution in sync with canvas size
  useEffect(() => {
    setResolution(uniforms.uResolution, size);
    invalidate?.();
  }, [size.width, size.height, uniforms, invalidate]);

  const rafRef = useRef(0);
  const lastMove = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const canvas = gl?.domElement;
    if (!canvas) return;

    // rAF-throttled move handler
    const onMove = (e) => {
      if (rafRef.current) return; // only one scheduled rAF at a time
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / Math.max(1, rect.width);
        const y = 1.0 - (e.clientY - rect.top) / Math.max(1, rect.height);
        lastMove.current.x = THREE.MathUtils.clamp(x, 0, 1);
        lastMove.current.y = THREE.MathUtils.clamp(y, 0, 1);
        uniforms.uMouse.value[0] = lastMove.current.x;
        uniforms.uMouse.value[1] = lastMove.current.y;
        uniforms.uMouseActiveFactor.value = 1.0;
      });
    };

    const onLeave = () => {
      // fade out mouse influence, keep a small ambient factor
      uniforms.uMouseActiveFactor.value = 0.2;
    };

    canvas.addEventListener("pointermove", onMove, { passive: true });
    canvas.addEventListener("pointerleave", onLeave, { passive: true });

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [gl, uniforms, useWindowPointer]);

  // Reactivation / nudge effect — run when playing becomes true or parent bumps showTick
  useEffect(() => {
    const m = meshRef.current;
    if (!m) return;

    m.frustumCulled = false;
    try {
      if (m.material) m.material.needsUpdate = true;
    } catch (e) {}

    // ensure a frame is scheduled
    invalidate?.();
    if (playingRef.current) {
      // run 3 frames to be sure shader is warmed up
      let runs = 0;
      const tick = () => {
        invalidate?.();

        runs += 1;
        if (runs < 3) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }, [showTick, playing, invalidate]);

  useEffect(() => {
    const canvas = gl?.domElement;
    if (!canvas) return;
    const onLost = (e) => {
      e.preventDefault();
    };
    const onRestored = () => {
      if (meshRef.current?.material) {
        meshRef.current.material.needsUpdate = true;
      }
      clock.start();
      invalidate?.();
    };
    canvas.addEventListener("webglcontextlost", onLost, false);
    canvas.addEventListener("webglcontextrestored", onRestored, false);
    return () => {
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
    };
  }, [gl, clock, invalidate]);

  const materialRef = useRef(null);

  // Reset uniforms when showTick changes instead of recreating
  useEffect(() => {
    if (showTick > 0 && materialRef.current) {
      // Reset animation state
      uniforms.uTime.value = 0;
      uniforms.uMouseActiveFactor.value = 0.2;
      // Force update
      if (meshRef.current) {
        meshRef.current.material.needsUpdate = true;
      }
      invalidate?.();
    }
  }, [showTick, uniforms, invalidate]);

  const frameCount = useRef(0);
  useFrame((state, delta) => {
    if (!playingRef.current) {
      return;
    }
    frameCount.current++;
    if (frameCount.current % 2 !== 0) return;
    uniforms.uTime.value += delta * 2;
    uniforms.uStarSpeed.value = (uniforms.uTime.value * starSpeed) / 10.0;
  });

  useEffect(() => {
    return () => {
      if (meshRef.current?.material) {
        meshRef.current.material.dispose();
      }
    };
  }, []);

  return (
    <mesh ref={meshRef} renderOrder={-1000} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        key={showTick} // re-create on showTick change
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        depthWrite={false}
        depthTest={false}
        transparent={transparent}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
});

// helper: circle points in pixel space
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clampLocal = (v, mn, mx) => Math.max(mn, Math.min(mx, v));
const Tlocal = { neon: "#23bfff" };

function circlePoints(cx, cy, r, seg = 120) {
  const pts = [];
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a), 0]);
  }
  return pts;
}

function sizeFor(value, { min = 6, max = 24, curve = "sqrt" } = {}) {
  const v = Math.max(0, Math.min(100, Number(value))) / 100;
  const t = curve === "sqrt" ? Math.sqrt(v) : curve === "cubic" ? v * v * v : v;
  return min + (max - min) * t;
}

function makeStarTexture() {
  const c = document.createElement("canvas");
  const s = 128;
  c.width = c.height = s;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0.0, "rgba(255,255,255,1.0)");
  g.addColorStop(0.35, "rgba(255,255,220,0.95)");
  g.addColorStop(0.7, "rgba(255,255,180,0.25)");
  g.addColorStop(1.0, "rgba(0,0,0,0.0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

const ConstellationR3F = React.memo(function ConstellationR3F({
  items = [],
  onHover = () => {},
  onSelect = () => {},
  activeId = null,
  size = 520,
  starScale = 1,
  jitter = 14,
  layout = "radial",
  seed = 0,
  visible = true,
  matRefTracker = null,
}) {
  const [hoveredIdx, setHoveredIdx] = useState(-1);
  const { size: vp } = useThree();
  const cxLocal = size / 2;
  const cyLocal = size / 2;
  const baseR = Math.min(size / 2 - 36, 220);

  // place the 480x480 area in the center of the viewport (pixel space)
  const originX = (vp.width - size) / 2;
  const originY = (vp.height - size) / 2;
  const centerX = originX + cxLocal;
  const centerY = originY + cyLocal;

  const rng = useMemo(
    () => (seed ? mulberry32(Math.floor(seed)) : Math.random),
    [seed]
  );

  // Generate nodes (same logic as your DOM version)
  const nodes = useMemo(() => {
    const N = Math.max(1, items.length || 4);
    const maxRadius = baseR - 24;
    return items.map((it, i) => {
      const val = Number(it.value || 0);
      if (
        layout === "manual" &&
        typeof it.x === "number" &&
        typeof it.y === "number"
      ) {
        return {
          ...it,
          x: clampLocal(it.x, 20, size - 20),
          y: clampLocal(it.y, 20, size - 20),
          id: it.id ?? `node-${i}`,
        };
      }
      let angle, radius;
      if (layout === "random") {
        angle = rng() * Math.PI * 2;
        radius = rng() * (maxRadius - 36) + 36;
      } else if (layout === "spiral") {
        const turns = 1.4;
        angle =
          (i / N) * Math.PI * 2 * turns - Math.PI / 2 + (rng() - 0.5) * 0.4;
        radius = 36 + (i / N) * (maxRadius - 36) + (rng() - 0.5) * 8;
      } else {
        angle = (Math.PI * 2 * i) / N - Math.PI / 2 + (rng() - 0.5) * 0.18;
        radius =
          100 + (val / 100) * (maxRadius - 36) + (rng() - 0.5) * (jitter || 0);
      }
      const radialJ = (rng() - 0.5) * jitter;
      radius += radialJ;

      let x = cxLocal + radius * Math.cos(angle);
      let y = cyLocal + radius * Math.sin(angle);

      x = clampLocal(x, 20, size - 20);
      y = clampLocal(y, 20, size - 20);

      // map to viewport pixel space
      return {
        ...it,
        x: originX + x,
        y: originY + y,
        id: it.id ?? `node-${i}`,
      };
    });
  }, [
    items,
    layout,
    seed,
    size,
    jitter,
    starScale,
    originX,
    originY,
    cxLocal,
    cyLocal,
    baseR,
    rng,
  ]);

  // Edges: top-K fully connected (same as before)
  const edges = useMemo(() => {
    const top = nodes
      .slice()
      .sort((a, b) => b.value - a.value)
      .slice(0, Math.min(8, nodes.length));
    const e = [];
    for (let i = 0; i < top.length; i++) {
      for (let j = i + 1; j < top.length; j++) e.push([top[i], top[j]]);
    }
    return e;
  }, [nodes]);

  // Star sprite texture (shared)
  const starTex = useMemo(() => makeStarTexture(), []);

  // Build star Sprite objects: we use one material per star so we can animate opacity/scale for twinkle
  const spriteRefs = useRef([]);
  spriteRefs.current = [];

  // twinkle
  const phases = useMemo(
    () => nodes.map((_, i) => ((i * 73) % 100) / 100),
    [nodes]
  );

  const frameSkip = useRef({ count: 0, skip: 2 });
  useFrame((state) => {
    if (!visible) return;
    frameSkip.current.count++;
    if (frameSkip.current.count < frameSkip.current.skip) return;
    frameSkip.current.count = 0;
    const t = state.clock.getElapsedTime();
    for (let i = 0; i < spriteRefs.current.length; i++) {
      const spr = spriteRefs.current[i];
      if (!spr) continue;
      // base size by proficiency
      const n = nodes[i];
      const s =
        sizeFor(n.value, { min: 8, max: 28, curve: "sqrt" }) * (starScale || 1);
      const isActive = activeId === n.label || activeId === n.id;
      const halo = isActive ? 1.45 : 1.0;
      const tw =
        0.85 +
        0.15 * Math.sin(t * (0.9 + (i % 5) * 0.06) + phases[i] * Math.PI * 2);
      spr.scale.set(s * halo * tw, s * halo * tw, 1);
      const mat = spr.material;
      mat.opacity = isActive ? 1.0 : 0.95;
      mat.needsUpdate = false;
    }
  });

  const edgePositions = useMemo(
    () =>
      new Float32Array(edges.flatMap(([a, b]) => [a.x, a.y, 0, b.x, b.y, 0])),
    [edges]
  );

  return (
    <>
      {/* Pixel-space ortho camera */}
      <OrthographicCamera
        makeDefault
        left={0}
        right={vp.width}
        top={vp.height}
        bottom={0}
        near={-1000}
        far={1000}
        position={[0, 0, 10]}
      />
      {/* Rings (three dashed circles) */}
      <Line
        points={circlePoints(centerX, centerY, Math.max(8, baseR * 0.8))}
        color={Tlocal.neon}
        opacity={0.12}
        dashed
        dashSize={8}
        gapSize={10}
        linewidth={1}
        transparent
      />
      <Line
        points={circlePoints(centerX, centerY, Math.max(8, baseR * 1.15))}
        color={Tlocal.neon}
        opacity={0.08}
        dashed
        dashSize={8}
        gapSize={10}
        linewidth={1}
        transparent
      />
      <Line
        points={circlePoints(centerX, centerY, Math.max(8, baseR * 0.35))}
        color={Tlocal.neon}
        opacity={0.12}
        dashed
        dashSize={8}
        gapSize={10}
        linewidth={1}
        transparent
      />
      {/* Edges */}
      {edges.length > 0 && (
        <lineSegments renderOrder={-10}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={edgePositions.length / 3}
              array={edgePositions}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={Tlocal.neon} transparent opacity={0.12} />
        </lineSegments>
      )}
      {/* Stars as sprites with additive glow + twinkle */}
      {nodes.map((n, i) => {
        const baseSize =
          sizeFor(n.value, { min: 8, max: 28, curve: "sqrt" }) *
          (starScale || 1);
        const isActive = activeId === n.label || activeId === n.id;
        const isHovered = hoveredIdx === i;

        // Scale target; hover gets a bit bigger, active gets bigger still
        const targetSize = baseSize * (isActive ? 1.45 : isHovered ? 1.2 : 1.0);

        return (
          <group
            key={n.id}
            position={[n.x, n.y, 0]}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredIdx(i);
              onHover(n);
            }}
            onPointerOut={(e) => {
              e.stopPropagation();
              setHoveredIdx(-1);
              onHover(null);
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(n);
              setHoveredIdx(i);
              setTimeout(() => setHoveredIdx(-1), 200);
            }}
          >
            <StarParticle3D
              size={targetSize}
              color="#ffffb8"
              phase={((i * 73) % 100) / 100}
              hovered={isHovered}
              active={isActive}
              twinkleSpeed={0.9 + (i % 5) * 0.06}
              twinkleAmount={isActive ? 0.36 : 0.28}
              seed={i + 1}
              usedMaterialsRef={matRefTracker}
            />
          </group>
        );
      })}
      {/* Labels (monospace 11px) */}
      {nodes.map((n, i) => {
        const baseSize =
          sizeFor(n.value, { min: 8, max: 28, curve: "sqrt" }) *
          (starScale || 1);
        return (
          <Text
            key={`label-${n.id}`}
            position={[n.x, n.y + baseSize / 2 + 8, 0]}
            fontSize={11}
            color="#c7ffe2"
            //font="/fonts/FiraCode-Regular.ttf" // optional if you have it
            anchorX="center"
            anchorY="bottom"
            renderOrder={30}
          >
            {n.label || n.name}
          </Text>
        );
      })}
    </>
  );
});

const StarParticle3D = React.memo(function StarParticle3D({
  position = [0, 0, 0],
  size = 16,
  color = "#ffffb8",
  phase = 0,
  active = false,
  twinkleSpeed = 1.0,
  twinkleAmount = 0.2,
  seed = 1,
  hovered = false,
  usedMaterialsRef = null,
}) {
  const meshRef = useRef();
  const matRef = useRef();
  const { camera, clock } = useThree();

  const col = useMemo(() => new THREE.Color(color), [color]);

  const burstRef = useRef(0);
  const curScaleRef = useRef(size);
  const targetScaleRef = useRef(size);

  useEffect(() => {
    targetScaleRef.current = size;
  }, [size]);

  // spike a burst when hovered or active toggles
  useEffect(() => {
    if (hovered) burstRef.current = Math.max(burstRef.current, 0.7);
  }, [hovered]);
  useEffect(() => {
    if (active) burstRef.current = Math.max(burstRef.current, 1.0);
  }, [active]);

  // Star shader (billboard), WebGL1-safe
  const starFrag = useMemo(
    () => `
precision highp float;
varying vec2 vUv;
uniform vec3 uColor;
uniform float uTime, uPhase, uTwinkleSpeed, uTwinkleAmount, uHaloBoost, uActive, uSeed, uBurst;

float gauss(float x, float s){ return exp(-(x*x)/(2.0*s*s)); }
float hash(float n){ return fract(sin(n)*43758.5453123); }

void main(){
vec2 p = vUv * 2.0 - 1.0;
float d = length(p) + 1e-5;

float tw = 1.0 + sin(uTime * uTwinkleSpeed + uPhase * 6.2831853) * uTwinkleAmount;

float halo = (0.22 / d) + smoothstep(1.0, 0.0, d) * 0.6;
float hoverBoost = 1.0 + uBurst * 0.9;
halo *= uHaloBoost * hoverBoost;

float ringR = 0.55;
float ringW = 0.12;
float ring = smoothstep(ringR + ringW, ringR, d) - smoothstep(ringR, ringR - ringW, d);
ring *= 0.35 * hoverBoost;

float a = atan(p.y, p.x);
float spikeP = uActive > 0.5 ? 9.0 : 12.0;
float spikesA = pow(abs(cos(a * 4.0)), spikeP);
float spikesB = pow(abs(cos((a + 0.785398) * 4.0)), spikeP);
float spikes = max(spikesA, spikesB) * (1.0 - smoothstep(0.0, 1.0, d)) * 0.9 * hoverBoost;

float speck = 0.0;
for (int i = 0; i < 6; i++) {
float fi = float(i);
float ang = hash(fi + uSeed * 13.7) * 6.2831853;
float rad = 0.15 + hash(fi + uSeed * 37.9) * 0.7;
vec2 q = vec2(cos(ang), sin(ang)) * rad;
float s = 0.05 + hash(fi + uSeed * 71.1) * 0.08;
float amp = 0.04 + hash(fi + uSeed * 19.1) * 0.12;
speck += gauss(length(p - q), s) * amp;
}

float glow = (halo + ring + spikes + speck) * tw;
vec3 col = uColor * glow;
float alpha = clamp(glow, 0.0, 1.0);
gl_FragColor = vec4(col, alpha);
}
`,
    []
  );

  const starVert = useMemo(
    () =>
      `precision highp float; varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    []
  );

  const material = useMemo(() =>
    getPooledMaterial(
      `star-${color}-${seed}`,
      () =>
        new THREE.ShaderMaterial({
          uniforms: {
            uColor: { value: col },
            uTime: { value: 0 },
            uPhase: { value: phase },
            uTwinkleSpeed: { value: twinkleSpeed },
            uTwinkleAmount: { value: twinkleAmount },
            uHaloBoost: { value: active ? 1.45 : 1.0 },
            uActive: { value: active ? 1.0 : 0.0 },
            uSeed: { value: seed },
            uBurst: { value: 0.0 },
          },
          vertexShader: starVert,
          fragmentShader: starFrag,
          transparent: true,
          depthWrite: false,
          depthTest: true,
          blending: THREE.AdditiveBlending,
        }),
      [color, seed]
    )
  );

  useEffect(() => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTwinkleAmount.value = twinkleAmount;
    matRef.current.uniforms.uActive.value = active ? 1.0 : 0.0;
  }, [twinkleAmount, active]);

  // billboard + twinkle scale
  const frameSkip = useRef({ count: 0, skip: 2 });
  useFrame(() => {
    if (!meshRef.current || !matRef.current) return;

    frameSkip.current.count++;
    if (frameSkip.current.count < frameSkip.current.skip) return;
    frameSkip.current.count = 0;
    // billboard
    meshRef.current.quaternion.copy(camera.quaternion);
    // animate time
    matRef.current.uniforms.uTime.value = clock.getElapsedTime();
    // decay burst
    burstRef.current *= 0.9; // smooth decay
    matRef.current.uniforms.uBurst.value = burstRef.current;
    // recompute halo boost with hover + burst
    const baseBoost = active ? 1.65 : 1.0;
    const hoverBoost = hovered ? 1.15 : 1.0;
    matRef.current.uniforms.uHaloBoost.value =
      baseBoost * hoverBoost * (1.0 + 0.8 * burstRef.current);
    // smooth scale toward target size with extra burst expansion
    const target =
      targetScaleRef.current *
      (1.0 + (hovered ? 0.1 : 0.0) + 0.16 * burstRef.current);
    curScaleRef.current += (target - curScaleRef.current) * 0.18;
    meshRef.current.scale.set(curScaleRef.current, curScaleRef.current, 1);
  });

  useEffect(() => {
    if (meshRef.current) meshRef.current.scale.set(size, size, 1);
  }, [size]);

  // Track material usage for cleanup
  useEffect(() => {
    const key = `star-${color}-${seed}`;
    if (usedMaterialsRef.current) {
      usedMaterialsRef.current.add(key);
    }

    return () => {};
  }, [color, seed, usedMaterialsRef]);

  return (
    <mesh ref={meshRef} position={position}>
      <planeGeometry args={[1, 1]} />
      <primitive ref={matRef} object={material} attach="material" />
      {/* initial size; scale is managed outside */}
    </mesh>
  );
});

const Gauge = React.memo(function Gauge({ value = 0, size = 68, swidth = 6 }) {
  const pct = clamp(Math.round(value), 0, 100);
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <defs>
        <linearGradient id="gauge" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00ff4180" /> {/* Green start */}
          <stop offset="100%" stopColor="#00d4a4" /> {/* Cyan end */}
        </linearGradient>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="rgba(255,255,255,0.03)"
        strokeWidth="6"
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="url(#gauge)"
        strokeWidth={swidth}
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={`${offset}`}
        strokeLinecap="round"
        style={{
          filter: `drop-shadow(0 0 8px ${T.glow})`,
          transition: "stroke-dashoffset .6s ease",
        }}
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fill: "#dfffe6",
          fontFamily: "monospace",
          fontSize: Math.max(10, size * 0.18),
        }}
      >
        {pct}%
      </text>
    </svg>
  );
});

const SkillMini = React.memo(function SkillMini({
  s,
  onSelect = () => {},
  active = false,
  cat = "",
}) {
  const w = Math.round(clamp(s.proficiency / 100, 0, 1) * 100);
  return (
    <div
      tabIndex={0}
      role="button"
      onClick={() => onSelect(s)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSelect(s);
      }}
      className={`rounded-md p-2 border ${
        active
          ? "border-green-400/40 bg-black/40"
          : "border-[#00ff41]/10 bg-black/20"
      } transition cursor-pointer outline-none focus:outline-none`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="truncate text-[#00ff41]/55" style={{ fontWeight: 600 }}>
          {s.name}
        </div>
        <div className="text-xs font-mono text-sky-100/80">
          {Math.round(s.proficiency)}%
        </div>
      </div>
      <div className="mt-2 h-2 w-full bg-white/5 rounded overflow-hidden">
        <div
          style={{
            width: `${w}%`,
            height: "100%",
            background: ` linear-gradient(90deg, rgba(0,255,65,0.80), #00d4a4)`,
          }}
        />
      </div>
      {cat && (
        <div className="mt-2 text-xs font-mono text-sky-200/70">
          Category: {cat}
        </div>
      )}
      <div></div>
    </div>
  );
});
