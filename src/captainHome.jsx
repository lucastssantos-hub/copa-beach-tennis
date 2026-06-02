// ============ Área do Capitão (controla a equipe Brasil) ============
import { TEAMS, EVENT, TEAM_CODE } from "./data.js";
import { Eyebrow, StatusPill, VersusRow, Button, Card, Flag, AppBar } from "./components.jsx";

// Athlete selector chip-grid for a duo
export function DuoPicker({ label, pool, selected, onPick, locked, gender }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <Eyebrow color={gender === "f" ? "#FF8478" : "#9B6BFF"}>{label}</Eyebrow>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          color: selected.filter(Boolean).length === 2 ? "#5FC97E" : "#8a7d63" }}>
          {selected.filter(Boolean).length}/2
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {pool.map(a => {
          const isOn = selected.includes(a.id);
          return (
            <button key={a.id} disabled={locked} onClick={() => onPick(a.id)} style={{
              display: "flex", alignItems: "center", gap: 9, padding: "13px 13px",
              borderRadius: 13, cursor: locked ? "default" : "pointer", textAlign: "left",
              background: isOn ? (gender === "f" ? "rgba(255,90,78,.16)" : "rgba(107,47,217,.22)") : "rgba(242,228,201,.05)",
              border: isOn ? `1.5px solid ${gender === "f" ? "#FF5A4E" : "#9B6BFF"}` : "1.5px solid rgba(242,228,201,.1)",
              transition: "all .14s ease", opacity: locked && !isOn ? .4 : 1,
            }}>
              <span style={{ width: 26, height: 26, borderRadius: 99, flexShrink: 0,
                display: "grid", placeItems: "center", fontFamily: "'Archivo Black',sans-serif", fontSize: 11,
                background: isOn ? (gender === "f" ? "#FF5A4E" : "#9B6BFF") : "rgba(242,228,201,.1)",
                color: isOn ? "#1B0B44" : "#C9BBA0" }}>
                {a.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#FBF7EE", lineHeight: 1.15 }}>{a.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Captain Home ----------
export function CaptainHome({ matches, onOpenMatch }) {
  const team = TEAMS[TEAM_CODE];
  const upcoming = matches.filter(m => (m.a === TEAM_CODE || m.b === TEAM_CODE) &&
    !["finalizado", "wo", "desistencia"].includes(m.status));
  const next = upcoming[0];
  const lineup = next ? next.lineups[TEAM_CODE] : null;

  return (
    <div style={{ padding: "0 20px 110px" }}>
      <AppBar subtitle={EVENT.category} title={`${team.flag} ${team.name}`}
        right={<div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#8a7d63", letterSpacing: ".1em" }}>CAPITÃO</div>
          <div style={{ fontSize: 12, color: "#C9BBA0", fontWeight: 600 }}>D. Ramos</div>
        </div>} />

      {next && (
        <Card accent style={{ marginTop: 4, padding: 0, overflow: "hidden" }}>
          <div style={{ background: "linear-gradient(135deg, #6B2FD9, #3A0E7A)", padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <Eyebrow color="#E0CFFF">Próximo confronto</Eyebrow>
              <StatusPill status={lineup.status} size="sm" />
            </div>
            <VersusRow a={next.a} b={next.b} />
            <div style={{ display: "flex", gap: 16, marginTop: 16, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#E0CFFF" }}>
              <span>◷ {next.time}</span><span>◇ {next.court}</span><span>{next.phase}</span>
            </div>
          </div>
          <div style={{ padding: 16 }}>
            {lineup.status === "pendente" || lineup.status === "rascunho" ? (
              <>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12,
                  color: "#FFC766", fontSize: 12.5, fontWeight: 600 }}>
                  <span>⚠</span> Escalação {lineup.status === "rascunho" ? "em rascunho — envie até 30 min antes" : "pendente — prazo: 14:00"}
                </div>
                <Button full onClick={() => onOpenMatch(next.id)}>
                  {lineup.status === "rascunho" ? "Continuar escalação" : "Fazer escalação"}
                </Button>
              </>
            ) : (
              <>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12,
                  color: "#8FE0A6", fontSize: 12.5, fontWeight: 600 }}>
                  <span>✓</span> {lineup.status === "validada" ? "Escalação validada pela arbitragem" : "Escalação enviada — aguardando validação"}
                </div>
                <Button full variant="ghost" onClick={() => onOpenMatch(next.id)}>Ver escalação</Button>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Squad */}
      <div style={{ marginTop: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <Eyebrow>Atletas inscritos</Eyebrow>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#8a7d63" }}>
            {team.women.length + team.men.length} atletas
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[...team.women.map(a => ({ ...a, g: "f" })), ...team.men.map(a => ({ ...a, g: "m" }))].map(a => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 12px",
              background: "rgba(242,228,201,.05)", borderRadius: 12, border: "1px solid rgba(242,228,201,.08)" }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: a.g === "f" ? "#FF5A4E" : "#9B6BFF", flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "#E9DEC6" }}>{a.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Confrontos list */}
      <div style={{ marginTop: 22 }}>
        <Eyebrow>Seus confrontos</Eyebrow>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {matches.filter(m => m.a === TEAM_CODE || m.b === TEAM_CODE).map(m => {
            const opp = m.a === TEAM_CODE ? m.b : m.a;
            const done = ["finalizado", "wo", "desistencia"].includes(m.status);
            return (
              <Card key={m.id} onClick={() => onOpenMatch(m.id)} style={{ padding: "13px 15px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#8a7d63", width: 38 }}>{m.time}</span>
                    <Flag code={opp} size={18} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#FBF7EE" }}>{TEAMS[opp].name}</span>
                  </div>
                  <StatusPill status={done ? m.status : m.lineups[TEAM_CODE].status} size="sm" />
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
