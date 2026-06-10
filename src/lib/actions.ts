import { supabase } from "./supabase";

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
