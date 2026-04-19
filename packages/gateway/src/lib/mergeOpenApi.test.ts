import { describe, expect, it } from 'bun:test';
import { mergeGatewayWithAuthService } from './mergeOpenApi';

describe('mergeGatewayWithAuthService', () => {
  it('prefixes auth paths and namespaces schema keys', () => {
    const gateway = {
      openapi: '3.1.0',
      paths: {},
      components: {},
    };

    const auth = {
      openapi: '3.1.0',
      paths: {
        '/login': {
          post: {
            responses: { 200: { description: 'ok' } },
          },
        },
      },
      components: {
        schemas: {
          Foo: { type: 'string' },
        },
      },
    };

    const merged = mergeGatewayWithAuthService(gateway, auth, '/auth');

    expect(merged.paths).toHaveProperty('/auth/login');
    expect((merged.components as { schemas: Record<string, unknown> }).schemas).toHaveProperty(
      'authService_Foo',
    );
  });

  it('returns gateway only when auth spec is null', () => {
    const gateway = { openapi: '3.1.0', paths: { '/x': {} } };
    const merged = mergeGatewayWithAuthService(gateway, null, '/auth');
    expect(merged).toEqual(gateway);
  });
});
