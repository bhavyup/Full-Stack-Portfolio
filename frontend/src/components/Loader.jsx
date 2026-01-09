import React, { useState, useEffect, useRef } from "react";
import styled, { keyframes } from "styled-components";
import { publicApi } from "../utils/api";
import axios from "axios";
import Terminal from "./ui/Terminal";
import { useTypewriter } from "@/hooks/useTypewriter";
import GForm from "./Admin/GForm";
import * as THREE from "three";

const blinkAnimation = keyframes`
  50% { opacity: 0; }
`;

const BlinkingCursor = styled.span`
  display: inline-block;
  width: 10px;
  height: 1.2rem;
  background-color: #00ff41;
  margin-left: -10px;
  animation: ${blinkAnimation} 1s step-end infinite;
`;

function GLWarmup() {
  const [mount, setMount] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setMount(false), 400); // mount briefly
    return () => clearTimeout(id);
  }, []);
  if (!mount) return null;
  const { Canvas } = require("@react-three/fiber");
  return (
    <div
      style={{
        position: "fixed",
        left: -9999,
        top: -9999,
        width: 1,
        height: 1,
      }}
    >
      <Canvas gl={{ alpha: false, antialias: false }} frameloop="demand">
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial />
        </mesh>
      </Canvas>
    </div>
  );
}

