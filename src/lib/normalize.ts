/**
 * Normalização canônica de países, categorias e gênero.
 * Usada em login, filtros, envio de escalação e exibição.
 */

const COUNTRY_MAP: Record<string, string> = {
  // variações sem acento → nome canônico com acento
  italia: "Itália",
  italia_: "Itália",
  suecia: "Suécia",
  canada: "Canadá",
  franca: "França",
  australia: "Austrália",
  holanda: "Holanda",
  alemanha: "Alemanha",
  brasil: "Brasil",
  argentina: "Argentina",
  portugal: "Portugal",
  noruega: "Noruega",
  jamaica: "Jamaica",
  aruba: "Aruba",
  inglaterra: "Inglaterra",
  usa: "USA",
};

/** Retorna o nome canônico do país, ignorando acentos e capitalização. */
export function normalizeCountry(raw: string): string {
  const lower = raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // remove diacríticos
  return COUNTRY_MAP[lower] ?? raw.trim();
}

const CANONICAL_COUNTRIES = [
  "USA", "Brasil", "Itália", "Argentina", "Portugal",
  "Suécia", "Austrália", "Holanda", "Inglaterra", "Canadá",
  "Aruba", "França", "Jamaica", "Noruega", "Alemanha",
];

export function getCanonicalCountries() {
  return CANONICAL_COUNTRIES;
}

const VALID_CATEGORIES = new Set(["A", "B", "C", "D", "E", "35+", "60+"]);

/** Retorna a categoria normalizada, ou null se inválida. */
export function normalizeCategory(raw: string): string | null {
  const t = raw.trim().toUpperCase();
  // aceitar "35" ou "60" sem o "+"
  if (t === "35") return "35+";
  if (t === "60") return "60+";
  return VALID_CATEGORIES.has(t) ? t : null;
}

/** Normaliza gênero para os valores esperados pelo Supabase. */
export function normalizeGender(raw: string): "Feminino" | "Masculino" | null {
  const t = raw.trim().toLowerCase();
  if (["f", "fem", "feminino", "female", "mulher"].includes(t)) return "Feminino";
  if (["m", "masc", "masculino", "male", "homem"].includes(t)) return "Masculino";
  return null;
}
