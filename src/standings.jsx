// ============ Classificação (standings) — shared ============
import { TEAMS, TEAM_CODE, confrontoScore } from "./data.js";
import { Flag, AppBar, Eyebrow, Card } from "./components.jsx";

export function computeStandings(matches, group = "Grupo A") {
  const codes = new Set();
  matches.filter(m => m.phase === group).forEach(m => { codes.add(m.a); codes.add(m.b); });
  const table = {};
  codes.forEach(c => { table[c] = { code: c, j: 0, v: 0, d: 0, sv: 0, games: 0, gc: 0 }; });

  matches.filter(m => m.phase === group && ["finalizado", "wo", "desistencia"].includes(m.status)).forEach(m => {
    const s = confrontoScore(m);
    table[m.a].j++; table[m.b].j++;
    // confronto win
    if (s.a > s.b) { table[m.a].v++; table[m.b].d++; }
    else if (s.b > s.a) { table[m.b].v++; table[m.a].d++; }
    // partida balance + games
    ["fem", "masc", "mista"].forEach(k => {
      const g = m.games[k];
      if (!g || !g.winner) return;
      if (g.winner === m.a) table[m.a].sv++; else table[m.b].sv++;
      const [ga, gb] = (g.score || "0-0").split("-").map(Number);
      const aGames = g.winner === m.a ? ga : gb;
      const bGames = g.winner === m.a ? gb : ga;
      table[m.a].games += aGames; table[m.a].gc += bGames;
      table[m.b].games += bGames; table[m.b].gc += aGames;
    });
  });

  return Object.values(table).sort((x, y) =>
    y.v - x.v || y.sv - x.sv || (y.games - y.gc) - (x.games - x.gc) || y.games - x.games);
}

export function Classificacao({ matches, highlight, group = "Grupo 1" }) {
  const rows = computeStandings(matches, group);
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "26px 1fr 30px 30px 38px 42px",
        gap: 6, padding: "0 12px 8px", fontFamily: "'JetBrains Mono',monospace", fontSize: 10,
        color: "#8a7d63", letterSpacing: ".05em" }}>
        <span>#</span><span>EQUIPE</span><span style={{ textAlign: "center" }}>V</span>
        <span style={{ textAlign: "center" }}>D</span><span style={{ textAlign: "center" }}>SV</span>
        <span style={{ textAlign: "center" }}>SALDO</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.map((r, i) => {
          const isMe = highlight === r.code;
          const qualifies = i < 2;
          return (
            <div key={r.code} style={{ display: "grid", gridTemplateColumns: "26px 1fr 30px 30px 38px 42px",
              gap: 6, alignItems: "center", padding: "12px 12px", borderRadius: 12,
              background: isMe ? "rgba(255,90,78,.12)" : "rgba(242,228,201,.05)",
              border: isMe ? "1.5px solid rgba(255,90,78,.4)" : "1px solid rgba(242,228,201,.08)" }}>
              <span style={{ fontFamily: "'Archivo Black',sans-serif", fontSize: 13,
                color: qualifies ? "#5FC97E" : "#8a7d63" }}>{i + 1}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <Flag code={r.code} size={16} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#FBF7EE", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{TEAMS[r.code].name}</span>
              </div>
              <span style={{ textAlign: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: "#FBF7EE", fontWeight: 600 }}>{r.v}</span>
              <span style={{ textAlign: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: "#C9BBA0" }}>{r.d}</span>
              <span style={{ textAlign: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: "#C9BBA0" }}>{r.sv}</span>
              <span style={{ textAlign: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: 13,
                color: (r.games - r.gc) >= 0 ? "#8FE0A6" : "#FF8478" }}>{r.games - r.gc > 0 ? "+" : ""}{r.games - r.gc}</span>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, padding: "0 12px",
        fontSize: 11, color: "#8a7d63" }}>
        <span style={{ width: 8, height: 8, borderRadius: 99, background: "#5FC97E" }} />
        Classificam para a fase eliminatória
      </div>
    </div>
  );
}

// ---------- Captain History ----------
export function CaptainHistory({ matches, category }) {
  const me = TEAM_CODE;
  const mine = matches.filter(m => (m.a === me || m.b === me));
  const played = mine.filter(m => ["finalizado", "wo", "desistencia"].includes(m.status));
  const wins = played.filter(m => { const s = confrontoScore(m); const isA = m.a === me; return (isA ? s.a > s.b : s.b > s.a); }).length;

  return (
    <div style={{ padding: "0 20px 110px" }}>
      <AppBar subtitle={`Brasil · Categoria ${category.label}`} title="Histórico & Classificação" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 22 }}>
        {[["Jogados", played.length], ["Vitórias", wins], ["Pontos", wins * 3]].map(([l, v]) => (
          <Card key={l} style={{ padding: "14px 12px", textAlign: "center" }}>
            <div style={{ fontFamily: "'Archivo Black',sans-serif", fontSize: 26, color: "#FBF7EE" }}>{v}</div>
            <div style={{ fontSize: 11, color: "#8a7d63", marginTop: 2 }}>{l}</div>
          </Card>
        ))}
      </div>

      {[...new Set(matches.map(m => m.phase))].map(group => (
        <div key={group} style={{ marginBottom: 24 }}>
          <Eyebrow>Classificação · {group}</Eyebrow>
          <div style={{ marginTop: 12 }}>
            <Classificacao matches={matches} highlight={me} group={group} />
          </div>
        </div>
      ))}

      <Eyebrow>Confrontos anteriores</Eyebrow>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
        {played.length === 0 && <div style={{ fontSize: 13, color: "#8a7d63", padding: "16px 0" }}>Nenhum confronto finalizado ainda.</div>}
        {played.map(m => {
          const opp = m.a === me ? m.b : m.a;
          const s = confrontoScore(m);
          const myS = m.a === me ? s.a : s.b, oppS = m.a === me ? s.b : s.a;
          const won = myS > oppS;
          return (
            <Card key={m.id} style={{ padding: "13px 15px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 4, height: 30, borderRadius: 4, background: won ? "#5FC97E" : "#FF5A4E" }} />
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <Flag code={opp} size={16} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#FBF7EE" }}>{TEAMS[opp].name}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#8a7d63", marginTop: 2 }}>{m.phase} · {m.time}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'Archivo Black',sans-serif", fontSize: 18, color: won ? "#8FE0A6" : "#FF8478" }}>{myS} × {oppS}</div>
                  <div style={{ fontSize: 10, color: "#8a7d63" }}>{won ? "Vitória" : "Derrota"}</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
