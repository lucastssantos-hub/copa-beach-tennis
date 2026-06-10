export interface Team {
  id: string;
  team_name: string;
  country: string | null;
  abbreviation: string | null;
  flag: string | null;
  captain_name: string | null;
  captain_phone: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  category_name: string;
  event_day: string | null;
  start_time: string | null;
  end_time: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export type MatchStatus =
  | "Aguardando escalação"
  | "Escalação parcial"
  | "Escalações recebidas"
  | "Aguardando presença"
  | "Pronto para quadra"
  | "Liberado para quadra"
  | "Em andamento"
  | "Resultado pendente"
  | "Finalizado"
  | "Resultado contestado"
  | "W.O."
  | "Desistência";

export const MATCH_STATUSES: MatchStatus[] = [
  "Aguardando escalação",
  "Escalação parcial",
  "Escalações recebidas",
  "Aguardando presença",
  "Pronto para quadra",
  "Liberado para quadra",
  "Em andamento",
  "Resultado pendente",
  "Finalizado",
  "Resultado contestado",
  "W.O.",
  "Desistência",
];

export interface Match {
  id: string;
  category_id: string | null;
  category_name: string | null;
  group_or_phase: string | null;
  round: string | null;
  team_a_id: string | null;
  team_a_name: string | null;
  team_a_abbreviation: string | null;
  team_a_flag: string | null;
  team_b_id: string | null;
  team_b_name: string | null;
  team_b_abbreviation: string | null;
  team_b_flag: string | null;
  scheduled_time: string | null;
  court: string | null;
  match_status: MatchStatus;
  score_team_a: number;
  score_team_b: number;
  match_mode: string;
  mixed_required: boolean;
  contest_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lineup {
  id: string;
  match_id: string | null;
  category_name: string | null;
  round: string | null;
  team_id: string | null;
  team_name: string | null;
  captain_name: string | null;
  female_player_1: string | null;
  female_player_2: string | null;
  male_player_1: string | null;
  male_player_2: string | null;
  mixed_player_1: string | null;
  mixed_player_2: string | null;
  lineup_status: string;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Presence {
  id: string;
  match_id: string | null;
  team_id: string | null;
  team_name: string | null;
  captain_ready: boolean;
  ready_at: string | null;
  admin_confirmed: boolean;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Court {
  id: string;
  court_number: number;
  court_status: string;
  current_match_id: string | null;
  current_match_label: string | null;
  current_game: string | null;
  next_action: string | null;
  created_at: string;
  updated_at: string;
}

export interface Result {
  id: string;
  match_id: string | null;
  game_type: "Feminino" | "Masculino" | "Mista" | null;
  winner_team_id: string | null;
  winner_team_name: string | null;
  score: string | null;
  result_status: string;
  submitted_by: string | null;
  checked_by: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  notification_type: string | null;
  message: string | null;
  team_id: string | null;
  team_name: string | null;
  match_id: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor: string | null;
  action: string | null;
  entity: string | null;
  details: string | null;
  created_at: string;
}

// Ordem oficial dos chips no painel da organização.
export const CATEGORY_CHIPS = ["60+", "E", "35+", "D", "C", "B", "A"];
