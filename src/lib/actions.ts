import { supabase } from "./supabase";
import {
  confrontoDecided,
  courtLabel,
  gameWins,
  idleCourtStatus,
  isForward,
  matchLabel,
  matchWinnerSide,
  needsMista,
  sideTeamId,
  sideTeamName,
  type GameType,
} from "./engine";
import type { Court, Match, MatchStatus, Result, Team } from "./types";

export async function createNotification(input: {
  notification_type: string;
  message: string;
  team_id?: string | null;
  team_name?: string | null;
  match_id?: string | null;
}) {
  if (!supabase) return;
  await supabase.from("notifications").insert(input);
}

export async function createAuditLog(input: {
  actor: string;
  action: string;
  entity: string;
  details?: string;
}) {
  if (!supabase) return;
  await supabase.from("audit_logs").insert(input);
}

const now = () => new Date().toISOString();

/** Avança o status do confronto — nunca regride (ações atrasadas são ignoradas). */
export async function advanceMatchStatus(match: Match, next: MatchStatus) {
  if (!supabase || !isForward(match.match_status, next)) return;
  await supabase.from("matches").update({ match_status: next, updated_at: now() }).eq("id", match.id);
}

export async function updateMatchAdmin(
  match: Match,
  patch: Partial<Pick<Match, "scheduled_time" | "court" | "match_mode" | "match_status">>,
  actor = "ORG",
): Promise<string | null> {
  if (!supabase) return "Supabase não configurado.";
  const { error } = await supabase
    .from("matches")
    .update({ ...patch, updated_at: now() })
    .eq("id", match.id);
  if (error) return error.message;
  await createAuditLog({
    actor,
    action: "EDITAR_CONFRONTO",
    entity: "matches",
    details: matchLabel(match),
  });
  return null;
}

// ---------------------------------------------------------------------------
// Presença (capitão marca pronto; ADM confirma)
// ---------------------------------------------------------------------------
export async function upsertPresence(
  match: Match,
  side: "a" | "b",
  patch: { captain_ready?: boolean; admin_confirmed?: boolean },
) {
  if (!supabase) return;
  const teamId = sideTeamId(match, side);
  const teamName = sideTeamName(match, side);
  const stamp: Record<string, unknown> = { ...patch, updated_at: now() };
  if (patch.captain_ready) stamp.ready_at = now();
  if (patch.admin_confirmed) stamp.confirmed_at = now();

  if (teamId) {
    const row: Record<string, unknown> = {
      match_id: match.id,
      team_id: teamId,
      team_name: teamName,
      ...stamp,
    };
    if (patch.captain_ready !== undefined) row.captain_ready = patch.captain_ready;
    if (patch.admin_confirmed !== undefined) row.admin_confirmed = patch.admin_confirmed;
    await supabase.from("presence").upsert(row, { onConflict: "match_id,team_id" });
    return;
  }

  let query = supabase.from("presence").select("id").eq("match_id", match.id).limit(1);
  query = query.eq("team_name", teamName);
  const { data: existing } = await query;
  if (existing && existing.length > 0) {
    await supabase.from("presence").update(stamp).eq("id", existing[0].id);
  } else {
    await supabase.from("presence").insert({
      match_id: match.id,
      team_id: teamId,
      team_name: teamName,
      captain_ready: !!patch.captain_ready,
      ...stamp,
    });
  }
}

// ---------------------------------------------------------------------------
// Escalação do capitão (rascunho ou envio definitivo)
// ---------------------------------------------------------------------------
export interface LineupPlayers {
  female_player_1: string;
  female_player_2: string;
  male_player_1: string;
  male_player_2: string;
  mixed_player_1: string;
  mixed_player_2: string;
}

/**
 * Salva a escalação da equipe no confronto (upsert por match+team).
 * status 'Enviada' trava a escalação, notifica a organização e avança o fluxo;
 * 'Rascunho' apenas persiste para continuar depois.
 */
