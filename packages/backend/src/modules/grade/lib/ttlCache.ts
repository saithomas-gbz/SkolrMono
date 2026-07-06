/**
 * Cache mémoire minimal (issue #96) : pas de Redis/cache partagé ailleurs dans le
 * repo, donc un simple Map + TTL suffit pour ce monolithe mono-process. TTL court,
 * sans invalidation active sur écriture (createGrade/batchUpdateGrades/
 * publishAssignment ne sont pas modifiés) — fenêtre de fraîcheur assumée en échange
 * de ne pas toucher tous les points d'écriture du module grade.
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
