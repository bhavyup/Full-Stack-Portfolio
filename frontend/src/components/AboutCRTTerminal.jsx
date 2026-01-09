// components/CRTTerminal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";

/* Theme + CRT styles (scoped) */
const Root = styled.div`
  --phos: ${(p) =>
    p.mode === "amber"
      ? "255 191 0"
      : p.mode === "blue"
      ? "35 177 255"
      : "0 255 65"};
  --phos-hex: ${(p) =>
    p.mode === "amber" ? "#ffbf00" : p.mode === "blue" ? "#23b1ff" : "#00ff41"};
  --line: rgba(var(--phos) / 0.18);
  --soft: 0 0 2px rgba(var(--phos) / 0.8), 0 0 5px rgba(var(--phos) / 0.35),
    0 0 12px rgba(var(--phos) / 0.16);
  --strong: 0 0 6px rgba(var(--phos) / 0.9), 0 0 12px rgba(var(--phos) / 0.4),
    0 0 24px rgba(var(--phos) / 0.18);
  --scanline: ${(p) => (p.scan ? 1 : 0)};

  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.8);
  border-radius: 12px;
  box-shadow: inset 0 0 14px rgba(0, 0, 0, 0.6);
  color: var(--phos-hex);
  font-family: "Fira Code", "Fira Mono", ui-monospace, SFMono-Regular, monospace;
  position: relative;
  overflow: auto;

  &::after {
    /* scanlines overlay */
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: calc(0.16 * var(--scanline));
    background: repeating-linear-gradient(
      to bottom,
      rgba(var(--phos) / 0.06) 0px,
      rgba(var(--phos) / 0.06) 1px,
      transparent 1px,
      transparent 3px
    );
    mix-blend-mode: screen;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px dashed var(--line);
  text-shadow: var(--soft);
`;
const Dot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 40%, var(--phos-hex), #00b33b);
  box-shadow: 0 0 8px rgba(var(--phos) / 0.85);
`;

const Muted = styled.span`
  color: rgba(255, 255, 255, 0.6);
`;

const Body = styled.div`
  ${(p) => (p.h ? `height:${p.h}px; max-height:none;` : `max-height:200px;`)}
  overflow: auto;
  padding: 10px 14px;
  background: radial-gradient(
    130% 70% at 50% 0%,
    rgba(var(--phos) / 0.06),
    transparent 50%
  );
`;
const Line = styled.div`
  white-space: pre-wrap;
  margin: 2px 0;
  color: ${(p) =>
    p.variant === "banner"
      ? "var(--phos-hex)"
      : p.variant === "log"
      ? "rgba(160,255,180,0.80)" /* system log tint */
      : "rgba(190,255,184,0.95)"};
  text-shadow: ${(p) =>
    p.variant === "banner" ? "var(--strong)" : "var(--soft)"};
`;
const CommandLine = styled(Line)`
  color: var(--phos-hex);
`;

const InputRow = styled.form`
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 10px 12px;
  border-top: 1px dashed var(--line);
`;
const Prompt = styled.span`
  color: ${() => "rgba(0, 255, 65, 0.85)"};
  font-weight: 600;
  font-size: 0.9rem;
`;
const TermInput = styled.input`
  flex: 1;
  background: transparent;
  border: 1px solid rgba(0, 255, 65, 0.2);
  color: var(--phos-hex);
  padding: 10px;
  border-radius: 8px;
  font-family: inherit;
  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(var(--phos) / 0.15);
  }
`;

const Button = styled.button`
  background: transparent;
  border: 1px solid rgba(0, 255, 65, 0.18);
  color: var(--phos-hex);
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  outline: none;
  &:focus {
    outline: none;
  }
  &:hover {
    background: rgba(0, 255, 65, 0.07);
  }
`;

const Hints = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 12px 12px;
`;
const Hint = styled.span`
  border: 1px dashed var(--line);
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(0, 255, 65, 0.06);
  color: rgba(190, 255, 184, 0.9);
  cursor: pointer;
  &:hover {
    background: rgba(0, 255, 65, 0.12);
  }
`;

/* Tiny QR renderer (deterministic pseudo pattern) */
const QRWrap = styled.div`
  display: inline-grid;
  grid-template-columns: repeat(29, 10px);
  gap: 2px;
  padding: 12px;
  border: 1px dashed var(--line);
  background: rgba(0, 0, 0, 0.35);
  border-radius: 8px;
  margin: 6px 0;
`;
const QRCell = styled.div`
  width: 10px;
  height: 10px;
  background: ${(p) => (p.on ? "var(--phos-hex)" : "#0b1713")};
  border: 1px solid rgba(0, 255, 65, 0.12);
  box-shadow: ${(p) => (p.on ? "0 0 6px rgba(0,255,65,0.8)" : "none")};
`;

