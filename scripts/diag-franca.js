import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dir, "..");
const envPath = join(rootDir, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2].trim();
  }
}

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

// Teams
const { data: teams } = await sb.from("teams").select("*").ilike("team_name", "%fran%");
console.log("\n=== TEAMS com 'fran' ===");
console.log(JSON.stringify(teams?.map(t => ({ id: t.id, team_name: t.team_name, flag: t.flag, abbreviation: t.abbreviation })), null, 2));

// Atletas por team_name
const { data: byName } = await sb.from("athletes").select("*").ilike("team_name", "%fran%");
console.log(`\n=== ATHLETES com team_name contendo 'fran' — Total: ${byName?.length ?? 0} ===`);
for (const a of byName ?? []) {
  console.log(`  [${a.gender ?? "SEM GÊNERO"}] [Cat:${a.category_name ?? "SEM CAT"}] ${a.athlete_name} | team_name="${a.team_name}" | team_id=${a.team_id ?? "null"}`);
}

// Atletas por team_id
if (teams?.length) {
  for (const team of teams) {
    const { data: byId } = await sb.from("athletes").select("*").eq("team_id", team.id);
    console.log(`\n=== ATHLETES com team_id=${team.id} (${team.team_name}) — Total: ${byId?.length ?? 0} ===`);
    for (const a of byId ?? []) {
      console.log(`  [${a.gender ?? "SEM GÊNERO"}] [Cat:${a.category_name ?? "SEM CAT"}] ${a.athlete_name} | team_name="${a.team_name}" | team_id=${a.team_id}`);
    }
  }
}

// Confrontos
const { data: matches } = await sb.from("matches").select("*").or("team_a_name.ilike.%fran%,team_b_name.ilike.%fran%");
console.log("\n=== CONFRONTOS ===");
for (const m of matches ?? []) {
  console.log(`  ${m.team_a_name} x ${m.team_b_name} | Cat:${m.category_name} | Status:${m.match_status} | team_a_id:${m.team_a_id} | team_b_id:${m.team_b_id}`);
}

// Escalações
const { data: lineups } = await sb.from("lineups").select("*").ilike("team_name", "%fran%");
console.log(`\n=== ESCALAÇÕES — Total: ${lineups?.length ?? 0} ===`);
for (const l of lineups ?? []) {
  console.log(`  ${l.team_name} | Cat:${l.category_name} | Status:${l.lineup_status}`);
  console.log(`    Fem: "${l.female_player_1}", "${l.female_player_2}"`);
  console.log(`    Masc: "${l.male_player_1}", "${l.male_player_2}"`);
}
