#!/usr/bin/env node
/**
 * Healthcheck do App Copa do Mundo de Beach Tennis
 * Uso: node scripts/healthcheck-copa.js
 *
 * Requer variáveis de ambiente:
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 * (ou .env na raiz do copa-vite)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dir, "..");

// Carregar .env manualmente se existir
const envPath = join(rootDir, ".env");
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const m = line.match(/^([A-Z0-9_]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2].trim();
  }
}

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON =
  process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const CANONICAL_COUNTRIES = [
  "USA", "Brasil", "Itália", "Argentina", "Portugal",
  "Suécia", "Austrália", "Holanda", "Inglaterra", "Canadá",
  "Aruba", "França", "Jamaica", "Noruega", "Alemanha",
];

const VALID_CATEGORIES = new Set(["A", "B", "C", "D", "E", "35+", "60+"]);
const VALID_GENDERS = new Set(["Feminino", "Masculino"]);

const errors = [];
const warnings = [];

function err(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

async function run() {
  console.log("\n══════════════════════════════════════════");
  console.log("  APP COPA — HEALTHCHECK");
  console.log("══════════════════════════════════════════\n");

  if (!SUPABASE_URL || !SUPABASE_ANON) {
    err("VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configurados");
    printResult({ teams: 0, athletes: 0, categories: 0, matches: 0, lineups: 0, results: 0 });
    return;
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

  const [
    { data: teams, error: teamsErr },
    { data: athletes, error: athletesErr },
    { data: categories, error: catsErr },
    { data: matches, error: matchesErr },
    { data: lineups, error: lineupsErr },
    { data: results, error: resultsErr },
  ] = await Promise.all([
    sb.from("teams").select("*"),
    sb.from("athletes").select("*"),
    sb.from("categories").select("*"),
    sb.from("matches").select("*"),
    sb.from("lineups").select("*"),
    sb.from("results").select("*"),
  ]);

  if (teamsErr) err(`Erro ao buscar teams: ${teamsErr.message}`);
  if (athletesErr) err(`Erro ao buscar athletes: ${athletesErr.message}`);
  if (catsErr) err(`Erro ao buscar categories: ${catsErr.message}`);
  if (matchesErr) err(`Erro ao buscar matches: ${matchesErr.message}`);
  if (lineupsErr) err(`Erro ao buscar lineups: ${lineupsErr.message}`);
  if (resultsErr) err(`Erro ao buscar results: ${resultsErr.message}`);

  const t = teams || [];
  const a = athletes || [];
  const c = categories || [];
  const m = matches || [];
  const l = lineups || [];
  const r = results || [];

  // Verificar países canônicos
  const teamNames = new Set(t.map((team) => team.team_name));
  for (const country of CANONICAL_COUNTRIES) {
    if (!teamNames.has(country)) {
      warn(`País não encontrado no banco: "${country}"`);
    }
  }

  // Verificar duplicatas de país
  const seen = new Map();
  for (const team of t) {
    const key = team.team_name?.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (seen.has(key)) {
      err(`País duplicado com nomes diferentes: "${seen.get(key)}" e "${team.team_name}"`);
    } else {
      seen.set(key, team.team_name);
    }
  }

  // Verificar categorias
  const catNames = new Set(c.map((cat) => cat.category_name));
  for (const cat of VALID_CATEGORIES) {
    if (!catNames.has(cat)) {
      warn(`Categoria "${cat}" não encontrada no banco`);
    }
  }

  // Verificar atletas
  for (const athlete of a) {
    if (!athlete.team_name && !athlete.team_id) {
      err(`Atleta sem time: "${athlete.athlete_name}" (id: ${athlete.id})`);
    }
    if (!athlete.category_name) {
      warn(`Atleta sem categoria: "${athlete.athlete_name}"`);
    }
    if (!athlete.gender) {
      err(`Atleta sem gênero: "${athlete.athlete_name}"`);
    } else if (!VALID_GENDERS.has(athlete.gender)) {
      err(`Atleta com gênero inválido "${athlete.gender}": "${athlete.athlete_name}" — deve ser "Feminino" ou "Masculino"`);
    }
  }

  // Verificar atletas duplicados (mesmo nome + mesmo time + mesma categoria)
  const athleteKeys = new Map();
  for (const athlete of a) {
    const key = `${(athlete.team_name || "").toLowerCase()}|${(athlete.category_name || "").toLowerCase()}|${(athlete.athlete_name || "").toLowerCase()}`;
    if (athleteKeys.has(key)) {
      warn(`Atleta possivelmente duplicado: "${athlete.athlete_name}" em ${athlete.team_name} / ${athlete.category_name}`);
    }
    athleteKeys.set(key, true);
  }

  // Verificar confrontos sem categoria
  for (const match of m) {
    if (!match.category_name) {
      warn(`Confronto sem categoria: ${match.team_a_name} x ${match.team_b_name} (id: ${match.id})`);
    }
  }

  // Verificar escalações enviadas com campos obrigatórios vazios
  for (const lineup of l) {
    if (lineup.lineup_status === "Enviada") {
      const missingFields = [];
      if (!lineup.female_player_1) missingFields.push("female_player_1");
      if (!lineup.female_player_2) missingFields.push("female_player_2");
      if (!lineup.male_player_1) missingFields.push("male_player_1");
      if (!lineup.male_player_2) missingFields.push("male_player_2");
      if (missingFields.length > 0) {
        err(`Escalação "Enviada" incompleta (${lineup.team_name} / ${lineup.category_name}): campos faltando: ${missingFields.join(", ")}`);
      }
      if (!lineup.match_id) {
        err(`Escalação sem match_id: time=${lineup.team_name}`);
      }
    }
  }

  const summary = {
    teams: t.length,
    athletes: a.length,
    categories: c.length,
    matches: m.length,
    lineups: l.length,
    results: r.length,
  };

  printResult(summary);
}

function printResult(summary) {
  if (errors.length > 0) {
    console.log("❌  Erros críticos:");
    for (const e of errors) console.log(`   • ${e}`);
    console.log();
  }
  if (warnings.length > 0) {
    console.log("⚠️  Avisos:");
    for (const w of warnings) console.log(`   • ${w}`);
    console.log();
  }

  console.log("📊  Resumo:");
  console.log(`   • países:      ${summary.teams}`);
  console.log(`   • categorias:  ${summary.categories}`);
  console.log(`   • atletas:     ${summary.athletes}`);
  console.log(`   • confrontos:  ${summary.matches}`);
  console.log(`   • escalações:  ${summary.lineups}`);
  console.log(`   • resultados:  ${summary.results}`);
  console.log();

  const status = errors.length > 0 ? "CRÍTICO" : warnings.length > 0 ? "ATENÇÃO" : "PRONTO";
  const icon = errors.length > 0 ? "🔴" : warnings.length > 0 ? "🟡" : "🟢";
  console.log(`${icon}  Status geral: ${status}`);
  console.log("══════════════════════════════════════════\n");

  process.exit(errors.length > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error("Erro inesperado no healthcheck:", e);
  process.exit(1);
});