export async function saveLineup(
  match: Match,
  team: Team,
  players: LineupPlayers,
  status: "Rascunho" | "Enviada",
): Promise<string | null> {
  if (!supabase) return "Supabase não configurado.";
  if (status === "Rascunho" && team.id) {
    const { data: current } = await supabase
      .from("lineups")
      .select("lineup_status")
      .eq("match_id", match.id)
      .eq("team_id", team.id)
      .maybeSingle();
    if (current?.lineup_status === "Enviada") {
      return "Escalação já enviada. Procure a organização para reabrir alterações.";
    }
  }
  const row = {
    match_id: match.id,
    category_name: match.category_name,
    round: match.round,
    team_id: team.id,
    team_name: team.team_name,
    captain_name: team.captain_name,
    ...players,
    lineup_status: status,
    submitted_at: status === "Enviada" ? now() : null,
    updated_at: now(),
  };
  if (team.id) {
    const { error } = await supabase.from("lineups").upsert(row, { onConflict: "match_id,team_id" });
    if (error) return error.message;
  } else {
    let query = supabase.from("lineups").select("id").eq("match_id", match.id).limit(1);
    query = query.eq("team_name", team.team_name);
    const { data: existing } = await query;
    const { error } =
      existing && existing.length > 0
        ? await supabase.from("lineups").update(row).eq("id", existing[0].id)
        : await supabase.from("lineups").insert(row);
    if (error) return error.message;
  }
  if (status === "Rascunho") return null;

  await createNotification({
    notification_type: "escalacao",
    message: `${team.team_name} enviou escalação`,
    team_id: team.id,
    team_name: team.team_name,
    match_id: match.id,
  });
  await createAuditLog({
    actor: `CAPITAO:${team.team_name}`,
    action: "ENVIAR_ESCALACAO",
    entity: "lineups",
    details: `Confronto ${match.team_a_name} x ${match.team_b_name}`,
  });
  // Avança a máquina de status: 1 escalação enviada = parcial, 2 = recebidas.
  const { data: sent } = await supabase
    .from("lineups")
    .select("team_id, team_name")
    .eq("match_id", match.id)
    .eq("lineup_status", "Enviada");
  const distinctTeams = new Set((sent ?? []).map((l) => l.team_id || l.team_name)).size;
  await advanceMatchStatus(match, distinctTeams >= 2 ? "Escalações recebidas" : "Escalação parcial");
  return null;
}

/** ADM confirma a presença de um lado; avança o status quando os dois confirmam. */
export async function confirmPresenceAndAdvance(
  match: Match,
  side: "a" | "b",
  otherConfirmed: boolean,
) {
  await upsertPresence(match, side, { admin_confirmed: true });
  await advanceMatchStatus(match, otherConfirmed ? "Pronto para quadra" : "Aguardando presença");
}

/** ADM cobra a escalação de um capitão (notificação tipo 'cobranca'). */
export async function pokeCaptain(match: Match, side: "a" | "b", actor = "ORG") {
  if (!supabase) return;
  const teamName = sideTeamName(match, side);
  await createNotification({
    notification_type: "cobranca",
    message: `📣 Organização cobrou a escalação de ${teamName} (${matchLabel(match)})`,
    team_id: sideTeamId(match, side),
    team_name: teamName,
    match_id: match.id,
  });
  await createAuditLog({
    actor,
    action: "COBRAR_CAPITAO",
    entity: "notifications",
    details: `${teamName} — ${matchLabel(match)}`,
  });
}

// ---------------------------------------------------------------------------
// Liberação de quadra (1 quadra no modo sequencial, 2 no simultâneo)
// ---------------------------------------------------------------------------
export async function releaseCourts(match: Match, courts: Court[], actor = "ORG") {
  if (!supabase || courts.length === 0) return;
  const label = courts.map(courtLabel).join(" + ");
  const simultaneous = courts.length > 1;
  await supabase
    .from("matches")
    .update({ court: label, match_status: "Liberado para quadra", updated_at: now() })
    .eq("id", match.id);
  for (const [i, c] of courts.entries()) {
    await supabase
      .from("courts")
      .update({
        court_status: "Ocupada",
        current_match_id: match.id,
        current_match_label: matchLabel(match),
        current_game: simultaneous ? (i === 0 ? "Feminino" : "Masculino") : "Feminino + Masculino",
        next_action: "Aguardando início",
        updated_at: now(),
      })
      .eq("id", c.id);
  }
  await createNotification({
    notification_type: "quadra",
    message: `${matchLabel(match)} liberado para ${label}`,
    match_id: match.id,
  });
  await createAuditLog({
    actor,
    action: "LIBERAR_QUADRA",
    entity: "matches",
    details: `${matchLabel(match)} → ${label}${simultaneous ? " (simultâneo)" : ""}`,
  });
}

