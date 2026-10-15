export type PublicKey = "products" | "memberships" | "about" |
  `product:${string}` | `recommendations:${string}`;
export type PublicSnapshot<T> = { data: T; savedAt: number };
const DATABASE = "titanium-public-v1";
const STORE = "resources";

// Storage may be denied, evicted, full, or blocked by another tab. None of those
// conditions should block rendering or the decision to wait for a connection.
function transaction<T>(mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  return new Promise((resolve) => {
    let database: IDBDatabase | undefined;
    let finished = false;
    const finish = (result?: T) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      database?.close();
      resolve(result);
    };
    const timer = setTimeout(() => finish(), 1500);
    try {
      const opening = indexedDB.open(DATABASE, 1);
      opening.onupgradeneeded = () => opening.result.createObjectStore(STORE);
      opening.onerror = () => finish();
      opening.onblocked = () => finish();
      opening.onsuccess = () => {
        database = opening.result;
        if (finished) { database.close(); return; }
        database.onversionchange = () => database?.close();
        const tx = database.transaction(STORE, mode);
        const request = run(tx.objectStore(STORE));
        tx.oncomplete = () => finish(request.result);
        tx.onerror = tx.onabort = () => finish();
      };
    } catch { finish(); }
  });
}

export function readPublic<T>(key: PublicKey) {
  return transaction<PublicSnapshot<T>>("readonly", (store) => store.get(key));
}

export async function writePublic<T>(key: PublicKey, snapshot: PublicSnapshot<T>) {
  await transaction("readwrite", (store) => store.put(snapshot, key));
}
