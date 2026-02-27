"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = authRoutes;
async function authRoutes(fastify, options) {
    // Register proxy plugin to handle all /auth/* routes
    fastify.register(Promise.resolve().then(() => __importStar(require('../plugins/proxy'))));
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
