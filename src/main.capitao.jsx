import React from "react";
import { createRoot } from "react-dom/client";
import CaptainApp from "./captainApp.jsx";
import { ErrorBoundary } from "./components.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <CaptainApp />
    </ErrorBoundary>
  </React.StrictMode>
);
