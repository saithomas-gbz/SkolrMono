import { describe, it, expect } from 'bun:test';

// D'autres fichiers de test (statsController.test.ts, etc.) mockent
// '../lib/ttlCache' via mock.module, qui persiste au-delà de leur propre fichier
// dans un run multi-fichiers (mock.restore() ne suffit pas à défaire des mocks
// empilés par plusieurs fichiers). Le suffixe `?fresh` force une résolution de
// module distincte, non interceptée par mock.module('../lib/ttlCache', ...).
const { getOrCompute, invalidate } = await import('../lib/ttlCache?fresh');

describe('getOrCompute', () => {
  it('recalcule au premier appel puis sert le cache tant que le TTL est valide', async () => {
    let calls = 0;
    const compute = async () => {
      calls += 1;
      return calls;
    };
    const key = `test:hit:${Math.random()}`;

    expect(await getOrCompute(key, 10_000, compute)).toBe(1);
    expect(await getOrCompute(key, 10_000, compute)).toBe(1);
    expect(calls).toBe(1);
  });

  it('recalcule après invalidate', async () => {
    let calls = 0;
    const compute = async () => {
      calls += 1;
      return calls;
    };
    const key = `test:invalidate:${Math.random()}`;

    await getOrCompute(key, 10_000, compute);
    invalidate(key);
    await getOrCompute(key, 10_000, compute);

    expect(calls).toBe(2);
  });

  it('évince la clé la plus ancienne au-delà de MAX_ENTRIES (500)', async () => {
    const prefix = `test:evict:${Math.random()}:`;
    for (let i = 0; i < 501; i += 1) {
      await getOrCompute(`${prefix}${i}`, 10_000, async () => i);
    }

    let firstKeyRecomputed = false;
    await getOrCompute(`${prefix}0`, 10_000, async () => {
      firstKeyRecomputed = true;
      return -1;
    });

    expect(firstKeyRecomputed).toBe(true);
  });
});
