import { OAuth2Namespace } from '@fastify/oauth2';

declare module 'fastify' {
  interface FastifyInstance {
    googleOAuth2: OAuth2Namespace;
    jwt: {
      sign: (payload: object, options?: object) => string;
      verify: (token: string) => object;
    };
  }
}