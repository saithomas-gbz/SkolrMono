import type { FastifyPluginAsync } from 'fastify';
import classRoutes from './routes/classRoutes';

/** Module Class — monté sous le préfixe `/class`. Classes, élèves, profs, cours. */
const classModule: FastifyPluginAsync = async (fastify) => {
  await fastify.register(classRoutes);
};

export const classOpenApiTags = [{ name: 'class', description: 'Class services api' }];

export default classModule;
