// ============================================================================
// adminOps.jsx — Organização (ADM)
// Centro de Operações (quadras ao vivo), Dashboard (KPIs), detalhe com
// validações/liberação/contestação, Notificações e Auditoria.
// ============================================================================
import { useState } from "react";
import { TEAMS, confrontoScore, teamName } from "./data.js";
import {
  STATUS, courtsFromMatches, courtNames, kpisFromMatches, isTerminal, isLive,
  releaseCourt, warmupToPlay, validateResult, resolveContest, markWalkover,
} from "./engine.js";
import { AppBar, Card, Eyebrow, Button, Flag, StatusPill, Countdown } from "./components.jsx";
import { Scoreboard, GameRow, ArbLineupCol } from "./arbMatch.jsx";

const PENDING = [STATUS.AGUARDANDO_QUADRA, STATUS.AGUARDANDO_RESULTADO, STATUS.RESULTADO_CONTESTADO];

// Conjunto de quadras atualmente ocupadas (AQUECIMENTO ou EM_JOGO) em todos os matches
function occupiedSet(allMatches) {
  return new Set(
    allMatches
      .filter(m => m.status === STATUS.AQUECIMENTO || isLive(m.status))
      .map(m => m.court)
      .filter(Boolean)
  );
}

// Picker inline de quadra — mostra N slots, ocupados desativados
function CourtPicker({ courtCount, allMatches, onPick, onCancel }) {
  const occupied = occupiedSet(allMatches);
  const names = courtNames(courtCount);
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 11.5, color: "#C9BBA0", fontWeight: 700, marginBottom: 8, letterSpacing: ".04em" }}>ESCOLHA A QUADRA</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {names.map(name => {
          const busy = occupied.has(name);
          return (
            <button key={name} disabled={busy} onClick={() => !busy && onPick(name)} style={{
              padding: "9px 14px", borderRadius: 10, cursor: busy ? "default" : "pointer",
              background: busy ? "rgba(242,228,201,.04)" : "rgba(107,47,217,.18)",
              border: `1px solid ${busy ? "rgba(242,228,201,.1)" : "#9B6BFF"}`,
              color: busy ? "#6f6387" : "#C9A9FF",
              fontSize: 12.5, fontWeight: 700, lineHeight: 1.3, textAlign: "center",
            }}>
              {name}
              {busy && <span style={{ display: "block", fontSize: 10, color: "#5a4f78" }}>Em uso</span>}
            </button>
          );
        })}
      </div>
      <button onClick={onCancel} style={{ marginTop: 10, fontSize: 12, color: "#8a7d63", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
        Cancelar
      </button>
    </div>
  );
}