const LoaderScreen = ({ onFinished, onReadyToPreload }) => {
  const [profile, setProfile] = useState(null);
  const [visitorInfo, setVisitorInfo] = useState(null);
  const [loaderState, setLoaderState] = useState("typing");
  const [countdown, setCountdown] = useState(5);
  const countdownStartedRef = useRef(false);
  const [countdownVisible, setCountdownVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function prefetchAll() {
      try {
        // 1) Route chunks (match the exact paths used in lazy() above)
        const routeChunks = [
          import(/* webpackPrefetch: true */ "@/components/HeroSection"),
          import(/* webpackPrefetch: true */ "@/components/AboutSection"),
          import(/* webpackPrefetch: true */ "@/components/SkillsSection"),
          import(/* webpackPrefetch: true */ "@/components/ProjectsSection"),
          import(/* webpackPrefetch: true */ "@/components/EducationSection"),
          import(
            /* webpackPrefetch: true */ "@/components/LearningJourneySection"
          ),
          import(/* webpackPrefetch: true */ "@/components/ExperimentsSection"),
          import(/* webpackPrefetch: true */ "@/components/ContactSection"),
          import(/* webpackPrefetch: true */ "@/components/Footer"),
          import(/* webpackPrefetch: true */ "@/components/Test"),
          import(/* webpackPrefetch: true */ "@/components/ExperienceSection"), // heavy 3D
        ];

        // 2) Heavy libs (some are already prefetched in App; keeping here is fine)
        const libs = [
          import("three"),
          import("@react-three/fiber"),
          import("@react-three/drei"),
        ];

        // 3) Data you’ll need soon (warm HTTP cache and optionally stash in window)
        const dataCalls = [
          publicApi.getProfile?.().catch(() => null),
          publicApi.getExperience?.().catch(() => null),
          publicApi.getProjects?.().catch(() => null),
          publicApi.getSkills?.().catch(() => null),
          publicApi.getEducation?.().catch(() => null),
          publicApi.getLearningJourney?.().catch(() => null),
          publicApi.getExperiments?.().catch(() => null),
          publicApi.getContact?.().catch(() => null),
        ];

        // Optional: store some results for instant usage after nav (simple bootstrap cache)
        const [profileRes, experienceRes, skillsRes] = await Promise.allSettled(
          [
            publicApi.getProfile?.(),
            publicApi.getExperience?.(),
            publicApi.getSkills?.(),
          ]
        );
        if (!cancelled) {
          window.__BOOTSTRAP__ = window.__BOOTSTRAP__ || {};
          if (profileRes.status === "fulfilled" && profileRes.value?.data) {
            window.__BOOTSTRAP__.profile = profileRes.value.data;
          }
          if (
            experienceRes.status === "fulfilled" &&
            experienceRes.value?.data
          ) {
            window.__BOOTSTRAP__.experience = experienceRes.value.data;
          }
          if (skillsRes.status === "fulfilled" && skillsRes.value?.data) {
            window.__BOOTSTRAP__.skills = skillsRes.value.data;
          }
        }

        // Kick the rest in parallel but don’t wait for them to finish to unblock UX
        Promise.allSettled([...routeChunks, ...libs, ...dataCalls]).then(() => {
          // all warmed
        });
      } catch {
        // ignore
      }
    }

    prefetchAll();
    return () => {
      cancelled = true;
    };
  }, []);

  // In your App.js or loader
  useEffect(() => {
    // Preload WebGL context
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");

    // Preload critical textures
    const textureLoader = new THREE.TextureLoader();
    // Warm up shaders
    import("@react-three/drei").then((drei) => {
      drei.Line;
      drei.OrthographicCamera;
      drei.Text;
    });
  }, []);

  useEffect(() => {
    const fetchVisitorInfo = async () => {
      try {
        const response = await axios.get("http://ip-api.com/json");
        setVisitorInfo(response.data);
      } catch (error) {
        console.error("Could not fetch visitor info:", error);
        setVisitorInfo({
          query: "127.0.0.1",
          city: "Classified",
          country: "Unknown",
          isp: "Secure Net",
        });
      }
    };
    fetchVisitorInfo();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await publicApi.getProfile();
        if (response.success && response.data) setProfile(response.data);
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };
    fetchProfile();
  }, []);

  const bootlines = profile?.hero_lines || [];
  const infoLines = visitorInfo
    ? [
        `> CONNECTION ESTABLISHED...`,
        `> TRACING USER...`,
        `> IP ADDRESS.....: ${visitorInfo.query}`,
        `> LOCATION.......: ${visitorInfo.city}, ${visitorInfo.country}`,
        `> ISP............: ${visitorInfo.isp}`,
        `> ACCESS GRANTED. PRESS ANY KEY TO CONTINUE...`,
      ]
    : [];
  const heroLines = [...bootlines, ...infoLines];

  const loaderTxt = useTypewriter(heroLines, {
    typeSpeed: 100,
    deleteSpeed: 90,
    pauseDelay: 1000,
    shouldLoop: false,
    multiLine: true,
  });

  const exitLines = ["CONNECTION SECURE.", "> LOADING MAIN INTERFACE IN..."];

  const exitTxt = useTypewriter(loaderState === "exiting" ? exitLines : [], {
    typeSpeed: 100,
    deleteSpeed: 90,
    pauseDelay: 1000,
    shouldLoop: false,
    multiLine: true,
  });

  useEffect(() => {
    if (loaderState !== "typing") return;
    if (!heroLines.length) return;

    const lastLine = heroLines[heroLines.length - 1] ?? "";
    if (lastLine && loaderTxt.displayText.endsWith(lastLine)) {
      setLoaderState("awaitingInteraction");
    }
    onReadyToPreload?.();
  }, [loaderTxt, heroLines, loaderState, onReadyToPreload]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "h") {
        onFinished();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onFinished]);

  useEffect(() => {
    const handleInteraction = () => {
      if (loaderState === "awaitingInteraction") {
        console.log(
          "interaction: setting loaderState -> exiting (was)",
          loaderState
        );
        setLoaderState("exiting");
      } else {
        console.log("interaction ignored — current state:", loaderState);
      }
    };
    window.addEventListener("keydown", handleInteraction);
    window.addEventListener("mousedown", handleInteraction);
    return () => {
      window.removeEventListener("keydown", handleInteraction);
      window.removeEventListener("mousedown", handleInteraction);
    };
  }, [loaderState]);

  useEffect(() => {
    if (loaderState === "exiting") {
      const fullExitText = exitLines.join("\n");

      if (exitTxt.displayText === fullExitText) {
        if (countdownStartedRef.current) return;
        countdownStartedRef.current = true;

        setCountdownVisible(true);

        const id = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(id);
              onFinished();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        return () => clearInterval(id);
      }
    }
  }, [exitTxt.displayText, loaderState, onFinished]);

  if (!profile) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-100">
          <GForm />
        </div>
        <div className="relative z-10 min-h-screen">
          <Terminal className="!bg-black" title="BOOTING SYSTEM UPDATE...">
            <span>&gt; WAITING FOR THE SCRIPT TO EXECUTE</span>
          </Terminal>
        </div>
      </div>
    );
  }

  return (
    <>
      <GLWarmup />
      <div className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-100">
          <GForm />
        </div>
        <div className="relative z-10 min-h-screen">
          <Terminal
            className="!bg-black"
            title={profile.hero_title}
            showCursor={false}
          >
            <pre
              style={{
                whiteSpace: "pre-wrap",
                fontFamily: '"Fira Code", monospace',
                margin: 0,
              }}
            >
              {loaderState !== "exiting"
                ? `> ` + loaderTxt.displayText
                : `> ` +
                  exitTxt.displayText +
                  (countdownVisible ? ` ${countdown}` : "")}
              <BlinkingCursor />
            </pre>
          </Terminal>
        </div>
      </div>
    </>
  );
};

export default LoaderScreen;
