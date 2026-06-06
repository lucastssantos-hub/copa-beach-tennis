// ============================================================================
// publicTV.jsx — Tela Pública (projetável em TV). Sem login. Fullscreen landscape.
// ============================================================================
import { useEffect, useState } from "react";
import { TEAMS, EVENT, confrontoScore } from "./data.js";
import { STATUS, isLive, isTerminal } from "./engine.js";
import { Flag, StatusPill, Countdown } from "./components.jsx";
import { computeStandings } from "./standings.jsx";

export function PublicTV({ matches, category }) {
  const [clock, setClock] = useState(nowLabel());
  useEffect(() => { const t = setInterval(() => setClock(nowLabel()), 1000); return () => clearInterval(t); }, []);

  const live = matches.filter(m => isLive(m.status));
  const upcoming = matches
    .filter(m => [STATUS.AGUARDANDO_ESCALACAO, STATUS.ESCALACAO_ENVIADA, STATUS.AGUARDANDO_VALIDACAO, STATUS.AGUARDANDO_QUADRA].includes(m.status))
    .sort((a, b) => a.time.localeCompare(b.time)).slice(0, 6);
  const results = matches.filter(m => isTerminal(m.status)).slice(-6).reverse();
  const groups = [...new Set(matches.map(m => m.phase))];

  return (
    <div style={{ position: "fixed", inset: 0, background: "radial-gradient(130% 90% at 50% -10%, #2a1257 0%, #1B0B44 45%, #0E0518 100%)",
      color: "#FBF7EE", fontFamily: "'Archivo',sans-serif", overflow: "auto", padding: "clamp(14px,2vw,28px)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "clamp(12px,1.6vw,22px)" }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", color: "#9B6BFF", fontSize: "clamp(11px,1vw,15px)", letterSpacing: ".18em" }}>
            {EVENT.edition} · CATEGORIA {category.label}
          </div>
          <div style={{ fontFamily: "'Archivo Black',sans-serif", fontSize: "clamp(24px,3vw,48px)", lineHeight: 1 }}>{EVENT.title}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "rgba(255,90,78,.18)", color: "#FF8478",
            padding: "8px 16px", borderRadius: 999, fontWeight: 800, fontSize: "clamp(12px,1.1vw,16px)", letterSpacing: ".1em" }}>
            <span style={{ width: 10, height: 10, borderRadius: 99, background: "#FF5A4E", animation: "pulse 1.4s infinite" }} /> AO VIVO
          </div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "clamp(18px,2vw,32px)", fontWeight: 700, marginTop: 8 }}>{clock}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: "clamp(12px,1.4vw,20px)", alignItems: "start" }}>
        {/* Coluna 1 — Ao vivo */}
        <Section title="Em andamento" accent="#9B6BFF">
          {live.length === 0 && <Empty>Nenhuma partida em quadra agora.</Empty>}
          <div style={{ display: "flex", flexDirection: "column", gap: "clamp(10px,1.2vw,16px)" }}>
            {live.map(m => {
              const s = confrontoScore(m);
              return (
                <div key={m.id} style={{ background: "linear-gradient(135deg, rgba(107,47,217,.28), rgba(58,14,122,.12))",
                  border: "1px solid rgba(155,107,255,.3)", borderRadius: 18, padding: "clamp(12px,1.4vw,22px)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "#C9A9FF", fontSize: "clamp(11px,.95vw,15px)" }}>◇ {m.court} · {m.phase}</span>
                    {m.status === STATUS.AQUECIMENTO && m.warmupEndsAt
                      ? <Countdown endsAt={m.warmupEndsAt} size={20} />
                      : <StatusPill status={m.status} size="sm" />}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12 }}>
                    <TeamBig code={m.a} align="left" />
                    <div style={{ fontFamily: "'Archivo Black',sans-serif", fontSize: "clamp(34px,4vw,64px)", lineHeight: 1 }}>
                      {s.a}<span style={{ color: "#6B2FD9", margin: "0 .15em" }}>×</span>{s.b}
                    </div>
                    <TeamBig code={m.b} align="right" />
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Coluna 2 — Próximos + Resultados */}
        <div style={{ display: "flex", flexDirection: "column", gap: "clamp(12px,1.4vw,20px)" }}>
          <Section title="Próximos jogos" accent="#FFB36B">
            {upcoming.length === 0 && <Empty>Sem jogos na fila.</Empty>}
            {upcoming.map(m => (
              <Row key={m.id}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "#FFB36B", fontSize: "clamp(13px,1.1vw,18px)", fontWeight: 700, minWidth: 52 }}>{m.time}</span>
                <MiniVs a={m.a} b={m.b} />
                <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "#8a7d63", fontSize: "clamp(10px,.85vw,13px)" }}>{m.court}</span>
              </Row>
            ))}
          </Section>
          <Section title="Resultados" accent="#8FE0A6">
            {results.length === 0 && <Empty>Ainda sem resultados.</Empty>}
            {results.map(m => {
              const s = confrontoScore(m);
              return (
                <Row key={m.id}>
                  <MiniVs a={m.a} b={m.b} />
                  <span style={{ fontFamily: "'Archivo Black',sans-serif", color: "#8FE0A6", fontSize: "clamp(15px,1.4vw,22px)" }}>{s.a} × {s.b}</span>
                </Row>
              );
            })}
          </Section>
        </div>

        {/* Coluna 3 — Classificação + Eliminatórias */}
        <div style={{ display: "flex", flexDirection: "column", gap: "clamp(12px,1.4vw,20px)" }}>
          <Section title="Classificação" accent="#5FC97E">
            {groups.map(g => (
              <div key={g} style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", color: "#9B6BFF", fontSize: "clamp(10px,.85vw,13px)", letterSpacing: ".08em", marginBottom: 6 }}>{g}</div>
                {computeStandings(matches, g).map((r, i) => (
                  <div key={r.code} style={{ display: "grid", gridTemplateColumns: "20px 1fr auto auto", gap: 8, alignItems: "center", padding: "5px 0" }}>
                    <span style={{ fontFamily: "'Archivo Black',sans-serif", fontSize: "clamp(12px,1vw,16px)", color: i < 2 ? "#5FC97E" : "#8a7d63" }}>{i + 1}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                      <Flag code={r.code} size={15} />
                      <span style={{ fontWeight: 700, fontSize: "clamp(12px,1vw,16px)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{TEAMS[r.code].name}</span>
                    </span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "clamp(11px,.9vw,15px)", color: "#FBF7EE", fontWeight: 700 }}>{r.v}V</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "clamp(11px,.9vw,15px)", color: (r.games - r.gc) >= 0 ? "#8FE0A6" : "#FF8478" }}>{r.games - r.gc > 0 ? "+" : ""}{r.games - r.gc}</span>
                  </div>
                ))}
              </div>
            ))}
          </Section>
          <Section title="Eliminatórias · Campeões" accent="#C9A9FF">
            <Empty>Chaveamento e campeões serão exibidos ao término da fase de grupos.</Empty>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, accent, children }) {
  return (
    <div style={{ background: "rgba(14,5,24,.4)", border: "1px solid rgba(242,228,201,.1)", borderRadius: 18, padding: "clamp(12px,1.4vw,20px)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ width: 10, height: 10, borderRadius: 99, background: accent }} />
        <span style={{ fontFamily: "'Archivo Black',sans-serif", fontSize: "clamp(15px,1.4vw,22px)" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}
function Row({ children }) {
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
    padding: "clamp(8px,.9vw,13px) 0", borderBottom: "1px solid rgba(242,228,201,.07)" }}>{children}</div>;
}
function MiniVs({ a, b }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 7, flex: 1, minWidth: 0 }}>
      <Flag code={a} size={16} /><b style={{ fontSize: "clamp(12px,1vw,16px)" }}>{TEAMS[a].name}</b>
      <span style={{ color: "#6B2FD9", fontWeight: 800 }}>×</span>
      <b style={{ fontSize: "clamp(12px,1vw,16px)" }}>{TEAMS[b].name}</b><Flag code={b} size={16} />
    </span>
  );
}
function TeamBig({ code, align }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: align === "right" ? "flex-end" : "flex-start", gap: 6 }}>
      <Flag code={code} size={34} />
      <span style={{ fontWeight: 800, fontSize: "clamp(14px,1.3vw,22px)" }}>{TEAMS[code].name}</span>
    </div>
  );
}
function Empty({ children }) {
  return <div style={{ color: "#8a7d63", fontSize: "clamp(12px,1vw,15px)", lineHeight: 1.4, padding: "6px 0" }}>{children}</div>;
}
function nowLabel() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}
