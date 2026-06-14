// ============================================================================
// engine.ts — Lógica pura da operação v1 (sem Supabase, sem React).
// Porta as regras do motor legado (src/engine.js) para o schema normalizado:
// mista condicional, classificação com desempates oficiais e geração de chaves.
// ============================================================================
import type { Court, Lineup, Match, MatchStatus, Presence, Result, Team } from "./types";

export type GameType = "Feminino" | "Masculino" | "Mista";
export const GAME_TYPES: GameType[] = ["Feminino", "Masculino", "Mista"];

// Ordem do fluxo — usada para nunca regredir o status por uma ação atrasada
// (ex.: capitão marca presença depois que o ADM já liberou a quadra).
const STATUS_ORDER: MatchStatus[] = [
  "Aguardando escalação",
  "Escalação parcial",
  "Escalações recebidas",
  "Aguardando presença",
  "Pronto para quadra",
  "Liberado para quadra",
  "Em andamento",
  "Resultado pendente",
  "Finalizado",
];

// Status fora do fluxo normal (Fase 3): contestação e encerramentos administrativos.
export const TERMINAL_STATUSES: MatchStatus[] = ["Finalizado", "W.O.", "Desistência"];

/** Confronto encerrado (resultado em quadra, W.O. ou desistência) — conta para a classificação. */
export function isTerminal(s: MatchStatus): boolean {
  return TERMINAL_STATUSES.includes(s);
}

export function statusRank(s: MatchStatus): number {
  return STATUS_ORDER.indexOf(s);
}

/** true se `next` avança o fluxo em relação ao status atual. */
export function isForward(current: MatchStatus, next: MatchStatus): boolean {
  // Fora do fluxo (contestado, W.O., desistência) nada avança por ação atrasada.
  if (statusRank(current) === -1) return false;
  return statusRank(next) > statusRank(current);
}

// ---------------------------------------------------------------------------
// Resultados / mista condicional
// ---------------------------------------------------------------------------
export interface MatchGames {
  fem: Result | null;
  masc: Result | null;
  mista: Result | null;
}

export function resultsFor(match: Match, results: Result[]): MatchGames {
  const rs = results.filter((r) => r.match_id === match.id);
  const get = (t: GameType) => rs.find((r) => r.game_type === t) ?? null;
  return { fem: get("Feminino"), masc: get("Masculino"), mista: get("Mista") };
}

/** Lado vencedor de uma parcial: 'a', 'b' ou null. */
export function winnerSide(match: Match, r: Result | null): "a" | "b" | null {
  if (!r) return null;
  if (r.winner_team_id && (r.winner_team_id === match.team_a_id || r.winner_team_id === match.team_b_id)) {
    return r.winner_team_id === match.team_a_id ? "a" : "b";
  }
  if (r.winner_team_name === match.team_a_name) return "a";
  if (r.winner_team_name === match.team_b_name) return "b";
  return null;
}

/** Partidas vencidas por cada equipe no confronto. */
export function gameWins(match: Match, results: Result[]): { a: number; b: number } {
  const g = resultsFor(match, results);
  let a = 0;
  let b = 0;
  [g.fem, g.masc, g.mista].forEach((r) => {
    const w = winnerSide(match, r);
    if (w === "a") a++;
    if (w === "b") b++;
  });
  return { a, b };
}

/** 1×1 após feminino e masculino, mista ainda sem vencedora → mista decide. */
export function needsMista(match: Match, results: Result[]): boolean {
  const g = resultsFor(match, results);
  const wf = winnerSide(match, g.fem);
  const wm = winnerSide(match, g.masc);
  if (!wf || !wm) return false;
  return wf !== wm && !winnerSide(match, g.mista);
}

/** Confronto decidido: 2×0 nas duas primeiras, ou mista já definida. */
export function confrontoDecided(match: Match, results: Result[]): boolean {
  const g = resultsFor(match, results);
  const wf = winnerSide(match, g.fem);
  const wm = winnerSide(match, g.masc);
  if (!wf || !wm) return false;
  if (wf === wm) return true;
  return !!winnerSide(match, g.mista);
}

export function matchWinnerSide(match: Match, results: Result[]): "a" | "b" | null {
  if (!confrontoDecided(match, results)) return null;
  const { a, b } = gameWins(match, results);
  return a > b ? "a" : "b";
}

