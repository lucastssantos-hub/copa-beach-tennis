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

export interface ScoreSet {
  gw: number; // games do vencedor do confronto naquele set
  gl: number; // games do perdedor naquele set
  tb: number | null; // pontos do tiebreak do PERDEDOR do set, ou null
}

/**
 * Faz o parse do placar no formato real desta Copa no LetzPlay: exatamente 1
 * set, vencedor-perdedor, com tiebreak opcional do perdedor entre parênteses.
 * Ex.: "6-3" · "7-6(4)".
 * Retorna null quando não há set numérico (ex.: "W.O.", "Desist.").
 */
export function parseScoreSets(score: string | null | undefined): ScoreSet[] | null {
  if (!score || /w\.?o\.?|desist/i.test(score)) return null;
  if (score.includes(",")) return null;
  const sets: ScoreSet[] = [];
  const m = score.trim().match(/^(\d+)\s*[-x]\s*(\d+)(?:\s*\(\s*(\d+)\s*\))?$/i);
  if (!m) return null;
  const set = { gw: Number(m[1]), gl: Number(m[2]), tb: m[3] != null ? Number(m[3]) : null };
  if (!isValidOneSetScore(set)) return null;
  sets.push(set);
  return sets;
}

export function isValidOneSetScore(set: ScoreSet): boolean {
  const { gw, gl, tb } = set;
  if (!Number.isInteger(gw) || !Number.isInteger(gl)) return false;
  if (gw === gl) return false;
  if (gw > 7 || gl > 6 || gw < 0 || gl < 0) return false;
  if (tb != null && (!Number.isInteger(tb) || tb < 0 || tb > 99)) return false;
  if (gw === 7 && gl === 6) return tb != null;
  if (tb != null) return false;
  if (gw === 7) return gl === 5;
  if (gw === 6) return gl >= 0 && gl <= 4;
  return false;
}

export function oneSetScoreHelpText(): string {
  return "LetzPlay configurado para 1 Set / 6 Games com tiebreak no 6 a 6. Informe sempre vencedor-perdedor: 6-3 ou 7-6(4).";
}

export function oneSetScoreErrorText(): string {
  return "Placar inválido. LetzPlay configurado para 1 Set / 6 Games com tiebreak no 6 a 6. Use 6-3 ou 7-6(4).";
}

export function oneSetScoreInputPlaceholder(): string {
  return "6-3 ou 7-6(4)";
}

export function oneSetScoreExamples(): string {
  return "Multi-set não é aceito, por exemplo: 6-4, 7-6(4).";
}

export function parseOneSetScore(score: string | null | undefined): ScoreSet | null {
  const sets = parseScoreSets(score);
  return sets?.[0] ?? null;
}

export function normalizeOneSetScore(score: string): string | null {
  const set = parseOneSetScore(score);
  if (!set) return null;
  return `${set.gw}-${set.gl}${set.tb != null ? `(${set.tb})` : ""}`;
}

export function scoreHasMultipleSets(score: string): boolean {
  return score.includes(",");
}

export function scoreIsTieWithoutTiebreak(score: string): boolean {
  const m = score.trim().match(/^(\d+)\s*[-x]\s*(\d+)$/i);
  return !!m && Number(m[1]) === Number(m[2]);
}

export function scoreSaldoGames(score: string | null | undefined): { gw: number; gl: number } | null {
  const set = parseOneSetScore(score);
  if (!set) return null;
  return { gw: set.gw, gl: set.gl };
}

export function sumScoreSets(score: string | null | undefined): { gw: number; gl: number } | null {
  const saldo = scoreSaldoGames(score);
  if (!saldo) return null;
  return saldo;
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
        const sets = parseScoreSets(r.score);
        if (!sets) return; // "W.O." / "Desist." — sem games numéricos no saldo
        // A Copa está configurada no LetzPlay como 1 set. O tiebreak não conta
        // como game; o saldo vem apenas do único set aceito pelo app.
        const { gw, gl } = sets[0];
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
  /** Vaga ainda não definida (grupo em andamento) — vira placeholder no banco. */
  pending?: boolean;
}

// ---------------------------------------------------------------------------
// Vagas em aberto ("adiantar" a chave com os grupos já fechados)
// ---------------------------------------------------------------------------
// Um confronto eliminatório pode ser criado antes de todos os grupos fecharem:
// o lado já definido recebe a equipe real (o capitão já escala) e o lado
// pendente guarda a vaga como texto — "A definir · 1º Grupo 1" — com id, sigla
// curta e bandeira nulos. O texto é o que permite reabrir a chave depois e
// preencher a vaga automaticamente (buildKnockoutFillPlan).
export const PENDING_SLOT_PREFIX = "A definir";

