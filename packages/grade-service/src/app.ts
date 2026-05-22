import fastify from 'fastify';
import dotenv from 'dotenv';
import { testDatabaseConnection } from './db';
import gradeRoutes from './routes/gradeRoutes';

dotenv.config();

const app = fastify({ logger: true });

app.get('/health', async () => ({ status: 'ok' }));

async function start() {
  try {
    await app.register(gradeRoutes);
    await app.listen({ port: Number(process.env.PORT || 3007), host: '0.0.0.0' });
    app.log.info(`Server running on port ${process.env.PORT || 3007}`);
    await testDatabaseConnection();
    app.log.info('Database connection successful!');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

void start();
