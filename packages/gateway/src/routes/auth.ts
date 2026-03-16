import { FastifyInstance } from 'fastify';
import proxyPlugin from '../plugins/proxy';

export default async function authRoutes(fastify: FastifyInstance) {
  // Register proxy plugin to get the proxyToAuthService method
  await proxyPlugin(fastify);

  // Set up proxy routes for all /auth/* endpoints
  fastify.all('/auth/*', async (request, reply) => {
    await fastify.proxyToAuthService(request, reply);
  });

  // Add Swagger documentation for auth routes
  // These are documentation-only routes that describe the proxied endpoints
  fastify.route({
    method: 'POST',
    url: '/auth/login',
    schema: {
      description: 'Authenticate user and return JWT token',
      tags: ['auth'],
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 }
        },
        required: ['email', 'password']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                role: { type: 'string' }
              }
            }
          }
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    },
    handler: async (request, reply) => {
      // This route is handled by the proxy plugin
      // The handler is just for documentation purposes
      return reply.code(200).send({ message: 'This endpoint is proxied to auth-service' });
    }
  });

  fastify.route({
    method: 'POST',
    url: '/auth/register',
    schema: {
      description: 'Register new user',
      tags: ['auth'],
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          name: { type: 'string' }
        },
        required: ['email', 'password']
      },
      response: {
        201: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                role: { type: 'string' }
              }
            }
          }
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    },
    handler: async (request, reply) => {
      // This route is handled by the proxy plugin
      // The handler is just for documentation purposes
      return reply.code(201).send({ message: 'This endpoint is proxied to auth-service' });
    }
  });

  fastify.route({
    method: 'GET',
    url: '/auth/login/google/callback',
    schema: {
      description: 'Google OAuth callback endpoint',
      tags: ['auth'],
      response: {
        302: {
          description: 'Redirect to frontend with JWT token'
        }
      }
    },
    handler: async (request, reply) => {
      // This route is handled by the proxy plugin
      // The handler is just for documentation purposes
      return reply.code(302).redirect('http://votre-frontend.com/auth/success?token=example_token');
    }
  });

  fastify.route({
    method: 'GET',
    url: '/auth/login/google',
    schema: {
      description: 'Initiate Google OAuth login flow',
      tags: ['auth'],
      response: {
        302: {
          description: 'Redirect to Google OAuth consent screen'
        }
      }
    },
    handler: async (request, reply) => {
      // This route is handled by the proxy plugin
      // The handler is just for documentation purposes
      return reply.code(302).redirect('https://accounts.google.com/o/oauth2/auth');
    }
  });
}
