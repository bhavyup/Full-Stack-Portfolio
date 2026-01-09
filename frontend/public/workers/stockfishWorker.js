/* eslint-disable no-restricted-globals */
// public/workers/stockfishWorker.js
// Tries threaded WASM when SharedArrayBuffer exists; otherwise falls back to a nested worker
// that runs /workers/stockfish.js (single-thread). API:
// - INIT
// - SEARCH { id, payload: { fen, timeMs, moveTimeMs? } }
// - CANCEL { id }
// Posts:
// - READY once an engine is ready
// - BESTMOVE { id, bestmove, raw }
// - ENGINE_MSG { text } for logs (optional)
// - ERROR { message, id? } only if a SEARCH can't be served

let engine = null;          // factory-based engine (Stockfish()) or proxy to nested worker
let engineWorker = null;    // nested worker if using stockfish.js worker build
let ready = false;
let pendingSearch = null;

// Optional: forward engine logs for debugging (comment out to silence)
function log(msg) {
  // postMessage({ type: "ENGINE_MSG", text: msg });
}

function setupEngine(inst) {
  engine = inst;
  ready = true;

  // Both factory engines and nested worker proxies will deliver strings like "info ..." or "bestmove ..."
  engine.onmessage = (ev) => {
    const text = typeof ev === "string" ? ev : ev?.data || "";
    if (!text) return;
    log(text);
    if (text.startsWith("bestmove")) {
      const best = text.split(/\s+/)[1];
      const id = pendingSearch?.id || null;
      postMessage({ type: "BESTMOVE", id, bestmove: best, raw: text });
      pendingSearch = null;
    }
  };

  try {
    engine.postMessage && engine.postMessage("uci");
  } catch {
    if (typeof engine === "function") engine("uci");
  }

  postMessage({ type: "READY" });
}

function tryInstantiateFactory() {
  try {
    if (typeof self.Stockfish === "function") {
      const maybe = self.Stockfish();
      if (maybe && typeof maybe.then === "function") {
        maybe.then(setupEngine).catch(() => {});
      } else {
        setupEngine(maybe);
      }
      return true;
    }
    if (typeof self.createStockfish === "function") {
      setupEngine(self.createStockfish());
      return true;
    }
    if (self.Module && typeof self.Module.Stockfish === "function") {
      setupEngine(self.Module.Stockfish());
      return true;
    }
    if (typeof self.createModule === "function") {
      self.createModule().then((mod) => {
        if (typeof mod.Stockfish === "function") setupEngine(mod.Stockfish());
      }).catch(() => {});
      return true;
    }
  } catch (e) {
    // swallow here; we only ERROR on SEARCH if still not ready
  }
  return false;
}

// Create a nested worker that runs /workers/stockfish.js directly
function tryInstantiateNestedWorker() {
  try {
    if (engineWorker) {
      try { engineWorker.terminate(); } catch {}
      engineWorker = null;
    }
    engineWorker = new Worker("/workers/stockfish.js");

    // Proxy wrapper so we look like the factory engine to the rest of the code
    const proxy = {
      postMessage: (msg) => engineWorker.postMessage(msg),
      onmessage: null,
    };

    engineWorker.onmessage = (e) => {
      // Forward to proxy.onmessage in the same shape as the factory engine would
      const text = typeof e.data === "string" ? e.data : (e?.data?.data || e?.data || "");
      if (proxy.onmessage) proxy.onmessage(text);
    };

    setupEngine(proxy);
    return true;
  } catch (e) {
    return false;
  }
}

function importEngineScripts() {
  const hasSAB = typeof SharedArrayBuffer !== "undefined";

  try {
    if (hasSAB) {
      // Threaded WASM path — fix locateFile (was using a literal in your code)
      self.Module = self.Module || {};
      self.Module.locateFile = (path) => `/workers/${path}`;
      importScripts("/workers/stockfish.wasm.js");
      log("loaded threaded wasm glue");
    } else {
      // We won't importScripts('/workers/stockfish.js') here because most single-thread builds
      // are worker scripts. We'll prefer nested worker instantiation below.
      log("skipping glue import (no SAB)");
    }
  } catch (e) {
    // If threaded import failed, we'll fall back to nested worker
    log("threaded import failed: " + String(e));
  }
}

function ensureEngine() {
  if (ready) return true;

  // Try to load the glue or decide on fallback
  importEngineScripts();

  // 1) Try factory instantiation (threaded or non-threaded factory builds)
  if (tryInstantiateFactory()) return true;

  // 2) Fallback to nested worker (single-thread worker build)
  if (tryInstantiateNestedWorker()) return true;

  // 3) Give factory one more tick (some builds set globals async)
  setTimeout(() => { if (!ready) tryInstantiateFactory(); }, 0);
  return ready;
}

function cancelPending(id) {
  if (!pendingSearch) return;
  try { engine?.postMessage?.("stop"); } catch {}
  if (!id || pendingSearch.id === id) pendingSearch = null;
}

self.onmessage = (ev) => {
  const msg = ev.data || {};
  if (!msg.type) return;

  if (msg.type === "INIT") {
    ensureEngine(); // no ERROR on INIT
    return;
  }

  if (msg.type === "CANCEL") {
    cancelPending(msg.id);
    return;
  }

  if (msg.type === "SEARCH") {
    const { id, payload } = msg;
    if (!payload) {
      postMessage({ type: "ERROR", message: "SEARCH missing payload", id });
      return;
    }

    // Make sure an engine is ready; try now if not
    if (!ready) ensureEngine();
    if (!ready) {
      postMessage({ type: "ERROR", message: "Engine not initialized", id });
      return;
    }

    // Abort previous search
    cancelPending();

    const { fen, timeMs = 1000, moveTimeMs } = payload;
    pendingSearch = { id, startedAt: Date.now() };

    try {
      if (!fen || fen === "startpos") engine.postMessage("position startpos");
      else engine.postMessage("position fen " + fen);

      const go = moveTimeMs
        ? `go movetime ${moveTimeMs}`
        : `go movetime ${Math.max(40, Math.min(8000, timeMs))}`;
      engine.postMessage(go);
    } catch (e) {
      try {
        if (typeof engine === "function") {
          if (!fen || fen === "startpos") engine("position startpos");
          else engine("position fen " + fen);
          const go = moveTimeMs
            ? `go movetime ${moveTimeMs}`
            : `go movetime ${Math.max(40, Math.min(8000, timeMs))}`;
          engine(go);
        } else {
          throw e;
        }
      } catch (ee) {
        postMessage({ type: "ERROR", message: "Failed to send go command: " + String(ee), id });
        pendingSearch = null;
        return;
      }
    }

    // Hard stop guard
    const cap = Math.max(timeMs + 1000, 4000);
    setTimeout(() => {
      if (pendingSearch && pendingSearch.id === id) {
        try { engine.postMessage("stop"); } catch {}
      }
    }, cap);
  }
};