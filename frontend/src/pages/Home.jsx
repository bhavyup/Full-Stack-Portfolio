import React, { useState, createContext } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import LoaderScreen from "../components/Loader";
import KeepAliveView from "@/pages/KeepALive";

// Your KeepAliveView component is NOT imported or used here.
// It remains inside your Portfolio.jsx, which is rendered by the <Outlet />.

export const LoaderContext = createContext({ isLoaded: false });

const RootLayout = () => {
  const [isLoading, setIsLoading] = useState(
    !sessionStorage.getItem("hasSeenLoader")
  );

  const loaderContextValue = { isLoaded: !isLoading };

  const [canPreload, setCanPreload] = useState(!isLoading);

  const handleLoaderFinished = () => {
    sessionStorage.setItem("hasSeenLoader", "true");
    setIsLoading(false);
  };

  return (
    <LoaderContext.Provider value={loaderContextValue}>
      {canPreload && (
        <motion.div
          animate={{ opacity: isLoading ? 0 : 1 }}
          transition={{ duration: 0.03 }}
          style={{ pointerEvents: isLoading ? "none" : "auto" }}
        >
          <Outlet />
        </motion.div>
      )}

      {/* The LoaderScreen is rendered on top only when isLoading is true.
        AnimatePresence handles its graceful removal from the DOM.
      */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            key="loader"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.03 }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              zIndex: 9999, // Ensure it's on top of everything
            }}
          >
            <LoaderScreen
              onFinished={handleLoaderFinished}
              onReadyToPreload={() => setCanPreload(true)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </LoaderContext.Provider>
  );
};

export default RootLayout;
