// ============ Captain — Match detail / Escalação ============
import { useState } from "react";
import { TEAMS, TEAM_CODE, athleteName, confrontoScore } from "./data.js";
import { AppBar, Card, StatusPill, Eyebrow, Button, Flag } from "./components.jsx";
import { DuoPicker } from "./captainHome.jsx";

export function CaptainMatch({ match, onBack, onUpdate, toast }) {
  const me = TEAM_CODE;
  const opp = match.a === me ? match.b : match.a;
  const lineup = match.lineups[me];
  const editable = lineup.status === "pendente" || lineup.status === "rascunho";
  const team = TEAMS[me];

  const [fem, setFem] = useState(lineup.fem);
  const [masc, setMasc] = useState(lineup.masc);
  const [mistaW, setMistaW] = useState(lineup.mista ? lineup.mista.w : null);
  const [mistaM, setMistaM] = useState(lineup.mista ? lineup.mista.m : null);

  const score = confrontoScore(match);
  const tied = match.status === "mista"; // referee released the mista
  const mistaSent = !!lineup.mista;

  function pickInto(list, setList, id) {
    if (list.includes(id)) setList(list.map(x => x === id ? null : x));
    else { const i = list.indexOf(null); if (i === -1) { const n = [...list]; n[1] = id; setList(n); } else { const n = [...list]; n[i] = id; setList(n); } }
  }

  const femOk = fem.filter(Boolean).length === 2;
  const mascOk = masc.filter(Boolean).length === 2;
  const complete = femOk && mascOk;

  function saveDraft() {
    onUpdate(match.id, me, { ...lineup, status: "rascunho", fem, masc });
    toast("Rascunho salvo");
  }
  function send() {
    onUpdate(match.id, me, { ...lineup, status: "enviada", fem, masc });
    toast("Escalação enviada para a arbitragem");
    onBack();
  }
  function sendMista() {
    onUpdate(match.id, me, { ...lineup, mista: { w: mistaW, m: mistaM } });
    toast("Dupla mista enviada");
  }

  return (
    <div style={{ padding: "0 20px 130px" }}>
      <AppBar onBack={onBack} subtitle={`Categoria ${match.category} · ${match.phase} · ${match.time}`} title={`Brasil vs ${TEAMS[opp].name}`} />

      {/* match meta */}
      <Card style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 16px" }}>
        <div style={{ display: "flex", gap: 14, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#C9BBA0" }}>
          <span>◇ {match.court}</span><span>◷ {match.time}</span>
        </div>
        <StatusPill status={match.status} size="sm" />
      </Card>

      {editable ? (
        <>
          <div style={{ marginTop: 20 }}>
            <div style={{ fontFamily: "'Archivo Black',sans-serif", fontSize: 17, color: "#FBF7EE", marginBottom: 4 }}>Monte sua escalação</div>
            <div style={{ fontSize: 12.5, color: "#8a7d63", marginBottom: 18 }}>Jogo 1 e Jogo 2 são enviados juntos. A mista só é liberada em caso de empate 1×1.</div>

            <div style={{ marginBottom: 8 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#FF8478", letterSpacing: ".08em" }}>JOGO 1</span>
            </div>
            <DuoPicker label="Dupla Feminina" gender="f" pool={team.women} selected={fem} onPick={id => pickInto(fem, setFem, id)} />

            <div style={{ marginBottom: 8 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#9B6BFF", letterSpacing: ".08em" }}>JOGO 2</span>
            </div>
            <DuoPicker label="Dupla Masculina" gender="m" pool={team.men} selected={masc} onPick={id => pickInto(masc, setMasc, id)} />
          </div>

          {!complete && (
            <div style={{ display: "flex", gap: 9, padding: "12px 14px", background: "rgba(255,176,46,.1)",
              border: "1px solid rgba(255,176,46,.25)", borderRadius: 12, fontSize: 12.5, color: "#FFC766", marginBottom: 16 }}>
              <span>⚠</span><span>Selecione 2 atletas para cada dupla antes de enviar.</span>
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="ghost" onClick={saveDraft}>Salvar rascunho</Button>
            <div style={{ flex: 1 }}><Button full disabled={!complete} onClick={send}>Enviar escalação</Button></div>
          </div>
          <div style={{ fontSize: 11.5, color: "#8a7d63", marginTop: 12, textAlign: "center", lineHeight: 1.4 }}>
            Após o envio, alterações não serão permitidas<br />depois da validação da arbitragem.
          </div>
        </>
      ) : (
        <>
          {/* Sent / locked view */}
          <div style={{ marginTop: 18, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Eyebrow>Sua escalação</Eyebrow>
            <StatusPill status={lineup.status} size="sm" />
          </div>
          <LineupView code={me} lineup={lineup} game1={match.games.fem} game2={match.games.masc} />

          {/* Mista flow */}
          {(match.games.fem || match.games.masc) && (
            <div style={{ marginTop: 20 }}>
              <Card style={{ background: tied ? "rgba(255,90,78,.08)" : "rgba(242,228,201,.04)",
                borderColor: tied ? "rgba(255,90,78,.3)" : "rgba(242,228,201,.1)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: tied ? 14 : 0 }}>
                  <Eyebrow color={tied ? "#FF8478" : "#8a7d63"}>Jogo 3 · Dupla Mista</Eyebrow>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: "#FBF7EE", fontWeight: 600 }}>
                    {score.a}<span style={{ color: "#8a7d63" }}> × </span>{score.b}
                  </span>
                </div>
                {!tied && !mistaSent && (
                  <div style={{ fontSize: 12.5, color: "#8a7d63", marginTop: 8 }}>
                    A mista será liberada apenas se o confronto terminar empatado em 1×1 após os dois primeiros jogos.
                  </div>
                )}
                {tied && !mistaSent && (
                  <>
                    <div style={{ fontSize: 12.5, color: "#FF8478", marginBottom: 14, fontWeight: 600 }}>
                      Confronto empatado 1×1 — escale sua dupla mista.
                    </div>
                    <DuoPicker label="Atleta feminina" gender="f" pool={team.women}
                      selected={[mistaW]} onPick={id => setMistaW(mistaW === id ? null : id)} />
                    <DuoPicker label="Atleta masculino" gender="m" pool={team.men}
                      selected={[mistaM]} onPick={id => setMistaM(mistaM === id ? null : id)} />
                    <Button full disabled={!mistaW || !mistaM} onClick={sendMista}>Enviar dupla mista</Button>
                  </>
                )}
                {mistaSent && (
                  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                    <DuoLine label="Feminina" name={athleteName(me, lineup.mista.w)} gender="f" />
                    <DuoLine label="Masculino" name={athleteName(me, lineup.mista.m)} gender="m" />
                    {match.games.mista && <ResultLine game={match.games.mista} match={match} />}
                  </div>
                )}
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// One athlete row inside a lineup
export function DuoLine({ label, name, gender }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ width: 7, height: 7, borderRadius: 99, background: gender === "f" ? "#FF5A4E" : "#9B6BFF", flexShrink: 0 }} />
      <span style={{ fontSize: 13.5, fontWeight: 600, color: "#FBF7EE" }}>{name}</span>
    </div>
  );
}

export function ResultLine({ game, match }) {
  if (!game || !game.winner) return null;
  return (
    <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 8, fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>
      <Flag code={game.winner} size={14} />
      <span style={{ color: "#8FE0A6", fontWeight: 600 }}>{TEAMS[game.winner].name} venceu</span>
      <span style={{ color: "#C9BBA0" }}>{game.score}</span>
    </div>
  );
}

// Full lineup view: two games
export function LineupView({ code, lineup, game1, game2 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#FF8478", letterSpacing: ".08em" }}>JOGO 1 · FEMININA</span>
          {game1 && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#C9BBA0" }}>{game1.score}</span>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <DuoLine name={athleteName(code, lineup.fem[0])} gender="f" />
          <DuoLine name={athleteName(code, lineup.fem[1])} gender="f" />
        </div>
      </Card>
      <Card style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#9B6BFF", letterSpacing: ".08em" }}>JOGO 2 · MASCULINA</span>
          {game2 && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#C9BBA0" }}>{game2.score}</span>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <DuoLine name={athleteName(code, lineup.masc[0])} gender="m" />
          <DuoLine name={athleteName(code, lineup.masc[1])} gender="m" />
        </div>
      </Card>
    </div>
  );
}
