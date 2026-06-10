import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./styles/index.css";
import Home from "./pages/Home";
import Org from "./pages/Org";
import Capitao from "./pages/Capitao";
import Telao from "./pages/Telao";

const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/org" element={<Org />} />
        <Route path="/capitao" element={<Capitao />} />
        <Route path="/telao" element={<Telao />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