// ---------------------------------------------------------------------------
// Classificação automática (regras idênticas ao legado)
// Desempate: 1) vitórias de confronto  2) partidas vencidas  3) saldo de games
//            4) confronto direto       5) total de games pró
// Convenção de placar: "games do vencedor - games do perdedor" (ex.: 6-3).
// ---------------------------------------------------------------------------
export interface StandingRow {
  key: string;
  name: string;
  abbreviation: string | null;
  flag: string | null;
  j: number;
  v: number;
  d: number;
  sv: number; // partidas (sets) vencidas
  gp: number; // games pró
  gc: number; // games contra
}

function teamKey(match: Match, side: "a" | "b"): string {
  return (side === "a" ? match.team_a_id || match.team_a_name : match.team_b_id || match.team_b_name) || "?";
}

export function computeStandings(matches: Match[], results: Result[]): StandingRow[] {
  const table = new Map<string, StandingRow>();
  const h2h = new Map<string, number>(); // `${winner}|${loser}` → confrontos vencidos no duelo

  const ensure = (match: Match, side: "a" | "b") => {
    const key = teamKey(match, side);
    if (!table.has(key)) {
      table.set(key, {
        key,
        name: (side === "a" ? match.team_a_name : match.team_b_name) || "—",
        abbreviation: side === "a" ? match.team_a_abbreviation : match.team_b_abbreviation,
        flag: side === "a" ? match.team_a_flag : match.team_b_flag,
        j: 0, v: 0, d: 0, sv: 0, gp: 0, gc: 0,
      });
    }
    return table.get(key)!;
  };

  matches.forEach((m) => ensure(m, "a") && ensure(m, "b"));

  matches
    .filter((m) => isTerminal(m.match_status))
    .forEach((m) => {
      const a = ensure(m, "a");
      const b = ensure(m, "b");
      const wins = gameWins(m, results);
      a.j++; b.j++;
      if (wins.a > wins.b) {
        a.v++; b.d++;
        const k = `${a.key}|${b.key}`;
        h2h.set(k, (h2h.get(k) || 0) + 1);
      } else if (wins.b > wins.a) {
        b.v++; a.d++;
        const k = `${b.key}|${a.key}`;
        h2h.set(k, (h2h.get(k) || 0) + 1);
      }
      const g = resultsFor(m, results);
      [g.fem, g.masc, g.mista].forEach((r) => {
        const w = winnerSide(m, r);
        if (!w || !r) return;
        const winner = w === "a" ? a : b;
        const loser = w === "a" ? b : a;
        winner.sv++;
        const [gw, gl] = (r.score || "").split("-").map((n) => parseInt(n, 10));
        if (!Number.isFinite(gw) || !Number.isFinite(gl)) return; // "W.O." etc.
        winner.gp += gw; winner.gc += gl;
        loser.gp += gl; loser.gc += gw;
      });
    });

  const saldo = (r: StandingRow) => r.gp - r.gc;
  return [...table.values()].sort((x, y) => {
    if (y.v !== x.v) return y.v - x.v;
    if (y.sv !== x.sv) return y.sv - x.sv;
    if (saldo(y) !== saldo(x)) return saldo(y) - saldo(x);
    const direct = (h2h.get(`${y.key}|${x.key}`) || 0) - (h2h.get(`${x.key}|${y.key}`) || 0);
    if (direct !== 0) return direct;
    return y.gp - x.gp;
  });
}

// ---------------------------------------------------------------------------
// Eliminatórias pós-grupos
// ---------------------------------------------------------------------------
export const KNOCKOUT_PHASES = ["Quartas de final", "Semifinal", "Final", "Disputa de 3º lugar"] as const;
export type KnockoutPhase = (typeof KNOCKOUT_PHASES)[number];

export interface TeamSlot {
  id: string | null;
  name: string;
  abbreviation: string | null;
  flag: string | null;
  seedLabel?: string;
}

export interface KnockoutMatchPlan {
  phase: KnockoutPhase;
  round: string;
  teamA: TeamSlot;
  teamB: TeamSlot;
}

export interface KnockoutPlan {
  label: string;
  reason: string | null;
  rows: KnockoutMatchPlan[];
}

export function isGroupPhase(value: string | null): value is string {
  return /^Grupo\s+\d+$/i.test((value ?? "").trim());
}

export function isKnockoutPhase(value: string | null): value is KnockoutPhase {
  return KNOCKOUT_PHASES.includes((value ?? "") as KnockoutPhase);
}

