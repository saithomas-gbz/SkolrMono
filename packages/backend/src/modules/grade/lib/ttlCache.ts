/**
 * Cache mémoire minimal (issue #96) : pas de Redis/cache partagé ailleurs dans le
 * repo, donc un simple Map + TTL suffit pour ce monolithe mono-process. Les écritures
 * de notes (createGrade/updateGrade/deleteGrade/batchUpdateGrades) appellent
 * `invalidate` sur les clés directement concernées (user/class/assignment) ; le rang
 * des camarades de classe (dérivé de leur propre entrée `user:*`) peut rester
 * périmé jusqu'à expiration du TTL — fenêtre de fraîcheur assumée plutôt qu'une
 * invalidation par préfixe de classe.
 */

type CacheEntry<T> = { value: T; expiresAt: number };

const store = new Map<string, CacheEntry<unknown>>();

export async function getOrCompute<T>(key: string, ttlMs: number, compute: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.value as T;
  }
  const value = await compute();
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

export function invalidate(key: string): void {
  store.delete(key);
}
