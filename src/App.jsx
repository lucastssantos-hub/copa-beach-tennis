// ============ Root App — role switch + routing + shared state ============
import { useEffect, useState } from "react";
import { CATEGORIES, MATCHES, SCHEDULE, categoryMeta } from "./data.js";
import { hasSupabaseConfig, loadRemoteMatches, saveRemoteMatches } from "./supabaseState.js";
import { AppBar, Card, Toast } from "./components.jsx";
import { CaptainHome } from "./captainHome.jsx";
import { CaptainMatch } from "./captainMatch.jsx";
import { CaptainHistory, Classificacao } from "./standings.jsx";
import { ArbDashboard } from "./arbDash.jsx";
import { ArbMatch } from "./arbMatch.jsx";

export default function App() {
  const [role, setRole] = useState("capitao"); // capitao | arbitro
  const [matches, setMatches] = useState(loadMatches);
  const [tab, setTab] = useState("home");
  const [openId, setOpenId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("60+");
  const [toastMsg, setToastMsg] = useState("");
  const [syncReady, setSyncReady] = useState(!hasSupabaseConfig);
  const toast = m => setToastMsg(m);

  useEffect(() => {
    if (!hasSupabaseConfig) return;

    let active = true;
    loadRemoteMatches()
      .then(remoteMatches => {
        if (active && isValidMatchSet(remoteMatches)) setMatches(remoteMatches.map(normalizeMatch));
      })
      .catch(() => {
        if (active) toast("Supabase indisponível. Usando dados locais");
      })
      .finally(() => {
        if (active) setSyncReady(true);
      });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
  }, [matches]);

  useEffect(() => {
    if (!hasSupabaseConfig || !syncReady) return;

    const timer = setTimeout(() => {
      saveRemoteMatches(matches).catch(() => {
        console.warn("Supabase sync skipped");
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [matches, syncReady]);

  // ---- mutations ----
  function updateLineup(matchId, teamCode, payload) {
    setMatches(ms => ms.map(m => {
      if (m.id !== matchId) return m;
      if (teamCode === "__games") return normalizeMatch({ ...m, games: payload });

      const lineups = teamCode === null
        ? payload
        : { ...m.lineups, [teamCode]: payload };
      return normalizeMatch({ ...m, lineups });
    }));
  }
  function setStatus(matchId, status) {
    setMatches(ms => ms.map(m => m.id === matchId ? { ...m, status } : m));
  }
  function resetApp() {
    localStorage.removeItem(STORAGE_KEY);
    setMatches(cloneSeed());
    setOpenId(null);
    setSelectedCategory("60+");
    setTab(role === "capitao" ? "home" : "jogos");
    toast("Dados restaurados");
  }

  const openMatch = matches.find(m => m.id === openId);
  const visibleMatches = matches.filter(m => m.category === selectedCategory);
  const activeCategory = categoryMeta(selectedCategory);

  function switchRole(r) { setRole(r); setOpenId(null); setTab(r === "capitao" ? "home" : "jogos"); }
  function switchCategory(categoryId) {
    setSelectedCategory(categoryId);
    setOpenId(null);
  }

  // ---- screen routing ----
  let screen;
  if (openMatch) {
    screen = role === "capitao"
      ? <CaptainMatch match={openMatch} onBack={() => setOpenId(null)} onUpdate={updateLineup} toast={toast} />
      : <ArbMatch match={openMatch} onBack={() => setOpenId(null)} onUpdate={updateLineup} onSetStatus={setStatus} toast={toast} />;
  } else if (role === "capitao") {
    screen = tab === "home"
      ? <CaptainHome matches={visibleMatches} category={activeCategory} onOpenMatch={setOpenId} />
      : <CaptainHistory matches={visibleMatches} category={activeCategory} />;
  } else {
    screen = tab === "jogos"
      ? <ArbDashboard matches={visibleMatches} category={activeCategory} onOpenMatch={setOpenId} />
      : <ArbClassif matches={visibleMatches} category={activeCategory} />;
  }

  const navItems = role === "capitao"
    ? [["home", "Início", "◳"], ["hist", "Histórico", "≡"]]
    : [["jogos", "Jogos", "◳"], ["classif", "Classificação", "≡"]];

  return (
    <div style={{ minHeight: "100vh", background: "#0E0518", display: "grid", placeItems: "center",
      padding: "0", fontFamily: "'Archivo', sans-serif" }}>
      {/* phone frame */}
      <div style={{ width: "100%", maxWidth: 440, height: "100dvh", maxHeight: 940, position: "relative",
        background: "radial-gradient(120% 80% at 50% -10%, #2a1257 0%, #1B0B44 42%, #160938 100%)",
        overflow: "hidden", boxShadow: "0 40px 120px -30px rgba(0,0,0,.8)",
        display: "flex", flexDirection: "column" }}>

        {/* role switcher */}
        <div style={{ display: "flex", gap: 0, padding: "12px 16px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", background: "rgba(14,5,24,.5)", borderRadius: 12, padding: 4, gap: 4, width: "100%" }}>
            {[["capitao", "Capitão"], ["arbitro", "Arbitragem"]].map(([k, l]) => (
              <button key={k} onClick={() => switchRole(k)} style={{ flex: 1, padding: "9px 0", borderRadius: 9,
                background: role === k ? (k === "capitao" ? "#FF5A4E" : "#6B2FD9") : "transparent",
                color: role === k ? (k === "capitao" ? "#1B0B44" : "#FBF7EE") : "#8a7d63", border: "none",
                cursor: "pointer", fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: 13,
                transition: "all .18s ease" }}>{l}</button>
            ))}
          </div>
        </div>

        {!openMatch && (
          <>
            <CategoryPicker selected={selectedCategory} onSelect={switchCategory} />
            <ScheduleStrip selected={selectedCategory} />
          </>
        )}

        {/* scroll area */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingTop: 4 }} key={role + tab + selectedCategory + (openId || "")}>
          <div style={{ animation: "fadeIn .3s ease" }}>{screen}</div>
        </div>

        {/* bottom nav (hidden in match detail) */}
        {!openMatch && (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex",
            padding: "10px 24px calc(14px + env(safe-area-inset-bottom))",
            background: "linear-gradient(0deg, #160938 70%, transparent)", gap: 8 }}>
            {navItems.map(([k, l, ic]) => {
              const active = tab === k;
              const accent = role === "capitao" ? "#FF5A4E" : "#9B6BFF";
              return (
                <button key={k} onClick={() => setTab(k)} style={{ flex: 1, display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 3, padding: "8px 0", background: "transparent", border: "none", cursor: "pointer" }}>
                  <span style={{ fontSize: 19, color: active ? accent : "#5a4f78" }}>{ic}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: active ? "#FBF7EE" : "#5a4f78" }}>{l}</span>
                </button>
              );
            })}
          </div>
        )}

        <Toast msg={toastMsg} onClose={() => setToastMsg("")} />
      </div>
      <button onClick={resetApp} style={{ position: "fixed", right: 16, bottom: 16,
        background: "rgba(251,247,238,.08)", color: "#C9BBA0", border: "1px solid rgba(242,228,201,.14)",
        borderRadius: 999, padding: "9px 12px", fontFamily: "'Archivo',sans-serif", fontSize: 12,
        fontWeight: 700, cursor: "pointer" }}>
        Reiniciar demo
      </button>
    </div>
  );
}

const STORAGE_KEY = "copa-beach-tennis-state-v2";

function cloneSeed() {
  return JSON.parse(JSON.stringify(MATCHES)).map(normalizeMatch);
}

function loadMatches() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return cloneSeed();
    const parsed = JSON.parse(saved);
    return isValidMatchSet(parsed) ? parsed.map(normalizeMatch) : cloneSeed();
  } catch {
    return cloneSeed();
  }
}