/* Helpers */
function makeQRData(data) {
  const size = 29;
  const mods = Array(size * size).fill(false);
  const seed = Array.from(data).reduce(
    (a, c) => (a * 31 + c.charCodeAt(0)) % 9973,
    7
  );
  const prng = (i) => {
    const x = Math.sin(seed + i * 13.37) * 10000;
    return x - Math.floor(x);
  };
  for (let i = 0; i < size * size; i++) mods[i] = prng(i) > 0.64;

  const addFinder = (x0, y0) => {
    for (let y = 0; y < 7; y++)
      for (let x = 0; x < 7; x++) {
        const idx = (y0 + y) * size + (x0 + x);
        const border = x === 0 || y === 0 || x === 6 || y === 6;
        const center = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        mods[idx] = border || center;
      }
  };
  addFinder(0, 0);
  addFinder(size - 7, 0);
  addFinder(0, size - 7);
  return { size, mods };
}

const ASCII = {
  logo: String.raw`
      ▄▄▄▄
   ▄████████▄     CRT
  ████████████   terminal
  ████████████   edition
   ▀████████▀
      ▀▀▀▀
`,
  help: String.raw`
Available commands:
  help                         Show this help
  whoami                       Identity info
  bio                          Print profile bio
  skills [category?]           List skills (or a single category)
  projects                     Recent projects
  neofetch                     System summary
  qr [text]                    Render QR for text/URL
  theme set [green|amber|blue] Switch phosphor color
  scanlines [on|off]           Toggle scanlines
  glow [on|off]                Toggle stronger glow
  logs [n]                     Print last N system logs (default 50)
  logs follow [on|off]         Stream system logs into terminal
  clear                        Clear terminal
  exit                         Close terminal
  & others
`,
};

function normalizeSkills(skills) {
  // skills is expected as { category: [{name, level?} | string | any] }
  if (!skills || typeof skills !== "object") return {};
  return skills;
}

function formatSkills(skills, pickCategory) {
  const map = normalizeSkills(skills);
  const cats = Object.keys(map);
  const out = [];
  if (pickCategory) {
    const key = cats.find((c) =>
      c.toLowerCase().includes(pickCategory.toLowerCase())
    );
    if (!key) return [`No category found matching "${pickCategory}".`];
    out.push(`Category: ${key}`);
    (map[key] || []).forEach((it) => {
      if (typeof it === "string") out.push(`  • ${it}`);
      else if (it?.name)
        out.push(`  • ${it.name}${it.level ? ` — ${it.level}%` : ""}`);
      else out.push(`  • ${JSON.stringify(it)}`);
    });
    return out;
  }
  cats.forEach((c) => {
    out.push(`- ${c}`);
    (map[c] || []).forEach((it) => {
      if (typeof it === "string") out.push(`    • ${it}`);
      else if (it?.name)
        out.push(`    • ${it.name}${it.level ? ` — ${it.level}%` : ""}`);
      else out.push(`    • ${JSON.stringify(it)}`);
    });
  });
  return out.length ? out : ["No skills available."];
}

function formatProjects(projects) {
  if (!projects?.length) return ["No projects available."];
  return projects.slice(0, 12).map((p, i) => {
    const name = p.title || p.name || `project-${i + 1}`;
    const status = p.status || "live";
    const link = p.url || p.link || p.repo || "";
    return `- ${name}${link ? ` — ${link}` : ""} [${status}]`;
  });
}

