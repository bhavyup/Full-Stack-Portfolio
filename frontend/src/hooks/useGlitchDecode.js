import { useState, useEffect } from 'react';

/**
 * A custom React hook for a "glitch and decode" text effect.
 * @param {string} text - The final text to be revealed.
 * @param {object} options - Configuration options.
 * @param {number} options.speed - The speed of the animation in milliseconds.
 * @param {number} options.iterations - How many glitch frames per letter. Higher is slower.
 * @returns {string} The text to be displayed.
 */
export const useGlitchDecode = (text, { speed = 50, iterations = 2 } = {}) => {
  const [displayText, setDisplayText] = useState('');
  const [runId, setRunId] = useState(0);
  const glitchChars = 'BhavyaUpreti'; // Characters to use for the glitch effect

  useEffect(() => {
    // If there's no text, do nothing.
    if (!text) {
        setDisplayText('');
        return;
    }

    let decodedIndex = 0;
    let iterationCount = 0;
    
    // Set the initial display to all glitching characters
    setDisplayText(Array(text.length).fill(0).map(() => glitchChars[Math.floor(Math.random() * glitchChars.length)]).join(''));

    const intervalId = setInterval(() => {
      // Get the part of the string that is already decoded
      const decodedPart = text.substring(0, decodedIndex);
      
      // Create the currently glitching character
      const glitchingChar = glitchChars[Math.floor(Math.random() * glitchChars.length)];

      // Create the remaining random part
      let randomPart = '';
      for (let i = decodedIndex + 1; i < text.length; i++) {
        randomPart += glitchChars[Math.floor(Math.random() * glitchChars.length)];
      }

      // Update the display text
      setDisplayText(decodedPart + glitchingChar + randomPart);

      // After a few iterations, lock in the next letter
      if (iterationCount >= iterations) {
        iterationCount = 0;
        decodedIndex++;
      } else {
        iterationCount++;
      }
      
      // If all letters are decoded, stop the interval and set the final text
      if (decodedIndex >= text.length) {
        clearInterval(intervalId);
        setDisplayText(text);
      }
    }, speed);

    // Cleanup function to clear the interval
    return () => clearInterval(intervalId);
  }, [text, speed, iterations, runId]);
  
  const restartAnimation = () => {
    setRunId(prevId => prevId + 1);
  };// Re-run the effect if the target text changes

  return {displayText, restartAnimation};
};