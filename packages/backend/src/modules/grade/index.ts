import type { FastifyPluginAsync } from 'fastify';
import gradeRoutes from './routes/gradeRoutes';
import assignmentRoutes from './routes/assignmentRoutes';
import courseRoutes from './routes/courseRoutes';
import subjectRoutes from './routes/subjectRoutes';
import topicRoutes from './routes/topicRoutes';
import bulletinRoutes from './routes/bulletinRoutes';
import statsRoutes from './routes/statsRoutes';

/** Module Grade — monté sous `/grade`. Notes, devoirs, cours, matières, chapitres. */
const gradeModule: FastifyPluginAsync = async (fastify) => {
  await fastify.register(gradeRoutes);
  await fastify.register(assignmentRoutes);
  await fastify.register(courseRoutes);
  await fastify.register(subjectRoutes);
  await fastify.register(topicRoutes);
  await fastify.register(bulletinRoutes);
  await fastify.register(statsRoutes);
};

export const gradeOpenApiTags = [
  { name: 'grade', description: 'Grade services api' },
  { name: 'assignment', description: 'Assignment (devoir) management api' },
  { name: 'course', description: 'Course management api' },
  { name: 'subject', description: 'Subject management api' },
  { name: 'topic', description: 'Topic management api' },
  { name: 'bulletin', description: 'Bulletin de notes PDF' },
  { name: 'stats', description: 'Statistiques et moyennes de notes (issue #96)' },
];

export default gradeModule;
