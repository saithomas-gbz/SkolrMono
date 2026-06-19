import * as Sentry from '@sentry/node';
import fastify from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import dotenv from 'dotenv';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import autoLoad from '@fastify/autoload';
import { join } from 'path';
import type { OpenAPIV3_1 } from 'openapi-types';
import {
  mergeGatewayWithAuthService,
  mergeGatewayWithClassService,
  mergeGatewayWithGradeService,
  mergeGatewayWithPlanningService,
  mergeGatewayWithBillingService,
} from './lib/mergeOpenApi';

dotenv.config();

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
  serverName: 'gateway',
  tracesSampleRate: 1.0,
});

const gatewayPort = parseInt(process.env.PORT || '3001', 10);
const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3000';
/** Path on auth-service for raw OpenAPI JSON (e.g. /openapi.json or /documentation/json) */
const authOpenApiPath = process.env.AUTH_OPENAPI_PATH || '/openapi.json';

const classServiceUrl = process.env.CLASS_SERVICE_URL || 'http://localhost:3002';
/** Path on class-service for raw OpenAPI JSON (e.g. /openapi.json or /documentation/json) */
const classOpenApiPath = process.env.CLASS_OPENAPI_PATH || '/openapi.json';

const gradeServiceUrl = process.env.GRADE_SERVICE_URL || 'http://localhost:3007';
/** Path on grade-service for raw OpenAPI JSON (e.g. /openapi.json or /documentation/json) */
const gradeOpenApiPath = process.env.GRADE_OPENAPI_PATH || '/openapi.json';

const planningServiceUrl = process.env.PLANNING_SERVICE_URL || 'http://localhost:3008';
/** Path on planning-service for raw OpenAPI JSON */
const planningOpenApiPath = process.env.PLANNING_OPENAPI_PATH || '/openapi.json';

const billingServiceUrl = process.env.BILLING_SERVICE_URL || 'http://localhost:3011';
/** Path on billing-service for raw OpenAPI JSON */
const billingOpenApiPath = process.env.BILLING_OPENAPI_PATH || '/openapi.json';

async function fetchServiceOpenApiSpec(baseUrl: string, path: string): Promise<Record<string, unknown> | null> {
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

const SPECS_CACHE_TTL_MS = 60_000;

interface SpecsCache {
  auth: Record<string, unknown> | null;
  class: Record<string, unknown> | null;
  grade: Record<string, unknown> | null;
  planning: Record<string, unknown> | null;
  billing: Record<string, unknown> | null;
  lastFetchAt: number;
}

const specsCache: SpecsCache = {
  auth: null,
  class: null,
  grade: null,
  planning: null,
  billing: null,
  lastFetchAt: 0,
};

async function refreshSpecs() {
  specsCache.auth = await fetchServiceOpenApiSpec(authServiceUrl, authOpenApiPath);
  specsCache.class = await fetchServiceOpenApiSpec(classServiceUrl, classOpenApiPath);
  specsCache.grade = await fetchServiceOpenApiSpec(gradeServiceUrl, gradeOpenApiPath);
  specsCache.planning = await fetchServiceOpenApiSpec(planningServiceUrl, planningOpenApiPath);
  specsCache.billing = await fetchServiceOpenApiSpec(billingServiceUrl, billingOpenApiPath);
  specsCache.lastFetchAt = Date.now();
}

async function build() {
  const cachedAuthSpec = await fetchServiceOpenApiSpec(authServiceUrl, authOpenApiPath);
  const cachedClassSpec = await fetchServiceOpenApiSpec(classServiceUrl, classOpenApiPath);
  const cachedGradeSpec = await fetchServiceOpenApiSpec(gradeServiceUrl, gradeOpenApiPath);
  const cachedPlanningSpec = await fetchServiceOpenApiSpec(planningServiceUrl, planningOpenApiPath);
  const cachedBillingSpec = await fetchServiceOpenApiSpec(billingServiceUrl, billingOpenApiPath);

  if (!cachedAuthSpec) {
    console.warn(
      `[gateway] Auth OpenAPI not available at ${authServiceUrl} (tried ${authOpenApiPath}` +
        (authOpenApiPath === '/openapi.json' ? ' and /documentation/json' : '') +
        '); /docs will only list gateway routes.',
    );
  }
  if (!cachedClassSpec) {
    console.warn(
      `[gateway] Class OpenAPI not available at ${classServiceUrl} (tried ${classOpenApiPath}` +
        (classOpenApiPath === '/openapi.json' ? ' and /documentation/json' : '') +
        '); /docs will only list gateway routes.',
    );
  }
  if (!cachedGradeSpec) {
    console.warn(
      `[gateway] Grade OpenAPI not available at ${gradeServiceUrl} (tried ${gradeOpenApiPath}` +
        (gradeOpenApiPath === '/openapi.json' ? ' and /documentation/json' : '') +
        '); /docs will only list gateway routes.',
    );
  }
  if (!cachedPlanningSpec) {
    console.warn(
      `[gateway] Planning OpenAPI not available at ${planningServiceUrl} (tried ${planningOpenApiPath}` +
        (planningOpenApiPath === '/openapi.json' ? ' and /documentation/json' : '') +
        '); /docs will only list gateway routes.',
    );
  }
  if (!cachedBillingSpec) {
    console.warn(
      `[gateway] Billing OpenAPI not available at ${billingServiceUrl} (tried ${billingOpenApiPath}` +
        (billingOpenApiPath === '/openapi.json' ? ' and /documentation/json' : '') +
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
          'API Gateway for Skolr services. Paths are merged from service OpenAPI specs when reachable at startup.',
      },
      servers: [
        {
          url: `http://localhost:${gatewayPort}`,
          description: 'Gateway (public URL for this document)',
        },
      ],
      tags: [
        { name: 'auth', description: 'Proxied to auth-service under /auth' },
        { name: 'class', description: 'Proxied to class-service under /class' },
        { name: 'grade', description: 'Proxied to grade-service under /grade' },
        { name: 'planning', description: 'Proxied to planning-services under /planning' },
        { name: 'billing', description: 'Proxied to billing-service under /billing' },
      ],
    },
    transformObject: (documentObject) => {
      if (Date.now() - specsCache.lastFetchAt > SPECS_CACHE_TTL_MS) {
        void refreshSpecs();
      }

      if ('openapiObject' in documentObject && documentObject.openapiObject) {
        const mergedAuth = mergeGatewayWithAuthService(
          documentObject.openapiObject as Record<string, unknown>,
          cachedAuthSpec,
          '/auth',
        );
        const mergedClass = mergeGatewayWithClassService(mergedAuth, cachedClassSpec, '/class');
        const mergedGrade = mergeGatewayWithGradeService(mergedClass, cachedGradeSpec, '/grade');
        const mergedPlanning = mergeGatewayWithPlanningService(mergedGrade, cachedPlanningSpec, '/planning');
        return mergeGatewayWithBillingService(mergedPlanning, cachedBillingSpec, '/billing') as Partial<OpenAPIV3_1.Document>;
      }
      return 'swaggerObject' in documentObject ? documentObject.swaggerObject : {};
    },
  });

  Sentry.setupFastifyErrorHandler(gateway);

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
  await gateway.register(import('./routes/class'));
  await gateway.register(import('./routes/grade'));
  await gateway.register(import('./routes/planning'));
  await gateway.register(import('./routes/notification'));
  await gateway.register(import('./routes/message'));
  await gateway.register(import('./routes/billing'));

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
