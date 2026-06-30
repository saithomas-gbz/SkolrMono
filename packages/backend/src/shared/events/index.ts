import { EventEmitter } from 'node:events';

/**
 * Bus d'événements in-process — remplaçant direct de `@skolr/rabbitmq` pour le
 * monolithe modulaire (#114). Mêmes signatures `publish` / `consume` et mêmes
 * clés de routage (`user.created`, `student.enrolled`, `grade.created`,
 * `absence.*`, `message.received`, `billing.*`) que l'ancien exchange topic, si
 * bien que publishers et consumers migrent sans changement de logique.
 *
 * Sémantique conservée :
 * - découplage type messagerie : `publish` rend la main immédiatement, les
 *   handlers s'exécutent hors du chemin de la requête (queueMicrotask) ;
 * - une erreur de handler n'interrompt jamais le publisher (logguée puis ignorée,
 *   comme un nack sans requeue) ;
 * - le payload est sérialisé/désérialisé en JSON (Date -> string ISO) pour rester
 *   identique au comportement réseau précédent.
 */
export const EXCHANGE = 'skolr.events';

const emitter = new EventEmitter();
// Plusieurs consumers peuvent écouter la même clé sans plafond de listeners.
emitter.setMaxListeners(0);

export async function publish(routingKey: string, payload: unknown): Promise<void> {
  const encoded = JSON.stringify(payload);
  queueMicrotask(() => {
    emitter.emit(routingKey, encoded);
  });
}

export async function consume(
  queue: string,
  routingKey: string,
  handler: (payload: unknown) => Promise<void>,
): Promise<void> {
  emitter.on(routingKey, (encoded: string) => {
    void (async () => {
      try {
        const payload = JSON.parse(encoded) as unknown;
        await handler(payload);
      } catch (err) {
        console.error(`[events] Error processing '${routingKey}' on queue '${queue}':`, err);
      }
    })();
  });
}
