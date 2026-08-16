import { describe, it, expect, beforeEach } from 'bun:test';
import Fastify from 'fastify';
import { collectHttpMetrics, buildMetricsServer, registry } from '../metrics';

/**
 * Métriques Prometheus (#218). Ne touche ni la base ni le réseau : une instance
 * Fastify jetable suffit à observer ce que le hook enregistre.
 */
describe('métriques HTTP', () => {
  beforeEach(() => {
    registry.resetMetrics();
  });

  async function appWithRoutes() {
    const app = Fastify({ logger: false });
    collectHttpMetrics(app);
    app.get('/ping', async () => ({ ok: true }));
    app.get('/items/:id', async () => ({ ok: true }));
    app.get('/boom', async (_request, reply) => reply.code(500).send({ ko: true }));
    await app.ready();
    return app;
  }

  it('enregistre la durée, la méthode et le code de statut de chaque requête', async () => {
    const app = await appWithRoutes();
    await app.inject({ method: 'GET', url: '/ping' });

    const metrics = await registry.metrics();
    expect(metrics).toContain('skolr_http_request_duration_seconds_count');
    expect(metrics).toMatch(/route="\/ping"/);
    expect(metrics).toMatch(/method="GET"/);
    expect(metrics).toMatch(/status_code="200"/);
  });

  it('étiquette avec la route déclarée, pas le chemin appelé', async () => {
    const app = await appWithRoutes();
    await app.inject({ method: 'GET', url: '/items/42' });
    await app.inject({ method: 'GET', url: '/items/1337' });

    const metrics = await registry.metrics();
    // Une seule série pour les deux appels : c'est ce qui empêche un client
    // d'exploser la cardinalité en variant l'identifiant.
    expect(metrics).toMatch(/route="\/items\/:id"/);
    expect(metrics).not.toMatch(/route="\/items\/42"/);
    expect(metrics).not.toMatch(/route="\/items\/1337"/);
  });

  it('regroupe les requêtes sans route correspondante', async () => {
    const app = await appWithRoutes();
    await app.inject({ method: 'GET', url: '/chemin-inexistant-aleatoire' });

    const metrics = await registry.metrics();
    expect(metrics).toMatch(/route="<no-route>"/);
    expect(metrics).not.toMatch(/chemin-inexistant-aleatoire/);
  });

  it('distingue les erreurs serveur des succès', async () => {
    const app = await appWithRoutes();
    await app.inject({ method: 'GET', url: '/boom' });

    const metrics = await registry.metrics();
    expect(metrics).toMatch(/route="\/boom",status_code="500"|status_code="500".*route="\/boom"/);
  });

  it('expose les métriques au format Prometheus sur le serveur dédié', async () => {
    const app = await appWithRoutes();
    await app.inject({ method: 'GET', url: '/ping' });

    const metricsApp = buildMetricsServer();
    const res = await metricsApp.inject({ method: 'GET', url: '/metrics' });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.body).toContain('# TYPE skolr_http_request_duration_seconds histogram');
    // Métriques processus : distinguer « l'app est lente » de « la machine sature ».
    expect(res.body).toContain('process_resident_memory_bytes');
  });

  it("n'expose aucune métrique sur le port applicatif", async () => {
    const app = await appWithRoutes();
    const res = await app.inject({ method: 'GET', url: '/metrics' });
    expect(res.statusCode).toBe(404);
  });
});
