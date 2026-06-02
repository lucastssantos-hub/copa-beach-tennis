// ============ Copa do Mundo de Beach Tennis — tournament data ============

export const FLAGS = {
  ARG: "🇦🇷", ARU: "🇦🇼", AUS: "🇦🇺", BRA: "🇧🇷", CAN: "🇨🇦",
  CRO: "🇭🇷", ENG: "🏴", ESP: "🇪🇸", ITA: "🇮🇹", NED: "🇳🇱",
  NOR: "🇳🇴", POR: "🇵🇹", SWE: "🇸🇪", USA: "🇺🇸",
};

export const TEAM_CODE = "BRA";

const COUNTRY_NAMES = {
  ARG: "Argentina",
  ARU: "Aruba",
  AUS: "Austrália",
  BRA: "Brasil",
  CAN: "Canadá",
  CRO: "Croácia",
  ENG: "Inglaterra",
  ESP: "Espanha",
  ITA: "Itália",
  NED: "Holanda",
  NOR: "Noruega",
  POR: "Portugal",
  SWE: "Suécia",
  USA: "USA",
};

function makeRoster(code) {
  const initials = code.toLowerCase();
  const names = {
    BRA: {
      women: ["Sofia Almeida", "Marina Costa", "Júlia Ferraz"],
      men: ["Diego Ramos", "Lucas Mendes", "Rafael Pinto"],
    },
    ESP: { women: ["Carmen Ruiz", "Lucía Vega"], men: ["Pablo Serra", "Hugo Marín"] },
    ITA: { women: ["Giulia Conti", "Sara Greco"], men: ["Marco Bruno", "Luca Ferri"] },
  }[code];
  const women = names?.women || [`${COUNTRY_NAMES[code]} F1`, `${COUNTRY_NAMES[code]} F2`];
  const men = names?.men || [`${COUNTRY_NAMES[code]} M1`, `${COUNTRY_NAMES[code]} M2`];
  return {
    id: code,
    name: COUNTRY_NAMES[code],
    flag: FLAGS[code],
    women: women.map((name, i) => ({ id: `${initials}-w${i + 1}`, name })),
    men: men.map((name, i) => ({ id: `${initials}-m${i + 1}`, name })),
  };
}

export const TEAMS = Object.keys(COUNTRY_NAMES).reduce((acc, code) => {
  acc[code] = makeRoster(code);
  return acc;
}, {});

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
  A: {
    participants: 57,
    groups: [
      group(1, ["POR", "ITA", "NOR"], [["NOR", "ITA"], ["POR", "NOR"], ["ITA", "POR"]]),
      group(2, ["ARG", "AUS", "USA"], [["AUS", "USA"], ["ARG", "USA"], ["ARG", "AUS"]]),
      group(3, ["ESP", "SWE", "NED"], [["SWE", "NED"], ["SWE", "ESP"], ["NED", "ESP"]]),
      group(4, ["ARU", "BRA", "CRO", "CAN"], [["ARU", "CRO"], ["BRA", "ARU"], ["CAN", "BRA"], ["CRO", "CAN"], ["ARU", "CAN"], ["CRO", "BRA"]]),
    ],
  },
  E: {
    participants: 88,
    groups: [
      group(1, ["ITA", "ARG", "USA"], [["ITA", "USA"], ["USA", "ARG"], ["ITA", "ARG"]]),
      group(2, ["ESP", "ENG", "POR"], [["ESP", "ENG"], ["POR", "ENG"], ["ESP", "POR"]]),
      group(3, ["BRA", "ARU", "NOR", "CAN"], [["NOR", "BRA"], ["ARU", "CAN"], ["BRA", "CAN"], ["BRA", "ARU"], ["NOR", "CAN"], ["NOR", "ARU"]]),
      group(4, ["SWE", "CRO", "AUS", "NED"], [["CRO", "NED"], ["NED", "SWE"], ["SWE", "AUS"], ["SWE", "CRO"], ["NED", "AUS"], ["AUS", "CRO"]]),
    ],
  },
  "35+": {
    participants: 65,
    groups: [
      group(1, ["CAN", "ARG", "NOR"], [["NOR", "CAN"], ["ARG", "CAN"], ["NOR", "ARG"]]),
      group(2, ["ITA", "ARU", "BRA"], [["ITA", "BRA"], ["ARU", "ITA"], ["BRA", "ARU"]]),
      group(3, ["ESP", "POR", "AUS"], [["POR", "AUS"], ["AUS", "ESP"], ["POR", "ESP"]]),
      group(4, ["USA", "ENG", "SWE", "CRO"], [["SWE", "CRO"], ["ENG", "SWE"], ["ENG", "USA"], ["ENG", "CRO"], ["USA", "CRO"], ["USA", "SWE"]]),
    ],
  },
  "60+": {
    participants: 57,
    groups: [
      group(1, ["AUS", "POR", "SWE"], [["POR", "AUS"], ["AUS", "SWE"], ["SWE", "POR"]]),
      group(2, ["CRO", "NOR", "ENG"], [["CRO", "ENG"], ["NOR", "ENG"], ["NOR", "CRO"]]),
      group(3, ["ARG", "CAN", "ITA"], [["ARG", "ITA"], ["CAN", "ITA"], ["CAN", "ARG"]]),
      group(4, ["ARU", "BRA", "ESP", "USA"], [["USA", "BRA"], ["ESP", "ARU"], ["BRA", "ESP"], ["USA", "ESP"], ["ARU", "USA"], ["ARU", "BRA"]]),
    ],
  },
};

export const MATCHES = buildMatches();

export const STATUS_META = {
  aguardando:   { label: "Aguardando escalação", tone: "muted" },
  parcial:      { label: "Escalação parcial",     tone: "warn" },
  pronto:       { label: "Pronto para chamada",   tone: "go" },
  andamento:    { label: "Em andamento",          tone: "live" },
  mista:        { label: "Aguardando mista",      tone: "coral" },
  finalizado:   { label: "Finalizado",            tone: "done" },
  wo:           { label: "W.O.",                  tone: "coral" },
  desistencia:  { label: "Desistência",           tone: "coral" },
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

export function categoryMeta(categoryId) {
  return CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[0];
}

function group(number, teams, games) {
  return { id: `Grupo ${number}`, teams, games };
}

function buildMatches() {
  const courts = ["Quadra Central", "Quadra 2", "Quadra 3", "Quadra 4"];
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
          court: courts[(n - 1) % courts.length],
          time: timesByCategory[category]?.[index % 6] || "08:00",
          a,
          b,
          status: "parcial",
          lineups,
          games: { fem: null, masc: null, mista: null },
        });
        n++;
      });
    });
  });
  return matches;
}
