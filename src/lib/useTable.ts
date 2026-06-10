import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

interface UseTableOptions {
  orderBy?: string;
  ascending?: boolean;
  limit?: number;
  /** Intervalo de atualização automática em ms (0 = desligado). */
  pollMs?: number;
}

interface UseTableResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Busca uma tabela do Supabase com polling opcional.
 * Se o Supabase não estiver configurado, devolve lista vazia sem quebrar.
 */
export function useTable<T>(
  table: string,
  { orderBy = "created_at", ascending = false, limit, pollMs = 0 }: UseTableOptions = {},
): UseTableResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(supabase !== null);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    if (!supabase) return;
    let query = supabase.from(table).select("*").order(orderBy, { ascending });
    if (limit) query = query.limit(limit);
    const { data: rows, error: err } = await query;
    if (!mounted.current) return;
    if (err) {
      setError(err.message);
    } else {
      setError(null);
      setData((rows ?? []) as T[]);
    }
    setLoading(false);
  }, [table, orderBy, ascending, limit]);

  useEffect(() => {
    mounted.current = true;
    refresh();
    let timer: ReturnType<typeof setInterval> | undefined;
    if (pollMs > 0 && supabase) timer = setInterval(refresh, pollMs);
    return () => {
      mounted.current = false;
      if (timer) clearInterval(timer);
    };
  }, [refresh, pollMs]);

  return { data, loading, error, refresh };
}
