const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const STATE_ID = "copa-beach-tennis";

export const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

async function supabaseRequest(path, options = {}) {
  if (!hasSupabaseConfig) return null;

  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const requestOptions = {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  };

  const res = typeof fetch === "function"
    ? await fetch(url, requestOptions)
    : await xhrRequest(url, requestOptions);

  if (!res.ok) {
    throw new Error(`Supabase request failed: ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

function xhrRequest(url, options) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(options.method || "GET", url);
    Object.entries(options.headers || {}).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });
    xhr.onload = () => {
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        json: () => JSON.parse(xhr.responseText || "null"),
      });
    };
    xhr.onerror = () => reject(new Error("Supabase request failed"));
    xhr.send(options.body || null);
  });
}

export async function loadRemoteMatches() {
  const rows = await supabaseRequest(
    `app_state?id=eq.${STATE_ID}&select=data&limit=1`,
    { method: "GET" }
  );
  return rows?.[0]?.data?.matches || null;
}

export async function saveRemoteMatches(matches) {
  return supabaseRequest(`app_state?id=eq.${STATE_ID}`, {
    method: "PATCH",
    body: JSON.stringify({
      data: { matches },
      updated_at: new Date().toISOString(),
    }),
  });
}

// Login do Capitão: resolve um código de acesso para o código da equipe via RPC
// (verify_captain_code). Retorna a string da equipe (ex.: "BRA") ou null se o
// código for inválido ou o Supabase não estiver configurado.
export async function verifyCaptainCode(code) {
  if (!hasSupabaseConfig) return null;
  const result = await supabaseRequest("rpc/verify_captain_code", {
    method: "POST",
    body: JSON.stringify({ p_code: String(code || "").trim() }),
  });
  // A função retorna um escalar (text) — o PostgREST devolve o valor direto.
  return typeof result === "string" && result ? result : null;
}
