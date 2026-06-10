// ============================================================================
// useTournament — estado compartilhado do torneio (matches + notificações +
// auditoria). Usado tanto pelo app da Organização quanto pelo app do Capitão.
// Persiste no localStorage (mesma chave) e sincroniza entre abas/dispositivos
// do mesmo navegador via evento 'storage'. (Sync entre dispositivos diferentes
// fica para o backend Supabase — Fase 2.)
// ============================================================================
import { useEffect, useRef, useState } from "react";
import { MATCHES, TEAMS } from "./data.js";
import { STATUS, normalizeMatch, warmupToPlay } from "./engine.js";
import { hasSupabaseConfig, loadRemoteMatches, saveRemoteMatches } from "./supabaseState.js";

export const STORAGE_KEY = "copa-beach-tennis-state-v3";

export function cloneSeed() {
  return JSON.parse(JSON.stringify(MATCHES)).map(normalizeMatch);
}
function isValidMatchSet(value) {
  return Array.isArray(value) && value.length > 0 && value.every(m => m.category && m.id);
}
// Descarta confrontos cujos códigos de equipe não existem mais em TEAMS (ex.:
// dado remoto obsoleto após remover uma seleção). Sem isso, um único confronto
// fantasma quebrava a renderização. Normaliza os que sobram. Dado obsoleto se
// auto-cura porque o conjunto saneado é re-salvo no localStorage/Supabase.
function sanitizeMatches(list) {
  return list.filter(m => TEAMS[m.a] && TEAMS[m.b]).map(normalizeMatch);
}
function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { matches: cloneSeed(), notifications: [], audits: [], courtCount: 4 };
    const parsed = JSON.parse(saved);
    const matches = isValidMatchSet(parsed.matches) ? sanitizeMatches(parsed.matches) : cloneSeed();
    return { matches, notifications: parsed.notifications || [], audits: parsed.audits || [], courtCount: parsed.courtCount || 4 };
  } catch {
    return { matches: cloneSeed(), notifications: [], audits: [], courtCount: 4 };
  }
}

export function useTournament({ manageWarmup = false } = {}) {
  const init = loadState();
  const [matches, setMatches] = useState(init.matches);
  const [notifications, setNotifications] = useState(init.notifications);
  const [audits, setAudits] = useState(init.audits);
  const [courtCount, setCourtCount] = useState(init.courtCount);
  const [syncReady, setSyncReady] = useState(!hasSupabaseConfig);
  // JSON dos matches que já estão em sincronia com o Supabase (anti-eco do polling)
  const lastSyncedRef = useRef(null);

  // Aplica o resultado de uma transição (engine.js)
  function dispatch(txResult) {
    if (!txResult) return;
    const { match, audits: au = [], notifications: nt = [] } = txResult;
    if (match) setMatches(ms => ms.map(m => (m.id === match.id ? match : m)));
    if (au.length) setAudits(a => [...a, ...au]);
    if (nt.length) setNotifications(n => [...n, ...nt]);
  }
  function reset() {
    localStorage.removeItem(STORAGE_KEY);
    setMatches(cloneSeed());
    setNotifications([]);
    setAudits([]);
    setCourtCount(4);
  }

  // Supabase (carregamento inicial dos confrontos)
  useEffect(() => {
    if (!hasSupabaseConfig) return;
    let active = true;
    loadRemoteMatches()
      .then(remote => {
        if (active && isValidMatchSet(remote)) {
          const norm = sanitizeMatches(remote);
          lastSyncedRef.current = JSON.stringify(norm);
          setMatches(norm);
        }
      })
      .catch(() => {})
      .finally(() => { if (active) setSyncReady(true); });
    return () => { active = false; };
  }, []);

  // Polling: relê o Supabase a cada 5s para refletir mudanças de OUTROS dispositivos
  // (capitão envia escalação → ADM vê; ADM libera quadra → capitão/mesário veem).
  useEffect(() => {
    if (!hasSupabaseConfig) return;
    const t = setInterval(() => {
      loadRemoteMatches().then(remote => {
        if (!isValidMatchSet(remote)) return;
        const norm = sanitizeMatches(remote);
        const json = JSON.stringify(norm);
        if (json === lastSyncedRef.current) return; // nada novo no servidor
        lastSyncedRef.current = json;
        setMatches(norm);
      }).catch(() => {});
    }, 5000);
    return () => clearInterval(t);
  }, []);

  // Persistência local
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ matches, notifications, audits, courtCount }));
  }, [matches, notifications, audits]);

  useEffect(() => {
    if (!hasSupabaseConfig || !syncReady) return;
    const json = JSON.stringify(matches);
    if (json === lastSyncedRef.current) return; // mudança veio do servidor (não reenviar)
    const t = setTimeout(() => {
      saveRemoteMatches(matches)
        .then(() => { lastSyncedRef.current = json; })
        .catch(() => {});
    }, 500);
    return () => clearTimeout(t);
  }, [matches, syncReady]);

  // Sincronização entre abas/apps (capitão ↔ organização) no mesmo navegador
  useEffect(() => {
    function onStorage(e) {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue);
        if (isValidMatchSet(parsed.matches)) setMatches(sanitizeMatches(parsed.matches));
        setNotifications(parsed.notifications || []);
        setAudits(parsed.audits || []);
      } catch { /* ignore */ }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Cronômetro de aquecimento (só o app que "gerencia" — a Organização)
  const matchesRef = useRef(matches);
  useEffect(() => { matchesRef.current = matches; }, [matches]);
  useEffect(() => {
    if (!manageWarmup) return;
    const t = setInterval(() => {
      matchesRef.current
        .filter(m => m.status === STATUS.AQUECIMENTO && m.warmupEndsAt && Date.now() >= m.warmupEndsAt)
        .forEach(m => dispatch(warmupToPlay(m, { actor: "sistema" })));
    }, 1000);
    return () => clearInterval(t);
  }, [manageWarmup]);

  return { matches, notifications, audits, dispatch, reset, setMatches, setNotifications, courtCount, setCourtCount };
}