export async function startMatch(match: Match, actor = "ORG") {
  if (!supabase) return;
  await supabase
    .from("matches")
    .update({ match_status: "Em andamento", updated_at: now() })
    .eq("id", match.id);
  await supabase
    .from("courts")
    .update({ next_action: "Em jogo", updated_at: now() })
    .eq("current_match_id", match.id);
  await createAuditLog({ actor, action: "INICIAR_JOGO", entity: "matches", details: matchLabel(match) });
}

async function freeCourtsOf(match: Match) {
  if (!supabase) return;
  const { data: occupied } = await supabase
    .from("courts")
    .select("*")
    .eq("current_match_id", match.id);
  for (const c of (occupied ?? []) as Court[]) {
    await supabase
      .from("courts")
      .update({
        court_status: idleCourtStatus(c),
        current_match_id: null,
        current_match_label: null,
        current_game: null,
        next_action: null,
        updated_at: now(),
      })
      .eq("id", c.id);
  }
}

// ---------------------------------------------------------------------------
// Resultado de parcial + mista condicional + finalização automática
// ---------------------------------------------------------------------------
export async function recordGameResult(
  match: Match,
  existingResults: Result[],
  gameType: GameType,
  winner: "a" | "b",
  score: string,
  actor = "ORG",
) {
  if (!supabase) return;
  const row = {
    match_id: match.id,
    game_type: gameType,
    winner_team_id: sideTeamId(match, winner),
    winner_team_name: sideTeamName(match, winner),
    score: score.trim() || null,
    result_status: "Validado",
    submitted_by: actor,
    finished_at: now(),
    updated_at: now(),
  };
  const existing = existingResults.find((r) => r.match_id === match.id && r.game_type === gameType);
  if (existing?.id) {
    await supabase.from("results").update(row).eq("id", existing.id);
  } else {
    await supabase.from("results").upsert(row, { onConflict: "match_id,game_type" });
  }

  // Reavalia o confronto com o resultado novo em mãos.
  const { data: fresh } = await supabase.from("results").select("*").eq("match_id", match.id);
  const results = (fresh ?? []) as Result[];
  const wins = gameWins(match, results);
  const patch: Record<string, unknown> = {
    score_team_a: wins.a,
    score_team_b: wins.b,
    updated_at: now(),
  };

  if (confrontoDecided(match, results)) {
    patch.match_status = "Finalizado";
    const side = matchWinnerSide(match, results);
    await supabase.from("matches").update(patch).eq("id", match.id);
    await freeCourtsOf(match);
    await createNotification({
      notification_type: "resultado",
      message: `${matchLabel(match)} finalizado — vitória de ${side ? sideTeamName(match, side) : "?"} (${wins.a}×${wins.b})`,
      match_id: match.id,
    });
    await createAuditLog({
      actor,
      action: "FINALIZAR_CONFRONTO",
      entity: "matches",
      details: `${matchLabel(match)} ${wins.a}×${wins.b}`,
    });
    return { finished: true, mistaNeeded: false };
  }

  const mistaNeeded = needsMista(match, results);
  if (mistaNeeded && !match.mixed_required) {
    patch.mixed_required = true;
    await createNotification({
      notification_type: "mista",
      message: `${matchLabel(match)} empatado 1×1 — dupla mista decide`,
      match_id: match.id,
    });
  }
  await supabase.from("matches").update(patch).eq("id", match.id);
  await createAuditLog({
    actor,
    action: "REGISTRAR_PARCIAL",
    entity: "results",
    details: `${matchLabel(match)} · ${gameType} ${score} (${sideTeamName(match, winner)})`,
  });
  return { finished: false, mistaNeeded };
}