function isValidMatchSet(value) {
  return Array.isArray(value) && value.length > 0 && value.every(m => m.category && m.id);
}

function normalizeMatch(match) {
  const terminal = ["finalizado", "wo", "desistencia"].includes(match.status);
  if (terminal || match.status === "andamento" || match.status === "mista") return match;

  const statuses = Object.values(match.lineups).map(l => l.status);
  if (statuses.every(s => s === "validada")) return { ...match, status: "pronto" };
  if (statuses.some(s => s === "enviada" || s === "validada")) return { ...match, status: "parcial" };
  return { ...match, status: "aguardando" };
}

function CategoryPicker({ selected, onSelect }) {
  return (
    <div style={{ display: "flex", gap: 7, overflowX: "auto", padding: "12px 16px 2px", flexShrink: 0 }}>
      {CATEGORIES.map(c => {
        const active = selected === c.id;
        return (
          <button key={c.id} onClick={() => onSelect(c.id)} style={{ flexShrink: 0, minWidth: 54,
            padding: "9px 12px", borderRadius: 999, border: active ? "1.5px solid #FF5A4E" : "1px solid rgba(242,228,201,.12)",
            background: active ? "rgba(255,90,78,.18)" : "rgba(242,228,201,.05)",
            color: active ? "#FBF7EE" : c.loaded ? "#C9BBA0" : "#6f6387",
            fontFamily: "'Archivo',sans-serif", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

function ScheduleStrip({ selected }) {
  const rows = SCHEDULE.filter(s => s.categories.includes(selected));
  return (
    <div style={{ padding: "7px 16px 2px", flexShrink: 0 }}>
      {rows.map(row => (
        <div key={`${row.day}-${row.time}-${row.categories.join("-")}`} style={{ display: "flex", alignItems: "center", gap: 10,
          padding: "10px 12px", borderRadius: 13, background: "rgba(14,5,24,.42)",
          border: "1px solid rgba(242,228,201,.1)" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", color: "#9B6BFF", fontSize: 10, letterSpacing: ".08em" }}>{row.note}</div>
            <div style={{ color: "#FBF7EE", fontSize: 12.5, fontWeight: 800, marginTop: 2 }}>{row.day} · {row.date}</div>
          </div>
          <div style={{ fontFamily: "'Archivo Black',sans-serif", color: "#FF5A4E", fontSize: 18 }}>{row.time}</div>
        </div>
      ))}
    </div>
  );
}

// Arbitragem classificação screen
function ArbClassif({ matches, category }) {
  const groups = [...new Set(matches.map(m => m.phase))];
  return (
    <div style={{ padding: "0 20px 110px" }}>
      <AppBar subtitle={category.schedule} title={`Classificação ${category.label}`} />
      {groups.map(g => (
        <div key={g} style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ fontFamily: "'Archivo Black',sans-serif", fontSize: 15, color: "#FBF7EE" }}>{g}</span>
            <span style={{ flex: 1, height: 1, background: "rgba(242,228,201,.1)" }} />
          </div>
          <Classificacao matches={matches} group={g} />
        </div>
      ))}
      <Card style={{ background: "rgba(255,176,46,.06)", borderColor: "rgba(255,176,46,.2)" }}>
        <div style={{ fontSize: 12, color: "#C9BBA0", lineHeight: 1.5 }}>
          <span style={{ fontWeight: 700, color: "#FFC766" }}>Critérios de desempate:</span> vitórias no confronto,
          confronto direto, saldo de vitórias de partidas, saldo de sets, saldo de games, game average e sorteio.
        </div>
      </Card>
    </div>
  );
}
