// ============================================================================
// refereeFlow.jsx — Painel do Árbitro/Mesário
// Funções: confirmar presença, iniciar aquecimento, iniciar jogo, inserir
// placar, encerrar e enviar resultado. SEM ações administrativas.
// ============================================================================
import { useState } from "react";
import { TEAMS } from "./data.js";
import {
  STATUS, needsMista, confrontoDecided,
  releaseCourt, warmupToPlay, setPresence, recordGame, submitResult, submitMista,
  courtsFromMatches,
} from "./engine.js";
import { AppBar, Card, Eyebrow, Button, Flag, StatusPill, Countdown } from "./components.jsx";
import { Scoreboard, ScoreEditor, GameRow, ArbLineupCol } from "./arbMatch.jsx";

// ---------- Fila por quadra ----------
export function RefereeQueue({ matches, category, onOpenMatch }) {
  const courts = courtsFromMatches(matches);
  const actionable = matches
    .filter(m => [STATUS.AGUARDANDO_QUADRA, STATUS.AQUECIMENTO, STATUS.EM_JOGO].includes(m.status))
    .sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div style={{ padding: "0 20px 110px" }}>
      <AppBar subtitle={`Mesário · Categoria ${category.label}`} title="Minhas quadras"
        right={<div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#8a7d63", letterSpacing: ".1em" }}>ÁRBITRO</div>
          <div style={{ fontSize: 12, color: "#C9BBA0", fontWeight: 600 }}>Mesa central</div>
        </div>} />

      <Eyebrow>Quadras</Eyebrow>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12, marginBottom: 22 }}>
        {courts.map(c => (
          <Card key={c.court} onClick={c.current ? () => onOpenMatch(c.current.id) : undefined}
            accent={c.current?.status === STATUS.EM_JOGO}
            style={{ padding: "12px 13px" }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: "#9B6BFF", letterSpacing: ".06em", marginBottom: 6 }}>{c.court}</div>
            {c.current ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#FBF7EE", marginBottom: 6 }}>
                  {TEAMS[c.current.a].name} <span style={{ color: "#6B2FD9" }}>×</span> {TEAMS[c.current.b].name}
                </div>
                <StatusPill status={c.current.status} size="sm" />
                {c.current.status === STATUS.AQUECIMENTO && c.current.warmupEndsAt && (
                  <div style={{ marginTop: 8 }}><Countdown endsAt={c.current.warmupEndsAt} size={18} /></div>
                )}
              </>
            ) : (
              <div style={{ fontSize: 12.5, color: "#6f6387", fontWeight: 700, paddingTop: 4 }}>
                {c.next ? <>Próximo · {c.next.time}<br />{TEAMS[c.next.a].name} × {TEAMS[c.next.b].name}</> : "Livre"}
              </div>
            )}
          </Card>
        ))}
      </div>

      <Eyebrow>Precisa de você</Eyebrow>
      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 12 }}>
        {actionable.length === 0 && (
          <div style={{ fontSize: 13, color: "#8a7d63", padding: "8px 0" }}>Nenhuma quadra ativa nesta categoria agora.</div>
        )}
        {actionable.map(m => (
          <Card key={m.id} onClick={() => onOpenMatch(m.id)} style={{ padding: "13px 15px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#8a7d63" }}>◇ {m.court} · ◷ {m.time}</span>
              <StatusPill status={m.status} size="sm" />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Flag code={m.a} size={18} /><span style={{ fontWeight: 700, color: "#FBF7EE", fontSize: 14 }}>{TEAMS[m.a].name}</span>
              <span style={{ color: "#6B2FD9", fontWeight: 800 }}>×</span>
              <span style={{ fontWeight: 700, color: "#FBF7EE", fontSize: 14 }}>{TEAMS[m.b].name}</span><Flag code={m.b} size={18} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------- Detalhe do confronto (mesário) ----------
export function RefereeMatch({ match, onBack, dispatch, toast }) {
  const [editing, setEditing] = useState(null);
  const a = match.a, b = match.b;
  const game1Done = match.games.fem?.winner;
  const game2Done = match.games.masc?.winner;
  const mistaDone = match.games.mista?.winner;
  const tie = game1Done && game2Done && [match.games.fem, match.games.masc].filter(g => g.winner === a).length === 1;
  const bothMistaSent = Object.values(match.lineups).every(l => !!l.mista);
  const inPlay = match.status === STATUS.EM_JOGO;
  const decided = confrontoDecided(match);
  const bothPresent = match.presence[a] && match.presence[b];

  function saveScore(gameKey, result) {
    dispatch(recordGame(match, gameKey, result, { actor: "arbitro" }));
    setEditing(null);
    toast("Placar registrado");
  }
  function fillMista() {
    let next = { match };
    Object.keys(match.lineups).forEach(code => {
      if (!match.lineups[code].mista) {
        next = submitMista(next.match, code, { w: TEAMS[code].women[0].id, m: TEAMS[code].men[0].id });
      }
    });
    dispatch(next);
    toast("Duplas mistas pendentes preenchidas");
  }

  return (
    <div style={{ padding: "0 20px 130px", position: "relative" }}>
      <AppBar onBack={onBack} subtitle={`Mesário · ${match.court}`}
        title={`${TEAMS[a].name} vs ${TEAMS[b].name}`} right={<StatusPill status={match.status} size="sm" />} />

      <Scoreboard match={match} />

      {/* Presença */}
      <div style={{ marginTop: 18 }}>
        <Eyebrow>Presença das equipes</Eyebrow>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
          {[a, b].map(code => (
            <button key={code} onClick={() => { dispatch(setPresence(match, code, !match.presence[code], { actor: "arbitro" })); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "13px", borderRadius: 13, cursor: "pointer",
                background: match.presence[code] ? "rgba(120,200,140,.16)" : "rgba(242,228,201,.05)",
                border: match.presence[code] ? "1.5px solid #5FC97E" : "1.5px solid rgba(242,228,201,.12)" }}>
              <Flag code={code} size={18} />
              <span style={{ fontWeight: 700, color: "#FBF7EE", fontSize: 13.5, flex: 1, textAlign: "left" }}>{TEAMS[code].name}</span>
              <span style={{ fontSize: 16, color: match.presence[code] ? "#5FC97E" : "#6f6387" }}>{match.presence[code] ? "✓" : "○"}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Aquecimento / início */}
      {match.status === STATUS.AGUARDANDO_QUADRA && (
        <Card style={{ marginTop: 18, padding: "14px 16px" }}>
          <div style={{ fontSize: 12.5, color: "#8FE0A6", fontWeight: 700, marginBottom: 10 }}>Escalações validadas. Pronto para iniciar.</div>
          <Button full disabled={!bothPresent} onClick={() => { dispatch(releaseCourt(match, { actor: "arbitro" })); toast("Aquecimento iniciado (6:00)"); }}>
            ⏱ Iniciar aquecimento {bothPresent ? "" : "(confirme presença)"}
          </Button>
        </Card>
      )}
      {match.status === STATUS.AQUECIMENTO && (
        <Card style={{ marginTop: 18, padding: "16px", textAlign: "center", background: "rgba(255,138,46,.08)", borderColor: "rgba(255,138,46,.28)" }}>
          <Eyebrow color="#FFB36B">Aquecimento</Eyebrow>
          <div style={{ margin: "10px 0 14px" }}>
            <Countdown endsAt={match.warmupEndsAt} size={44} />
          </div>
          <Button full variant="solid" onClick={() => { dispatch(warmupToPlay(match, { actor: "arbitro" })); toast("Jogo iniciado"); }}>▶ Iniciar jogo agora</Button>
        </Card>
      )}

      {/* Jogos */}
      <div style={{ marginTop: 22 }}>
        <Eyebrow>Jogos do confronto</Eyebrow>
        <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 12 }}>
          <GameRow n="1" label="Feminina" game={match.games.fem} match={match}
            canEdit={inPlay && !game1Done} onEdit={() => setEditing("fem")} />
          <GameRow n="2" label="Masculina" game={match.games.masc} match={match}
            canEdit={inPlay && game1Done && !game2Done} locked={!game1Done && !game2Done}
            onEdit={() => setEditing("masc")} />
          <GameRow n="3" label="Mista" game={match.games.mista} match={match} mista
            visible={tie || mistaDone}
            waiting={tie && !mistaDone && !bothMistaSent}
            canEdit={inPlay && tie && !mistaDone && bothMistaSent}
            onEdit={() => setEditing("mista")} />
        </div>
        {inPlay && tie && !mistaDone && !bothMistaSent && (
          <Button full variant="sand" onClick={fillMista}>Preencher mista pendente</Button>
        )}
      </div>

      {/* Escalações */}
      <div style={{ marginTop: 22 }}>
        <Eyebrow>Escalações</Eyebrow>
        <Card style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1px 1fr", gap: 14 }}>
          <ArbLineupCol match={match} code={a} />
          <div style={{ background: "rgba(242,228,201,.1)" }} />
          <ArbLineupCol match={match} code={b} />
        </Card>
      </div>

      {/* Enviar resultado */}
      {inPlay && decided && (
        <div style={{ marginTop: 22 }}>
          <Button full onClick={() => { dispatch(submitResult(match, { actor: "arbitro" })); toast("Resultado enviado para validação da Organização"); onBack(); }}>
            ✓ Encerrar e enviar resultado
          </Button>
        </div>
      )}
      {match.status === STATUS.AGUARDANDO_RESULTADO && (
        <Card style={{ marginTop: 22, padding: "14px 16px", background: "rgba(70,140,255,.1)", borderColor: "rgba(70,140,255,.28)" }}>
          <div style={{ fontSize: 12.5, color: "#9CC2FF", fontWeight: 700 }}>Resultado enviado. Aguardando validação da Organização.</div>
        </Card>
      )}

      {editing && <ScoreEditor match={match} gameKey={editing} onCancel={() => setEditing(null)} onSave={r => saveScore(editing, r)} />}
    </div>
  );
}
