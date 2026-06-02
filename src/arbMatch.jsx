// ============ Arbitragem — Tela do confronto (ações + placar) ============
import { useState } from "react";
import { TEAMS, athleteName, confrontoScore } from "./data.js";
import { StatusPill, Flag, AppBar, Card, Eyebrow, Button } from "./components.jsx";
import { DuoLine } from "./captainMatch.jsx";

function ScoreEditor({ match, gameKey, onSave, onCancel }) {
  const [winner, setWinner] = useState(null);
  const [aGames, setAGames] = useState(6);
  const [bGames, setBGames] = useState(4);
  const TA = TEAMS[match.a], TB = TEAMS[match.b];
  const winnerGames = winner === match.a ? aGames : bGames;
  const loserGames = winner === match.a ? bGames : aGames;
  const scoreOk = winner && winnerGames > loserGames;

  function step(setter, val, dir) {
    const n = Math.max(0, Math.min(9, val + dir));
    setter(n);
  }

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 60, background: "rgba(14,5,24,.78)",
      display: "flex", alignItems: "flex-end", animation: "fade .2s ease" }}>
      <div style={{ width: "100%", background: "#241047", borderRadius: "24px 24px 0 0",
        padding: "22px 20px 28px", border: "1px solid rgba(242,228,201,.12)", animation: "slideUp .28s ease" }}>
        <div style={{ width: 40, height: 4, borderRadius: 99, background: "rgba(242,228,201,.2)", margin: "0 auto 18px" }} />
        <div style={{ fontFamily: "'Archivo Black',sans-serif", fontSize: 17, color: "#FBF7EE", marginBottom: 4 }}>Registrar placar</div>
        <div style={{ fontSize: 12.5, color: "#8a7d63", marginBottom: 20 }}>
          {gameKey === "fem" ? "Jogo 1 · Dupla Feminina" : gameKey === "masc" ? "Jogo 2 · Dupla Masculina" : "Jogo 3 · Dupla Mista"}
        </div>

        {/* winner choose */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[match.a, match.b].map(code => (
            <button key={code} onClick={() => setWinner(code)} style={{ padding: "14px", borderRadius: 14,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer",
              background: winner === code ? "rgba(120,200,140,.16)" : "rgba(242,228,201,.05)",
              border: winner === code ? "1.5px solid #5FC97E" : "1.5px solid rgba(242,228,201,.12)" }}>
              <Flag code={code} size={20} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#FBF7EE" }}>{TEAMS[code].name}</span>
            </button>
          ))}
        </div>

        {/* games stepper */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center", marginBottom: 22 }}>
          <Stepper label={TA.name} value={aGames} onUp={() => step(setAGames, aGames, 1)} onDown={() => step(setAGames, aGames, -1)} />
          <span style={{ fontFamily: "'Archivo Black',sans-serif", fontSize: 18, color: "#8a7d63" }}>×</span>
          <Stepper label={TB.name} value={bGames} onUp={() => step(setBGames, bGames, 1)} onDown={() => step(setBGames, bGames, -1)} />
        </div>

        {winner && !scoreOk && (
          <div style={{ margin: "-8px 0 18px", padding: "10px 12px", borderRadius: 12,
            background: "rgba(255,176,46,.1)", border: "1px solid rgba(255,176,46,.24)",
            color: "#FFC766", fontSize: 12.5, fontWeight: 600 }}>
            O vencedor precisa ter mais games que o adversário.
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          <div style={{ flex: 1 }}>
            <Button full disabled={!scoreOk} onClick={() => {
              onSave({ winner, score: `${winnerGames}-${loserGames}` });
            }}>Confirmar resultado</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stepper({ label, value, onUp, onDown }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 11, color: "#8a7d63", marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <button onClick={onDown} style={stepBtn}>−</button>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 30, fontWeight: 700, color: "#FBF7EE", width: 30 }}>{value}</span>
        <button onClick={onUp} style={stepBtn}>+</button>
      </div>
    </div>
  );
}
const stepBtn = { width: 34, height: 34, borderRadius: 10, background: "rgba(242,228,201,.08)",
  border: "1px solid rgba(242,228,201,.14)", color: "#FBF7EE", fontSize: 18, cursor: "pointer" };

