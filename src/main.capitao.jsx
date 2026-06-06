import React from "react";
import { createRoot } from "react-dom/client";
import CaptainApp from "./captainApp.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <CaptainApp />
  </React.StrictMode>
);