// ---------- Centro de Operações ----------
export function CentroOperacoes({ matches, category, onOpenMatch, dispatch, toast, courtCount = 4, setCourtCount, allMatches = [] }) {
  const [pickingFor, setPickingFor] = useState(null); // match ID aguardando escolha de quadra
  const [showSettings, setShowSettings] = useState(false);

  const courts = courtsFromMatches(allMatches, courtCount);
  const pending = matches
    .filter(m => PENDING.includes(m.status))
    .sort((a, b) => PENDING.indexOf(a.status) - PENDING.indexOf(b.status) || a.time.localeCompare(b.time));

  function handleRelease(m, courtName) {
    dispatch(releaseCourt(m, { actor: "admin", court: courtName }));
    toast(`${courtName} liberada · aquecimento 6:00`);
    setPickingFor(null);
  }

  const actionLabel = s => ({
    [STATUS.AGUARDANDO_RESULTADO]: "Validar resultado",
    [STATUS.RESULTADO_CONTESTADO]: "Resolver contestação",
  }[s]);

  return (
    <div style={{ padding: "0 20px 110px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
        <AppBar subtitle={`Organização · Categoria ${category.label}`} title="Centro de Operações" />
        <button onClick={() => setShowSettings(s => !s)} title="Configurar quadras" style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: showSettings ? "rgba(155,107,255,.22)" : "rgba(242,228,201,.07)",
          border: `1px solid ${showSettings ? "#9B6BFF" : "rgba(242,228,201,.14)"}`,
          color: showSettings ? "#C9A9FF" : "#8a7d63", fontSize: 16, cursor: "pointer",
        }}>⚙</button>
      </div>

      {/* Configuração de número de quadras */}
      {showSettings && (
        <Card style={{ marginBottom: 16, padding: "14px 16px", background: "rgba(107,47,217,.08)", borderColor: "rgba(107,47,217,.3)" }}>
          <Eyebrow>Quadras do evento</Eyebrow>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10 }}>
            <button onClick={() => setCourtCount(c => Math.max(1, c - 1))} disabled={courtCount <= 1} style={{
              width: 36, height: 36, borderRadius: 9, fontSize: 20, fontWeight: 800,
              background: "rgba(242,228,201,.08)", border: "1px solid rgba(242,228,201,.18)",
              color: courtCount <= 1 ? "#5a4f78" : "#FBF7EE", cursor: courtCount <= 1 ? "default" : "pointer",
            }}>−</button>
            <span style={{ fontFamily: "'Archivo Black',sans-serif", fontSize: 28, color: "#FBF7EE", minWidth: 36, textAlign: "center", lineHeight: 1 }}>{courtCount}</span>
            <button onClick={() => setCourtCount(c => Math.min(16, c + 1))} disabled={courtCount >= 16} style={{
              width: 36, height: 36, borderRadius: 9, fontSize: 20, fontWeight: 800,
              background: "rgba(242,228,201,.08)", border: "1px solid rgba(242,228,201,.18)",
              color: courtCount >= 16 ? "#5a4f78" : "#FBF7EE", cursor: courtCount >= 16 ? "default" : "pointer",
            }}>+</button>
            <span style={{ fontSize: 12.5, color: "#C9BBA0" }}>quadra{courtCount !== 1 ? "s" : ""} disponíve{courtCount !== 1 ? "is" : "l"}</span>
          </div>
        </Card>
      )}

      <Eyebrow>Quadras ao vivo</Eyebrow>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12, marginBottom: 22 }}>
        {courts.map(c => {
          const m = c.current;
          const live = m && isLive(m.status);
          return (
            <Card key={c.court} onClick={m ? () => onOpenMatch(m.id) : undefined}
              accent={m?.status === STATUS.EM_JOGO || m?.status === STATUS.RESULTADO_CONTESTADO}
              style={{ padding: "12px 13px", minHeight: 104 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: "#9B6BFF", letterSpacing: ".05em" }}>{c.court}</span>
                {m && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#8a7d63" }}>{m.category}</span>}
              </div>
              {m ? (
                <>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: "#FBF7EE", marginBottom: 6, lineHeight: 1.25 }}>
                    {teamName(m.a)}<br /><span style={{ color: "#6B2FD9" }}>×</span> {teamName(m.b)}
                  </div>
                  <StatusPill status={m.status} size="sm" />
                  {m.status === STATUS.AQUECIMENTO && m.warmupEndsAt && (
                    <div style={{ marginTop: 7 }}><Countdown endsAt={m.warmupEndsAt} size={18} /></div>
                  )}
                  {live && <div style={{ marginTop: 7, fontFamily: "'Archivo Black',sans-serif", fontSize: 16, color: "#FBF7EE" }}>
                    {confrontoScore(m).a} × {confrontoScore(m).b}</div>}
                </>
              ) : (
                <div style={{ fontSize: 12, color: "#6f6387", fontWeight: 700, paddingTop: 4, lineHeight: 1.35 }}>Livre</div>
              )}
            </Card>
          );
        })}
      </div>

      <Eyebrow>Ações pendentes ({pending.length})</Eyebrow>
      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 12 }}>
        {pending.length === 0 && <div style={{ fontSize: 13, color: "#8a7d63", padding: "8px 0" }}>Tudo em dia nesta categoria. ✓</div>}
        {pending.map(m => (
          <Card key={m.id} style={{ padding: "12px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#8a7d63" }}>
                {m.court ? `◇ ${m.court} · ` : ""}{m.phase}
              </span>
              <StatusPill status={m.status} size="sm" />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 11 }}>
              <Flag code={m.a} size={17} /><span style={{ fontWeight: 700, color: "#FBF7EE", fontSize: 13.5 }}>{teamName(m.a)}</span>
              <span style={{ color: "#6B2FD9", fontWeight: 800 }}>×</span>
              <span style={{ fontWeight: 700, color: "#FBF7EE", fontSize: 13.5 }}>{teamName(m.b)}</span><Flag code={m.b} size={17} />
            </div>

            {/* Picker de quadra inline para AGUARDANDO_QUADRA */}
            {m.status === STATUS.AGUARDANDO_QUADRA && pickingFor === m.id ? (
              <CourtPicker courtCount={courtCount} allMatches={allMatches}
                onPick={name => handleRelease(m, name)}
                onCancel={() => setPickingFor(null)} />
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <Button full
                  variant={m.status === STATUS.RESULTADO_CONTESTADO ? "danger" : "primary"}
                  onClick={() => {
                    if (m.status === STATUS.AGUARDANDO_QUADRA) { setPickingFor(m.id); }
                    else if (m.status === STATUS.AGUARDANDO_RESULTADO) { dispatch(validateResult(m, { actor: "admin" })); toast("Resultado validado — classificação atualizada"); }
                    else onOpenMatch(m.id);
                  }}>
                  {m.status === STATUS.AGUARDANDO_QUADRA ? "Liberar quadra" : actionLabel(m.status)}
                </Button>
                <Button variant="ghost" onClick={() => onOpenMatch(m.id)}>Detalhe</Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------- Dashboard (KPIs) ----------
export function AdminDashboard({ matches, category, categories, courtCount = 4 }) {
  const k = kpisFromMatches(matches, courtCount, categories);
  const cards = [
    { label: "Jogos do dia", value: k.jogosDia, tone: "#C9A9FF", bg: "rgba(107,47,217,.16)" },
    { label: "Em andamento", value: k.emAndamento, tone: "#9B6BFF", bg: "rgba(107,47,217,.14)" },
    { label: "Finalizados", value: k.finalizados, tone: "#8FE0A6", bg: "rgba(120,200,140,.1)" },
    { label: "Aguardando resultado", value: k.aguardandoResultado, tone: "#9CC2FF", bg: "rgba(70,140,255,.14)" },
    { label: "Aguardando validação", value: k.aguardandoValidacao, tone: "#FFC766", bg: "rgba(255,176,46,.12)" },
    { label: "Quadras ocupadas", value: k.quadrasOcupadas, tone: "#FF8478", bg: "rgba(255,90,78,.12)" },
    { label: "Quadras livres", value: k.quadrasLivres, tone: "#C9BBA0", bg: "rgba(242,228,201,.07)" },
    { label: "Categorias ativas", value: k.categoriasAtivas, tone: "#E9DEC6", bg: "rgba(242,228,201,.07)" },
    { label: "Tempo médio (min)", value: k.tempoMedio, tone: "#FFB36B", bg: "rgba(255,138,46,.12)" },
  ];
  return (
    <div style={{ padding: "0 20px 110px" }}>
      <AppBar subtitle={`Organização · Categoria ${category.label}`} title="Painel do evento" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {cards.map(c => (
          <div key={c.label} style={{ background: c.bg, border: "1px solid rgba(242,228,201,.08)",
            borderRadius: 14, padding: "13px 12px", minHeight: 84, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ fontFamily: "'Archivo Black',sans-serif", fontSize: 26, color: c.tone, lineHeight: 1 }}>{c.value}</div>
            <div style={{ fontSize: 10, color: "#C9BBA0", lineHeight: 1.2 }}>{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Detalhe do confronto (ADM) ----------
export function AdminMatch({ match, onBack, dispatch, toast, courtCount = 4, allMatches = [] }) {
  const [woKind, setWoKind] = useState(null); // 'WO' | 'DESISTENCIA'
  const [pickingCourt, setPickingCourt] = useState(false);
  const a = match.a, b = match.b;
  const done = isTerminal(match.status);

  return (
    <div style={{ padding: "0 20px 130px", position: "relative" }}>
      <AppBar onBack={onBack} subtitle={`Organização · ${match.court || "Quadra a definir"} · ${match.phase}`}
        title={`${teamName(a)} vs ${teamName(b)}`} right={<StatusPill status={match.status} size="sm" />} />

      <Scoreboard match={match} />

      {/* Contestação em destaque */}
      {match.status === STATUS.RESULTADO_CONTESTADO && (
        <Card style={{ marginTop: 16, padding: "14px 16px", background: "rgba(255,64,64,.1)", borderColor: "rgba(255,64,64,.32)" }}>
          <Eyebrow color="#FF8A8A">Resultado contestado</Eyebrow>
          <div style={{ fontSize: 13, color: "#FFD0D0", margin: "8px 0 14px", lineHeight: 1.4 }}>
            Motivo: {match.result.reason || "não informado"}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="ghost" onClick={() => { dispatch(resolveContest(match, "reabrir", { actor: "admin" })); toast("Confronto reaberto"); }}>Reabrir confronto</Button>
            <div style={{ flex: 1 }}><Button full onClick={() => { dispatch(resolveContest(match, "validar", { actor: "admin" })); toast("Resultado mantido e validado"); }}>Manter resultado</Button></div>
          </div>
        </Card>
      )}

      {/* Jogos (somente leitura para ADM) */}
      <div style={{ marginTop: 18 }}>
        <Eyebrow>Jogos do confronto</Eyebrow>
        <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 12 }}>
          <GameRow n="1" label="Feminina" game={match.games.fem} match={match} />
          <GameRow n="2" label="Masculina" game={match.games.masc} match={match} />
          <GameRow n="3" label="Mista" game={match.games.mista} match={match} mista visible={!!match.games.mista} />
        </div>
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

      {/* Ações da Organização */}
      {!done && (
        <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
          <Eyebrow>Ações da Organização</Eyebrow>

          {match.status === STATUS.AGUARDANDO_QUADRA && !pickingCourt && (
            <Button full onClick={() => setPickingCourt(true)}>◇ Liberar quadra (inicia aquecimento)</Button>
          )}
          {match.status === STATUS.AGUARDANDO_QUADRA && pickingCourt && (
            <Card style={{ padding: "14px 16px", background: "rgba(107,47,217,.08)", borderColor: "rgba(107,47,217,.3)" }}>
              <CourtPicker courtCount={courtCount} allMatches={allMatches}
                onPick={name => { dispatch(releaseCourt(match, { actor: "admin", court: name })); toast(`${name} liberada · aquecimento 6:00`); setPickingCourt(false); }}
                onCancel={() => setPickingCourt(false)} />
            </Card>
          )}
          {match.status === STATUS.AQUECIMENTO && (
            <Card style={{ padding: "14px 16px", textAlign: "center", background: "rgba(255,138,46,.08)", borderColor: "rgba(255,138,46,.28)" }}>
              <Eyebrow color="#FFB36B">Aquecimento em curso</Eyebrow>
              <div style={{ margin: "8px 0 12px" }}><Countdown endsAt={match.warmupEndsAt} size={36} /></div>
              <Button full variant="ghost" onClick={() => { dispatch(warmupToPlay(match, { actor: "admin" })); toast("Jogo iniciado"); }}>Iniciar jogo agora</Button>
            </Card>
          )}
          {match.status === STATUS.AGUARDANDO_RESULTADO && (
            <Button full onClick={() => { dispatch(validateResult(match, { actor: "admin" })); toast("Resultado validado — classificação atualizada"); }}>
              ✓ Validar resultado
            </Button>
          )}

          {/* W.O. / Desistência */}
          {!woKind ? (
            <div style={{ display: "flex", gap: 10 }}>
              <Button variant="danger" onClick={() => setWoKind("WO")}>Marcar W.O.</Button>
              <div style={{ flex: 1 }}><Button full variant="danger" onClick={() => setWoKind("DESISTENCIA")}>Desistência</Button></div>
            </div>
          ) : (
            <Card style={{ padding: "14px 16px", background: "rgba(255,64,64,.08)", borderColor: "rgba(255,64,64,.28)" }}>
              <div style={{ fontSize: 12.5, color: "#FF8A8A", fontWeight: 700, marginBottom: 10 }}>
                {woKind === "WO" ? "W.O." : "Desistência"} — quem é o vencedor?
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                {[a, b].map(code => (
                  <Button key={code} full variant="ghost" onClick={() => {
                    dispatch(markWalkover(match, code, woKind, { actor: "admin" }));
                    toast(`${woKind === "WO" ? "W.O." : "Desistência"} registrado`); setWoKind(null);
                  }}>{teamName(code)}</Button>
                ))}
              </div>
              <Button full variant="ghost" onClick={() => setWoKind(null)}>Cancelar</Button>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Notificações ----------
export function NotificationsScreen({ notifications, onMarkAllRead }) {
  return (
    <div style={{ padding: "0 20px 110px" }}>
      <AppBar subtitle="Central" title="Notificações"
        right={notifications.some(n => !n.read)
          ? <button onClick={onMarkAllRead} style={{ background: "rgba(242,228,201,.08)", border: "1px solid rgba(242,228,201,.14)",
              color: "#C9BBA0", borderRadius: 10, padding: "8px 11px", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>Marcar lidas</button>
          : null} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {notifications.length === 0 && <div style={{ fontSize: 13, color: "#8a7d63", padding: "16px 0" }}>Sem notificações.</div>}
        {notifications.map(n => (
          <Card key={n.id} style={{ padding: "12px 14px", opacity: n.read ? 0.6 : 1,
            borderColor: !n.read ? "rgba(155,107,255,.3)" : "rgba(242,228,201,.1)" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <StatusDot type={n.type} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: "#FBF7EE", fontWeight: 600, lineHeight: 1.35 }}>{n.text}</div>
                <div style={{ fontSize: 10.5, color: "#8a7d63", marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>{timeAgo(n.ts)} · {n.audience}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------- Auditoria ----------
export function AuditScreen({ audits }) {
  return (
    <div style={{ padding: "0 20px 110px" }}>
      <AppBar subtitle="Rastreabilidade" title="Log de auditoria" />
      <div style={{ fontSize: 11.5, color: "#8a7d63", marginBottom: 14, lineHeight: 1.4 }}>
        Cada ação registra perfil, alvo, data/hora e sessão. Campo de IP reservado (preenchido quando houver backend).
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {audits.length === 0 && <div style={{ fontSize: 13, color: "#8a7d63", padding: "16px 0" }}>Nenhum registro ainda.</div>}
        {[...audits].reverse().map(au => (
          <div key={au.id} style={{ display: "flex", gap: 10, padding: "10px 12px", borderRadius: 11,
            background: "rgba(242,228,201,.04)", border: "1px solid rgba(242,228,201,.08)" }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#9B6BFF", minWidth: 64 }}>{clock(au.ts)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: "#FBF7EE", fontWeight: 600 }}>{au.action}</div>
              <div style={{ fontSize: 10.5, color: "#8a7d63", marginTop: 2 }}>
                <b style={{ color: "#C9BBA0", textTransform: "uppercase" }}>{au.actor}</b>
                {au.matchId ? ` · ${au.matchId}` : ""}{au.detail ? ` · ${au.detail}` : ""}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusDot({ type }) {
  const c = { go: "#5FC97E", done: "#5FC97E", fire: "#FF8A2E", live: "#9B6BFF", info: "#4C8DFF", alert: "#FF4D4D" }[type] || "#8a7d63";
  return <span style={{ width: 9, height: 9, borderRadius: 99, background: c, marginTop: 5, flexShrink: 0 }} />;
}
function clock(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}
function timeAgo(ts) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return "agora";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  return `${Math.floor(s / 3600)} h`;
}
