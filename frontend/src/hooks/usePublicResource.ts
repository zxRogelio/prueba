import { useCallback, useEffect, useState } from "react";
import { useOnline } from "./useOnline";
import { readPublic, writePublic, type PublicKey, type PublicSnapshot } from "../pwa/publicStore";

export function usePublicResource<T>(key: PublicKey, loader: (signal: AbortSignal) => Promise<T>) {
  const online = useOnline();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    key: PublicKey; data?: T; loading: boolean; stale: boolean;
    error: boolean; savedAt?: number;
  }>({ key, loading: true, stale: false, error: false });
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setState({ key, loading: true, stale: false, error: false });
    async function load() {
      let cached = await readPublic<T>(key);
      // A product from the saved catalogue is also usable on a first detail visit.
      if (!cached && key.startsWith("product:")) {
        const catalog = await readPublic<Array<{ id: string }>>("products");
        const data = catalog?.data.find((item) => String(item.id) === key.slice(8));
        if (data && catalog) cached = { data: data as T, savedAt: catalog.savedAt };
      }
      if (!active) return;
      if (cached) setState({ key, ...cached, loading: false, stale: true, error: false });
      if (!online) {
        // Give the loading state one frame even when storage is empty and fast.
        await new Promise((resolve) => setTimeout(resolve, 250));
        if (active) setState({ key, ...cached, loading: false, stale: Boolean(cached), error: !cached });
        return;
      }
      try {
        const data = await loader(controller.signal);
        const snapshot: PublicSnapshot<T> = { data, savedAt: Date.now() };
        if (!active) return;
        await writePublic(key, snapshot);
        if (active) setState({ key, ...snapshot, loading: false, stale: false, error: false });
      } catch {
        if (active) setState({ key, ...cached, loading: false, stale: Boolean(cached), error: true });
      }
    }
    void load();
    return () => { active = false; controller.abort(); };
  }, [key, loader, online, attempt]);

  const current = state.key === key ? state : { loading: true, stale: false, error: false, data: undefined, savedAt: undefined };
  return { ...current, online, retry };
}
