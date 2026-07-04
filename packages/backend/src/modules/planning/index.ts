import type { FastifyPluginAsync } from 'fastify';
import sessionRoutes from './routes/sessionRoutes';
import absenceRoutes from './routes/absenceRoutes';
import absenceJustificationRoutes from './routes/absenceJustificationRoutes';

/** Module Planning — monté sous `/planning`. Sessions, absences, justificatifs. */
const planningModule: FastifyPluginAsync = async (fastify) => {
  await fastify.register(sessionRoutes);
  await fastify.register(absenceRoutes);
  await fastify.register(absenceJustificationRoutes);
};

export const planningOpenApiTags = [
  { name: 'session', description: 'Session scheduling api' },
  { name: 'absence', description: 'Absence management api' },
  { name: 'absence-justification', description: 'Absence justification workflow api (issue #80)' },
];

export default planningModule;
