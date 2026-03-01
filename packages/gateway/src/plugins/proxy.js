"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = proxyPlugin;
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
async function proxyRequest(req, reply, targetUrl) {
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
        const proxyReq = (target.protocol === 'https:' ? https_1.default : http_1.default).request(options, (proxyRes) => {
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
async function proxyPlugin(fastify, options) {
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:3000';
    // Decorate fastify instance with proxy method
    fastify.decorate('proxyToAuthService', async (request, reply) => {
        const targetPath = request.url.replace(/^\/auth/, '');
        const targetUrl = `${authServiceUrl}${targetPath}`;
        try {
            await proxyRequest(request, reply, targetUrl);
        }
        catch (error) {
            fastify.log.error({ message: 'Proxy error', error });
            reply.code(500).send({ error: 'Proxy error', details: error instanceof Error ? error.message : 'Unknown error' });
        }
    });
    // Set up proxy routes
    fastify.all('/auth/*', async (request, reply) => {
        await fastify.proxyToAuthService(request, reply);
    });
}
