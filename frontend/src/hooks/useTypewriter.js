import { useState, useEffect, useRef } from "react";

export const useTypewriter = (
  textLines = [],
  {
    typeSpeed = 100,
    deleteSpeed = 50,
    pauseDelay = 1200,
    shouldLoop = true,
    multiLine = false,
    startWhen = true, // NEW: wait for this to be true before starting
  } = {}
) => {
  const [displayText, setDisplayText] = useState("");
  const [isDone, setIsDone] = useState(false);

  // internal state kept in a ref so RAF loop can mutate without re-renders
  const stateRef = useRef({
    lineIndex: 0,
    subIndex: 0,
    phase: "typing", // typing | pausing | deleting | idle
    isStopped: false,
  });

  const lastTickRef = useRef(0);

  useEffect(() => {
    // Normalize input
    const hasLines = Array.isArray(textLines) && textLines.length > 0;

    // If nothing to type -> set done and bail
    if (!hasLines) {
      setDisplayText("");
      setIsDone(true);
      return;
    }

    // If startWhen is falsy, ensure we are paused/reset and don't start RAF.
    if (!startWhen) {
      // reset internal state so when startWhen becomes true we begin cleanly
      stateRef.current = {
        lineIndex: 0,
        subIndex: 0,
        phase: "typing",
        isStopped: true,
      };
      lastTickRef.current = 0;
      setDisplayText("");
      setIsDone(false);
      return; // wait for startWhen to become true (effect will re-run)
    }

    // startWhen is true -> (re)initialize and start typing
    stateRef.current = {
      lineIndex: 0,
      subIndex: 0,
      phase: "typing",
      isStopped: false,
    };
    lastTickRef.current = 0;
    setDisplayText("");
    setIsDone(false);

    let rafId = 0;
    let pauseTimeoutId = null;

    const step = (timestamp) => {
      rafId = requestAnimationFrame(step);

      const state = stateRef.current;
      if (state.isStopped) return;

      const speed = state.phase === "deleting" ? deleteSpeed : typeSpeed;
      if (timestamp - lastTickRef.current < speed) return;
      lastTickRef.current = timestamp;

      const currentLine = (textLines[state.lineIndex] ?? "") + "";

      if (state.phase === "typing") {
        if (state.subIndex < currentLine.length) {
          state.subIndex++;
        } else {
          // detect completion (only when not looping)
          if (!shouldLoop && multiLine && state.lineIndex === textLines.length - 1) {
            setIsDone(true);
          }
          if (!shouldLoop && !multiLine && state.lineIndex === textLines.length - 1) {
            setIsDone(true);
          }

          if (multiLine) {
            if (state.lineIndex < textLines.length - 1) {
              state.phase = "pausing";
              pauseTimeoutId = setTimeout(() => {
                state.phase = "typing";
                state.lineIndex++;
                state.subIndex = 0;
                pauseTimeoutId = null;
              }, pauseDelay);
            } else {
              if (shouldLoop) {
                state.phase = "pausing";
                pauseTimeoutId = setTimeout(() => {
                  state.phase = "deleting";
                  state.subIndex = currentLine.length;
                  pauseTimeoutId = null;
                }, pauseDelay);
              } else {
                state.phase = "idle";
                state.isStopped = true;
                cancelAnimationFrame(rafId);
              }
            }
          } else {
            state.phase = "pausing";
            pauseTimeoutId = setTimeout(() => {
              state.phase = "deleting";
              state.subIndex = currentLine.length;
              pauseTimeoutId = null;
            }, pauseDelay);
          }
        }
      } else if (state.phase === "deleting") {
        if (state.subIndex > 0) {
          state.subIndex--;
        } else {
          if (multiLine) {
            if (state.lineIndex > 0) {
              state.lineIndex--;
              state.subIndex = textLines[state.lineIndex].length;
            } else {
              if (shouldLoop) {
                state.lineIndex = 0;
                state.subIndex = 0;
                state.phase = "typing";
              } else {
                state.phase = "idle";
                state.isStopped = true;
                cancelAnimationFrame(rafId);
              }
            }
          } else {
            if (state.lineIndex < textLines.length - 1) {
              state.lineIndex++;
              state.subIndex = 0;
              state.phase = "typing";
            } else {
              if (shouldLoop) {
                state.lineIndex = 0;
                state.subIndex = 0;
                state.phase = "typing";
              } else {
                state.phase = "idle";
                state.isStopped = true;
                cancelAnimationFrame(rafId);
              }
            }
          }
        }
      }

      // commit display
      if (multiLine) {
        const linesToShow = [];
        for (let i = 0; i <= state.lineIndex; i++) {
          if (i < state.lineIndex) {
            linesToShow.push(textLines[i]);
          } else {
            linesToShow.push(
              textLines[i].substring(0, Math.max(0, state.subIndex))
            );
          }
        }
        setDisplayText(linesToShow.join("\n"));
      } else {
        const cur = textLines[state.lineIndex] ?? "";
        setDisplayText(cur.substring(0, Math.max(0, state.subIndex)));
      }
    };

    rafId = requestAnimationFrame(step);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (pauseTimeoutId) clearTimeout(pauseTimeoutId);
    };
    // re-run whenever lines/options change OR when startWhen flips
  }, [
    JSON.stringify(textLines),
    typeSpeed,
    deleteSpeed,
    pauseDelay,
    shouldLoop,
    multiLine,
    startWhen, // <-- important: effect waits for changes to this
  ]);

  return { displayText, isDone };
};