// ---------------------------------------------------------------------------
// Contestação de resultado (Fase 3)
// ---------------------------------------------------------------------------
/** Capitão contesta um confronto finalizado — motivo obrigatório. */
export async function contestResult(match: Match, reason: string, teamName: string) {
  if (!supabase || match.match_status !== "Finalizado" || !reason.trim()) return;
  await supabase
    .from("matches")
    .update({ match_status: "Resultado contestado", contest_reason: reason.trim(), updated_at: now() })
    .eq("id", match.id);
  await createNotification({
    notification_type: "contestacao",
    message: `⚠ ${teamName} contestou o resultado de ${matchLabel(match)}: ${reason.trim()}`,
    team_name: teamName,
    match_id: match.id,
  });
  await createAuditLog({
    actor: `CAPITAO:${teamName}`,
    action: "CONTESTAR_RESULTADO",
    entity: "matches",
    details: `${matchLabel(match)} — ${reason.trim()}`,
  });
}

/** ADM resolve a contestação: 'manter' valida o resultado; 'reabrir' apaga as parciais e volta o jogo. */
export async function resolveContest(match: Match, decision: "manter" | "reabrir", actor = "ORG") {
  if (!supabase || match.match_status !== "Resultado contestado") return;
  if (decision === "manter") {
    await supabase
      .from("matches")
      .update({ match_status: "Finalizado", contest_reason: null, updated_at: now() })
      .eq("id", match.id);
  } else {
    await supabase.from("results").delete().eq("match_id", match.id);
    await supabase
      .from("matches")
      .update({
        match_status: "Em andamento",
        contest_reason: null,
        score_team_a: 0,
        score_team_b: 0,
        mixed_required: false,
        updated_at: now(),
      })
      .eq("id", match.id);
  }
  await createNotification({
    notification_type: "contestacao",
    message:
      decision === "manter"
        ? `${matchLabel(match)}: contestação resolvida — resultado mantido`
        : `${matchLabel(match)}: confronto reaberto para relançar as parciais`,
    match_id: match.id,
  });
  await createAuditLog({
    actor,
    action: decision === "manter" ? "MANTER_RESULTADO" : "REABRIR_CONFRONTO",
    entity: "matches",
    details: matchLabel(match),
  });
}

// ---------------------------------------------------------------------------
// W.O. / Desistência (Fase 3) — placar sintético 2×0 para a classificação
// ---------------------------------------------------------------------------
export async function recordWalkover(
  match: Match,
  kind: "W.O." | "Desistência",
  winner: "a" | "b",
  existingResults: Result[],
  actor = "ORG",
) {
  if (!supabase) return;
  const scoreLabel = kind === "W.O." ? "W.O." : "Desist.";
  for (const gameType of ["Feminino", "Masculino"] as GameType[]) {
    const row = {
      match_id: match.id,
      game_type: gameType,
      winner_team_id: sideTeamId(match, winner),
      winner_team_name: sideTeamName(match, winner),
      score: scoreLabel,
      result_status: "Validado",
      submitted_by: actor,
      finished_at: now(),
      updated_at: now(),
    };
    const existing = existingResults.find((r) => r.match_id === match.id && r.game_type === gameType);
    if (existing?.id) {
      await supabase.from("results").update(row).eq("id", existing.id);
    } else {
      await supabase.from("results").upsert(row, { onConflict: "match_id,game_type" });
    }
  }
  await supabase
    .from("matches")
    .update({
      match_status: kind,
      contest_reason: null,
      score_team_a: winner === "a" ? 2 : 0,
      score_team_b: winner === "b" ? 2 : 0,
      updated_at: now(),
    })
    .eq("id", match.id);
  await freeCourtsOf(match);
  await createNotification({
    notification_type: "alerta",
    message: `${kind} em ${matchLabel(match)} — vitória de ${sideTeamName(match, winner)}`,
    match_id: match.id,
  });
  await createAuditLog({
    actor,
    action: kind === "W.O." ? "REGISTRAR_WO" : "REGISTRAR_DESISTENCIA",
    entity: "matches",
    details: `${matchLabel(match)} — vencedor ${sideTeamName(match, winner)}`,
  });
}

// ---------------------------------------------------------------------------
// Geração de chaves
// ---------------------------------------------------------------------------
export async function insertGeneratedMatches(
  rows: Array<Record<string, unknown>>,
  categoryName: string,
  actor = "ORG",
) {
  if (!supabase || rows.length === 0) return null;
  const { error } = await supabase.from("matches").insert(rows);
  if (error) return error.message;
  await createAuditLog({
    actor,
    action: "GERAR_CHAVES",
    entity: "matches",
    details: `Categoria ${categoryName}: ${rows.length} confrontos gerados`,
  });
  return null;
}
