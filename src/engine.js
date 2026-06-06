// ============================================================================
// engine.js — Máquina de status operacional + transições + auditoria
// ----------------------------------------------------------------------------
// Backbone da Central Operacional. Toda mudança de estado de um confronto passa
// por aqui: as funções de transição são PURAS (recebem um match, devolvem um
// novo match + entradas de auditoria + notificações). O App apenas aplica.
//
// MODELO RELACIONAL (documentado — implementado em memória/localStorage nesta
// fase; mapeia 1:1 para tabelas Supabase numa fase futura):
//
//   events(id, title, edition, category)                  → EVENT (data.js)
//   categories(id, label, loaded, schedule)               → CATEGORIES (data.js)
//   teams(code, name, flag)                               → TEAMS (data.js)
//   captains(id, team_code, name)                         → (demo: 1 capitão = BRA)
//   athletes(id, team_code, name, gender)                 → TEAMS[code].women/men
//   groups(id, category_id, name, team_codes[])           → CATEGORY_DRAWS
//   matches(id, category, phase, court, time, a, b,        → MATCHES (data.js)
//           status, warmup_ends_at)
//   lineups(match_id, team_code, status, fem[], masc[],   → match.lineups[code]
//           mista{w,m})
//   courts(name) + court_state(derivado)                  → courtsFromMatches()
//   results(match_id, game_key, winner, score)            → match.games[key]
//   results_meta(match_id, submitted_by, validated,        → match.result
//                contested, reason)
//   standings(category, group, ...)                       → computeStandings()
//   playoffs(...)                                          → Fase 2
//   notifications(id, ts, type, text, audience, read)     → app.notifications
//   audits(id, ts, actor, action, match_id, detail, ip,   → app.audits
//          session_id)
// ============================================================================

// ---- Status canônicos (cada um com cor própria via STATUS_FLOW_META) ----
export const STATUS = {
  AGUARDANDO_ESCALACAO: "AGUARDANDO_ESCALACAO",
  ESCALACAO_ENVIADA: "ESCALACAO_ENVIADA",
  AGUARDANDO_VALIDACAO: "AGUARDANDO_VALIDACAO",
  AGUARDANDO_QUADRA: "AGUARDANDO_QUADRA",
  AQUECIMENTO: "AQUECIMENTO",
  EM_JOGO: "EM_JOGO",
  AGUARDANDO_RESULTADO: "AGUARDANDO_RESULTADO",
  RESULTADO_CONTESTADO: "RESULTADO_CONTESTADO",
  FINALIZADO: "FINALIZADO",
  WO: "WO",
  DESISTENCIA: "DESISTENCIA",
};

export const STATUS_FLOW_META = {
  [STATUS.AGUARDANDO_ESCALACAO]: { label: "Aguardando escalação", tone: "muted", short: "Escalar" },
  [STATUS.ESCALACAO_ENVIADA]:    { label: "Escalação enviada",     tone: "sand",  short: "Parcial" },
  [STATUS.AGUARDANDO_VALIDACAO]: { label: "Aguardando validação",  tone: "warn",  short: "Validar" },
  [STATUS.AGUARDANDO_QUADRA]:    { label: "Aguardando quadra",     tone: "go",    short: "Liberar" },
  [STATUS.AQUECIMENTO]:          { label: "Aquecimento",           tone: "fire",  short: "Aquecendo" },
  [STATUS.EM_JOGO]:              { label: "Em jogo",               tone: "live",  short: "Ao vivo" },
  [STATUS.AGUARDANDO_RESULTADO]: { label: "Aguardando resultado",  tone: "info",  short: "Resultado" },
  [STATUS.RESULTADO_CONTESTADO]: { label: "Resultado contestado",  tone: "alert", short: "Contestado" },
  [STATUS.FINALIZADO]:           { label: "Finalizado",            tone: "done",  short: "Final" },
  [STATUS.WO]:                   { label: "W.O.",                  tone: "alert", short: "W.O." },
  [STATUS.DESISTENCIA]:          { label: "Desistência",           tone: "alert", short: "Desist." },
};

// Statuses que pulsam (chamam atenção) na UI
export const PULSING = new Set([STATUS.AQUECIMENTO, STATUS.EM_JOGO, STATUS.RESULTADO_CONTESTADO]);