export default function CRTTerminal({
  profile,
  skills,
  projects,
  bodyHeight,
  systemLogs = [], // NEW
  onClose = () => {},
  onUnknownCommand = async () => {},
  triggerAlert = () => {},
  addLog = () => {},
}) {
  const [mode, setMode] = useState("green"); // green | amber | blue
  const [scan, setScan] = useState(true);
  const [glow, setGlow] = useState(false);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [prevCmds, setPrevCmds] = useState([]);
  const [cursor, setCursor] = useState(-1);
  const bodyRef = useRef(null);
  const [followLogs, setFollowLogs] = useState(true); // NEW
  const prevLenRef = useRef(systemLogs?.length || 0); // NEW

  // Tail some logs on mount (without duplicating)
  useEffect(() => {
    const len = systemLogs?.length || 0;
    if (len) {
      const TAIL = 12; // initial tail count
      const slice = systemLogs.slice(Math.max(0, len - TAIL), len);
      setHistory((h) => [
        ...h,
        { type: "banner", text: "— system logs (tail)" },
        ...slice.map((t) => ({ type: "log", text: t })),
      ]);
    }
    // mark all as seen so we don't reprint on first update
    prevLenRef.current = len;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!followLogs) return;
    const prev = prevLenRef.current || 0;
    const curr = systemLogs?.length || 0;
    if (curr > prev) {
      const fresh = systemLogs.slice(prev, curr);
      setHistory((h) => [
        ...h,
        ...fresh.map((t) => ({ type: "log", text: t })),
      ]);
      prevLenRef.current = curr;
    } else if (curr < prev) {
      // logs array rotated/trimmed upstream; reset pointer to current length
      prevLenRef.current = curr;
    }
  }, [systemLogs, followLogs]);

  const reducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  }, []);

  useEffect(() => {
    if (bodyRef.current)
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [history]);

  const print = (entry) => setHistory((h) => [...h, entry]);
  const printLines = (lines, variant = "out") =>
    setHistory((h) => [
      ...h,
      ...lines.map((t) => ({ type: variant, text: t })),
    ]);

  const commands = useMemo(
    () => ({
      help() {
        printLines(ASCII.help.trimEnd().split("\n"), "banner");
      },
      logs(arg = "") {
        const a = arg.trim();
        if (a.startsWith("follow")) {
          const v = a.split(/\s+/)[1]?.toLowerCase();
          if (v === "on") {
            setFollowLogs(true);
            return print({ type: "out", text: "logs follow: on" });
          }
          if (v === "off") {
            setFollowLogs(false);
            return print({ type: "out", text: "logs follow: off" });
          }
          return print({ type: "out", text: "Usage: logs follow [on|off]" });
        }
        // tail N lines (default 50)
        const n = Math.max(1, Math.min(200, parseInt(a, 10) || 50));
        const tail = (systemLogs || []).slice(-n);
        if (!tail.length) return print({ type: "out", text: "No logs yet." });
        print({ type: "banner", text: `— system logs (last ${tail.length})` });
        printLines(tail, "log");
      },
      whoami() {
        const lines = [
          `${profile?.name || "Anonymous"} — ${profile?.role || "Specialist"}`,
          ...(profile?.highlights ? [`directive: ${profile.highlights}`] : []),
        ];
        printLines(lines);
      },
      bio() {
        const bio = profile?.bio || "";
        const lines = bio ? bio.split(/\n+/) : ["No bio available."];
        printLines(lines);
      },
      skills(arg = "") {
        printLines(formatSkills(skills, arg.trim()));
      },
      projects() {
        printLines(formatProjects(projects));
      },
      neofetch() {
        const left = ASCII.logo.trimEnd().split("\n");
        const right = [
          `${profile?.name || "Anonymous"} @ ${profile?.handle || "agent"}`,
          "-------------------------",
          `OS: CRT-EMU`,
          `Theme: ${mode} phosphor`,
          `Uptime: ∞`,
          `Packages: 42 (custom)`,
          `Memory: as needed`,
        ];
        const rows = Math.max(left.length, right.length);
        const maxL = Math.max(...left.map((s) => s.length));
        const out = [];
        for (let i = 0; i < rows; i++) {
          out.push(`${(left[i] || "").padEnd(maxL + 3, " ")}${right[i] || ""}`);
        }
        printLines(out, "banner");
      },
      qr(arg = "") {
        const text = arg.trim() || profile?.site || "https://example.com";
        const { mods } = makeQRData(text);
        print({
          type: "node",
          node: (
            <QRWrap>
              {mods.map((on, i) => (
                <QRCell key={i} on={on} />
              ))}
            </QRWrap>
          ),
        });
      },
      "theme set"(arg = "") {
        const v = arg.trim().toLowerCase();
        if (!["green", "amber", "blue"].includes(v)) {
          print({ type: "out", text: "Usage: theme set [green|amber|blue]" });
          return;
        }
        setMode(v);
        triggerAlert(`Theme set to ${v}`);
        print({ type: "out", text: `Theme set to ${v}` });
      },
      scanlines(arg = "") {
        const v = arg.trim().toLowerCase();
        if (v === "on") setScan(true);
        else if (v === "off") setScan(false);
        else return print({ type: "out", text: "Usage: scanlines [on|off]" });
        print({
          type: "out",
          text: `scanlines: ${v || (scan ? "on" : "off")}`,
        });
      },
      glow(arg = "") {
        const v = arg.trim().toLowerCase();
        if (v === "on") setGlow(true);
        else if (v === "off") setGlow(false);
        else return print({ type: "out", text: "Usage: glow [on|off]" });
        print({ type: "out", text: `glow: ${v}` });
      },
      clear() {
        setHistory([]);
      },
      exit() {
        print({ type: "out", text: "closing terminal ..." });
        onClose();
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, skills, projects, mode, scan, glow, systemLogs, followLogs]
  );

  const exec = async (raw) => {
    const line = raw.trim();
    if (!line) return;
    setPrevCmds((p) => [...p, line].slice(-50));
    setCursor(-1);
    print({ type: "cmd", text: `$ ${line}` });

    // Support two-word commands like "theme set"
    const [c0, c1, ...rest] = line.split(" ");
    const key = commands[`${c0} ${c1}`] ? `${c0} ${c1}` : c0;
    const arg =
      key === `${c0} ${c1}` ? rest.join(" ") : [c1, ...rest].join(" ");

    const fn = commands[key];
    if (fn) {
      try {
        await fn(arg);
      } catch (e) {
        print({ type: "out", text: `error: ${String(e.message || e)}` });
      }
      return;
    }

    // Forward unknown commands to parent prank processor
    try {
      await onUnknownCommand(line);
      // Surface a subtle note in terminal too
    } catch (e) {
      print({ type: "out", text: `error: ${String(e.message || e)}` });
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const v = input.trim();
      if (!v) return;
      setInput("");
      exec(v);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!prevCmds.length) return;
      const next = cursor < 0 ? prevCmds.length - 1 : Math.max(0, cursor - 1);
      setCursor(next);
      setInput(prevCmds[next] || "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!prevCmds.length) return;
      const next = cursor < 0 ? -1 : Math.min(prevCmds.length - 1, cursor + 1);
      setCursor(next);
      setInput(next < 0 ? "" : prevCmds[next] || "");
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
      print({ type: "out", text: "^C" });
      setInput("");
    }
  };

  const hintPills = [
    "help",
    "whoami",
    "bio",
    "skills",
    "projects",
    "neofetch",
    "qr https://example.com",
    "theme set amber",
    "scanlines off",
    "glow on",
  ];

  useEffect(() => {
    // small MOTD
    if (history.length === 0) {
      print({
        type: "out",
        text: "Welcome. Try: neofetch · skills · projects · theme set amber",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Root
      mode={mode}
      scan={scan}
      style={{
        filter: glow ? "drop-shadow(0 0 24px rgba(0,255,65,0.25))" : "none",
      }}
    >
      <Header>
        <Dot />
        <span>interactive terminal</span>
        <Muted style={{ marginLeft: 6 }}>— type help</Muted>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "var(--phos-hex)",
            }}
          />
          <Muted>theme: {mode}</Muted>
          <Button onClick={onClose}>Close</Button>
        </div>
      </Header>

      <Body ref={bodyRef}>
        {history.map((h, i) =>
          h.type === "node" ? (
            <Line key={i}>{h.node}</Line>
          ) : h.type === "cmd" ? (
            <CommandLine key={i}>{h.text}</CommandLine>
          ) : (
            <Line
              key={i}
              variant={
                h.type === "banner"
                  ? "banner"
                  : h.type === "log"
                  ? "log"
                  : "out"
              }
            >
              {h.text}
            </Line>
          )
        )}
      </Body>

      <InputRow onSubmit={(e) => e.preventDefault()}>
        <Prompt>$</Prompt>
        <TermInput
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="type a command… (help)"
          aria-label="terminal input"
        />
        <Button
          onClick={() => {
            const v = input.trim();
            if (!v) return;
            setInput(""); // clear on Run
            exec(v);
          }}
        >
          RUN
        </Button>
      </InputRow>

      <Hints>
        {hintPills.map((p) => (
          <Hint
            key={p}
            onClick={() => setInput(p)}
            onDoubleClick={() => {
              setInput(p);
              setTimeout(() => exec(p), 0);
            }}
          >
            {p}
          </Hint>
        ))}
      </Hints>
    </Root>
  );
}
