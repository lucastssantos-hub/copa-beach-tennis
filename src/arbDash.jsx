// ============ Dashboard da Arbitragem — Visão geral + Lista ============
import { useState } from "react";
import { EVENT, TEAMS, STATUS_META, confrontoScore } from "./data.js";
import { Card, StatusPill, Flag, AppBar } from "./components.jsx";

export function ArbDashboard({ matches, onOpenMatch }) {
  const count = st => matches.filter(m => m.status === st).length;
  const pendingLineups = matches.filter(m =>
    Object.values(m.lineups).some(l => ["pendente", "rascunho"].includes(l.status)) &&
    !["finalizado", "wo", "desistencia"].includes(m.status)).length;
  const toValidate = matches.filter(m => Object.values(m.lineups).some(l => l.status === "enviada")).length;

  const cards = [
    { label: "Em andamento", value: count("andamento"), tone: "#9B6BFF", bg: "rgba(107,47,217,.16)" },
    { label: "Aguardando escalação", value: count("aguardando"), tone: "#C9BBA0", bg: "rgba(242,228,201,.07)" },
    { label: "A validar", value: toValidate, tone: "#FFC766", bg: "rgba(255,176,46,.12)" },
    { label: "Aguardando mista", value: count("mista"), tone: "#FF8478", bg: "rgba(255,90,78,.12)" },
    { label: "Finalizados", value: count("finalizado"), tone: "#8FE0A6", bg: "rgba(120,200,140,.1)" },
    { label: "Pendências", value: pendingLineups, tone: "#FFC766", bg: "rgba(255,176,46,.1)" },
  ];

  const [filter, setFilter] = useState("todos");
  const filters = [
    ["todos", "Todos"], ["aguardando", "A escalar"], ["enviada", "A validar"],
    ["andamento", "Ao vivo"], ["mista", "Mista"], ["finalizado", "Final"],
  ];
  const shown = matches.filter(m => {
    if (filter === "todos") return true;
    if (filter === "enviada") return Object.values(m.lineups).some(l => l.status === "enviada");
    return m.status === filter;
  });

  return (
    <div style={{ padding: "0 20px 110px" }}>
      <AppBar subtitle={`${EVENT.edition} · ${EVENT.category}`} title="Arbitragem Geral"
        right={<div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#8a7d63", letterSpacing: ".1em" }}>ÁRBITRO</div>
          <div style={{ fontSize: 12, color: "#C9BBA0", fontWeight: 600 }}>Geral</div>
        </div>} />

      {/* Overview cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {cards.map(c => (
          <div key={c.label} style={{ background: c.bg, border: "1px solid rgba(242,228,201,.08)",
            borderRadius: 14, padding: "13px 12px", minHeight: 78, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ fontFamily: "'Archivo Black',sans-serif", fontSize: 28, color: c.tone, lineHeight: 1 }}>{c.value}</div>
            <div style={{ fontSize: 10.5, color: "#C9BBA0", lineHeight: 1.2 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 7, overflowX: "auto", margin: "22px -20px 0", padding: "0 20px 4px" }}>
        {filters.map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 999,
            background: filter === k ? "#F2E4C9" : "rgba(242,228,201,.06)",
            color: filter === k ? "#1B0B44" : "#C9BBA0", border: "none", cursor: "pointer",
            fontFamily: "'Archivo',sans-serif", fontSize: 12.5, fontWeight: 700 }}>{l}</button>
        ))}
      </div>

      {/* Match list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 16 }}>
        {shown.map(m => <ArbMatchRow key={m.id} match={m} onClick={() => onOpenMatch(m.id)} />)}
      </div>
    </div>
  );
}

export function ArbMatchRow({ match, onClick }) {
  const s = confrontoScore(match);
  const live = match.status === "andamento" || match.status === "mista";
  const done = ["finalizado", "wo", "desistencia"].includes(match.status);
  return (
    <Card onClick={onClick} accent={match.status === "mista"} style={{ padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 10, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#8a7d63" }}>
          <span style={{ color: "#9B6BFF" }}>{match.phase}</span><span>◷ {match.time}</span><span>◇ {match.court}</span>
        </div>
        <StatusPill status={match.status} size="sm" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Flag code={match.a} size={20} />
          <span style={{ fontSize: 14.5, fontWeight: 700, color: "#FBF7EE" }}>{TEAMS[match.a].name}</span>
        </div>
        <div style={{ fontFamily: "'Archivo Black',sans-serif", fontSize: 17,
          color: live || done ? "#FBF7EE" : "#3a2f57", minWidth: 44, textAlign: "center" }}>
          {live || done ? `${s.a} × ${s.b}` : "—"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
          <span style={{ fontSize: 14.5, fontWeight: 700, color: "#FBF7EE" }}>{TEAMS[match.b].name}</span>
          <Flag code={match.b} size={20} />
        </div>
      </div>
      {/* per-team lineup status */}
      {!done && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, gap: 8 }}>
          <LineMini code={match.a} status={match.lineups[match.a].status} />
          <LineMini code={match.b} status={match.lineups[match.b].status} right />
        </div>
      )}
    </Card>
  );
}

export function LineMini({ code, status, right }) {
  const meta = STATUS_META[status];
  const c = { pendente: "#8a7d63", rascunho: "#FFC766", enviada: "#FFC766", validada: "#8FE0A6", bloqueada: "#9B6BFF" }[status] || "#8a7d63";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexDirection: right ? "row-reverse" : "row" }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: c }} />
      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#8a7d63", letterSpacing: ".03em" }}>
        {code} · {meta.label}
      </span>
    </div>
  );
}
