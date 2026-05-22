import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import http from 'http';
import https from 'https';

declare module 'fastify' {
  interface FastifyInstance {
    proxyToAuthService: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    proxyToClassService: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    proxyToGradeService: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
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
      reply.code(proxyRes.statusCode || 200);
      
      // Copy headers from proxy response
      Object.entries(proxyRes.headers).forEach(([key, value]) => {
        if (value && key !== 'transfer-encoding') {
          reply.header(key, Array.isArray(value) ? value.join(', ') : value);
        }
      });

      proxyRes.pipe(reply.raw);
      proxyRes.on('end', resolve);
    });

    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err);
      reply.code(502).send({ error: 'Bad Gateway', details: err.message });
      reject(err);
    });

    // Pipe request body to proxy
    if (req.body) {
      proxyReq.write(JSON.stringify(req.body));
    }
    proxyReq.end();
  });
}

export default async function proxyPlugin(fastify: FastifyInstance) {
  const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:3000';
  const classServiceUrl = process.env.CLASS_SERVICE_URL || 'http://class-service:3002';
  const gradeServiceUrl = process.env.GRADE_SERVICE_URL || 'http://grade-service:3007';

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

  // Proxy plugin provides the proxyToAuthService method
  // Routes are set up in the auth routes file
}