import styled, { keyframes } from "styled-components";
import React from "react";

const blinkAnimation = keyframes`
  0% { opacity: 1; },
  5% { opacity: 0.95; },
  10% { opacity: 0.90; },
  15% { opacity: 0.85; },
  20% { opacity: 0.80; },
  25% { opacity: 0.75; },
  30% { opacity: 0.70; },
  35% { opacity: 0.65; },
  40% { opacity: 0.60; },
  45% { opacity: 0.55; },
  50% { opacity: 0.50; },
  55% { opacity: 0.55; },
  60% { opacity: 0.60; },
  65% { opacity: 0.65; },
  70% { opacity: 0.70; },
  75% { opacity: 0.75; },
  80% { opacity: 0.80; },
  85% { opacity: 0.85; },
  90% { opacity: 0.90; },
  95% { opacity: 0.95; },
  100% { opacity: 1.00; },
`;

// Blinking pixel
const BlinkingCursor = styled.span`
  display: inline-block;
  width: 10px;
  height: ${({ height }) => height};
  background-color: ${({ cursorColor }) => cursorColor};
  animation: ${blinkAnimation} 2s step-end infinite;
`;

const EmptyPixel = styled.span`
  display: inline-block;
  width: 10px;
  height: ${({ height }) => height};
`;

const Pixel = ({ on, height, cursorColor }) =>
  on ? (
    <BlinkingCursor height={height} cursorColor={cursorColor} />
  ) : (
    <EmptyPixel height={height} />
  );

// Pixel font (A–Z)
const letters = {
  A: [
    [0,1,1,1,0],
    [1,0,0,0,1],
    [1,1,1,1,1],
    [1,0,0,0,1],
    [1,0,0,0,1]
  ],
  B: [
    [1,1,1,1,0],
    [1,0,0,0,1],
    [1,1,1,1,0],
    [1,0,0,0,1],
    [1,1,1,1,0]
  ],
  C: [
    [0,1,1,1,1],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [0,1,1,1,1]
  ],
  D: [
    [1,1,1,0,0],
    [1,0,0,1,0],
    [1,0,0,1,0],
    [1,0,0,1,0],
    [1,1,1,0,0]
  ],
  E: [
    [1,1,1,1,1],
    [1,0,0,0,0],
    [1,1,1,1,1],
    [1,0,0,0,0],
    [1,1,1,1,1]
  ],
  F: [
    [1,1,1,1,1],
    [1,0,0,0,0],
    [1,1,1,1,0],
    [1,0,0,0,0],
    [1,0,0,0,0]
  ],
  G: [
    [0,1,1,1,1],
    [1,0,0,0,0],
    [1,0,1,1,1],
    [1,0,0,0,1],
    [0,1,1,1,1]
  ],
  H: [
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,1],
    [1,0,0,0,1],
    [1,0,0,0,1]
  ],
  I: [
    [1,1,1,1,1],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [1,1,1,1,1]
  ],
  J: [
    [0,0,1,1,1],
    [0,0,0,1,0],
    [0,0,0,1,0],
    [1,0,0,1,0],
    [0,1,1,0,0]
  ],
  K: [
    [1,0,0,0,1],
    [1,0,0,1,0],
    [1,1,1,0,0],
    [1,0,0,1,0],
    [1,0,0,0,1]
  ],
  L: [
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,1,1,1,1]
  ],
  M: [
    [1,0,0,0,1],
    [1,1,0,1,1],
    [1,0,1,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1]
  ],
  N: [
    [1,0,0,0,1],
    [1,1,0,0,1],
    [1,0,1,0,1],
    [1,0,0,1,1],
    [1,0,0,0,1]
  ],
  O: [
    [1,1,1,1,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,1]
  ],
  P: [
    [1,1,1,1,1],
    [1,0,0,0,1],
    [1,1,1,1,1],
    [1,0,0,0,0],
    [1,0,0,0,0]
  ],
  Q: [
    [0,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,1,1],
    [0,1,1,1,1]
  ],
  R: [
    [1,1,1,1,0],
    [1,0,0,0,1],
    [1,1,1,1,0],
    [1,0,0,1,0],
    [1,0,0,0,1]
  ],
  S: [
    [1,1,1,1,1],
    [1,0,0,0,0],
    [1,1,1,1,1],
    [0,0,0,0,1],
    [1,1,1,1,1]
  ],
  T: [
    [1,1,1,1,1],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0]
  ],
  U: [
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [0,1,1,1,0]
  ],
  V: [
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [0,1,0,1,0],
    [0,0,1,0,0]
  ],
  W: [
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,1,0,1],
    [1,1,0,1,1],
    [1,0,0,0,1]
  ],
  X: [
    [1,0,0,0,1],
    [0,1,0,1,0],
    [0,0,1,0,0],
    [0,1,0,1,0],
    [1,0,0,0,1]
  ],
  Y: [
    [1,0,0,0,1],
    [0,1,0,1,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0]
  ],
  Z: [
    [1,1,1,1,1],
    [0,0,0,1,0],
    [0,0,1,0,0],
    [0,1,0,0,0],
    [1,1,1,1,1]
  ],
  "~": [
    [0,0],
    [0,0],
    [0,0],
    [0,0],
    [1,1]
  ]
};

const PixelText = ({ text, height = "1.3rem", cursorColor = "#00ff41" }) => {
  const chars = text.toUpperCase().replace(" ", "~").split("");
  
  // Build flattened array of all pixels for blinking logic
  const allPixels = [];
  chars.forEach((char, ci) => {
    const pattern = letters[char] || [];
    pattern.forEach(row => row.forEach(p => allPixels.push(p)));
  });
  
  const lastOnIndex = allPixels.lastIndexOf(1);

  return (
    <div style={{ display: "flex", gap: "1rem" }}>
      {chars.map((letter, i) => (
        <div key={i}>
          {letters[letter].map((row, r) => (
            <div key={r} style={{ display: "flex" }}>
              {row.map((on, c) => (
                <Pixel key={c} on={on} height={height} cursorColor={cursorColor} />
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
  
export default PixelText;
