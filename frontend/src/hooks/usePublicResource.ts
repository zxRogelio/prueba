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
    // Preserve rendered data while rechecking storage or revalidating it. An
    // online/offline event must not replace a saved catalogue with skeletons.
    setState((previous) => previous.key === key && previous.data !== undefined
      ? { ...previous, loading: false, stale: true, error: false }
      : { key, loading: true, stale: false, error: false });
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
        // Deliberately wait without a timer when there is no local snapshot.
        // The online event reruns this effect and starts a bounded API request.
        setState({ key, ...cached, loading: !cached, stale: Boolean(cached), error: false });
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
  const waitingForConnection = !online && current.data === undefined;
  return {
    ...current,
    loading: current.loading || waitingForConnection,
    error: online && current.error,
    waitingForConnection,
    online,
    retry,
  };
}