// Migração dos status legados (protótipo antigo) → canônicos
export const LEGACY_MAP = {
  aguardando: STATUS.AGUARDANDO_ESCALACAO,
  parcial: STATUS.ESCALACAO_ENVIADA,
  pronto: STATUS.AGUARDANDO_QUADRA,
  andamento: STATUS.EM_JOGO,
  mista: STATUS.EM_JOGO,
  finalizado: STATUS.FINALIZADO,
  wo: STATUS.WO,
  desistencia: STATUS.DESISTENCIA,
};

export const WARMUP_MS = 6 * 60 * 1000;

const TERMINAL = new Set([STATUS.FINALIZADO, STATUS.WO, STATUS.DESISTENCIA]);
const LOCKED = new Set([
  STATUS.AQUECIMENTO, STATUS.EM_JOGO, STATUS.AGUARDANDO_RESULTADO,
  STATUS.RESULTADO_CONTESTADO, STATUS.FINALIZADO, STATUS.WO, STATUS.DESISTENCIA,
]);

export const isTerminal = s => TERMINAL.has(s);
export const isLive = s => s === STATUS.AQUECIMENTO || s === STATUS.EM_JOGO;

// ---- Identidade / sessão (auditoria) ----
const SESSION_ID = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
export function uid(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function makeAudit({ actor, action, matchId = null, detail = "" }) {
  return { id: uid("aud"), ts: Date.now(), actor, action, matchId, detail, ip: null, sessionId: SESSION_ID };
}

export function makeNotification({ type = "info", text, audience = "all" }) {
  return { id: uid("ntf"), ts: Date.now(), type, text, audience, read: false };
}

// ---- Derivações ----
function lineupStatuses(match) {
  return Object.values(match.lineups).map(l => l.status);
}

export function deriveStatusFromLineups(match) {
  const ls = lineupStatuses(match);
  if (ls.length && ls.every(s => s === "validada")) return STATUS.AGUARDANDO_QUADRA;
  if (ls.length && ls.every(s => s === "enviada" || s === "validada")) return STATUS.AGUARDANDO_VALIDACAO;
  if (ls.some(s => s === "enviada" || s === "validada")) return STATUS.ESCALACAO_ENVIADA;
  return STATUS.AGUARDANDO_ESCALACAO;
}

const MATCH_DEFAULTS = match => ({
  warmupEndsAt: null,
  presence: { [match.a]: false, [match.b]: false },
  result: { submittedBy: null, submittedAt: null, validated: false, contested: false, reason: null, type: null },
});

// Garante shape + migra status legado + deriva fase de escalação quando aplicável
export function normalizeMatch(match) {
  const migrated = LEGACY_MAP[match.status] || match.status;
  const m = {
    ...MATCH_DEFAULTS(match),
    ...match,
    presence: { [match.a]: false, [match.b]: false, ...(match.presence || {}) },
    result: { ...MATCH_DEFAULTS(match).result, ...(match.result || {}) },
    status: migrated,
  };
  if (LOCKED.has(m.status)) return m;
  return { ...m, status: deriveStatusFromLineups(m) };
}

export function gameWins(match) {
  let a = 0, b = 0;
  ["fem", "masc", "mista"].forEach(k => {
    const g = match.games[k];
    if (g && g.winner) (g.winner === match.a ? a++ : b++);
  });
  return { a, b };
}

// 1×1 após os dois primeiros jogos e mista ainda não decidida
export function needsMista(match) {
  const f = match.games.fem, m = match.games.masc, x = match.games.mista;
  if (!f?.winner || !m?.winner) return false;
  const aw = [f, m].filter(g => g.winner === match.a).length;
  return aw === 1 && !x?.winner;
}

// Confronto tem vencedor definido (2×0 ou mista decidida)
export function confrontoDecided(match) {
  const f = match.games.fem, m = match.games.masc, x = match.games.mista;
  if (!f?.winner || !m?.winner) return false;
  const aw = [f, m].filter(g => g.winner === match.a).length;
  if (aw === 2 || aw === 0) return true;
  return !!x?.winner;
}

export function warmupRemaining(match, now = Date.now()) {
  if (match.status !== STATUS.AQUECIMENTO || !match.warmupEndsAt) return 0;
  return Math.max(0, match.warmupEndsAt - now);
}

// Estado de cada quadra a partir da lista de confrontos
export function courtsFromMatches(matches) {
  const byCourt = {};
  matches.forEach(m => {
    (byCourt[m.court] = byCourt[m.court] || []).push(m);
  });
  return Object.keys(byCourt).sort().map(court => {
    const list = byCourt[court];
    const current = list.find(m => isLive(m.status) || m.status === STATUS.AGUARDANDO_RESULTADO || m.status === STATUS.RESULTADO_CONTESTADO);
    const next = list
      .filter(m => !isTerminal(m.status) && m !== current)
      .sort((x, y) => x.time.localeCompare(y.time))[0];
    return { court, current, next, total: list.length };
  });
}

export function kpisFromMatches(matches, categories = []) {
  const count = pred => matches.filter(pred).length;
  const courts = courtsFromMatches(matches);
  const occupied = courts.filter(c => c.current).length;
  const finishedDurations = matches
    .filter(m => isTerminal(m.status) && m.result?.submittedAt)
    .map(() => 18 + Math.round(Math.random() * 0)); // duração média estimada (min) — refinar com timestamps reais na Fase 2
  const avg = finishedDurations.length ? Math.round(finishedDurations.reduce((a, b) => a + b, 0) / finishedDurations.length) : 18;
  return {
    jogosDia: matches.length,
    emAndamento: count(m => isLive(m.status)),
    finalizados: count(m => isTerminal(m.status)),
    aguardandoResultado: count(m => m.status === STATUS.AGUARDANDO_RESULTADO || m.status === STATUS.RESULTADO_CONTESTADO),
    aguardandoValidacao: count(m => m.status === STATUS.AGUARDANDO_VALIDACAO),
    quadrasOcupadas: occupied,
    quadrasLivres: Math.max(0, courts.length - occupied),
    categoriasAtivas: categories.filter(c => c.loaded).length,
    tempoMedio: avg,
  };
}

// ============================================================================
// Transições (puras). Cada uma devolve { match, audits, notifications }.
// ============================================================================
function tx(match, audits = [], notifications = []) {
  return { match, audits, notifications };
}

function teamLabel(match, code, teams) {
  return teams?.[code]?.name || code;
}

// Capitão envia a escalação (jogos 1 e 2)
export function submitLineup(match, code, payload, { actor = "capitao", teams } = {}) {
  const lineups = { ...match.lineups, [code]: { ...payload, status: "enviada" } };
  const next = normalizeMatch({ ...match, lineups });
  return tx(next,
    [makeAudit({ actor, action: "Escalação enviada", matchId: match.id, detail: teamLabel(match, code, teams) })],
    [makeNotification({ type: "info", text: `Escalação enviada — ${teamLabel(match, code, teams)} (${match.id})`, audience: "admin" })]);
}

// Capitão salva rascunho (sem transição de status final)
export function saveDraftLineup(match, code, payload) {
  const lineups = { ...match.lineups, [code]: { ...payload, status: "rascunho" } };
  return tx(normalizeMatch({ ...match, lineups }));
}

// Capitão envia dupla mista (sub-fase de EM_JOGO)
export function submitMista(match, code, mista) {
  const lineups = { ...match.lineups, [code]: { ...match.lineups[code], mista } };
  return tx({ ...match, lineups });
}

// ADM valida as escalações enviadas
export function validateLineups(match, { actor = "admin" } = {}) {
  const lineups = { ...match.lineups };
  Object.keys(lineups).forEach(k => {
    if (lineups[k].status === "enviada") lineups[k] = { ...lineups[k], status: "validada" };
  });
  const next = normalizeMatch({ ...match, lineups });
  const ready = next.status === STATUS.AGUARDANDO_QUADRA;
  return tx(next,
    [makeAudit({ actor, action: "Escalações validadas", matchId: match.id })],
    [makeNotification({ type: "go", text: `Escalação aprovada — ${match.id}`, audience: "capitao" })]);
}

// ADM libera a quadra → inicia aquecimento de 6 min
export function releaseCourt(match, { actor = "admin", now = Date.now() } = {}) {
  const next = { ...match, status: STATUS.AQUECIMENTO, warmupEndsAt: now + WARMUP_MS };
  return tx(next,
    [makeAudit({ actor, action: "Quadra liberada", matchId: match.id, detail: match.court })],
    [makeNotification({ type: "fire", text: `Quadra liberada — ${match.court} (${match.id}) · aquecimento 6:00`, audience: "all" })]);
}

// Cronômetro zera (ou início manual) → EM_JOGO
export function warmupToPlay(match, { actor = "sistema" } = {}) {
  const next = { ...match, status: STATUS.EM_JOGO, warmupEndsAt: null };
  return tx(next,
    [makeAudit({ actor, action: "Partida iniciada", matchId: match.id })],
    [makeNotification({ type: "live", text: `Partida iniciada — ${match.id}`, audience: "all" })]);
}

// Árbitro confirma presença de uma equipe
export function setPresence(match, code, present, { actor = "arbitro" } = {}) {
  const next = { ...match, presence: { ...match.presence, [code]: present } };
  return tx(next, [makeAudit({ actor, action: present ? "Presença confirmada" : "Presença removida", matchId: match.id, detail: code })]);
}

// Árbitro registra placar de um jogo (fem/masc/mista)
export function recordGame(match, gameKey, result, { actor = "arbitro" } = {}) {
  const games = { ...match.games, [gameKey]: result };
  const next = { ...match, games };
  return tx(next, [makeAudit({ actor, action: "Placar registrado", matchId: match.id, detail: `${gameKey} ${result.score}` })]);
}

// Árbitro/Capitão envia o resultado final do confronto para validação
export function submitResult(match, { actor = "arbitro" } = {}) {
  const next = {
    ...match,
    status: STATUS.AGUARDANDO_RESULTADO,
    result: { ...match.result, submittedBy: actor, submittedAt: Date.now(), contested: false, reason: null },
  };
  return tx(next,
    [makeAudit({ actor, action: "Resultado lançado", matchId: match.id })],
    [makeNotification({ type: "info", text: `Resultado lançado — ${match.id} · aguardando validação`, audience: "admin" })]);
}

// ADM valida o resultado → FINALIZADO (atualiza classificação)
export function validateResult(match, { actor = "admin" } = {}) {
  const next = {
    ...match,
    status: STATUS.FINALIZADO,
    result: { ...match.result, validated: true, contested: false, reason: null },
  };
  return tx(next,
    [makeAudit({ actor, action: "Resultado validado", matchId: match.id })],
    [makeNotification({ type: "done", text: `Resultado validado — ${match.id}`, audience: "all" })]);
}

// Capitão contesta o resultado
export function contestResult(match, reason, { actor = "capitao" } = {}) {
  const next = {
    ...match,
    status: STATUS.RESULTADO_CONTESTADO,
    result: { ...match.result, contested: true, reason: reason || "Sem detalhes" },
  };
  return tx(next,
    [makeAudit({ actor, action: "Resultado contestado", matchId: match.id, detail: reason })],
    [makeNotification({ type: "alert", text: `⚠ Resultado contestado — ${match.id}: ${reason || "sem detalhes"}`, audience: "admin" })]);
}

// ADM resolve a contestação: 'validar' (mantém) ou 'reabrir' (volta a EM_JOGO)
export function resolveContest(match, decision, { actor = "admin" } = {}) {
  if (decision === "reabrir") {
    const next = {
      ...match,
      status: STATUS.EM_JOGO,
      result: { ...match.result, submittedBy: null, submittedAt: null, contested: false, reason: null, validated: false },
    };
    return tx(next,
      [makeAudit({ actor, action: "Contestação aceita — confronto reaberto", matchId: match.id })],
      [makeNotification({ type: "fire", text: `Confronto reaberto — ${match.id}`, audience: "all" })]);
  }
  const next = {
    ...match,
    status: STATUS.FINALIZADO,
    result: { ...match.result, validated: true, contested: false },
  };
  return tx(next,
    [makeAudit({ actor, action: "Contestação negada — resultado mantido", matchId: match.id })],
    [makeNotification({ type: "done", text: `Contestação negada, resultado mantido — ${match.id}`, audience: "all" })]);
}

// ADM marca W.O. / desistência (com vencedor) — sintetiza placar 2×0 p/ classificação
export function markWalkover(match, winner, kind, { actor = "admin" } = {}) {
  const loser = winner === match.a ? match.b : match.a;
  const synth = { winner, score: kind === "WO" ? "W.O." : "DESIST." };
  const next = {
    ...match,
    status: kind === "WO" ? STATUS.WO : STATUS.DESISTENCIA,
    games: { fem: { ...synth }, masc: { ...synth }, mista: null },
    result: { ...match.result, validated: true, type: kind, winner },
  };
  return tx(next,
    [makeAudit({ actor, action: kind === "WO" ? "W.O. registrado" : "Desistência registrada", matchId: match.id, detail: `vencedor ${winner}, ausente ${loser}` })],
    [makeNotification({ type: "alert", text: `${kind === "WO" ? "W.O." : "Desistência"} — ${match.id}`, audience: "all" })]);
}