function groupNumber(value: string): number {
  const [, n] = value.match(/\d+/) ?? [];
  return Number(n) || 0;
}

function sideSlot(match: Match, side: "a" | "b", seedLabel?: string): TeamSlot {
  return {
    id: sideTeamId(match, side),
    name: sideTeamName(match, side),
    abbreviation: side === "a" ? match.team_a_abbreviation : match.team_b_abbreviation,
    flag: side === "a" ? match.team_a_flag : match.team_b_flag,
    seedLabel,
  };
}

function slotFromStanding(row: StandingRow, groupMatches: Match[], seedLabel: string): TeamSlot {
  for (const m of groupMatches) {
    if (m.team_a_id === row.key || m.team_a_name === row.name) return sideSlot(m, "a", seedLabel);
    if (m.team_b_id === row.key || m.team_b_name === row.name) return sideSlot(m, "b", seedLabel);
  }
  return {
    id: null,
    name: row.name,
    abbreviation: row.abbreviation,
    flag: row.flag,
    seedLabel,
  };
}

function orderedKnockoutMatches(matches: Match[], phase: KnockoutPhase): Match[] {
  return matches
    .filter((m) => m.group_or_phase === phase)
    .sort((a, b) => {
      const an = Number(a.round?.match(/\d+/)?.[0] ?? 0);
      const bn = Number(b.round?.match(/\d+/)?.[0] ?? 0);
      if (an !== bn) return an - bn;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
}

function completed(matches: Match[]): boolean {
  return matches.length > 0 && matches.every((m) => isTerminal(m.match_status));
}

function winnerSlot(match: Match, results: Result[], seedLabel?: string): TeamSlot | null {
  const side = matchWinnerSide(match, results);
  return side ? sideSlot(match, side, seedLabel) : null;
}

function loserSlot(match: Match, results: Result[], seedLabel?: string): TeamSlot | null {
  const side = matchWinnerSide(match, results);
  if (!side) return null;
  return sideSlot(match, side === "a" ? "b" : "a", seedLabel);
}

export function buildInitialKnockoutPlan(categoryName: string, matches: Match[], results: Result[]): KnockoutPlan {
  const categoryMatches = matches.filter((m) => m.category_name === categoryName);
  const knockoutExists = categoryMatches.some((m) => isKnockoutPhase(m.group_or_phase));
  if (knockoutExists) {
    return { label: "Eliminatórias já criadas", reason: "Esta categoria já tem confrontos eliminatórios.", rows: [] };
  }

  const groups = [...new Set(categoryMatches.map((m) => m.group_or_phase).filter(isGroupPhase))]
    .sort((a, b) => groupNumber(a) - groupNumber(b));
  if (![1, 2, 4].includes(groups.length)) {
    return {
      label: "Aguardando grupos",
      reason: "As eliminatórias automáticas esperam 1, 2 ou 4 grupos fechados.",
      rows: [],
    };
  }

  const standingsByGroup = groups.map((group) => {
    const groupMatches = categoryMatches.filter((m) => m.group_or_phase === group);
    const allFinished = groupMatches.length > 0 && groupMatches.every((m) => isTerminal(m.match_status));
    const standings = computeStandings(groupMatches, results);
    return { group, groupMatches, allFinished, standings };
  });

  const pendingGroup = standingsByGroup.find((g) => !g.allFinished || g.standings.length < 2);
  if (pendingGroup) {
    return {
      label: "Aguardando grupos",
      reason: `${pendingGroup.group} ainda não tem todos os confrontos finalizados com 2 classificados.`,
      rows: [],
    };
  }

  const seed = (groupIndex: number, position: 0 | 1) => {
    const g = standingsByGroup[groupIndex];
    return slotFromStanding(g.standings[position], g.groupMatches, `${position + 1}º G${groupIndex + 1}`);
  };

  if (groups.length === 1) {
    return {
      label: "Final direta",
      reason: null,
      rows: [{ phase: "Final", round: "Final", teamA: seed(0, 0), teamB: seed(0, 1) }],
    };
  }

  if (groups.length === 2) {
    return {
      label: "Semifinais",
      reason: null,
      rows: [
        { phase: "Semifinal", round: "Semifinal 1", teamA: seed(0, 0), teamB: seed(1, 1) },
        { phase: "Semifinal", round: "Semifinal 2", teamA: seed(1, 0), teamB: seed(0, 1) },
      ],
    };
  }

  return {
    label: "Quartas de final",
    reason: null,
    rows: [
      { phase: "Quartas de final", round: "Quartas 1", teamA: seed(0, 0), teamB: seed(3, 1) },
      { phase: "Quartas de final", round: "Quartas 2", teamA: seed(1, 0), teamB: seed(2, 1) },
      { phase: "Quartas de final", round: "Quartas 3", teamA: seed(2, 0), teamB: seed(1, 1) },
      { phase: "Quartas de final", round: "Quartas 4", teamA: seed(3, 0), teamB: seed(0, 1) },
    ],
  };
}

export function buildNextKnockoutPlan(categoryName: string, matches: Match[], results: Result[]): KnockoutPlan {
  const categoryMatches = matches.filter((m) => m.category_name === categoryName);
  const quarters = orderedKnockoutMatches(categoryMatches, "Quartas de final");
  const semis = orderedKnockoutMatches(categoryMatches, "Semifinal");
  const finals = orderedKnockoutMatches(categoryMatches, "Final");
  const thirdPlace = orderedKnockoutMatches(categoryMatches, "Disputa de 3º lugar");

  if (quarters.length > 0 && semis.length === 0) {
    if (quarters.length !== 4) {
      return { label: "Quartas incompletas", reason: "A categoria tem quartas criadas em quantidade diferente de 4.", rows: [] };
    }
    if (!completed(quarters)) {
      return { label: "Aguardando quartas", reason: "Finalize todas as quartas para gerar as semifinais.", rows: [] };
    }
    const winners = quarters.map((m, i) => winnerSlot(m, results, `Vencedor Q${i + 1}`));
    if (winners.some((w) => !w)) {
      return { label: "Aguardando quartas", reason: "Há quartas finalizadas sem vencedor definido.", rows: [] };
    }
    return {
      label: "Semifinais",
      reason: null,
      rows: [
        { phase: "Semifinal", round: "Semifinal 1", teamA: winners[0]!, teamB: winners[1]! },
        { phase: "Semifinal", round: "Semifinal 2", teamA: winners[2]!, teamB: winners[3]! },
      ],
    };
  }

  if (semis.length > 0 && (finals.length === 0 || thirdPlace.length === 0)) {
    if (semis.length !== 2) {
      return { label: "Semifinais incompletas", reason: "A categoria tem semifinais criadas em quantidade diferente de 2.", rows: [] };
    }
    if (!completed(semis)) {
      return { label: "Aguardando semifinais", reason: "Finalize as semifinais para gerar final e 3º lugar.", rows: [] };
    }
    const winners = semis.map((m, i) => winnerSlot(m, results, `Vencedor SF${i + 1}`));
    const losers = semis.map((m, i) => loserSlot(m, results, `Perdedor SF${i + 1}`));
    if (winners.some((w) => !w) || losers.some((l) => !l)) {
      return { label: "Aguardando semifinais", reason: "Há semifinal finalizada sem vencedor definido.", rows: [] };
    }
    const rows: KnockoutMatchPlan[] = [];
    if (thirdPlace.length === 0) {
      rows.push({ phase: "Disputa de 3º lugar", round: "3º lugar", teamA: losers[0]!, teamB: losers[1]! });
    }
    if (finals.length === 0) {
      rows.push({ phase: "Final", round: "Final", teamA: winners[0]!, teamB: winners[1]! });
    }
    return { label: "Final e 3º lugar", reason: null, rows };
  }

  if (finals.length > 0) {
    return { label: "Chave completa", reason: "A final desta categoria já foi criada.", rows: [] };
  }

  return buildInitialKnockoutPlan(categoryName, matches, results);
}

// ---------------------------------------------------------------------------
// Geração de chaves: distribuição em serpentina + round-robin (algoritmo do círculo)
// ---------------------------------------------------------------------------
export function distributeGroups<T>(teams: T[], groupCount: number): T[][] {
  const groups: T[][] = Array.from({ length: Math.max(1, groupCount) }, () => []);
  teams.forEach((t, i) => {
    const lap = Math.floor(i / groups.length);
    const pos = i % groups.length;
    const g = lap % 2 === 0 ? pos : groups.length - 1 - pos; // serpentina
    groups[g].push(t);
  });
  return groups.filter((g) => g.length > 0);
}

/** Rodadas de um grupo: cada rodada é uma lista de duplas [A, B]. */
export function roundRobin<T>(teams: T[]): [T, T][][] {
  const list: (T | null)[] = [...teams];
  if (list.length < 2) return [];
  if (list.length % 2 === 1) list.push(null); // bye
  const n = list.length;
  const rounds: [T, T][][] = [];
  const rot = list.slice(1); // o primeiro fica fixo; os demais giram
  for (let r = 0; r < n - 1; r++) {
    const lineup = [list[0], ...rot];
    const pairs: [T, T][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = lineup[i];
      const b = lineup[n - 1 - i];
      if (a !== null && b !== null) pairs.push([a, b]);
    }
    rounds.push(pairs);
    rot.unshift(rot.pop()!);
  }
  return rounds;
}

// ---------------------------------------------------------------------------
// Prontidão (formato Lovable): buckets por status + estado da mista
// ---------------------------------------------------------------------------
export type ReadinessBucket =
  | "pendentes"
  | "escalacoes"
  | "prontos"
  | "em_quadra"
  | "resultado"
  | "finalizados";

export const READINESS_BUCKETS: Array<{ key: ReadinessBucket; label: string }> = [
  { key: "pendentes", label: "Pendentes" },
  { key: "escalacoes", label: "Escalações" },
  { key: "prontos", label: "Prontos" },
  { key: "em_quadra", label: "Em quadra" },
  { key: "resultado", label: "Resultado" },
  { key: "finalizados", label: "Final." },
];

export function readinessBucket(status: MatchStatus): ReadinessBucket {
  switch (status) {
    case "Aguardando escalação":
    case "Escalação parcial":
      return "pendentes";
    case "Escalações recebidas":
    case "Aguardando presença":
      return "escalacoes";
    case "Pronto para quadra":
      return "prontos";
    case "Liberado para quadra":
    case "Em andamento":
      return "em_quadra";
    case "Resultado pendente":
    case "Resultado contestado":
      return "resultado";
    case "Finalizado":
    case "W.O.":
    case "Desistência":
      return "finalizados";
  }
}

export type MixedState = "nao_necessaria" | "se_necessario" | "necessaria" | "jogada";

export const MIXED_LABEL: Record<MixedState, string> = {
  nao_necessaria: "Mista: não necessária",
  se_necessario: "Mista: se necessário",
  necessaria: "Mista: necessária",
  jogada: "Mista: jogada",
};

export function mixedState(match: Match, results: Result[]): MixedState {
  const g = resultsFor(match, results);
  if (winnerSide(match, g.mista)) return "jogada";
  const wf = winnerSide(match, g.fem);
  const wm = winnerSide(match, g.masc);
  if (!wf || !wm) return "se_necessario";
  return wf === wm ? "nao_necessaria" : "necessaria";
}

/** Linha de presença de um lado do confronto (ou null). */
export function sidePresence(match: Match, presence: Presence[], side: "a" | "b"): Presence | null {
  const teamId = sideTeamId(match, side);
  const teamName = sideTeamName(match, side);
  return (
    presence.find(
      (p) => p.match_id === match.id && (teamId ? p.team_id === teamId : p.team_name === teamName),
    ) ?? null
  );
}

/** Escalação de um lado do confronto (ou null). */
export function sideLineup(match: Match, lineups: Lineup[], side: "a" | "b"): Lineup | null {
  const teamId = sideTeamId(match, side);
  const teamName = sideTeamName(match, side);
  return (
    lineups.find(
      (l) => l.match_id === match.id && (teamId ? l.team_id === teamId : l.team_name === teamName),
    ) ?? null
  );
}

// ---------------------------------------------------------------------------
// Quadras
// ---------------------------------------------------------------------------
export function isCourtFree(c: Court): boolean {
  return !c.current_match_id && c.court_status !== "Ocupada";
}

export function courtLabel(c: Court): string {
  return `Quadra ${c.court_number}`;
}

/** Status original de uma quadra ao ser liberada (11–13 são Escape). */
export function idleCourtStatus(c: Court): string {
  return c.court_number > 10 ? "Escape" : "Livre";
}

export function matchLabel(m: Match): string {
  const a = m.team_a_abbreviation || m.team_a_name || "?";
  const b = m.team_b_abbreviation || m.team_b_name || "?";
  return `${a} × ${b}${m.category_name ? ` · Cat. ${m.category_name}` : ""}`;
}

export function sideTeamName(m: Match, side: "a" | "b"): string {
  return (side === "a" ? m.team_a_name : m.team_b_name) || "—";
}

export function sideTeamId(m: Match, side: "a" | "b"): string | null {
  return side === "a" ? m.team_a_id : m.team_b_id;
}

export function teamSide(m: Match, team: Pick<Team, "id" | "team_name">): "a" | "b" | null {
  if (m.team_a_id === team.id || m.team_a_name === team.team_name) return "a";
  if (m.team_b_id === team.id || m.team_b_name === team.team_name) return "b";
  return null;
}

// ---------------------------------------------------------------------------
// Transferência para o LetzPlay (digitação manual).
// As chaves rodam no LetzPlay; o app é a fonte das escalações. Para digitar um
// jogo lá, precisamos das DUAS duplas (uma de cada seleção). Logo, um confronto
// só fica "pronto para o LetzPlay" quando as duas escalações foram enviadas.
// ---------------------------------------------------------------------------
export type LetzplayStage = "aguardando" | "pronto" | "enviado";

export interface Pair {
  p1: string;
  p2: string;
}

export interface LineupTriple {
  feminina: Pair | null;
  masculina: Pair | null;
  mista: Pair | null;
}

export interface LetzplayMatch {
  match: Match;
  stage: LetzplayStage;
  /** Lados ainda sem escalação enviada (para cobrar o capitão). */
  pendingSides: ("a" | "b")[];
  a: LineupTriple | null;
  b: LineupTriple | null;
}

function pair(p1: string | null, p2: string | null): Pair | null {
  const a = (p1 || "").trim();
  const b = (p2 || "").trim();
  if (!a && !b) return null;
  return { p1: a || "—", p2: b || "—" };
}

function tripleFromLineup(l: Lineup | undefined): LineupTriple | null {
  if (!l) return null;
  return {
    feminina: pair(l.female_player_1, l.female_player_2),
    masculina: pair(l.male_player_1, l.male_player_2),
    mista: pair(l.mixed_player_1, l.mixed_player_2),
  };
}

/** Escalação considerada confirmada para transferência (capitão já enviou). */
function isSubmitted(l: Lineup | undefined): boolean {
  return !!l && (l.lineup_status === "Enviada" || l.lineup_status === "Confirmada");
}

export function buildLetzplayMatch(match: Match, lineups: Lineup[]): LetzplayMatch {
  const forMatch = lineups.filter((l) => l.match_id === match.id);
  const pick = (side: "a" | "b") => {
    const teamId = sideTeamId(match, side);
    const teamName = sideTeamName(match, side);
    return forMatch.find((l) =>
      teamId ? l.team_id === teamId : l.team_name === teamName,
    );
  };
  const la = pick("a");
  const lb = pick("b");
  const pendingSides: ("a" | "b")[] = [];
  if (!isSubmitted(la)) pendingSides.push("a");
  if (!isSubmitted(lb)) pendingSides.push("b");

  const stage: LetzplayStage = match.letzplay_synced_at
    ? "enviado"
    : pendingSides.length === 0
      ? "pronto"
      : "aguardando";

  return {
    match,
    stage,
    pendingSides,
    a: tripleFromLineup(la),
    b: tripleFromLineup(lb),
  };
}

/** Texto pronto para colar/conferir ao digitar o confronto no LetzPlay. */
export function letzplayClipboardText(lm: LetzplayMatch): string {
  const m = lm.match;
  const head = `${sideTeamName(m, "a")} x ${sideTeamName(m, "b")} — Cat. ${m.category_name ?? "?"}` +
    `${m.group_or_phase ? ` · ${m.group_or_phase}` : ""}${m.scheduled_time ? ` · ${m.scheduled_time}` : ""}`;
  const lines = [head];
  const block = (label: string, key: keyof LineupTriple, onlyIfMista = false) => {
    const pa = lm.a?.[key] ?? null;
    const pb = lm.b?.[key] ?? null;
    if (!pa && !pb) return;
    lines.push(label + (onlyIfMista ? " (só se 1x1)" : ""));
    lines.push(`  ${sideTeamName(m, "a")}: ${pa ? `${pa.p1} / ${pa.p2}` : "—"}`);
    lines.push(`  ${sideTeamName(m, "b")}: ${pb ? `${pb.p1} / ${pb.p2}` : "—"}`);
  };
  block("Feminino", "feminina");
  block("Masculino", "masculina");
  block("Mista", "mista", true);
  return lines.join("\n");
}
