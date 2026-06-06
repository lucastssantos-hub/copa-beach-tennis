// ============================================================================
// App — Organização (ADM + Mesário + Público). App SEPARADO do Capitão.
// (O Capitão usa capitao.html → captainApp.jsx, sem acesso a estas telas.)
// ============================================================================
import { useEffect, useState } from "react";
import { CATEGORIES, SCHEDULE, categoryMeta } from "./data.js";
import { useTournament } from "./useTournament.js";
import { AppBar, Card, Toast, Bell } from "./components.jsx";
import { Classificacao } from "./standings.jsx";
import { RefereeQueue, RefereeMatch } from "./refereeFlow.jsx";
import { CentroOperacoes, AdminDashboard, AdminMatch, NotificationsScreen, AuditScreen } from "./adminOps.jsx";
import { PublicTV } from "./publicTV.jsx";

const ROLES = [
  ["admin", "Organização", "#9B6BFF"],
  ["arbitro", "Mesário", "#4C8DFF"],
  ["publico", "Público", "#5FC97E"],
];
const ROLE_ACCENT = Object.fromEntries(ROLES.map(([k, , c]) => [k, c]));
const DEFAULT_TAB = { admin: "ops", arbitro: "quadras", publico: "tv" };

export default function App() {
  const { matches, notifications, audits, dispatch, reset, setNotifications, courtCount, setCourtCount } = useTournament({ manageWarmup: true });
  const [role, setRole] = useState("admin");
  const [tab, setTab] = useState(DEFAULT_TAB.admin);
  const [openId, setOpenId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("60+");
  const [toastMsg, setToastMsg] = useState("");
  const toast = m => setToastMsg(m);

  // Notificações por perfil
  const audienceMatch = n => n.audience === "all" || n.audience === role;
  const roleNotifications = notifications.filter(audienceMatch);
  const unread = roleNotifications.filter(n => !n.read).length;
  function markRoleNotificationsRead() {
    setNotifications(ns => ns.map(n => (audienceMatch(n) ? { ...n, read: true } : n)));
  }
  useEffect(() => {
    if (role === "admin" && tab === "notif" && unread > 0) markRoleNotificationsRead();
  }, [role, tab, unread]);

  function resetApp() {
    reset();
    setOpenId(null); setSelectedCategory("60+"); setTab(DEFAULT_TAB[role]);
    toast("Dados restaurados");
  }
  function switchRole(r) { setRole(r); setOpenId(null); setTab(DEFAULT_TAB[r]); }
  function switchCategory(c) { setSelectedCategory(c); setOpenId(null); }

  const openMatch = matches.find(m => m.id === openId);
  const visibleMatches = matches.filter(m => m.category === selectedCategory);
  const activeCategory = categoryMeta(selectedCategory);

  // ===================== PÚBLICO (fullscreen) =====================
  if (role === "publico") {
    return (
      <>
        <PublicTV matches={visibleMatches} category={activeCategory} />
        <FloatingRoleSwitcher role={role} onSwitch={switchRole} />
      </>
    );
  }

  // ===================== Roteamento (frame mobile) =====================
  let screen;
  if (openMatch && role === "arbitro") {
    screen = <RefereeMatch match={openMatch} onBack={() => setOpenId(null)} dispatch={dispatch} toast={toast} />;
  } else if (openMatch && role === "admin") {
    screen = <AdminMatch match={openMatch} onBack={() => setOpenId(null)} dispatch={dispatch} toast={toast} courtCount={courtCount} allMatches={matches} />;
  } else if (role === "arbitro") {
    screen = tab === "quadras"
      ? <RefereeQueue matches={visibleMatches} category={activeCategory} onOpenMatch={setOpenId} />
      : <ArbClassif matches={visibleMatches} category={activeCategory} />;
  } else { // admin
    if (tab === "ops") screen = <CentroOperacoes matches={visibleMatches} category={activeCategory} onOpenMatch={setOpenId} dispatch={dispatch} toast={toast} courtCount={courtCount} setCourtCount={setCourtCount} allMatches={matches} />;
    else if (tab === "painel") screen = <AdminDashboard matches={visibleMatches} category={activeCategory} categories={CATEGORIES} courtCount={courtCount} />;
    else if (tab === "notif") screen = <NotificationsScreen notifications={[...roleNotifications].reverse()} onMarkAllRead={markRoleNotificationsRead} />;
    else screen = <AuditScreen audits={audits} />;
  }

  const navItems = {
    admin: [["ops", "Operações", "◳"], ["painel", "Painel", "▦"], ["notif", "Notificações", "◔"], ["audit", "Auditoria", "≡"]],
    arbitro: [["quadras", "Quadras", "◳"], ["classif", "Classificação", "≡"]],
  }[role];
  const accent = ROLE_ACCENT[role];

  return (
    <div style={{ minHeight: "100vh", background: "#0E0518", display: "grid", placeItems: "center",
      padding: "0", fontFamily: "'Archivo', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 440, height: "100dvh", maxHeight: 940, position: "relative",
        background: "radial-gradient(120% 80% at 50% -10%, #2a1257 0%, #1B0B44 42%, #160938 100%)",
        overflow: "hidden", boxShadow: "0 40px 120px -30px rgba(0,0,0,.8)",
        display: "flex", flexDirection: "column" }}>

        <div style={{ display: "flex", gap: 8, padding: "12px 16px 0", flexShrink: 0, alignItems: "center" }}>
          <RoleSwitcher role={role} onSwitch={switchRole} />
          {role === "admin" && <Bell count={unread} onClick={() => { setOpenId(null); setTab("notif"); }} />}
          <button onClick={resetApp} title="Reiniciar demo" aria-label="Reiniciar demo" style={{ width: 40, height: 40,
            borderRadius: 12, background: "rgba(242,228,201,.08)", border: "1px solid rgba(242,228,201,.14)",
            color: "#C9BBA0", fontSize: 17, cursor: "pointer", flexShrink: 0 }}>↺</button>
        </div>

        {!openMatch && (
          <>
            <CategoryPicker selected={selectedCategory} onSelect={switchCategory} />
            <ScheduleStrip selected={selectedCategory} />
          </>
        )}

        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingTop: 4 }} key={role + tab + selectedCategory + (openId || "")}>
          <div style={{ animation: "fadeIn .3s ease" }}>{screen}</div>
        </div>

        {!openMatch && (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex",
            padding: "10px 16px calc(14px + env(safe-area-inset-bottom))",
            background: "linear-gradient(0deg, #160938 70%, transparent)", gap: 4 }}>
            {navItems.map(([k, l, ic]) => {
              const active = tab === k;
              const showBadge = k === "notif" && unread > 0;
              return (
                <button key={k} onClick={() => setTab(k)} style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 3, padding: "8px 0", background: "transparent", border: "none", cursor: "pointer" }}>
                  <span style={{ fontSize: 19, color: active ? accent : "#5a4f78" }}>{ic}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: active ? "#FBF7EE" : "#5a4f78" }}>{l}</span>
                  {showBadge && <span style={{ position: "absolute", top: 4, right: "calc(50% - 18px)", width: 8, height: 8, borderRadius: 99, background: "#FF4D4D" }} />}
                </button>
              );
            })}
          </div>
        )}

        <Toast msg={toastMsg} onClose={() => setToastMsg("")} />
      </div>
    </div>
  );
}

