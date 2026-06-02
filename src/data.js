// ============ Copa do Mundo de Beach Tennis — Mock Data ============
// Single seeded dataset shared across roles. Captain edits flow into
// the same objects the referee reads, so the prototype feels live.

export const FLAGS = {
  BRA: "🇧🇷", ESP: "🇪🇸", ITA: "🇮🇹", FRA: "🇫🇷", USA: "🇺🇸",
  POR: "🇵🇹", ARG: "🇦🇷", GER: "🇩🇪",
};

// The captain role controls this team.
export const TEAM_CODE = "BRA";

// ---- Atletas por equipe (categoria Open Misto) ----
export const TEAMS = {
  BRA: {
    id: "BRA", name: "Brasil", flag: FLAGS.BRA,
    women: [
      { id: "b-w1", name: "Sofia Almeida" },
      { id: "b-w2", name: "Marina Costa" },
      { id: "b-w3", name: "Júlia Ferraz" },
    ],
    men: [
      { id: "b-m1", name: "Diego Ramos" },
      { id: "b-m2", name: "Lucas Mendes" },
      { id: "b-m3", name: "Rafael Pinto" },
    ],
  },
  ESP: {
    id: "ESP", name: "Espanha", flag: FLAGS.ESP,
    women: [
      { id: "e-w1", name: "Carmen Ruiz" },
      { id: "e-w2", name: "Lucía Vega" },
    ],
    men: [
      { id: "e-m1", name: "Pablo Serra" },
      { id: "e-m2", name: "Hugo Marín" },
    ],
  },
  ITA: {
    id: "ITA", name: "Itália", flag: FLAGS.ITA,
    women: [
      { id: "i-w1", name: "Giulia Conti" },
      { id: "i-w2", name: "Sara Greco" },
    ],
    men: [
      { id: "i-m1", name: "Marco Bruno" },
      { id: "i-m2", name: "Luca Ferri" },
    ],
  },
  FRA: {
    id: "FRA", name: "França", flag: FLAGS.FRA,
    women: [
      { id: "f-w1", name: "Camille Roux" },
      { id: "f-w2", name: "Léa Moreau" },
    ],
    men: [
      { id: "f-m1", name: "Théo Garnier" },
      { id: "f-m2", name: "Hugo Lefèvre" },
    ],
  },
};

// ---- Status de confronto ----
// aguardando | parcial | pronto | andamento | mista | finalizado | wo | desistencia
// ---- Status de escalação por equipe ----
// pendente | rascunho | enviada | validada | bloqueada

// A "lineup" holds the two locked games + optional mista.
// fem: [athleteId, athleteId], masc: [...], mista: { w, m }
export function emptyLineup() {
  return { status: "pendente", fem: [null, null], masc: [null, null], mista: null };
}

// Confrontos da fase de grupos — Grupo A
export const MATCHES = [
  {
    id: "m1", phase: "Grupo A", court: "Quadra Central", time: "14:30",
    a: "BRA", b: "ESP",
    status: "parcial",
    lineups: {
      BRA: { status: "validada", fem: ["b-w1", "b-w2"], masc: ["b-m1", "b-m2"], mista: null },
      ESP: { status: "enviada", fem: ["e-w1", "e-w2"], masc: ["e-m1", "e-m2"], mista: null },
    },
    games: { fem: null, masc: null, mista: null }, // each: {winner, score}
  },
  {
    id: "m2", phase: "Grupo A", court: "Quadra 2", time: "15:15",
    a: "ITA", b: "FRA",
    status: "andamento",
    lineups: {
      ITA: { status: "validada", fem: ["i-w1", "i-w2"], masc: ["i-m1", "i-m2"], mista: null },
      FRA: { status: "validada", fem: ["f-w1", "f-w2"], masc: ["f-m1", "f-m2"], mista: null },
    },
    games: { fem: { winner: "ITA", score: "6-3" }, masc: null, mista: null },
  },
  {
    id: "m3", phase: "Grupo A", court: "Quadra Central", time: "16:00",
    a: "BRA", b: "ITA",
    status: "aguardando",
    lineups: { BRA: emptyLineup(), ITA: emptyLineup() },
    games: { fem: null, masc: null, mista: null },
  },
  {
    id: "m4", phase: "Grupo A", court: "Quadra 2", time: "16:45",
    a: "ESP", b: "FRA",
    status: "aguardando",
    lineups: { ESP: emptyLineup(), FRA: emptyLineup() },
    games: { fem: null, masc: null, mista: null },
  },
  {
    id: "m5", phase: "Grupo A", court: "Quadra Central", time: "17:30",
    a: "BRA", b: "FRA",
    status: "aguardando",
    lineups: { BRA: emptyLineup(), FRA: emptyLineup() },
    games: { fem: null, masc: null, mista: null },
  },
  {
    id: "m6", phase: "Grupo A", court: "Quadra 2", time: "18:15",
    a: "ESP", b: "ITA",
    status: "finalizado",
    lineups: {
      ESP: { status: "validada", fem: ["e-w1", "e-w2"], masc: ["e-m1", "e-m2"], mista: { w: "e-w1", m: "e-m1" } },
      ITA: { status: "validada", fem: ["i-w1", "i-w2"], masc: ["i-m1", "i-m2"], mista: { w: "i-w1", m: "i-m1" } },
    },
    games: {
      fem: { winner: "ESP", score: "6-4" },
      masc: { winner: "ITA", score: "7-5" },
      mista: { winner: "ESP", score: "6-2" },
    },
  },
];

export const STATUS_META = {
  // match statuses
  aguardando:   { label: "Aguardando escalação", tone: "muted" },
  parcial:      { label: "Escalação parcial",     tone: "warn" },
  pronto:       { label: "Pronto para chamada",   tone: "go" },
  andamento:    { label: "Em andamento",          tone: "live" },
  mista:        { label: "Aguardando mista",      tone: "coral" },
  finalizado:   { label: "Finalizado",            tone: "done" },
  wo:           { label: "W.O.",                  tone: "coral" },
  desistencia:  { label: "Desistência",           tone: "coral" },
  // lineup statuses
  pendente:     { label: "Pendente",   tone: "muted" },
  rascunho:     { label: "Rascunho",   tone: "warn" },
  enviada:      { label: "Enviada",    tone: "go" },
  validada:     { label: "Validada",   tone: "done" },
  bloqueada:    { label: "Bloqueada",  tone: "live" },
};

export const EVENT = {
  title: "Copa do Mundo de Beach Tennis",
  edition: "Maceió 2026",
  category: "Open Misto",
};

// Confronto score helper (shared by every screen).
export function confrontoScore(m) {
  let a = 0, b = 0;
  ["fem", "masc", "mista"].forEach(k => {
    const g = m.games[k];
    if (g && g.winner) { if (g.winner === m.a) a++; else b++; }
  });
  return { a, b };
}

// Resolve an athlete's display name from a team + athlete id.
export function athleteName(code, id) {
  const t = TEAMS[code];
  const all = [...t.women, ...t.men];
  return (all.find(a => a.id === id) || {}).name || "—";
}