// Lineup column for one team in the referee match view
function ArbLineupCol({ match, code }) {
  const l = match.lineups[code];
  const empty = l.status === "pendente";
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Flag code={code} size={20} />
        <span style={{ fontSize: 14, fontWeight: 700, color: "#FBF7EE", flex: 1 }}>{TEAMS[code].name}</span>
      </div>
      <StatusPill status={l.status} size="sm" />
      {empty ? (
        <div style={{ marginTop: 12, fontSize: 12, color: "#8a7d63", fontStyle: "italic" }}>Escalação não enviada</div>
      ) : (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: "#FF8478", letterSpacing: ".06em", marginBottom: 6 }}>FEMININA</div>
            <DuoLine name={athleteName(code, l.fem[0])} gender="f" />
            <div style={{ height: 4 }} /><DuoLine name={athleteName(code, l.fem[1])} gender="f" />
          </div>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: "#9B6BFF", letterSpacing: ".06em", marginBottom: 6 }}>MASCULINA</div>
            <DuoLine name={athleteName(code, l.masc[0])} gender="m" />
            <div style={{ height: 4 }} /><DuoLine name={athleteName(code, l.masc[1])} gender="m" />
          </div>
          {l.mista && (
            <div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: "#FFC766", letterSpacing: ".06em", marginBottom: 6 }}>MISTA</div>
              <DuoLine name={athleteName(code, l.mista.w)} gender="f" />
              <div style={{ height: 4 }} /><DuoLine name={athleteName(code, l.mista.m)} gender="m" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ArbMatch({ match, onBack, onUpdate, onSetStatus, toast }) {
  const [editing, setEditing] = useState(null); // gameKey
  const s = confrontoScore(match);
  const bothValidated = Object.values(match.lineups).every(l => l.status === "validada");
  const anySent = Object.values(match.lineups).some(l => l.status === "enviada");
  const waitingLineups = Object.values(match.lineups).some(l => ["pendente", "rascunho"].includes(l.status));
  const game1Done = match.games.fem && match.games.fem.winner;
  const game2Done = match.games.masc && match.games.masc.winner;
  const mistaDone = match.games.mista && match.games.mista.winner;
  const bothMistaSent = Object.values(match.lineups).every(l => !!l.mista);

  function validateAll() {
    const lu = { ...match.lineups };
    Object.keys(lu).forEach(k => { if (lu[k].status === "enviada") lu[k] = { ...lu[k], status: "validada" }; });
    onUpdate(match.id, null, lu);
    const ready = Object.values(lu).every(l => l.status === "validada");
    toast(ready ? "Escalações validadas. Confronto pronto para chamada" : "Escalação validada. Aguardando a outra equipe");
  }
  function callMatch() { onSetStatus(match.id, "andamento"); toast("Jogo chamado — em andamento"); }
  function fillMissingMixedLineups() {
    const lineups = { ...match.lineups };
    Object.keys(lineups).forEach(code => {
      if (!lineups[code].mista) {
        lineups[code] = {
          ...lineups[code],
          mista: { w: TEAMS[code].women[0].id, m: TEAMS[code].men[0].id },
        };
      }
    });
    onUpdate(match.id, null, lineups);
    toast("Duplas mistas pendentes preenchidas");
  }

  function saveScore(gameKey, result) {
    const games = { ...match.games, [gameKey]: result };
    let nextStatus = match.status;
    // recompute after fem+masc
    const aWins = ["fem", "masc"].filter(k => games[k] && games[k].winner === match.a).length;
    const bWins = ["fem", "masc"].filter(k => games[k] && games[k].winner === match.b).length;
    if (gameKey === "masc" && games.fem) {
      if (aWins === 1 && bWins === 1) nextStatus = "mista"; // tie → release mista
      else nextStatus = "finalizado";
    }
    if (gameKey === "mista") nextStatus = "finalizado";
    onUpdate(match.id, "__games", games);
    onSetStatus(match.id, nextStatus);
    setEditing(null);
    if (nextStatus === "mista") toast("Empate 1×1 — dupla mista liberada aos capitães");
    else if (nextStatus === "finalizado") toast("Confronto finalizado");
    else toast("Placar registrado");
  }

  const done = ["finalizado", "wo", "desistencia"].includes(match.status);

  return (
    <div style={{ padding: "0 20px 130px", position: "relative" }}>
      <AppBar onBack={onBack} subtitle={`Categoria ${match.category} · ${match.phase} · ${match.court}`}
        title={`${TEAMS[match.a].name} vs ${TEAMS[match.b].name}`}
        right={<StatusPill status={match.status} size="sm" />} />

      {/* Scoreboard */}
      <Card style={{ padding: "18px 16px", background: "linear-gradient(135deg, rgba(107,47,217,.22), rgba(58,14,122,.1))" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 10 }}>
          <div style={{ textAlign: "center" }}>
            <Flag code={match.a} size={30} />
            <div style={{ fontSize: 13, fontWeight: 700, color: "#FBF7EE", marginTop: 4 }}>{TEAMS[match.a].name}</div>
          </div>
          <div style={{ fontFamily: "'Archivo Black',sans-serif", fontSize: 40, color: "#FBF7EE", lineHeight: 1 }}>
            {s.a}<span style={{ color: "#6B2FD9", margin: "0 6px" }}>×</span>{s.b}
          </div>
          <div style={{ textAlign: "center" }}>
            <Flag code={match.b} size={30} />
            <div style={{ fontSize: 13, fontWeight: 700, color: "#FBF7EE", marginTop: 4 }}>{TEAMS[match.b].name}</div>
          </div>
        </div>
      </Card>

      {/* Games */}
      <div style={{ marginTop: 18 }}>
        <Eyebrow>Jogos do confronto</Eyebrow>
        <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 12 }}>
          <GameRow n="1" label="Feminina" game={match.games.fem} match={match}
            canEdit={match.status === "andamento" && !game1Done}
            onEdit={() => setEditing("fem")} />
          <GameRow n="2" label="Masculina" game={match.games.masc} match={match}
            canEdit={match.status === "andamento" && game1Done && !game2Done}
            locked={!game1Done && !game2Done}
            onEdit={() => setEditing("masc")} />
          <GameRow n="3" label="Mista" game={match.games.mista} match={match}
            mista
            visible={match.status === "mista" || mistaDone}
            waiting={match.status === "mista" && !bothMistaSent}
            canEdit={match.status === "mista" && bothMistaSent && !mistaDone}
            onEdit={() => setEditing("mista")} />
        </div>
      </div>

      {/* Lineups */}
      <div style={{ marginTop: 22 }}>
        <Eyebrow>Escalações</Eyebrow>
        <Card style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1px 1fr", gap: 14 }}>
          <ArbLineupCol match={match} code={match.a} />
          <div style={{ background: "rgba(242,228,201,.1)" }} />
          <ArbLineupCol match={match} code={match.b} />
        </Card>
      </div>

      {/* Actions */}
      {!done && (
        <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
          <Eyebrow>Ações do árbitro</Eyebrow>
          {anySent && (
            <Button full variant="solid" onClick={validateAll}>✓ Validar escalações enviadas</Button>
          )}
          {!anySent && waitingLineups && (
            <Card style={{ padding: "12px 14px", background: "rgba(255,176,46,.08)", borderColor: "rgba(255,176,46,.2)" }}>
              <div style={{ fontSize: 12.5, color: "#FFC766", fontWeight: 600 }}>
                Aguardando envio de escalação para liberar a validação.
              </div>
            </Card>
          )}
          {bothValidated && match.status !== "andamento" && match.status !== "mista" && (
            <Button full onClick={callMatch}>📣 Chamar jogo</Button>
          )}
          {match.status === "mista" && !bothMistaSent && (
            <Button full variant="sand" onClick={fillMissingMixedLineups}>Preencher mistas pendentes</Button>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="danger" onClick={() => { onSetStatus(match.id, "wo"); toast("Confronto marcado como W.O."); }}>Marcar W.O.</Button>
            <div style={{ flex: 1 }}>
              <Button full variant="danger" onClick={() => { onSetStatus(match.id, "desistencia"); toast("Desistência registrada"); }}>Desistência</Button>
            </div>
          </div>
        </div>
      )}

      {editing && <ScoreEditor match={match} gameKey={editing} onCancel={() => setEditing(null)}
        onSave={r => saveScore(editing, r)} />}
    </div>
  );
}

