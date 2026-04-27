import { describe, expect, it } from 'bun:test';
import { mergeGatewayWithAuthService, mergeGatewayWithClassService, mergeGatewayWithService } from './mergeOpenApi';

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

describe('mergeGatewayWithClassService', () => {
  it('prefixes class paths and namespaces schema keys', () => {
    const gateway = {
      openapi: '3.1.0',
      paths: {},
      components: {},
    };

    const classSpec = {
      openapi: '3.1.0',
      paths: {
        '/classes': {
          get: {
            responses: { 200: { description: 'ok' } },
          },
        },
      },
      components: {
        schemas: {
          Bar: { type: 'string' },
        },
      },
    };

    const merged = mergeGatewayWithClassService(gateway, classSpec, '/class');

    expect(merged.paths).toHaveProperty('/class/classes');
    expect((merged.components as { schemas: Record<string, unknown> }).schemas).toHaveProperty(
      'classService_Bar',
    );
  });
});

describe('mergeGatewayWithService', () => {
  it('merges multiple services without schema collisions', () => {
    const gateway = { openapi: '3.1.0', paths: {}, components: {} };
    const specA = {
      openapi: '3.1.0',
      paths: { '/x': { get: { responses: { 200: { description: 'ok' } } } } },
      components: { schemas: { User: { type: 'string' } } },
    };
    const specB = {
      openapi: '3.1.0',
      paths: { '/y': { get: { responses: { 200: { description: 'ok' } } } } },
      components: { schemas: { User: { type: 'number' } } },
    };

    const mergedA = mergeGatewayWithService(gateway, specA, '/a', 'svcA_');
    const mergedB = mergeGatewayWithService(mergedA, specB, '/b', 'svcB_');

    expect(mergedB.paths).toHaveProperty('/a/x');
    expect(mergedB.paths).toHaveProperty('/b/y');
    expect((mergedB.components as { schemas: Record<string, unknown> }).schemas).toHaveProperty('svcA_User');
    expect((mergedB.components as { schemas: Record<string, unknown> }).schemas).toHaveProperty('svcB_User');
  });
});
