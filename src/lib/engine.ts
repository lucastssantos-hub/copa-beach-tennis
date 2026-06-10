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