function GameRow({ n, label, game, match, canEdit, onEdit, locked, mista, visible = true, waiting }) {
  if (mista && !visible) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 15px", borderRadius: 13,
        background: "rgba(242,228,201,.03)", border: "1px dashed rgba(242,228,201,.1)", opacity: .6 }}>
        <GameNum n={n} dim />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#8a7d63" }}>Dupla {label}</div>
          <div style={{ fontSize: 11, color: "#8a7d63" }}>Liberada apenas em empate 1×1</div>
        </div>
      </div>
    );
  }
  const finished = game && game.winner;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 15px", borderRadius: 13,
      background: finished ? "rgba(120,200,140,.07)" : canEdit ? "rgba(255,90,78,.08)" : "rgba(242,228,201,.04)",
      border: `1px solid ${finished ? "rgba(120,200,140,.18)" : canEdit ? "rgba(255,90,78,.3)" : "rgba(242,228,201,.08)"}` }}>
      <GameNum n={n} done={finished} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: "#FBF7EE" }}>Dupla {label}</div>
        {finished ? (
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 3, fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5 }}>
            <Flag code={game.winner} size={13} />
            <span style={{ color: "#8FE0A6", fontWeight: 600 }}>{TEAMS[game.winner].name}</span>
            <span style={{ color: "#C9BBA0" }}>{game.score}</span>
          </div>
        ) : (
          <div style={{ fontSize: 11, color: "#8a7d63", marginTop: 2 }}>
            {waiting ? "Aguardando duplas mistas dos capitães" : locked ? "Aguardando jogo anterior" : canEdit ? "Pronto para registrar" : "Aguardando chamada"}
          </div>
        )}
      </div>
      {canEdit && <Button onClick={onEdit}>Registrar</Button>}
    </div>
  );
}

function GameNum({ n, done, dim }) {
  return (
    <span style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, display: "grid", placeItems: "center",
      fontFamily: "'Archivo Black',sans-serif", fontSize: 13,
      background: done ? "#5FC97E" : dim ? "rgba(242,228,201,.08)" : "rgba(107,47,217,.3)",
      color: done ? "#1B0B44" : dim ? "#8a7d63" : "#C9A9FF" }}>{done ? "✓" : n}</span>
  );
}
