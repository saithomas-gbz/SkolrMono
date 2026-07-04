import type { FastifyPluginAsync } from 'fastify';
import parentRoutes from './routes/parentRoutes';
import parentLinkRoutes from './routes/parentLinkRoutes';

/** Module Parent — monté sous `/parent`. Liens parent ↔ élève. */
const parentModule: FastifyPluginAsync = async (fastify) => {
  await fastify.register(parentRoutes);
  await fastify.register(parentLinkRoutes);
};

export const parentOpenApiTags = [{ name: 'parent', description: 'Parent API' }];

export default parentModule;