export function pendingSlotName(seedLabel: string): string {
  return `${PENDING_SLOT_PREFIX} · ${seedLabel}`;
}

export function isPendingSlotName(name: string | null | undefined): boolean {
  return (name ?? "").startsWith(`${PENDING_SLOT_PREFIX} ·`);
}

/**
 * Duas origens possíveis para uma vaga em aberto:
 *  - `grupo`   → "A definir · 1º Grupo 2"          (classificação de um grupo)
 *  - `duelo`   → "A definir · Vencedor Semifinal 1" (avanço na própria chave)
 */
export type PendingSeed =
  | { kind: "grupo"; group: string; position: number; seedLabel: string }
  | { kind: "duelo"; round: string; side: "vencedor" | "perdedor"; seedLabel: string };

export function parsePendingSlotName(name: string | null | undefined): PendingSeed | null {
  if (!isPendingSlotName(name)) return null;
  const seedLabel = (name ?? "").slice(PENDING_SLOT_PREFIX.length + 3).trim();

  const duelo = seedLabel.match(/^(Vencedor|Perdedor)\s+(.+)$/i);
  if (duelo) {
    return {
      kind: "duelo",
      round: duelo[2].trim(),
      side: duelo[1].toLowerCase() === "vencedor" ? "vencedor" : "perdedor",
      seedLabel,
    };
  }

  const grupo = seedLabel.match(/^(\d+)º\s+(.+)$/);
  if (grupo) {
    const position = Number(grupo[1]) - 1;
    if (!Number.isInteger(position) || position < 0) return null;
    return { kind: "grupo", group: grupo[2].trim(), position, seedLabel };
  }

  return null;
}

/** Sigla curta: "1º Grupo 2" → "1º G2"; "Vencedor Semifinal 1" → "Venc. SF1". */
function pendingSlotAbbreviation(seedLabel: string): string {
  return seedLabel
    .replace(/Grupo\s+/i, "G")
    .replace(/^Vencedor\s+/i, "Venc. ")
    .replace(/^Perdedor\s+/i, "Perd. ")
    .replace(/Semifinal\s+/i, "SF")
    .replace(/Quartas\s+/i, "QF");
}

function slotFromSeedLabel(seedLabel: string): TeamSlot {
  return {
    id: null,
    name: pendingSlotName(seedLabel),
    abbreviation: pendingSlotAbbreviation(seedLabel),
    flag: null,
    seedLabel,
    pending: true,
  };
}

function pendingSlot(group: string, position: number): TeamSlot {
  return slotFromSeedLabel(`${position + 1}º ${group}`);
}

/** Vaga que depende do resultado de um confronto da própria chave. */
function pendingDueloSlot(match: Match, side: "vencedor" | "perdedor"): TeamSlot {
  const round = match.round || match.group_or_phase || "confronto";
  return slotFromSeedLabel(`${side === "vencedor" ? "Vencedor" : "Perdedor"} ${round}`);
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
  /** Há vagas em aberto nas linhas geradas (grupo ainda em andamento). */
  partial?: boolean;
  /** Aviso a exibir junto da prévia quando a chave sai incompleta. */
  note?: string | null;
}

export function isGroupPhase(value: string | null): value is string {
  return /^Grupo\s+\d+$/i.test((value ?? "").trim());
}

export function isKnockoutPhase(value: string | null): value is KnockoutPhase {
  return KNOCKOUT_PHASES.includes((value ?? "") as KnockoutPhase);
}

