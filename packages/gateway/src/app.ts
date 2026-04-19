import fastify from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import dotenv from 'dotenv';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import autoLoad from '@fastify/autoload';
import { join } from 'path';
import type { OpenAPIV3_1 } from 'openapi-types';
import { mergeGatewayWithAuthService } from './lib/mergeOpenApi';

dotenv.config();

const gatewayPort = parseInt(process.env.PORT || '3001', 10);
const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3000';
/** Path on auth-service for raw OpenAPI JSON (e.g. /openapi.json or /documentation/json) */
const authOpenApiPath = process.env.AUTH_OPENAPI_PATH || '/openapi.json';

async function fetchAuthOpenApiSpec(baseUrl: string, path: string): Promise<Record<string, unknown> | null> {
  const tryPaths = path === '/openapi.json' ? [path, '/documentation/json'] : [path];

  for (const p of tryPaths) {
    try {
      const url = `${baseUrl.replace(/\/$/, '')}${p}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        return (await res.json()) as Record<string, unknown>;
      }
    } catch {
      // try next path
    }
  }
  return null;
}

async function build() {
  const cachedAuthSpec = await fetchAuthOpenApiSpec(authServiceUrl, authOpenApiPath);

  if (!cachedAuthSpec) {
    console.warn(
      `[gateway] Auth OpenAPI not available at ${authServiceUrl} (tried ${authOpenApiPath}` +
        (authOpenApiPath === '/openapi.json' ? ' and /documentation/json' : '') +
        '); /docs will only list gateway routes.',
    );
  }

  const gateway = fastify({
    logger: true,
  });

  await gateway.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Skolr Gateway Documentation',
        version: '1.0.0',
        description:
          'API Gateway for Skolr services. Auth paths are merged from auth-service OpenAPI when reachable at startup.',
      },
      servers: [
        {
          url: `http://localhost:${gatewayPort}`,
          description: 'Gateway (public URL for this document)',
        },
      ],
      tags: [{ name: 'auth', description: 'Proxied to auth-service under /auth' }],
    },
    transformObject: (documentObject) => {
      if ('openapiObject' in documentObject && documentObject.openapiObject) {
        return mergeGatewayWithAuthService(
          documentObject.openapiObject as Record<string, unknown>,
          cachedAuthSpec,
          '/auth',
        ) as Partial<OpenAPIV3_1.Document>;
      }
      return 'swaggerObject' in documentObject ? documentObject.swaggerObject : {};
    },
  });

  await gateway.register(sensible);
  await gateway.register(cors, {
    origin: '*',
  });

  await gateway.register(autoLoad, {
    dir: join(__dirname, 'plugins'),
    dirNameRoutePrefix: false,
    ignorePattern: /proxy\.js$/,
  });

  await gateway.register(import('./routes/auth'));

  await gateway.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false,
    },
  });

  return gateway;
}

const start = async () => {
  try {
    const gateway = await build();
    await gateway.listen({ port: gatewayPort, host: '0.0.0.0' });
    gateway.log.info(`Server listening on port ${gatewayPort}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

void start();
