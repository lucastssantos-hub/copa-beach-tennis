// ============================================================================
// captainApp — App independente do Capitão (dispositivo do capitão).
// Sem seletor de perfil: o capitão NÃO acessa a Organização/Mesário.
// Abre com a seleção de equipe; depois só vê suas funções.
// Compartilha o mesmo estado de torneio (useTournament) — uma escalação enviada
// aqui aparece na Organização (sync por localStorage; backend = Fase 2).
// ============================================================================
import { useState } from "react";
import { TEAMS, CATEGORIES, categoryMeta } from "./data.js";
import { useTournament } from "./useTournament.js";
import { Toast, Flag, Eyebrow } from "./components.jsx";
import { CaptainHome } from "./captainHome.jsx";
import { CaptainMatch } from "./captainMatch.jsx";
import { CaptainHistory } from "./standings.jsx";

const ACCENT = "#FF5A4E";
const TEAM_KEY = "copa-captain-team";

export default function CaptainApp() {
  const { matches, dispatch } = useTournament({ manageWarmup: false });
  const [teamCode, setTeamCode] = useState(() => localStorage.getItem(TEAM_KEY) || null);
  const [tab, setTab] = useState("home");
  const [openId, setOpenId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const toast = m => setToastMsg(m);

  const myCategories = teamCode
    ? CATEGORIES.filter(c => matches.some(m => m.category === c.id && (m.a === teamCode || m.b === teamCode)))
    : [];
  const cat = (selectedCategory && myCategories.some(c => c.id === selectedCategory)) ? selectedCategory : myCategories[0]?.id;

  function chooseTeam(code) { setTeamCode(code); localStorage.setItem(TEAM_KEY, code); setSelectedCategory(null); setOpenId(null); setTab("home"); }
  function changeTeam() { localStorage.removeItem(TEAM_KEY); setTeamCode(null); setOpenId(null); }

  const team = teamCode ? TEAMS[teamCode] : null;
  const visible = matches.filter(m => m.category === cat);
  const activeCategory = cat ? categoryMeta(cat) : null;
  const openMatch = matches.find(m => m.id === openId);

  let screen = null;
  if (teamCode) {
    if (openMatch) screen = <CaptainMatch match={openMatch} me={teamCode} onBack={() => setOpenId(null)} dispatch={dispatch} toast={toast} />;
    else if (tab === "home") screen = <CaptainHome matches={visible} category={activeCategory} me={teamCode} onOpenMatch={setOpenId} />;
    else screen = <CaptainHistory matches={visible} category={activeCategory} me={teamCode} />;
  }

  const navItems = [["home", "Início", "◳"], ["hist", "Resultados", "≡"]];

  return (
    <div style={{ minHeight: "100vh", background: "#0E0518", display: "grid", placeItems: "center", fontFamily: "'Archivo', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 440, height: "100dvh", maxHeight: 940, position: "relative",
        background: "radial-gradient(120% 80% at 50% -10%, #2a1257 0%, #1B0B44 42%, #160938 100%)",
        overflow: "hidden", boxShadow: "0 40px 120px -30px rgba(0,0,0,.8)", display: "flex", flexDirection: "column" }}>

        {!teamCode ? (
          <TeamSelect onChoose={chooseTeam} />
        ) : (
          <>
            {/* Identidade do capitão (sem troca de perfil) */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px 0", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, flex: 1, minWidth: 0 }}>
                <Flag code={teamCode} size={26} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: ACCENT, letterSpacing: ".14em" }}>
                    {team.captain ? team.captain.toUpperCase() : "CAPITÃO"}
                  </div>
                  <div style={{ fontFamily: "'Archivo Black',sans-serif", fontSize: 16, color: "#FBF7EE", lineHeight: 1, marginTop: 2,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{team.name}</div>
                </div>
              </div>
              <button onClick={changeTeam} style={{ flexShrink: 0, padding: "8px 11px", borderRadius: 10,
                background: "rgba(242,228,201,.08)", border: "1px solid rgba(242,228,201,.14)", color: "#C9BBA0",
                fontFamily: "'Archivo',sans-serif", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>Trocar equipe</button>
            </div>

            {!openMatch && myCategories.length > 1 && (
              <div style={{ display: "flex", gap: 7, overflowX: "auto", padding: "12px 16px 2px", flexShrink: 0 }}>
                {myCategories.map(c => {
                  const on = cat === c.id;
                  return (
                    <button key={c.id} onClick={() => { setSelectedCategory(c.id); setOpenId(null); }} style={{ flexShrink: 0, minWidth: 52,
                      padding: "8px 12px", borderRadius: 999, border: on ? `1.5px solid ${ACCENT}` : "1px solid rgba(242,228,201,.12)",
                      background: on ? "rgba(255,90,78,.18)" : "rgba(242,228,201,.05)", color: on ? "#FBF7EE" : "#C9BBA0",
                      fontFamily: "'Archivo',sans-serif", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>{c.label}</button>
                  );
                })}
              </div>
            )}

            <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingTop: 6 }} key={tab + cat + (openId || "")}>
              <div style={{ animation: "fadeIn .3s ease" }}>{screen}</div>
            </div>

            {!openMatch && (
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex",
                padding: "10px 24px calc(14px + env(safe-area-inset-bottom))",
                background: "linear-gradient(0deg, #160938 70%, transparent)", gap: 8 }}>
                {navItems.map(([k, l, ic]) => {
                  const on = tab === k;
                  return (
                    <button key={k} onClick={() => setTab(k)} style={{ flex: 1, display: "flex", flexDirection: "column",
                      alignItems: "center", gap: 3, padding: "8px 0", background: "transparent", border: "none", cursor: "pointer" }}>
                      <span style={{ fontSize: 19, color: on ? ACCENT : "#5a4f78" }}>{ic}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: on ? "#FBF7EE" : "#5a4f78" }}>{l}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        <Toast msg={toastMsg} onClose={() => setToastMsg("")} />
      </div>
    </div>
  );
}

// ---------- Seleção de equipe ----------
function TeamSelect({ onChoose }) {
  const teams = Object.values(TEAMS).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "28px 20px 30px" }}>
      <Eyebrow color={ACCENT}>App do Capitão</Eyebrow>
      <div style={{ fontFamily: "'Archivo Black',sans-serif", fontSize: 26, color: "#FBF7EE", lineHeight: 1.05, margin: "8px 0 6px" }}>
        Qual é a sua equipe?
      </div>
      <div style={{ fontSize: 13, color: "#8a7d63", marginBottom: 22, lineHeight: 1.45 }}>
        Selecione a equipe que você capitaneia. Você só verá os seus confrontos, escalações, resultados e classificação.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {teams.map(t => (
          <button key={t.id} onClick={() => onChoose(t.id)} style={{ display: "flex", alignItems: "center", gap: 10,
            padding: "14px 14px", borderRadius: 14, cursor: "pointer", textAlign: "left",
            background: "rgba(242,228,201,.05)", border: "1.5px solid rgba(242,228,201,.1)" }}>
            <span style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>{t.flag}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: "#FBF7EE", lineHeight: 1.2 }}>{t.name}</div>
              {t.captain && <div style={{ fontSize: 11, color: "#8a7d63", marginTop: 2 }}>{t.captain}</div>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