// ---------- Role switcher ----------
function RoleSwitcher({ role, onSwitch }) {
  return (
    <div style={{ display: "flex", background: "rgba(14,5,24,.5)", borderRadius: 12, padding: 4, gap: 3, flex: 1 }}>
      {ROLES.map(([k, label, color]) => {
        const active = role === k;
        return (
          <button key={k} onClick={() => onSwitch(k)} style={{ flex: 1, padding: "9px 0", borderRadius: 9,
            background: active ? color : "transparent",
            color: active ? (k === "publico" ? "#1B0B44" : "#FBF7EE") : "#8a7d63",
            border: "none", cursor: "pointer", fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 12,
            transition: "all .18s ease", whiteSpace: "nowrap" }}>{label}</button>
        );
      })}
    </div>
  );
}

function FloatingRoleSwitcher({ role, onSwitch }) {
  return (
    <div style={{ position: "fixed", top: 14, left: "50%", transform: "translateX(-50%)", zIndex: 100,
      width: "min(520px, 92vw)", background: "rgba(14,5,24,.72)", backdropFilter: "blur(8px)",
      borderRadius: 14, padding: 4, boxShadow: "0 12px 40px -12px rgba(0,0,0,.7)" }}>
      <RoleSwitcher role={role} onSwitch={onSwitch} />
    </div>
  );
}

// ---------- Category picker + schedule ----------
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

// ---------- Classificação (Mesário) ----------
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
          vitórias de partidas, saldo de games, confronto direto e sorteio.
        </div>
      </Card>
    </div>
  );
}
