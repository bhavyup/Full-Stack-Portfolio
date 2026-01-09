import React, { useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

const vertexShader = `precision highp float; attribute vec3 position; attribute vec2 uv; varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }`;

const fragmentShader = `
precision highp float;
precision highp int;

uniform float uTime;
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
uniform float uMouseRepulsion; // 0.0 or 1.0
uniform float uTwinkleIntensity;
uniform float uRotationSpeed;
uniform float uRepulsionStrength;
uniform float uMouseActiveFactor;
uniform float uAutoCenterRepulsion; // 0.0..1.0
uniform float uTransparent; // 0.0 or 1.0

varying vec2 vUv;

#define NUM_LAYER 4.0
#define STAR_COLOR_CUTOFF 0.2
#define MAT45 mat2(0.7071, -0.7071, 0.7071, 0.7071)
#define PERIOD 3.0
const float PI = 3.141592653589793;

float Hash21(vec2 p){
p = fract(p * vec2(123.34, 456.21));
p += dot(p, p + 45.32);
return fract(p.x * p.y);
}

float tri(float x){ return abs(fract(x) * 2.0 - 1.0); }
float tris(float x){
float t = fract(x);
return 1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0));
}
float trisn(float x){
float t = fract(x);
return 2.0 * (1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0))) - 1.0;
}

float atan2safe(float y, float x){
float ax = abs(x);
float ay = abs(y);
float a = atan(ay / max(ax, 1e-6));
if (x < 0.0) a = PI - a;
return y < 0.0 ? -a : a;
}

vec3 hsv2rgb(vec3 c){
vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float Star(vec2 uv, float flare){
float d = length(uv);
float m = (0.05 * uGlowIntensity) / max(d, 1e-4);
float rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
m += rays * flare * uGlowIntensity;
uv *= MAT45;
rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
m += rays * 0.3 * flare * uGlowIntensity;
m *= (1.0 - smoothstep(0.2, 1.0, d));
return m;
}

vec3 StarLayer(vec2 uv){
vec3 col = vec3(0.0);
vec2 gv = fract(uv) - 0.5;
vec2 id = floor(uv);
for (int y = -1; y <= 1; y++){
for (int x = -1; x <= 1; x++){
vec2 offset = vec2(float(x), float(y));
vec2 si = id + offset;
float seed = Hash21(si);
float size = fract(seed * 345.32);
float glossLocal = tri(uStarSpeed / (PERIOD * seed + 1.0));
float flareSize = smoothstep(0.9, 1.0, size) * glossLocal;

  float red = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 1.0)) + STAR_COLOR_CUTOFF;
  float blu = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 3.0)) + STAR_COLOR_CUTOFF;
  float grn = min(red, blu) * seed;
  vec3 base = vec3(red, grn, blu);

  float hue = atan2safe(base.g - base.r, base.b - base.r) / (2.0 * PI) + 0.5;
  hue = fract(hue + uHueShift / 360.0);
  float sat = length(base - vec3(dot(base, vec3(0.299, 0.587, 0.114)))) * uSaturation;
  float val = max(max(base.r, base.g), base.b);
  base = hsv2rgb(vec3(hue, sat, val));

  vec2 pad = vec2(
    tris(seed * 34.0 + uTime * uSpeed / 10.0),
    tris(seed * 38.0 + uTime * uSpeed / 30.0)
  ) - 0.5;

  float star = Star(gv - offset - pad, flareSize);
  float twinkle = trisn(uTime * uSpeed + seed * 6.2831) * 0.5 + 1.0;
  twinkle = mix(1.0, twinkle, uTwinkleIntensity);
  star *= twinkle;

  col += star * size * base;
}
}
return col;
}

void main(){
vec2 focalPx = uFocal * uResolution.xy;
vec2 uv = (vUv * uResolution.xy - focalPx) / max(1.0, uResolution.y);

vec2 mouseNorm = uMouse - vec2(0.5);

if (uAutoCenterRepulsion > 0.0) {
vec2 centerUV = vec2(0.0);
float centerDist = length(uv - centerUV);
vec2 repulsion = normalize(uv - centerUV) * (uAutoCenterRepulsion / (centerDist + 0.1));
uv += repulsion * 0.05;
} else if (uMouseRepulsion > 0.5) {
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
float fade = depth * (1.0 - smoothstep(0.9, 1.0, depth));
col += StarLayer(uv * scale + i * 453.32) * fade;
}

gl_FragColor = vec4(col, 1.0);
}
`;

function setResolution(u, gl) {
  const w = gl.drawingBufferWidth;
  const h = gl.drawingBufferHeight;
  u.value.set(w, h, w / Math.max(1.0, h));
}

export default function GalaxyQuad({
  playing = true,
  focal = [0.5, 0.5],
  rotation = [1.0, 0.0],
  starSpeed = 0.5,
  density = 2.0,
  hueShift = 0.0,
  speed = 1.0,
  glowIntensity = 0.35,
  saturation = 0.2,
  mouseRepulsion = true,
  twinkleIntensity = 0.4,
  rotationSpeed = 0.25,
  repulsionStrength = 1.5,
  autoCenterRepulsion = 0.0,
  transparent = false,
  useWindowPointer = true,
}) {
  const { size, gl } = useThree();

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
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
      uMouseRepulsion: { value: mouseRepulsion ? 1.0 : 0.0 },
      uTwinkleIntensity: { value: twinkleIntensity },
      uRotationSpeed: { value: rotationSpeed },
      uRepulsionStrength: { value: repulsionStrength },
      uMouseActiveFactor: { value: 0.0 },
      uAutoCenterRepulsion: { value: autoCenterRepulsion },
      uTransparent: { value: transparent ? 1.0 : 0.0 },
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

  useEffect(() => {
    setResolution(uniforms.uResolution, gl);
  }, [size.width, size.height, gl, uniforms]);

  useEffect(() => {
    if (!useWindowPointer) return;
    const onMove = (e) => {
      const x = e.clientX / window.innerWidth;
      const y = 1.0 - e.clientY / window.innerHeight;
      uniforms.uMouse.value[0] = THREE.MathUtils.clamp(x, 0, 1);
      uniforms.uMouse.value[1] = THREE.MathUtils.clamp(y, 0, 1);
      uniforms.uMouseActiveFactor.value = 1.0;
    };
    const onLeave = () => (uniforms.uMouseActiveFactor.value = 0.0);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, [useWindowPointer, uniforms]);

  useFrame((state) => {
    if (!playing) return;
    const t = state.clock.getElapsedTime();
    uniforms.uTime.value = t;
    uniforms.uStarSpeed.value = (t * starSpeed) / 10.0;
    uniforms.uMouseActiveFactor.value *= 0.985;
  });

  return (
    <mesh frustumCulled={false} renderOrder={-1000}>
      <planeGeometry args={[2, 2]} />
      <rawShaderMaterial
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
}
