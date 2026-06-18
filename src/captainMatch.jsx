// ============ Captain — Match detail / Escalação / Contestação ============
import { useState } from "react";
import { TEAMS, athleteName, confrontoScore, teamName, getAthletesByCategory } from "./data.js";
import { STATUS, isTerminal, needsMista, confrontoDecided, saveDraftLineup, submitLineup, submitMista, contestResult, recordGame, submitResult } from "./engine.js";
import { AppBar, Card, StatusPill, Eyebrow, Button, Flag } from "./components.jsx";
import { DuoPicker } from "./captainHome.jsx";
import { ScoreEditor, GameRow } from "./arbMatch.jsx";

export function CaptainMatch({ match, onBack, dispatch, toast, me }) {
  const opp = match.a === me ? match.b : match.a;
  const lineup = match.lineups[me];
  const editable = lineup.status === "pendente" || lineup.status === "rascunho";
  const team = TEAMS[me] || { name: me, flag: "", women: [], men: [] };
  // Atletas filtrados pela categoria deste confronto específico
  const catAthletes = getAthletesByCategory(me, match.category);

  const [fem, setFem] = useState(lineup.fem);
  const [masc, setMasc] = useState(lineup.masc);
  const [mistaW, setMistaW] = useState(lineup.mista ? lineup.mista.w : null);
  const [mistaM, setMistaM] = useState(lineup.mista ? lineup.mista.m : null);
  const [contesting, setContesting] = useState(false);
  const [reason, setReason] = useState("");
  const [editingGame, setEditingGame] = useState(null);

  const score = confrontoScore(match);
  const tied = needsMista(match); // 1×1, mista ainda não decidida
  const mistaSent = !!lineup.mista;
  const canContest = match.status === STATUS.AGUARDANDO_RESULTADO || match.status === STATUS.FINALIZADO;
  const inPlay = match.status === STATUS.EM_JOGO;
  const game1Done = !!match.games.fem?.winner;
  const game2Done = !!match.games.masc?.winner;
  const mistaDone = !!match.games.mista?.winner;
  const bothMistaSent = Object.values(match.lineups).every(l => !!l.mista);
  const decided = confrontoDecided(match);

  function pickInto(list, setList, id) {
    if (list.includes(id)) setList(list.map(x => x === id ? null : x));
    else { const i = list.indexOf(null); if (i === -1) { const n = [...list]; n[1] = id; setList(n); } else { const n = [...list]; n[i] = id; setList(n); } }
  }

  const femOk = fem.filter(Boolean).length === 2;
  const mascOk = masc.filter(Boolean).length === 2;
  const complete = femOk && mascOk;

  function saveDraft() {
    dispatch(saveDraftLineup(match, me, { ...lineup, fem, masc }));
    toast("Rascunho salvo");
  }
  function send() {
    dispatch(submitLineup(match, me, { ...lineup, fem, masc }, { actor: "capitao", teams: TEAMS }));
    toast("Escalação enviada para a Organização");
    onBack();
  }
  function sendMista() {
    dispatch(submitMista(match, me, { w: mistaW, m: mistaM }));
    toast("Dupla mista enviada");
  }
  function doContest() {
    dispatch(contestResult(match, reason.trim(), { actor: "capitao" }));
    toast("Contestação enviada à Organização");
    setContesting(false); setReason("");
  }
  function saveScore(gameKey, result) {
    dispatch(recordGame(match, gameKey, result, { actor: "capitao" }));
    setEditingGame(null);
    toast("Placar registrado");
  }
  function doSubmitResult() {
    dispatch(submitResult(match, { actor: "capitao" }));
    toast("Resultado finalizado");
    onBack();
  }

  return (
    <div style={{ padding: "0 20px 130px" }}>
      <AppBar onBack={onBack} subtitle={`Categoria ${match.category} · ${match.phase} · ${match.time}`} title={`Brasil vs ${teamName(opp)}`} />

      {/* match meta */}
      <Card style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 16px" }}>
        <div style={{ display: "flex", gap: 14, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#C9BBA0" }}>
          {match.court && <span>◇ {match.court}</span>}<span>◷ {match.time}</span>
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
            <DuoPicker label="Dupla Feminina" gender="f" pool={catAthletes.women} selected={fem} onPick={id => pickInto(fem, setFem, id)} />

            <div style={{ marginBottom: 8 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#9B6BFF", letterSpacing: ".08em" }}>JOGO 2</span>
            </div>
            <DuoPicker label="Dupla Masculina" gender="m" pool={catAthletes.men} selected={masc} onPick={id => pickInto(masc, setMasc, id)} />
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
            Após o envio, a Organização valida a escalação<br />e libera a quadra.
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

          {/* Mista flow (sub-fase de EM_JOGO) */}
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
                    <DuoPicker label="Atleta feminina" gender="f" pool={catAthletes.women}
                      selected={[mistaW]} onPick={id => setMistaW(mistaW === id ? null : id)} />
                    <DuoPicker label="Atleta masculino" gender="m" pool={catAthletes.men}
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

          {/* Lançamento de placar — EM_JOGO */}
          {inPlay && (
            <div style={{ marginTop: 22 }}>
              <Eyebrow>Placar dos jogos</Eyebrow>
              <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 12 }}>
                <GameRow n="1" label="Feminina" game={match.games.fem} match={match}
                  canEdit={!game1Done} onEdit={() => setEditingGame("fem")} />
                <GameRow n="2" label="Masculina" game={match.games.masc} match={match}
                  canEdit={game1Done && !game2Done} locked={!game1Done}
                  onEdit={() => setEditingGame("masc")} />
                <GameRow n="3" label="Mista" game={match.games.mista} match={match} mista
                  visible={tied || mistaDone}
                  waiting={tied && !mistaDone && !bothMistaSent}
                  canEdit={tied && !mistaDone && bothMistaSent}
                  onEdit={() => setEditingGame("mista")} />
              </div>
              {decided && (
                <div style={{ marginTop: 14 }}>
                  <Button full onClick={doSubmitResult}>✓ Encerrar e enviar resultado</Button>
                </div>
              )}
            </div>
          )}

          {/* Contestação */}
          {canContest && match.status !== STATUS.RESULTADO_CONTESTADO && (
            <div style={{ marginTop: 20 }}>
              {!contesting ? (
                <Button full variant="danger" onClick={() => setContesting(true)}>⚑ Contestar resultado</Button>
              ) : (
                <Card style={{ padding: "14px 16px", background: "rgba(255,64,64,.08)", borderColor: "rgba(255,64,64,.28)" }}>
                  <Eyebrow color="#FF8A8A">Contestar resultado</Eyebrow>
                  <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
                    placeholder="Descreva o motivo da contestação"
                    style={{ width: "100%", marginTop: 10, marginBottom: 10, padding: "10px 12px", borderRadius: 12,
                      background: "rgba(14,5,24,.5)", border: "1px solid rgba(242,228,201,.16)", color: "#FBF7EE",
                      fontFamily: "'Archivo',sans-serif", fontSize: 13, resize: "vertical" }} />
                  <div style={{ display: "flex", gap: 10 }}>
                    <Button variant="ghost" onClick={() => { setContesting(false); setReason(""); }}>Cancelar</Button>
                    <div style={{ flex: 1 }}><Button full variant="danger" disabled={!reason.trim()} onClick={doContest}>Enviar contestação</Button></div>
                  </div>
                </Card>
              )}
            </div>
          )}
          {match.status === STATUS.RESULTADO_CONTESTADO && (
            <Card style={{ marginTop: 20, padding: "13px 15px", background: "rgba(255,64,64,.08)", borderColor: "rgba(255,64,64,.28)" }}>
              <div style={{ fontSize: 12.5, color: "#FF8A8A", fontWeight: 700 }}>Contestação enviada. Aguardando decisão da Organização.</div>
            </Card>
          )}
        </>
      )}
      {editingGame && <ScoreEditor match={match} gameKey={editingGame} onCancel={() => setEditingGame(null)} onSave={r => saveScore(editingGame, r)} />}
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
      <span style={{ color: "#8FE0A6", fontWeight: 600 }}>{teamName(game.winner)} venceu</span>
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
