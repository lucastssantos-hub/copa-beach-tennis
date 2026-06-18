// ============ Copa do Mundo de Beach Tennis — tournament data ============
import { STATUS, STATUS_FLOW_META, normalizeMatch, WARMUP_MS } from "./engine.js";
import { ATHLETES_BY_TEAM_CAT } from "./athletes.js";

export const FLAGS = {
  ARG: "🇦🇷", ARU: "🇦🇼", AUS: "🇦🇺", BRA: "🇧🇷", CAN: "🇨🇦",
  ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", FRA: "🇫🇷", GER: "🇩🇪", ITA: "🇮🇹", JAM: "🇯🇲",
  NED: "🇳🇱", NOR: "🇳🇴", POR: "🇵🇹", SWE: "🇸🇪", USA: "🇺🇸",
};

export const TEAM_CODE = "BRA";

const COUNTRY_NAMES = {
  ARG: "Argentina",
  ARU: "Aruba",
  AUS: "Austrália",
  BRA: "Brasil",
  CAN: "Canadá",
  ENG: "Inglaterra",
  FRA: "França",
  GER: "Alemanha",
  ITA: "Itália",
  JAM: "Jamaica",
  NED: "Holanda",
  NOR: "Noruega",
  POR: "Portugal",
  SWE: "Suécia",
  USA: "USA",
};

// Capitão de cada seleção neste evento
const CAPTAIN_NAMES = {
  USA: "Jadson",   BRA: "Eudes",     ITA: "Casimiro", ARG: "Vitor",
  POR: "David",    SWE: "Erick",     AUS: "Geovane",  NED: "Romulo",
  ENG: "Eduardo",  CAN: "Vinão",     ARU: "Robinho",
  FRA: "Henrique", JAM: "Martinelli",NOR: "Cláudia",  GER: "André",
};

function makeRoster(code) {
  // Agrega todos os atletas do país em todas as categorias (lista global da equipe)
  const byTeam = ATHLETES_BY_TEAM_CAT[code] || {};
  const womenMap = new Map();
  const menMap = new Map();
  Object.values(byTeam).forEach(({ women = [], men = [] }) => {
    women.forEach(a => { if (!womenMap.has(a.id)) womenMap.set(a.id, a); });
    men.forEach(a => { if (!menMap.has(a.id)) menMap.set(a.id, a); });
  });
  return {
    id: code,
    name: COUNTRY_NAMES[code],
    flag: FLAGS[code],
    captain: CAPTAIN_NAMES[code] || null,
    women: [...womenMap.values()],
    men:   [...menMap.values()],
  };
}

export const TEAMS = Object.keys(COUNTRY_NAMES).reduce((acc, code) => {
  acc[code] = makeRoster(code);
  return acc;
}, {});

// Retorna atletas de uma equipe filtrados pela categoria do confronto
export function getAthletesByCategory(code, categoryId) {
  const byTeam = ATHLETES_BY_TEAM_CAT[code] || {};
  const catData = byTeam[categoryId] || { women: [], men: [] };
  // Fallback: se não houver atletas na categoria, retorna lista global
  if (catData.women.length === 0 && catData.men.length === 0) {
    return { women: TEAMS[code]?.women || [], men: TEAMS[code]?.men || [] };
  }
  return { women: catData.women, men: catData.men };
}

export const EVENT = {
  title: "Copa do Mundo de Beach Tennis",
  edition: "Maceió 2026",
  category: "Circuito de Equipes",
};

export const SCHEDULE = [
  { day: "Quinta", date: "18/06", time: "18h00", categories: ["60+"], note: "Fase de grupos" },
  { day: "Sexta", date: "19/06", time: "18h30", categories: ["E", "35+"], note: "Fase de grupos" },
  { day: "Sábado", date: "20/06", time: "08h00", categories: ["D", "C"], note: "Fase de grupos" },
  { day: "Sábado", date: "20/06", time: "16h00", categories: ["E", "35+"], note: "Eliminatórias" },
  { day: "Domingo", date: "21/06", time: "08h00", categories: ["B", "A"], note: "Fase de grupos" },
];

export const CATEGORIES = [
  { id: "60+", label: "60+", loaded: true, schedule: "Quinta 18/06 · 18h00" },
  { id: "E", label: "E", loaded: true, schedule: "Sexta 19/06 · 18h30" },
  { id: "35+", label: "35+", loaded: true, schedule: "Sexta 19/06 · 18h30" },
  { id: "D", label: "D", loaded: false, schedule: "Sábado 20/06 · 08h00" },
  { id: "C", label: "C", loaded: false, schedule: "Sábado 20/06 · 08h00" },
  { id: "B", label: "B", loaded: false, schedule: "Domingo 21/06 · 08h00" },
  { id: "A", label: "A", loaded: true, schedule: "Domingo 21/06 · 08h00" },
];