function groupNumber(value: string): number {
  // /\d+/ não tem grupo de captura: o número está no índice 0 do match.
  return Number(value.match(/\d+/)?.[0]) || 0;
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

export interface KnockoutPlanOptions {
  /**
   * Cria a chave mesmo com grupo em andamento: os grupos já fechados entram com
   * as equipes reais (capitão escala desde já) e os demais viram vaga em aberto.
   */
  allowPartial?: boolean;
  /**
   * Cria a disputa de 3º lugar junto da final. Padrão: false — a chave desta
   * Copa no LetzPlay é SF → Final → Campeão, sem 3º lugar, e o app não pode
   * inventar um confronto que não existe lá.
   */
  thirdPlace?: boolean;
}

/** Classificação de cada grupo da categoria, na ordem Grupo 1, Grupo 2, … */
function groupStandings(categoryMatches: Match[], results: Result[]) {
  const groups = [...new Set(categoryMatches.map((m) => m.group_or_phase).filter(isGroupPhase))]
    .sort((a, b) => groupNumber(a) - groupNumber(b));
  return groups.map((group) => {
    const groupMatches = categoryMatches.filter((m) => m.group_or_phase === group);
    const allFinished = groupMatches.length > 0 && groupMatches.every((m) => isTerminal(m.match_status));
    const standings = computeStandings(groupMatches, results);
    return { group, groupMatches, allFinished, standings };
  });
}

export function buildInitialKnockoutPlan(
  categoryName: string,
  matches: Match[],
  results: Result[],
  options: KnockoutPlanOptions = {},
): KnockoutPlan {
  const categoryMatches = matches.filter((m) => m.category_name === categoryName);
  const knockoutExists = categoryMatches.some((m) => isKnockoutPhase(m.group_or_phase));
  if (knockoutExists) {
    return { label: "Eliminatórias já criadas", reason: "Esta categoria já tem confrontos eliminatórios.", rows: [] };
  }

  const standingsByGroup = groupStandings(categoryMatches, results);
  const groups = standingsByGroup.map((g) => g.group);
  if (![1, 2, 4].includes(groups.length)) {
    return {
      label: "Aguardando grupos",
      reason: "As eliminatórias automáticas esperam 1, 2 ou 4 grupos fechados.",
      rows: [],
    };
  }

  const isClosed = (g: (typeof standingsByGroup)[number]) => g.allFinished && g.standings.length >= 2;
  const openGroups = standingsByGroup.filter((g) => !isClosed(g));
  const partial = openGroups.length > 0;

  if (partial && !options.allowPartial) {
    return {
      label: "Aguardando grupos",
      reason: `${openGroups[0].group} ainda não tem todos os confrontos finalizados com 2 classificados.`,
      rows: [],
    };
  }
  if (partial && openGroups.length === standingsByGroup.length) {
    return {
      label: "Aguardando grupos",
      reason: "Nenhum grupo fechado ainda — não há classificado para adiantar.",
      rows: [],
    };
  }
  // Daqui em diante a chave sai mesmo com grupo em andamento: as vagas desses
  // grupos entram como placeholder e são preenchidas depois.
  const note = partial
    ? `${openGroups.map((g) => g.group).join(", ")} ainda em andamento: essas vagas entram como ` +
      `“A definir” e são preenchidas automaticamente depois, em “Preencher vagas definidas”.`
    : null;

  const seed = (groupIndex: number, position: 0 | 1): TeamSlot => {
    const g = standingsByGroup[groupIndex];
    if (!isClosed(g)) return pendingSlot(g.group, position);
    return slotFromStanding(g.standings[position], g.groupMatches, `${position + 1}º ${g.group}`);
  };

  if (groups.length === 1) {
    return {
      label: "Final direta",
      reason: null,
      partial,
      note,
      rows: [{ phase: "Final", round: "Final", teamA: seed(0, 0), teamB: seed(0, 1) }],
    };
  }

  if (groups.length === 2) {
    return {
      label: "Semifinais",
      reason: null,
      partial,
      note,
      rows: [
        { phase: "Semifinal", round: "Semifinal 1", teamA: seed(0, 0), teamB: seed(1, 1) },
        { phase: "Semifinal", round: "Semifinal 2", teamA: seed(1, 0), teamB: seed(0, 1) },
      ],
    };
  }

  return {
    label: "Quartas de final",
    reason: null,
    partial,
    note,
    rows: [
      { phase: "Quartas de final", round: "Quartas 1", teamA: seed(0, 0), teamB: seed(3, 1) },
      { phase: "Quartas de final", round: "Quartas 2", teamA: seed(1, 0), teamB: seed(2, 1) },
      { phase: "Quartas de final", round: "Quartas 3", teamA: seed(2, 0), teamB: seed(1, 1) },
      { phase: "Quartas de final", round: "Quartas 4", teamA: seed(3, 0), teamB: seed(0, 1) },
    ],
  };
}

// ---------------------------------------------------------------------------
// Preenchimento das vagas em aberto — roda depois que o grupo pendente fecha.
// ---------------------------------------------------------------------------
export interface KnockoutFillRow {
  match: Match;
  side: "a" | "b";
  seedLabel: string;
  slot: TeamSlot;
}

export interface KnockoutFillPlan {
  /** Vagas que já podem ser preenchidas agora. */
  rows: KnockoutFillRow[];
  /** Vagas que continuam em aberto (grupo ainda em andamento). */
  waiting: string[];
}

export function buildKnockoutFillPlan(
  categoryName: string,
  matches: Match[],
  results: Result[],
): KnockoutFillPlan {
  const categoryMatches = matches.filter((m) => m.category_name === categoryName);
  const byGroup = new Map(groupStandings(categoryMatches, results).map((g) => [g.group, g]));
  const rows: KnockoutFillRow[] = [];
  const waiting: string[] = [];

  // Confrontos da chave indexados por round, para resolver "Vencedor Semifinal 1".
  const byRound = new Map(
    categoryMatches
      .filter((m) => isKnockoutPhase(m.group_or_phase) && m.round)
      .map((m) => [m.round as string, m]),
  );

  const resolve = (seed: PendingSeed): TeamSlot | null => {
    if (seed.kind === "grupo") {
      const g = byGroup.get(seed.group);
      if (!g || !g.allFinished || g.standings.length <= seed.position) return null;
      return slotFromStanding(g.standings[seed.position], g.groupMatches, seed.seedLabel);
    }
    const source = byRound.get(seed.round);
    if (!source || !isTerminal(source.match_status)) return null;
    return seed.side === "vencedor"
      ? winnerSlot(source, results, seed.seedLabel)
      : loserSlot(source, results, seed.seedLabel);
  };

  for (const match of categoryMatches) {
    if (!isKnockoutPhase(match.group_or_phase)) continue;
    for (const side of ["a", "b"] as const) {
      const name = side === "a" ? match.team_a_name : match.team_b_name;
      const seed = parsePendingSlotName(name);
      if (!seed) continue;
      const slot = resolve(seed);
      if (!slot) {
        waiting.push(seed.seedLabel);
        continue;
      }
      rows.push({ match, side, seedLabel: seed.seedLabel, slot });
    }
  }

  return { rows, waiting: [...new Set(waiting)] };
}

export function buildNextKnockoutPlan(
  categoryName: string,
  matches: Match[],
  results: Result[],
  options: KnockoutPlanOptions = {},
): KnockoutPlan {
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

  const wantsThirdPlace = options.thirdPlace === true;
  const missingThirdPlace = wantsThirdPlace && thirdPlace.length === 0;

  if (semis.length > 0 && (finals.length === 0 || missingThirdPlace)) {
    if (semis.length !== 2) {
      return { label: "Semifinais incompletas", reason: "A categoria tem semifinais criadas em quantidade diferente de 2.", rows: [] };
    }
    // Com "adiantar" ligado, a final é criada já — cada lado que ainda não tem
    // vencedor entra como vaga em aberto ("Vencedor Semifinal 1") e é resolvido
    // depois, automaticamente ou pelo editor de confronto do ADM.
    if (!completed(semis) && !options.allowPartial) {
      return {
        label: "Aguardando semifinais",
        reason: `Finalize as semifinais para gerar a final${wantsThirdPlace ? " e o 3º lugar" : ""}.`,
        rows: [],
      };
    }
    const winners = semis.map(
      (m, i) => winnerSlot(m, results, `Vencedor SF${i + 1}`) ?? pendingDueloSlot(m, "vencedor"),
    );
    const losers = semis.map(
      (m, i) => loserSlot(m, results, `Perdedor SF${i + 1}`) ?? pendingDueloSlot(m, "perdedor"),
    );
    const rows: KnockoutMatchPlan[] = [];
    if (missingThirdPlace) {
      rows.push({ phase: "Disputa de 3º lugar", round: "3º lugar", teamA: losers[0], teamB: losers[1] });
    }
    if (finals.length === 0) {
      rows.push({ phase: "Final", round: "Final", teamA: winners[0], teamB: winners[1] });
    }
    const partial = rows.some((r) => r.teamA.pending || r.teamB.pending);
    return {
      label: wantsThirdPlace ? "Final e 3º lugar" : "Final",
      reason: null,
      partial,
      note: partial
        ? "As semifinais ainda não têm vencedor no app: esses lados entram como “A definir” e " +
          "são preenchidos em “Preencher vagas definidas” — ou à mão em CLASS, tocando no confronto."
        : null,
      rows,
    };
  }

  if (finals.length > 0) {
    return { label: "Chave completa", reason: "A final desta categoria já foi criada.", rows: [] };
  }

  return buildInitialKnockoutPlan(categoryName, matches, results, options);
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
    default:
      return "pendentes";
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

/** Status original de uma quadra ao ser liberada. */
export function idleCourtStatus(c: Court): string {
  return "Livre";
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
