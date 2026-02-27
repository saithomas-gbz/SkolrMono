import fastify from 'fastify';
import { swagger } from 'fastify-swagger';
import dotenv from 'dotenv';
import cors from 'fastify-cors';
import sensible from '@fastify/sensible';
import autoLoad from 'fastify-autoload';
import { join } from 'path';

dotenv.config();

const gateway = fastify({
  logger: true,
});

gateway.register(sensible);
gateway.register(cors, {
  origin: '*',
});

gateway.register(autoLoad, {
  dir: join(__dirname, 'plugins'),
  dirNameRoutePrefix: false,
});

gateway.register(autoLoad, {
  dir: join(__dirname, 'routes'),
  dirNameRoutePrefix: true,
  indexPattern: /.*routes(\.ts|\.js)$/,
});

gateway.register(swagger, {
  routePrefix: '/docs',
  swagger: {
    info: {
      title: 'Skolr Gateway Documentation',
      version: '1.0.0',
    },
  },
});

gateway.listen({ port: process.env.PORT || 8080 }, (err, address) => {
  if (err) {
    gateway.log.error(err);
    process.exit(1);
  }
  gateway.log.info(`Server listening at ${address}`);
});
