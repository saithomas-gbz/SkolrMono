import client from 'prom-client';
import Fastify, { type FastifyInstance } from 'fastify';

/**
 * Métriques Prometheus du monolithe (#218).
 *
 * Les métriques ne sont **pas** exposées sur le port applicatif : elles
 * décriraient publiquement la surface d'API, les volumes de trafic et l'état
 * mémoire du processus. Elles vivent sur un serveur HTTP distinct
 * (`METRICS_PORT`, 9464 par défaut) que `docker-compose.release.yml` ne publie
 * pas sur l'hôte — seul Prometheus, sur le réseau interne, peut l'atteindre.
 */

const METRICS_PORT = Number(process.env.METRICS_PORT ?? 9464);
const METRICS_ENABLED = process.env.METRICS_ENABLED !== 'false';

/**
 * Interface d'écoute du serveur de métriques. `127.0.0.1` par défaut : sur une
 * machine nue, écouter sur `0.0.0.0` publierait les métriques sur toutes les
 * interfaces, y compris publique s'il n'y a pas de pare-feu.
 *
 * En conteneur, l'isolation vient du namespace réseau et non du bind : les
 * fichiers compose passent explicitement `METRICS_HOST=0.0.0.0` pour que
 * Prometheus, dans un autre conteneur, puisse scruter — le port n'étant jamais
 * publié sur l'hôte. Même logique que `TRUST_PROXY` : sûr par défaut, élargi
 * seulement là où le contexte le justifie.
 */
const METRICS_HOST = process.env.METRICS_HOST ?? '127.0.0.1';

export const registry = new client.Registry();

/**
 * Une seule métrique HTTP : un histogramme suffit à tout dériver. `_count`
 * donne le trafic, la ventilation par `status_code` donne le taux d'erreur, les
 * buckets donnent les quantiles de latence. Un compteur séparé ferait doublon.
 */
export const httpRequestDuration = new client.Histogram({
  name: 'skolr_http_request_duration_seconds',
  help: "Durée des requêtes HTTP traitées par le backend, par route et code de statut",
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

/**
 * Route *déclarée* (`/grade/grades/:id`) et non chemin appelé
 * (`/grade/grades/42`). Sans ça, chaque identifiant créerait une série
 * temporelle : la cardinalité exploserait, et n'importe qui pourrait saturer la
 * mémoire de Prometheus en appelant des URL aléatoires. Les requêtes qui ne
 * correspondent à aucune route sont regroupées sous une valeur unique.
 */
function routeLabel(request: { routeOptions?: { url?: string } }): string {
  return request.routeOptions?.url ?? '<no-route>';
}

let defaultMetricsStarted = false;

/**
 * Branche la collecte sur une instance Fastify. À appeler sur l'instance racine
 * avant l'enregistrement des modules : un hook posé sur la racine s'applique à
 * tous les contextes enregistrés ensuite.
 */
export function collectHttpMetrics(app: FastifyInstance): void {
  if (!defaultMetricsStarted) {
    // Métriques du processus : CPU, mémoire, descripteurs, latence de la boucle
    // d'événements. C'est ce qui distingue « l'app est lente » de « la machine
    // est saturée » au moment d'un incident.
    client.collectDefaultMetrics({ register: registry });
    defaultMetricsStarted = true;
  }

  app.addHook('onResponse', async (request, reply) => {
    httpRequestDuration.observe(
      {
        method: request.method,
        route: routeLabel(request),
        status_code: String(reply.statusCode),
      },
      reply.elapsedTime / 1000,
    );
  });
}

/**
 * Serveur d'exposition des métriques. Journalisation désactivée : Prometheus
 * scrute toutes les 15 s, une ligne de log par scrape noierait les logs
 * applicatifs sans rien apprendre.
 */
export function buildMetricsServer(): FastifyInstance {
  const metricsApp = Fastify({ logger: false });

  metricsApp.get('/metrics', async (_request, reply) => {
    reply.header('Content-Type', registry.contentType);
    return registry.metrics();
  });

  return metricsApp;
}

/** Renvoie l'adresse d'écoute, ou `null` si `METRICS_ENABLED=false`. */
export async function startMetricsServer(): Promise<string | null> {
  if (!METRICS_ENABLED) return null;

  const metricsApp = buildMetricsServer();
  return metricsApp.listen({ port: METRICS_PORT, host: METRICS_HOST });
}