export const CATEGORY_DRAWS = {
  // Draws de DEMONSTRAÇÃO — substituir pelo chaveamento oficial do evento.
  // ESP e CRO removidos; FRA, JAM e GER adicionados.
  A: {
    participants: 57,
    groups: [
      group(1, ["POR", "ITA", "NOR", "GER"], [["NOR","ITA"],["POR","NOR"],["ITA","POR"],["GER","POR"],["GER","ITA"],["GER","NOR"]]),
      group(2, ["ARG", "AUS", "USA"],         [["AUS","USA"],["ARG","USA"],["ARG","AUS"]]),
      group(3, ["FRA", "SWE", "NED"],          [["SWE","NED"],["SWE","FRA"],["NED","FRA"]]),
      group(4, ["ARU", "BRA", "JAM", "CAN"],  [["ARU","JAM"],["BRA","ARU"],["CAN","BRA"],["JAM","CAN"],["ARU","CAN"],["JAM","BRA"]]),
    ],
  },
  E: {
    participants: 88,
    groups: [
      group(1, ["ITA", "ARG", "USA", "GER"],  [["ITA","USA"],["USA","ARG"],["ITA","ARG"],["GER","ITA"],["GER","USA"],["GER","ARG"]]),
      group(2, ["FRA", "ENG", "POR"],          [["FRA","ENG"],["POR","ENG"],["FRA","POR"]]),
      group(3, ["BRA", "ARU", "NOR", "CAN"],  [["NOR","BRA"],["ARU","CAN"],["BRA","CAN"],["BRA","ARU"],["NOR","CAN"],["NOR","ARU"]]),
      group(4, ["SWE", "JAM", "AUS", "NED"],  [["JAM","NED"],["NED","SWE"],["SWE","AUS"],["SWE","JAM"],["NED","AUS"],["AUS","JAM"]]),
    ],
  },
  "35+": {
    participants: 65,
    groups: [
      group(1, ["CAN", "ARG", "NOR", "GER"],  [["NOR","CAN"],["ARG","CAN"],["NOR","ARG"],["GER","CAN"],["GER","ARG"],["GER","NOR"]]),
      group(2, ["ITA", "ARU", "BRA"],          [["ITA","BRA"],["ARU","ITA"],["BRA","ARU"]]),
      group(3, ["FRA", "POR", "AUS"],          [["POR","AUS"],["AUS","FRA"],["POR","FRA"]]),
      group(4, ["USA", "ENG", "SWE", "JAM"],  [["SWE","JAM"],["ENG","SWE"],["ENG","USA"],["ENG","JAM"],["USA","JAM"],["USA","SWE"]]),
    ],
  },
  "60+": {
    participants: 46,
    groups: [
      group(1, ["BRA", "USA", "ARG"],  [["ARG","BRA"],["BRA","USA"],["USA","ARG"]]),
      group(2, ["POR", "NED", "SWE"],  [["SWE","POR"],["NED","POR"],["SWE","NED"]]),
      group(3, ["FRA", "NOR", "JAM"],  [["FRA","JAM"],["FRA","NOR"],["JAM","NOR"]]),
      group(4, ["CAN", "AUS", "ITA"],  [["CAN","ITA"],["ITA","AUS"],["CAN","AUS"]]),
    ],
  },
};

export const MATCHES = buildMatches();

export const STATUS_META = {
  // status canônicos de confronto (máquina de estados — engine.js)
  ...STATUS_FLOW_META,
  // sub-status da escalação (por equipe)
  pendente:     { label: "Pendente",   tone: "muted" },
  rascunho:     { label: "Rascunho",   tone: "warn" },
  enviada:      { label: "Enviada",    tone: "go" },
  validada:     { label: "Validada",   tone: "done" },
  bloqueada:    { label: "Bloqueada",  tone: "live" },
};

export function emptyLineup() {
  return { status: "pendente", fem: [null, null], masc: [null, null], mista: null };
}

export function filledLineup(code, status = "enviada") {
  const team = TEAMS[code];
  return {
    status,
    fem: [team.women[0]?.id || null, team.women[1]?.id || null],
    masc: [team.men[0]?.id || null, team.men[1]?.id || null],
    mista: null,
  };
}

export function confrontoScore(m) {
  let a = 0, b = 0;
  ["fem", "masc", "mista"].forEach(k => {
    const g = m.games[k];
    if (g && g.winner) { if (g.winner === m.a) a++; else b++; }
  });
  return { a, b };
}

export function athleteName(code, id) {
  const t = TEAMS[code];
  const all = [...(t?.women || []), ...(t?.men || [])];
  return (all.find(a => a.id === id) || {}).name || "—";
}

// Nome da equipe tolerante a códigos desconhecidos/obsoletos (ex.: confronto
// remoto contra uma seleção já removida). Nunca lança — cai no próprio código.
export function teamName(code) {
  return TEAMS[code]?.name ?? code ?? "—";
}

export function categoryMeta(categoryId) {
  return CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[0];
}

function group(number, teams, games) {
  return { id: `Grupo ${number}`, teams, games };
}

