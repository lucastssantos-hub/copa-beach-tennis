import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./styles/index.css";
import Home from "./pages/Home";
import Org from "./pages/Org";
import Capitao from "./pages/Capitao";
import Telao from "./pages/Telao";
import { ErrorBoundary } from "./lib/ErrorBoundary";

const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename={basename}>
        <Routes>
          <Route path="/" element={<ErrorBoundary><Home /></ErrorBoundary>} />
          <Route path="/org" element={<ErrorBoundary><Org /></ErrorBoundary>} />
          <Route path="/capitao" element={<ErrorBoundary><Capitao /></ErrorBoundary>} />
          <Route path="/telao" element={<ErrorBoundary><Telao /></ErrorBoundary>} />
          <Route path="*" element={<ErrorBoundary><Home /></ErrorBoundary>} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
