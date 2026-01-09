import React, {
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styled, { css } from "styled-components";
import { Chess } from "chess.js";
const Wrapper = styled.div`
  color: var(--crt-green, #00ff41);
  font-family: "Fira Code", monospace;
  width: 100%;
  box-sizing: border-box;
`;
const Topbar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
`;
const Controls = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
`;
const Btn = styled.button`
  background: transparent;
  color: var(--crt-green);
  border: 1px solid rgba(0, 255, 65, 0.12);
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  outline: none;
  font-family: inherit;
  font-size: 13px;
  transition: transform 0.12s ease;
  &:hover {
    transform: translateY(-2px);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
const BoardWrap = styled.div`
  display: inline-block;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(0, 255, 65, 0.06);
`;
const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  grid-template-rows: repeat(8, 1fr);
  width: min(680px, 96vw);
  max-width: 680px;
  height: 70vh;
  aspect-ratio: 1 / 1;
  user-select: none;
`;
const SquareDiv = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(18px, 4.5vw, 36px);
  position: relative;
  box-sizing: border-box;
  cursor: ${({ clickable }) => (clickable ? "pointer" : "default")};
  overflow: hidden;
  padding: 0;
`;
const Highlight = styled.div`
  position: absolute;
  inset: 6%;
  border-radius: 8px;
  pointer-events: none;
  ${({ type }) =>
    type === "selected" &&
    css`
      background: rgba(0, 255, 160, 0.08);
      border: 1px solid rgba(0, 255, 160, 0.18);
    `}
  ${({ type }) =>
    type === "legal" &&
    css`
      background: rgba(0, 255, 65, 0.1);
    `}
  ${({ type }) =>
    type === "check" &&
    css`
      background: rgba(255, 80, 80, 0.22);
      border: 1px solid rgba(255, 80, 80, 0.36);
    `}
`;
const Outline = styled.div`
  position: absolute;
  inset: 3%;
  border-radius: 8px;
  pointer-events: none;
  border: 2px solid rgba(0, 255, 65, 0.7);
  box-shadow: 0 0 10px rgba(0, 255, 65, 0.12);
`;
const Panel = styled.div`
  margin-left: 14px;
  min-width: 220px;
  max-width: 38vw;
`;
const MovesList = styled.div`
  max-height: 640px;
  overflow: auto;
  padding-right: 6px;
  font-size: 13px;
  color: rgba(0, 255, 65, 0.92);
`;

const PromoModal = styled.div`
  position: fixed;
  left: 25%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 2000;
  background: rgba(0, 0, 0, 0.96);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid rgba(0, 255, 65, 0.08);
  box-shadow: 0 14px 60px rgba(0, 0, 0, 0.6);
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
`;
const EndModal = styled(PromoModal)`
  flex-direction: column;
  min-width: 300px;
  gap: 12px;
`;

const UNICODE = {
  w: { p: "♙", r: "♖", n: "♘", b: "♗", q: "♕", k: "♔" },
  b: { p: "♟︎", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚" },
};

const cloneBoard = (board) =>
  board.map((r) => r.map((c) => (c ? { ...c } : null)));
const inBounds = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const opposite = (c) => (c === "w" ? "b" : "w");
const rcToAlg = (r, c) => `${String.fromCharCode(97 + c)}${8 - r}`;
const algToRC = (alg) => {
  if (!alg || typeof alg !== "string" || alg.length < 2) return null;
  const file = alg.charCodeAt(0) - 97;
  const rank = 8 - parseInt(alg[1], 10);
  return [rank, file];
};
function initialBoard() {
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  const br = ["r", "n", "b", "q", "k", "b", "n", "r"];
  for (let c = 0; c < 8; c++)
    board[0][c] = { type: br[c], color: "b", moved: false };
  for (let c = 0; c < 8; c++)
    board[1][c] = { type: "p", color: "b", moved: false };
  for (let c = 0; c < 8; c++)
    board[6][c] = { type: "p", color: "w", moved: false };
  const wr = ["r", "n", "b", "q", "k", "b", "n", "r"];
  for (let c = 0; c < 8; c++)
    board[7][c] = { type: wr[c], color: "w", moved: false };
  return board;
}
function findKing(board, color) {
  if (!color) return null;
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === "k" && p.color === color) return [r, c];
    }
  return null;
}
function isSquareAttacked(board, r, c, byColor) {
  const pawnDir = byColor === "w" ? -1 : 1;
  for (const dc of [-1, 1]) {
    const rr = r + pawnDir,
      cc = c + dc;
    if (!inBounds(rr, cc)) continue;
    const p = board[rr][cc];
    if (p && p.color === byColor && p.type === "p") return true;
  }
  const nOff = [
    [2, 1],
    [2, -1],
    [-2, 1],
    [-2, -1],
    [1, 2],
    [1, -2],
    [-1, 2],
    [-1, -2],
  ];
  for (const [dr, dc] of nOff) {
    const rr = r + dr,
      cc = c + dc;
    if (!inBounds(rr, cc)) continue;
    const p = board[rr][cc];
    if (p && p.color === byColor && p.type === "n") return true;
  }
  const orth = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (const [dr, dc] of orth) {
    let rr = r + dr,
      cc = c + dc;
    while (inBounds(rr, cc)) {
      const p = board[rr][cc];
      if (p) {
        if (p.color === byColor && (p.type === "r" || p.type === "q"))
          return true;
        break;
      }
      rr += dr;
      cc += dc;
    }
  }
  const diag = [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  for (const [dr, dc] of diag) {
    let rr = r + dr,
      cc = c + dc;
    while (inBounds(rr, cc)) {
      const p = board[rr][cc];
      if (p) {
        if (p.color === byColor && (p.type === "b" || p.type === "q"))
          return true;
        break;
      }
      rr += dr;
      cc += dc;
    }
  }
  for (let rr = r - 1; rr <= r + 1; rr++)
    for (let cc = c - 1; cc <= c + 1; cc++) {
      if (!inBounds(rr, cc) || (rr === r && cc === c)) continue;
      const p = board[rr][cc];
      if (p && p.color === byColor && p.type === "k") return true;
    }
  return false;
}
function pseudoLegalMoves(board, r, c, enPassantTarget = null) {
  const p = board[r][c];
  if (!p) return [];
  const moves = [];
  const color = p.color;
  const dir = color === "w" ? -1 : 1;

  if (p.type === "p") {
    const r1 = r + dir;
    if (inBounds(r1, c) && !board[r1][c]) {
      moves.push({
        from: [r, c],
        to: [r1, c],
        capture: false,
        promotion: r1 === (color === "w" ? 0 : 7),
      });
      const startRow = color === "w" ? 6 : 1;
      const r2 = r + dir * 2;
      if (r === startRow && inBounds(r2, c) && !board[r2][c])
        moves.push({
          from: [r, c],
          to: [r2, c],
          capture: false,
          doubleStep: true,
          enPassantTarget: [r1, c],
        });
    }
    for (const dc of [-1, 1]) {
      const rr = r + dir,
        cc = c + dc;
      if (!inBounds(rr, cc)) continue;
      const t = board[rr][cc];
      if (t && t.color !== color)
        moves.push({
          from: [r, c],
          to: [rr, cc],
          capture: true,
          promotion: rr === (color === "w" ? 0 : 7),
        });
      if (
        enPassantTarget &&
        enPassantTarget[0] === rr &&
        enPassantTarget[1] === cc
      ) {
        const capturedPawnRow = r,
          capturedPawnCol = cc;
        const maybe = board[capturedPawnRow]?.[capturedPawnCol];
        if (maybe && maybe.type === "p" && maybe.color !== color)
          moves.push({
            from: [r, c],
            to: [rr, cc],
            capture: true,
            enPassant: [capturedPawnRow, capturedPawnCol],
          });
      }
    }
  } else if (p.type === "n") {
    const offs = [
      [2, 1],
      [2, -1],
      [-2, 1],
      [-2, -1],
      [1, 2],
      [1, -2],
      [-1, 2],
      [-1, -2],
    ];
    for (const [dr, dc] of offs) {
      const rr = r + dr,
        cc = c + dc;
      if (!inBounds(rr, cc)) continue;
      const t = board[rr][cc];
      if (!t || t.color !== color)
        moves.push({ from: [r, c], to: [rr, cc], capture: !!t });
    }
  } else if (p.type === "b" || p.type === "r" || p.type === "q") {
    const dirs = [];
    if (p.type === "b" || p.type === "q")
      dirs.push(
        ...[
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1],
        ]
      );
    if (p.type === "r" || p.type === "q")
      dirs.push(
        ...[
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]
      );
    for (const [dr, dc] of dirs) {
      let rr = r + dr,
        cc = c + dc;
      while (inBounds(rr, cc)) {
        const t = board[rr][cc];
        if (!t) moves.push({ from: [r, c], to: [rr, cc], capture: false });
        else {
          if (t.color !== color)
            moves.push({ from: [r, c], to: [rr, cc], capture: true });
          break;
        }
        rr += dr;
        cc += dc;
      }
    }
  } else if (p.type === "k") {
    for (let rr = r - 1; rr <= r + 1; rr++)
      for (let cc = c - 1; cc <= c + 1; cc++) {
        if (!inBounds(rr, cc) || (rr === r && cc === c)) continue;
        const t = board[rr][cc];
        if (!t || t.color !== color)
          moves.push({ from: [r, c], to: [rr, cc], capture: !!t });
      }
    if (!p.moved) {
      const rookKs = board[r][7];
      if (
        rookKs &&
        rookKs.type === "r" &&
        rookKs.color === color &&
        !rookKs.moved
      ) {
        if (!board[r][5] && !board[r][6])
          moves.push({ from: [r, c], to: [r, 6], castle: "K" });
      }
      const rookQs = board[r][0];
      if (
        rookQs &&
        rookQs.type === "r" &&
        rookQs.color === color &&
        !rookQs.moved
      ) {
        if (!board[r][1] && !board[r][2] && !board[r][3])
          moves.push({ from: [r, c], to: [r, 2], castle: "Q" });
      }
    }
  }
  return moves;
}
function doMove(board, move) {
  const nb = cloneBoard(board);
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
  const piece = nb[fr][fc];
  nb[fr][fc] = null;

  if (move.enPassant) {
    const [cr, cc] = move.enPassant;
    nb[cr][cc] = null;
  }

  let castleSide = null;
  if (move.castle) {
    castleSide = move.castle;
  } else if (
    piece &&
    piece.type === "k" &&
    fr === tr &&
    Math.abs(tc - fc) === 2
  ) {
    castleSide = tc > fc ? "K" : "Q";
  }

  if (castleSide) {
    const rookFromCol = castleSide === "K" ? 7 : 0;
    const rookToCol = castleSide === "K" ? 5 : 3;
    const rook = nb[tr][rookFromCol];
    if (rook && rook.type === "r") {
      nb[tr][rookFromCol] = null;
      nb[tr][rookToCol] = { ...rook, moved: true };
    }
  }

  const newPiece = { ...piece, moved: true };
  if (move.promotion && move.promotionTo) newPiece.type = move.promotionTo;
  else if (move.promotion) newPiece.type = "q";
  nb[tr][tc] = newPiece;

  let newEnPassant = null;
  if (move.doubleStep && piece.type === "p") {
    newEnPassant = move.enPassantTarget || null;
  }

  return { board: nb, enPassant: newEnPassant };
}

function isLegalMove(board, move, turn) {
  if (move.castle) {
    const [kr, kc] = move.from;
    const enemy = opposite(turn);
    if (isSquareAttacked(board, kr, kc, enemy)) return false;
    const midCol = move.castle === "K" ? 5 : 3;
    if (isSquareAttacked(board, kr, midCol, enemy)) return false;
  }
  const { board: nb } = doMove(board, move);
  const kp = findKing(nb, turn);
  if (!kp) return false;
  return !isSquareAttacked(nb, kp[0], kp[1], opposite(turn));
}
function allLegalMoves(board, side, enPassantTarget) {
  const moves = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p.color !== side) continue;
      const pseudo = pseudoLegalMoves(board, r, c, enPassantTarget);
      for (const m of pseudo) if (isLegalMove(board, m, side)) moves.push(m);
    }
  return moves;
}

function fenFromBoard(board, side, enPassant) {
  const rows = [];
  for (let r = 0; r < 8; r++) {
    let row = "",
      empty = 0;
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) {
        empty++;
        continue;
      }
      if (empty) {
        row += empty;
        empty = 0;
      }
      row += p.color === "w" ? p.type.toUpperCase() : p.type.toLowerCase();
    }
    if (empty) row += empty;
    rows.push(row);
  }
  const pieces = rows.join("/");
  const wk = board[7][4],
    wrA = board[7][0],
    wrH = board[7][7];
  const bk = board[0][4],
    brA = board[0][0],
    brH = board[0][7];
  let cast = "";
  if (wk && wk.color === "w" && !wk.moved) {
    if (wrH && !wrH.moved) cast += "K";
    if (wrA && !wrA.moved) cast += "Q";
  }
  if (bk && bk.color === "b" && !bk.moved) {
    if (brH && !brH.moved) cast += "k";
    if (brA && !brA.moved) cast += "q";
  }
  if (!cast) cast = "-";
  const ep = enPassant ? rcToAlg(enPassant[0], enPassant[1]) : "-";
  return `${pieces} ${side} ${cast} ${ep} 0 1`;
}
function fenPiecesSide(board, side) {
  const rows = [];
  for (let r = 0; r < 8; r++) {
    let row = "",
      empty = 0;
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) {
        empty++;
        continue;
      }
      if (empty) {
        row += empty;
        empty = 0;
      }
      row += p.color === "w" ? p.type.toUpperCase() : p.type.toLowerCase();
    }
    if (empty) row += empty;
    rows.push(row);
  }
  return `${rows.join("/")} ${side}`;
}

const BOOK = new Map([
  [
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w",
    ["e2e4", "d2d4", "c2c4", "g1f3", "b1c3"],
  ],
  [
    "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b",
    ["e7e5", "c7c5", "e7e6", "c7c6", "g8f6"],
  ],
  [
    "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b",
    ["d7d5", "g8f6", "e7e6", "c7c5", "c7c6", "g7g6"],
  ],
  [
    "rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b",
    ["e7e5", "c7c5", "g8f6", "e7e6", "g7g6"],
  ],
  [
    "rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b",
    ["d7d5", "g8f6", "c7c5", "e7e6"],
  ],
  [
    "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w",
    ["g1f3", "b1c3", "f1c4", "f1b5"],
  ],
  [
    "rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w",
    ["c2c4", "g1f3", "g2g3"],
  ],
]);

function bookMoveFor(board, side) {
  const key = fenPiecesSide(board, side);
  const list = BOOK.get(key);
  if (!list || !list.length) return null;
  const uci = list[Math.floor(Math.random() * list.length)];
  const from = algToRC(uci.slice(0, 2));
  const to = algToRC(uci.slice(2, 4));
  const promotion = uci[4] ? uci[4].toLowerCase() : undefined;
  const mv = { from, to };
  if (promotion) {
    mv.promotion = true;
    mv.promotionTo = promotion;
  }
  return mv;
}

function createWorkerInstance() {
  try {
    const base =
      (typeof import.meta !== "undefined" &&
        import.meta.env &&
        import.meta.env.BASE_URL) ||
      (typeof process !== "undefined" &&
        process.env &&
        process.env.PUBLIC_URL) ||
      "";
    const url = `${String(base || "").replace(
      /\/$/,
      ""
    )}/workers/stockfishWorker.js`;
    const w = new Worker(url);
    w.postMessage({ type: "INIT" });
    return w;
  } catch (e) {
    console.error("Failed to init Stockfish worker:", e);
    return null;
  }
}
export default function ChessConsole({
  onClose,
  aiLevel = 3,
  aiPlays = "b",
  aiVariety = true,
}) {
  const [board, setBoard] = useState(() => initialBoard());
  const [turn, setTurn] = useState("w");
  const [selected, setSelected] = useState(null);
  const [legalTargets, setLegalTargets] = useState([]);
  const [enPassantTarget, setEnPassantTarget] = useState(null);
  const [history, setHistory] = useState([]);
  const [flip, setFlip] = useState(false);
  const [status, setStatus] = useState("ongoing");
  const [showPromo, setShowPromo] = useState(null);
  const [movesSAN, setMovesSAN] = useState([]);
  const [aiThinking, setAiThinking] = useState(false);
  const [lastMoveRC, setLastMoveRC] = useState(null);
  const [endInfo, setEndInfo] = useState(null);
  const [timerMin, setTimerMin] = useState(5);
  const [wMs, setWMs] = useState(timerMin * 60000);
  const [bMs, setBMs] = useState(timerMin * 60000);

  const workerRef = useRef(null);
  const pendingSearchRef = useRef(null);
  const chessRef = useRef(new Chess());

  useEffect(() => {
    const worker = createWorkerInstance();
    workerRef.current = worker;
    if (worker) {
      worker.onmessage = (ev) => {
        const msg = ev.data ?? ev;
        if (!msg) return;
        if (
          msg.type === "READY" ||
          msg.type === "ENGINE_MSG" ||
          msg.type === "ERROR"
        ) {
          if (msg.type === "ERROR") console.error(msg.message);
          return;
        }
        if (msg.type === "BESTMOVE") {
          const { id, bestmove } = msg;
          if (!pendingSearchRef.current || pendingSearchRef.current.id !== id)
            return;
          clearTimeout(pendingSearchRef.current.timeout);
          pendingSearchRef.current.resolve(bestmove);
          pendingSearchRef.current = null;
        }
      };
    }
    return () => {
      if (pendingSearchRef.current) {
        try {
          workerRef.current?.postMessage({
            type: "CANCEL",
            id: pendingSearchRef.current.id,
          });
        } catch {}
        clearTimeout(pendingSearchRef.current.timeout);
        pendingSearchRef.current = null;
      }
      try {
        workerRef.current?.terminate();
      } catch {}
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (status !== "ongoing") return;
    const id = setInterval(() => {
      if (turn === "w") setWMs((v) => Math.max(0, v - 100));
      else setBMs((v) => Math.max(0, v - 100));
    }, 100);
    return () => clearInterval(id);
  }, [turn, status]);

  useEffect(() => {
    if (status !== "ongoing") return;
    if (wMs <= 0) {
      setStatus("timeout-white");
      setEndInfo({ reason: "timeout", msg: "Game ended — Black won on time" });
    }
    if (bMs <= 0) {
      setStatus("timeout-black");
      setEndInfo({ reason: "timeout", msg: "Game ended — White won on time" });
    }
  }, [wMs, bMs, status]);

  const fmt = (ms) => {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const searchBestMoveWithWorker = useCallback(({ fen, timeMs = 1200 }) => {
    return new Promise((resolve) => {
      const worker = workerRef.current;
      if (!worker) {
        resolve(null);
        return;
      }

      if (pendingSearchRef.current) {
        try {
          worker.postMessage({
            type: "CANCEL",
            id: pendingSearchRef.current.id,
          });
        } catch {}
        clearTimeout(pendingSearchRef.current.timeout);
        pendingSearchRef.current = null;
      }

      const id = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const timeout = setTimeout(() => {
        try {
          worker.postMessage({ type: "CANCEL", id });
        } catch {}
        if (pendingSearchRef.current && pendingSearchRef.current.id === id)
          pendingSearchRef.current = null;
        resolve(null);
      }, timeMs + 1000);

      pendingSearchRef.current = { id, timeout, resolve };
      try {
        worker.postMessage({ type: "SEARCH", id, payload: { fen, timeMs } });
      } catch (err) {
        clearTimeout(timeout);
        pendingSearchRef.current = null;
        console.error("Worker SEARCH failed:", err);
        resolve(null);
      }
    });
  }, []);

  const normalizeWorkerMove = useCallback((best) => {
    if (!best) return null;
    const uci = String(best).trim();
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(uci)) return null;
    const from = algToRC(uci.slice(0, 2));
    const to = algToRC(uci.slice(2, 4));
    const promotion = uci[4] ? uci[4].toLowerCase() : undefined;
    const mv = { from, to };
    if (promotion) {
      mv.promotion = true;
      mv.promotionTo = promotion;
    }
    return mv;
  }, []);

  const pickHeuristicMove = useCallback(
    (legal, side) => {
      const MAT = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
      const scored = legal
        .map((m) => {
          const { board: nb } = doMove(board, m);
          let s = 0;
          for (let rr = 0; rr < 8; rr++)
            for (let cc = 0; cc < 8; cc++) {
              const p = nb[rr][cc];
              if (!p) continue;
              s += (p.color === "w" ? 1 : -1) * (MAT[p.type] || 0);
            }
          return { m, s: side === "w" ? s : -s };
        })
        .sort((a, b) => b.s - a.s);
      const topK = scored.slice(0, Math.min(3, scored.length));
      return topK[Math.floor(Math.random() * topK.length)]?.m || legal[0];
    },
    [board]
  );

  useEffect(() => {
    let canceled = false;
    const run = async () => {
      if (!aiPlays || status !== "ongoing") return;
      if (turn !== aiPlays) return;

      const legal = allLegalMoves(board, aiPlays, enPassantTarget);
      if (!legal.length) return;

      setAiThinking(true);
      await new Promise((r) => setTimeout(r, 100 + Math.random() * 220));
      if (canceled) return;

      const bookMaxPly = 10;
      const plyCount = movesSAN.length;
      if (aiVariety && plyCount < bookMaxPly) {
        const mv = bookMoveFor(board, aiPlays);
        if (mv) {
          applyMoveObj(mv);
          setAiThinking(false);
          return;
        }
      }

      const base = 800 + (aiLevel || 3) * 350;
      const timeMs = Math.max(250, base * (0.7 + Math.random() * 0.6));

      const epsilon = aiVariety ? Math.max(0.18 - plyCount * 0.01, 0.06) : 0;
      if (Math.random() < epsilon) {
        const mv = pickHeuristicMove(legal, aiPlays);
        setAiThinking(false);
        return;
      }

      const fen = fenFromBoard(board, aiPlays, enPassantTarget);
      const bestRaw = await searchBestMoveWithWorker({ fen, timeMs });
      if (canceled) return;

      let best = normalizeWorkerMove(bestRaw);
      if (!best) {
        let bestScore = -Infinity,
          bestMove = null;
        const MAT = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
        for (const m of legal) {
          const { board: nb } = doMove(board, m);
          let s = 0;
          for (let rr = 0; rr < 8; rr++)
            for (let cc = 0; cc < 8; cc++) {
              const p = nb[rr][cc];
              if (!p) continue;
              s += (p.color === "w" ? 1 : -1) * (MAT[p.type] || 0);
            }
          const sc = aiPlays === "w" ? s : -s;
          if (sc > bestScore) {
            bestScore = sc;
            bestMove = m;
          }
        }
        best = bestMove || legal[Math.floor(Math.random() * legal.length)];
      }
      applyMoveObj(best);
      setAiThinking(false);
    };
    run();
    return () => {
      canceled = true;
    };
  }, [
    aiPlays,
    aiVariety,
    board,
    enPassantTarget,
    status,
    turn,
    normalizeWorkerMove,
    searchBestMoveWithWorker,
    movesSAN.length,
    pickHeuristicMove,
  ]);
  const squares = useMemo(() => {
    const arr = [];
    if (!flip) {
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) arr.push([r, c]);
    } else {
      for (let r = 7; r >= 0; r--)
        for (let c = 7; c >= 0; c--) arr.push([r, c]);
    }
    return arr;
  }, [flip]);

  const computeLegalTargets = useCallback(
    (r, c) => {
      const p = board[r][c];
      if (!p || p.color !== turn) return [];
      const pseudo = pseudoLegalMoves(board, r, c, enPassantTarget);
      const legal = [];
      for (const m of pseudo) if (isLegalMove(board, m, turn)) legal.push(m.to);
      return legal.map(([rr, cc]) => `${rr},${cc}`);
    },
    [board, enPassantTarget, turn]
  );

  const applyMoveObj = useCallback(
    (moveObj) => {
      const prev = {
        board: cloneBoard(board),
        turn,
        enPassant: enPassantTarget,
      };
      const { board: nb, enPassant } = doMove(board, moveObj);

      setHistory((h) => [...h, prev]);
      setBoard(nb);
      setEnPassantTarget(enPassant || null);

      const next = opposite(turn);
      setTurn(next);
      setSelected(null);
      setLegalTargets([]);
      setLastMoveRC({ from: moveObj.from, to: moveObj.to });

      const fromAlg = rcToAlg(moveObj.from[0], moveObj.from[1]);
      const toAlg = rcToAlg(moveObj.to[0], moveObj.to[1]);
      let promotionChar = moveObj.promotionTo
        ? moveObj.promotionTo.toLowerCase()
        : undefined;
      try {
        const res = chessRef.current.move({
          from: fromAlg,
          to: toAlg,
          promotion: promotionChar,
        });
        setMovesSAN((m) => [
          ...m,
          res?.san ||
            `${fromAlg}-${toAlg}${
              promotionChar ? "=" + promotionChar.toUpperCase() : ""
            }`,
        ]);
      } catch {
        setMovesSAN((m) => [
          ...m,
          `${fromAlg}-${toAlg}${
            promotionChar ? "=" + promotionChar.toUpperCase() : ""
          }`,
        ]);
      }

      const oppMoves = allLegalMoves(nb, next, enPassant);
      const kp = findKing(nb, next);
      const inChk = kp
        ? isSquareAttacked(nb, kp[0], kp[1], opposite(next))
        : false;

      if (oppMoves.length === 0) {
        if (inChk) {
          setStatus("checkmate");
          const winner = next === "w" ? "Black" : "White";
          setEndInfo({
            reason: "checkmate",
            msg: "Game ended — ${winner} won by checkmate",
          });
        } else {
          setStatus("stalemate");
          setEndInfo({
            reason: "stalemate",
            msg: "Game ended — Draw by stalemate",
          });
        }
      } else {
        setStatus("ongoing");
      }
    },
    [board, turn, enPassantTarget]
  );

  const onSquareClick = useCallback(
    (r, c) => {
      const cell = board[r][c];
      if (cell && cell.color === turn) {
        setSelected([r, c]);
        setLegalTargets(computeLegalTargets(r, c));
        return;
      }
      if (selected) {
        const key = `${r},${c}`;
        if (legalTargets.includes(key)) {
          const [sr, sc] = selected;
          const pseudos = pseudoLegalMoves(board, sr, sc, enPassantTarget);
          const chosen = pseudos.find(
            (m) => m.to[0] === r && m.to[1] === c && isLegalMove(board, m, turn)
          );
          if (chosen) {
            if (chosen.promotion) {
              setShowPromo({ moveObj: chosen });
              setSelected(null);
              setLegalTargets([]);
              return;
            }
            applyMoveObj(chosen);
            return;
          }
        }
      }
      setSelected(null);
      setLegalTargets([]);
    },
    [
      board,
      selected,
      legalTargets,
      computeLegalTargets,
      enPassantTarget,
      turn,
      applyMoveObj,
    ]
  );

  const applyPromotion = (pieceType) => {
    if (!showPromo) return;
    const mv = { ...showPromo.moveObj, promotionTo: pieceType };
    applyMoveObj(mv);
    setShowPromo(null);
  };

  const undo = useCallback(() => {
    if (!history.length) return;
    const last = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setBoard(last.board);
    setTurn(last.turn);
    setEnPassantTarget(last.enPassant);
    setSelected(null);
    setLegalTargets([]);
    setStatus("ongoing");
    setLastMoveRC(null);
    try {
      const newSAN = movesSAN.slice(0, -1);
      chessRef.current.reset();
      for (const s of newSAN) {
        const ok = chessRef.current.move(s);
        if (!ok) break;
      }
      setMovesSAN(newSAN);
    } catch {}
  }, [history, movesSAN]);

  const newGame = useCallback(() => {
    setBoard(initialBoard());
    setTurn("w");
    setHistory([]);
    setEnPassantTarget(null);
    setSelected(null);
    setLegalTargets([]);
    setFlip(false);
    setMovesSAN([]);
    setStatus("ongoing");
    setShowPromo(null);
    setLastMoveRC(null);
    setEndInfo(null);
    chessRef.current.reset();

    const ms = Math.max(1, Number(timerMin) || 5) * 60000;
    setWMs(ms);
    setBMs(ms);
    if (pendingSearchRef.current) {
      try {
        workerRef.current?.postMessage({
          type: "CANCEL",
          id: pendingSearchRef.current.id,
        });
      } catch {}
      clearTimeout(pendingSearchRef.current.timeout);
      pendingSearchRef.current = null;
    }
  }, [timerMin]);

  const statusUpper = status.toUpperCase();
  const statusColor =
    statusUpper === "CHECKMATE"
      ? "var(--crt-green, #00ff41)"
      : statusUpper === "STALEMATE"
      ? "#ffd27a"
      : statusUpper.startsWith("TIMEOUT")
      ? "#ff6f6f"
      : undefined;

  const renderSquare = (r, c) => {
    const piece = board[r][c];
    const pieceChar = piece ? UNICODE[piece.color][piece.type] : null;
    const selectedKey = selected ? `${selected[0]},${selected[1]}` : null;
    const sqKey = `${r},${c}`;
    const isSelected = selectedKey === sqKey;
    const isLegal = legalTargets.includes(sqKey);
    const dark = (r + c) % 2 === 1;
    const bg = dark ? "rgba(0,20,6,0.85)" : "rgba(0,36,16,0.96)";
    const isLastFrom =
      lastMoveRC && lastMoveRC.from[0] === r && lastMoveRC.from[1] === c;
    const isLastTo =
      lastMoveRC && lastMoveRC.to[0] === r && lastMoveRC.to[1] === c;
    const isCheck =
      piece &&
      piece.type === "k" &&
      isSquareAttacked(board, r, c, opposite(piece.color));
    const isWhitePiece = piece && piece.color === "w";
    const glyphColor = isWhitePiece ? "#caffde" : "#ffd27a";
    const glow = isWhitePiece
      ? "rgba(80,255,160,0.35)"
      : "rgba(255,180,80,0.35)";

    return (
      <SquareDiv
        key={sqKey}
        clickable={(piece && piece.color === turn) || (selected && isLegal)}
        onClick={() => onSquareClick(r, c)}
        style={{ background: bg }}
        role="gridcell"
        aria-label={`${rcToAlg(r, c)} ${piece ? piece.type : ""}`}
      >
        {pieceChar && (
          <div
            style={{
              pointerEvents: "none",
              color: glyphColor,
              textShadow: `0 0 6px ${glow}, 0 0 12px ${glow}`,
              transform: "translateY(-1px)",
              lineHeight: 1,
              fontSize: "clamp(20px, 4.5vw, 36px)",
            }}
          >
            {pieceChar}
          </div>
        )}
        {isSelected && <Highlight type="selected" />}
        {!isSelected && isLegal && <Highlight type="legal" />}
        {isCheck && <Highlight type="check" />}
        {(isLastFrom || isLastTo) && <Outline />}
        <div
          style={{
            position: "absolute",
            left: 6,
            bottom: 6,
            fontSize: 10,
            color: "rgba(0,255,65,0.10)",
          }}
        >
          {String.fromCharCode(97 + c)}
          {8 - r}
        </div>
      </SquareDiv>
    );
  };

  return (
    <Wrapper>
      <Topbar>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ fontWeight: 800 }}>AI CHESS CONSOLE</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ fontSize: 13, opacity: 0.9 }}>
              {aiPlays === "b"
                ? "Computer (Black)"
                : aiPlays === "w"
                ? "Computer (White)"
                : "Human"}
            </div>
          </div>
        </div>

        <Controls>
          <div
            className="mr-5 border border-red-400 rounded-sm px-1"
            style={{
              fontSize: 13,
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <span style={{ color: turn === "w" ? "#ff0000" : "#7dffd1" }}>
              W {fmt(wMs)}
            </span>
            <span>•</span>
            <span style={{ color: turn === "b" ? "#ff0000" : "#ffd27a" }}>
              {fmt(bMs)} B
            </span>
          </div>
          <div
            className="mr-6"
            style={{ display: "flex", gap: 8, alignItems: "center" }}
          >
            <div
              className="animate-pulse"
              style={{ fontSize: 13, opacity: 0.9, color: statusColor }}
            >
              {statusUpper}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              className=" focus:outline-[#00ff41]"
              type="number"
              min="1"
              max="180"
              value={timerMin}
              onChange={(e) =>
                setTimerMin(Math.max(1, Number(e.target.value) || 1))
              }
              style={{
                width: 64,
                background: "transparent",
                border: "1px solid rgba(0,255,65,0.12)",
                borderRadius: 6,
                color: "var(--crt-green)",
                padding: "5px 8px",
                fontFamily: "inherit",
                fontSize: 13,
              }}
              title="Minutes per side"
            />
            <Btn
              onClick={() => {
                const ms = Math.max(1, Number(timerMin) || 1) * 60000;
                setWMs(ms);
                setBMs(ms);
              }}
            >
              SET TIMER
            </Btn>

            <Btn onClick={undo} disabled={!history.length}>
              UNDO
            </Btn>
            <Btn onClick={newGame}>NEW GAME</Btn>
            <Btn onClick={() => setFlip((f) => !f)}>FLIP</Btn>
            <Btn onClick={() => onClose && onClose()}>CLOSE</Btn>
          </div>
        </Controls>
      </Topbar>

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <BoardWrap>
          <Grid role="grid" aria-label="Chess board">
            {squares.map(([r, c]) => renderSquare(r, c))}
          </Grid>
        </BoardWrap>

        <Panel>
          <div style={{ marginTop: 6 }}>
            <strong style={{ color: "rgba(0,255,65,0.95)" }}>
              {turn === "w" ? "White" : "Black"} to move{" "}
              {status === "checkmate"
                ? "• CHECKMATE"
                : status === "stalemate"
                ? "• STALEMATE"
                : ""}
            </strong>

            <div className="grid grid-cols-2 gap-2 justify-between">
              <div
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  marginBottom: 8,
                  color: "rgba(0,255,65,0.9)",
                }}
              >
                Move log (SAN)
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <Btn
                  onClick={() => {
                    const chunks = [];
                    for (let i = 0; i < movesSAN.length; i += 2) {
                      const moveNo = i / 2 + 1;
                      const w = movesSAN[i] || "";
                      const b = movesSAN[i + 1] || "";
                      chunks.push(`${moveNo}. ${w}${b ? " " + b : ""}`);
                    }
                    navigator.clipboard
                      ?.writeText(chunks.join(" "))
                      .catch(() => {});
                  }}
                >
                  Copy SAN
                </Btn>
              </div>
            </div>
            <div style={{ fontSize: 12, color: "rgba(0,255,65,0.8)" }}>
              {aiThinking ? "AI thinking..." : ""}
            </div>

            <MovesList>
              {movesSAN.length === 0 ? (
                <div style={{ opacity: 0.7 }}>No moves yet.</div>
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  {Array.from(
                    { length: Math.ceil(movesSAN.length / 2) },
                    (_, i) => (
                      <div
                        key={i}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "24px 1fr 1fr",
                          gap: 6,
                        }}
                      >
                        <div
                          style={{
                            textAlign: "right",
                            fontSize: 12,
                            color: "rgba(0,255,65,0.7)",
                          }}
                        >
                          {i + 1}.
                        </div>
                        <div style={{ fontSize: 13 }}>
                          {movesSAN[i * 2] || ""}
                        </div>
                        <div style={{ fontSize: 13 }}>
                          {movesSAN[i * 2 + 1] || ""}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </MovesList>
          </div>
        </Panel>
      </div>

      {showPromo && (
        <PromoModal role="dialog" aria-modal>
          <div
            style={{
              fontSize: 13,
              color: "rgba(0,255,65,0.9)",
              marginRight: 8,
            }}
          >
            Promote to:
          </div>
          {["q", "r", "b", "n"].map((t) => (
            <Btn
              key={t}
              onClick={() => applyPromotion(t)}
              aria-label={`Promote to ${t}`}
            >
              {UNICODE[turn][t]} {t.toUpperCase()}
            </Btn>
          ))}
          <Btn onClick={() => applyPromotion("q")}>Auto Q</Btn>
        </PromoModal>
      )}

      {endInfo && (
        <EndModal role="dialog" aria-modal>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: "#ffff00",
            }}
          >
            {endInfo.msg}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={newGame}>NEW GAME</Btn>
            <Btn onClick={() => onClose && onClose()}>CLOSE</Btn>
          </div>
        </EndModal>
      )}
    </Wrapper>
  );
}
