// usePerfSettings.js
import { useMemo } from "react";
import { useDetectGPU } from "@react-three/drei";

export function usePerfSettings() {
  const gpu = useDetectGPU(); // { tier: 0..3, isMobile, ... }

  const settings = useMemo(() => {
    const tier = Math.max(0, gpu?.tier || 0);
    const isMobile = !!gpu?.isMobile;

    // DPR: keep low on mobile/weak GPUs
    const dpr = isMobile || tier < 2 ? [1, 1] : [1, 1.25];

    // Antialias is expensive: disable on weak tiers/mobile
    const antialias = !isMobile && tier >= 2;

    // Effects/shadows: toggle later based on tier if you want
    const allowPost = tier >= 2;
    const allowShadows = tier >= 2;

    // Counts scaling (use to scale stars/asteroids/instancing)
    const density = tier >= 3 ? 1 : tier === 2 ? 0.75 : 0.5;

    return { tier, isMobile, dpr, antialias, allowPost, allowShadows, density };
  }, [gpu]);

  return settings;
}
