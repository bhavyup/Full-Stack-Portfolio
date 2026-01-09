import React, { useMemo, useEffect, useRef } from "react"; // <-- Add useEffect and useRef
import styled, { keyframes } from "styled-components";

// --- CSS Animations (Keyframes) ---
const gridAnimation = keyframes`
  0% { transform: translateY(0); }
  100% { transform: translateY(-50px); }
`;

const blinkAnimation = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.2; }
`;

// --- Styled Components ---
const BackgroundWrapper = styled.div`
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
  background-color: #0a0a0a;
  perspective: 200px;
`;

const GridPlane = styled.div`
  position: absolute;
  inset: -100%;
  transform-style: preserve-d;
  transform: rotateX(75deg);
  transition: transform 0.5s cubic-bezier(0.23, 1, 0.32, 1);
  /* The "animation" property has been REMOVED from here... */
`;

const GridLines = styled.div`
  position: absolute;
  inset: 0;
  background-image: 
    repeating-linear-gradient(to right, rgba(0, 255, 65, 0.4) 0, rgba(0, 255, 65, 0.4) 1px, transparent 1px, transparent 50px),
    repeating-linear-gradient(to bottom, rgba(0, 255, 65, 0.4) 0, rgba(0, 255, 65, 0.4) 1px, transparent 1px, transparent 50px);
  
  /* ...and MOVED here, so scrolling doesn't conflict with mouse rotation. */
  animation: ${gridAnimation} 4s linear infinite;
`;

const HorizonFade = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 50%;
  background: linear-gradient(to top, transparent, #0a0a0a);
  z-index: 1;
`;

const Starfield = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;
`;

const Star = styled.span`
  position: absolute;
  font-family: "Fira Code", monospace;
  color: #00ff41;
  font-size: 10px;
  animation: ${blinkAnimation} linear infinite;
`;

// --- The React Component ---
const RetroBackground = () => {
  const planeRef = useRef(null); // 1. Create a ref to reference the grid plane

  // This effect adds the mouse tracking logic
  useEffect(() => {
    const handleMouseMove = (event) => {
      if (!planeRef.current) return;

      const { clientX, clientY } = event;
      const { innerWidth, innerHeight } = window;

      // Calculate mouse position from -1 to 1
      const mouseX = clientX / innerWidth - 0.5;
      const mouseY = clientY / innerHeight - 0.5;

      // Define the intensity of the 3D effect
      const rotY = mouseX * 10; // Tilt left/right
      const rotX_adjustment = mouseY * -10; // Tilt up/down

      // Apply the new rotation on top of the initial 75-degree tilt
      planeRef.current.style.transform = `rotateX(${
        75 + rotX_adjustment
      }deg) rotateY(${rotY}deg)`;
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Cleanup function to remove the listener
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);
  // Generate random positions and animations for stars just once
  const stars = useMemo(
    () =>
      Array.from({ length: 150 }).map(() => ({
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        animationDuration: `${2 + Math.random() * 3}s`,
        animationDelay: `${Math.random() * 5}s`,
        char: ["✦", "✧", "★", "·", "_"][Math.floor(Math.random() * 5)],
      })),
    []
  );

  return (
    <BackgroundWrapper>
      <Starfield>
        {stars.map((star, i) => (
          <Star
            key={i}
            style={{
              top: star.top,
              left: star.left,
              animationDuration: star.animationDuration,
              animationDelay: star.animationDelay,
            }}
          >
            {star.char}
          </Star>
        ))}
      </Starfield>
      <GridPlane ref={planeRef}>
        <GridLines />
      </GridPlane>
      <HorizonFade />
    </BackgroundWrapper>
  );
};

export default RetroBackground;