function buildMatches() {
  const timesByCategory = {
    "60+": ["18:00", "18:25", "18:50", "19:15", "19:40", "20:05"],
    E: ["18:30", "18:55", "19:20", "19:45", "20:10", "20:35"],
    "35+": ["18:30", "18:55", "19:20", "19:45", "20:10", "20:35"],
    A: ["08:00", "08:25", "08:50", "09:15", "09:40", "10:05"],
  };

  const matches = [];
  Object.entries(CATEGORY_DRAWS).forEach(([category, draw]) => {
    let n = 1;
    draw.groups.forEach(g => {
      g.games.forEach(([a, b], index) => {
        const lineups = { [a]: filledLineup(a), [b]: filledLineup(b) };
        if (a === TEAM_CODE || b === TEAM_CODE) {
          lineups[TEAM_CODE] = emptyLineup();
        }
        matches.push({
          id: `${category.replace("+", "plus").toLowerCase()}-${n}`,
          category,
          phase: g.id,
          court: "",   // ADM escolhe a quadra ao liberar
          time: timesByCategory[category]?.[index % 6] || "08:00",
          a,
          b,
          status: STATUS.AGUARDANDO_ESCALACAO,
          lineups,
          games: { fem: null, masc: null, mista: null },
          warmupEndsAt: null,
          presence: { [a]: false, [b]: false },
          result: { submittedBy: null, submittedAt: null, validated: false, contested: false, reason: null, type: null },
        });
        n++;
      });
    });
  });

  seedLiveActivity(matches);
  seedCaptainTasks(matches);
  return matches.map(normalizeMatch);
}

// Garante que TODA equipe tenha ao menos um confronto com escalação pendente
// (no confronto mais cedo ainda não tocado), para que qualquer capitão tenha
// uma escalação a fazer ao abrir o app.
function seedCaptainTasks(matches) {
  const codes = new Set();
  matches.forEach(m => { codes.add(m.a); codes.add(m.b); });
  const catOrder = id => CATEGORIES.findIndex(c => c.id === id);
  codes.forEach(code => {
    const first = matches
      .filter(m => (m.a === code || m.b === code) && m.status === STATUS.AGUARDANDO_ESCALACAO)
      .sort((a, b) => catOrder(a.category) - catOrder(b.category) || a.time.localeCompare(b.time))[0];
    if (first) first.lineups[code] = emptyLineup();
  });
}

// Semeia atividade ao vivo em quadras SEM o Brasil, para o Centro de Operações e
// a Tela Pública terem conteúdo. Confrontos do Brasil ficam pendentes de propósito,
// para o fluxo do Capitão ser demonstrável de ponta a ponta.
function seedLiveActivity(matches) {
  const validate = m => { Object.keys(m.lineups).forEach(c => { m.lineups[c].status = "validada"; }); };
  const win = (m, winner) => ({ winner, score: winner === m.a ? "6-3" : "3-6" });

  const byCat = {};
  matches.forEach(m => { (byCat[m.category] = byCat[m.category] || []).push(m); });

  Object.values(byCat).forEach(list => {
    const neutral = list.filter(m => m.a !== TEAM_CODE && m.b !== TEAM_CODE);
    const set = (m, fn) => { if (m) fn(m); };

    // 1º: finalizado 2×0 (vencedor A)
    set(neutral[0], m => {
      validate(m); m.presence = { [m.a]: true, [m.b]: true };
      m.games = { fem: win(m, m.a), masc: win(m, m.a), mista: null };
      m.status = STATUS.FINALIZADO; m.result = { ...m.result, submittedBy: "arbitro", submittedAt: Date.now() - 9e5, validated: true };
    });
    // 2º: finalizado 2×1 (mista decide para B)
    set(neutral[1], m => {
      validate(m); m.presence = { [m.a]: true, [m.b]: true };
      Object.keys(m.lineups).forEach(c => { m.lineups[c].mista = { w: TEAMS[c].women[0].id, m: TEAMS[c].men[0].id }; });
      m.games = { fem: win(m, m.a), masc: win(m, m.b), mista: win(m, m.b) };
      m.status = STATUS.FINALIZADO; m.result = { ...m.result, submittedBy: "arbitro", submittedAt: Date.now() - 6e5, validated: true };
    });
    // 3º: em jogo (jogo 1 já decidido)
    set(neutral[2], m => {
      validate(m); m.presence = { [m.a]: true, [m.b]: true };
      m.games = { fem: win(m, m.a), masc: null, mista: null };
      m.status = STATUS.EM_JOGO;
    });
    // 4º: aquecimento (cronômetro correndo)
    set(neutral[3], m => {
      validate(m); m.presence = { [m.a]: true, [m.b]: false };
      m.status = STATUS.AQUECIMENTO; m.warmupEndsAt = Date.now() + Math.round(WARMUP_MS * 0.7);
    });
    // 5º: aguardando resultado (lançado, falta ADM validar)
    set(neutral[4], m => {
      validate(m); m.presence = { [m.a]: true, [m.b]: true };
      m.games = { fem: win(m, m.b), masc: win(m, m.b), mista: null };
      m.status = STATUS.AGUARDANDO_RESULTADO; m.result = { ...m.result, submittedBy: "arbitro", submittedAt: Date.now() - 6e4 };
    });
    // 6º: aguardando quadra (validado, pronto p/ liberar)
    set(neutral[5], m => { validate(m); m.status = STATUS.AGUARDANDO_QUADRA; });
  });
}
