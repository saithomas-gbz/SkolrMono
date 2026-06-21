import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import http from 'http';
import https from 'https';

declare module 'fastify' {
  interface FastifyInstance {
    proxyToAuthService: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    proxyToClassService: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    proxyToGradeService: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    proxyToPlanningService: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    proxyToNotificationService: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    proxyToMessageService: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    proxyToBillingService: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    proxyToParentService: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

async function proxyRequest(req: FastifyRequest, reply: FastifyReply, targetUrl: string) {
  const target = new URL(targetUrl);
  
  const options = {
    hostname: target.hostname,
    port: target.port || (target.protocol === 'https:' ? 443 : 80),
    path: target.pathname + (target.search || ''),
    method: req.method,
    headers: {
      ...req.headers,
      host: target.host
    }
  };

  return new Promise((resolve, reject) => {
    const proxyReq = (target.protocol === 'https:' ? https : http).request(options, (proxyRes) => {
      // On pipe directement vers reply.raw : reply.header()/reply.code() ne seraient jamais
      // flush (ils ne s'appliquent qu'au appel de reply.send()). hijack() + writeHead()
      // garantit que les headers proxifiés (ex. Location sur une redirection OAuth) sortent bien.
      reply.hijack();

      const headers: http.OutgoingHttpHeaders = {};
      Object.entries(proxyRes.headers).forEach(([key, value]) => {
        if (value && key !== 'transfer-encoding') {
          headers[key] = value;
        }
      });
      reply.raw.writeHead(proxyRes.statusCode || 200, headers);

      proxyRes.pipe(reply.raw);
      proxyRes.on('end', resolve);
    });

    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err);
      reply.code(502).send({ error: 'Bad Gateway', details: err.message });
      reject(err);
    });

    // Pipe request body to proxy. Un Buffer (body brut, ex. webhooks signés) est transmis
    // tel quel pour préserver les octets exacts ; sinon on retombe sur le JSON ré-encodé.
    if (Buffer.isBuffer(req.body)) {
      proxyReq.write(req.body);
    } else if (req.body) {
      proxyReq.write(JSON.stringify(req.body));
    }
    proxyReq.end();
  });
}

export default async function proxyPlugin(fastify: FastifyInstance) {
  const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:3000';
  const classServiceUrl = process.env.CLASS_SERVICE_URL || 'http://class-service:3002';
  const gradeServiceUrl = process.env.GRADE_SERVICE_URL || 'http://grade-service:3007';
  const planningServiceUrl = process.env.PLANNING_SERVICE_URL || 'http://planning-services:3008';
  const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3009';
  const messageServiceUrl = process.env.MESSAGE_SERVICE_URL || 'http://message-service:3010';
  const billingServiceUrl = process.env.BILLING_SERVICE_URL || 'http://billing-service:3011';
  const parentServiceUrl = process.env.PARENT_SERVICE_URL || 'http://parent-service:3012';

  // Decorate fastify instance with proxy method
  fastify.decorate('proxyToAuthService', async (request: FastifyRequest, reply: FastifyReply) => {
    const targetPath = request.url.replace(/^\/auth/, '');
    const targetUrl = `${authServiceUrl}${targetPath}`;
    
    try {
      await proxyRequest(request, reply, targetUrl);
    } catch (error) {
      fastify.log.error({ message: 'Proxy error', error });
      reply.code(500).send({ error: 'Proxy error', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  fastify.decorate('proxyToClassService', async (request: FastifyRequest, reply: FastifyReply) => {
    const targetPath = request.url.replace(/^\/class/, '');
    const targetUrl = `${classServiceUrl}${targetPath}`;

    try {
      await proxyRequest(request, reply, targetUrl);
    } catch (error) {
      fastify.log.error({ message: 'Proxy error', error });
      reply
        .code(500)
        .send({ error: 'Proxy error', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  fastify.decorate('proxyToGradeService', async (request: FastifyRequest, reply: FastifyReply) => {
    const targetPath = request.url.replace(/^\/grade/, '');
    const targetUrl = `${gradeServiceUrl}${targetPath}`;

    try {
      await proxyRequest(request, reply, targetUrl);
    } catch (error) {
      fastify.log.error({ message: 'Proxy error', error });
      reply
        .code(500)
        .send({ error: 'Proxy error', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  fastify.decorate('proxyToPlanningService', async (request: FastifyRequest, reply: FastifyReply) => {
    const targetPath = request.url.replace(/^\/planning/, '');
    const targetUrl = `${planningServiceUrl}${targetPath}`;

    try {
      await proxyRequest(request, reply, targetUrl);
    } catch (error) {
      fastify.log.error({ message: 'Proxy error', error });
      reply
        .code(500)
        .send({ error: 'Proxy error', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  fastify.decorate('proxyToNotificationService', async (request: FastifyRequest, reply: FastifyReply) => {
    const targetPath = request.url.replace(/^\/notification/, '');
    const targetUrl = `${notificationServiceUrl}${targetPath}`;

    try {
      await proxyRequest(request, reply, targetUrl);
    } catch (error) {
      fastify.log.error({ message: 'Proxy error', error });
      reply
        .code(500)
        .send({ error: 'Proxy error', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  fastify.decorate('proxyToMessageService', async (request: FastifyRequest, reply: FastifyReply) => {
    const targetPath = request.url.replace(/^\/message/, '');
    const targetUrl = `${messageServiceUrl}${targetPath}`;

    try {
      await proxyRequest(request, reply, targetUrl);
    } catch (error) {
      fastify.log.error({ message: 'Proxy error', error });
      reply
        .code(500)
        .send({ error: 'Proxy error', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  fastify.decorate('proxyToBillingService', async (request: FastifyRequest, reply: FastifyReply) => {
    const targetPath = request.url.replace(/^\/billing/, '');
    const targetUrl = `${billingServiceUrl}${targetPath}`;

    try {
      await proxyRequest(request, reply, targetUrl);
    } catch (error) {
      fastify.log.error({ message: 'Proxy error', error });
      reply
        .code(500)
        .send({ error: 'Proxy error', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  fastify.decorate('proxyToParentService', async (request: FastifyRequest, reply: FastifyReply) => {
    const targetPath = request.url.replace(/^\/parent/, '');
    const targetUrl = `${parentServiceUrl}${targetPath}`;

    try {
      await proxyRequest(request, reply, targetUrl);
    } catch (error) {
      fastify.log.error({ message: 'Proxy error', error });
      reply
        .code(500)
        .send({ error: 'Proxy error', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });
}