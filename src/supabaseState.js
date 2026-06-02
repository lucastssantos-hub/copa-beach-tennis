const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const STATE_ID = "copa-beach-tennis";

export const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

async function supabaseRequest(path, options = {}) {
  if (!hasSupabaseConfig) return null;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    throw new Error(`Supabase request failed: ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
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
