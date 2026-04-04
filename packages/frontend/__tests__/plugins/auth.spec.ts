import { describe, it, expect, vi, beforeEach } from 'vitest';
import { defineNuxtPlugin, useAuth } from '#imports';

vi.mock('#imports', () => ({
  defineNuxtPlugin: vi.fn((fn: () => void) => {
    fn();
    return fn;
  }),
  useAuth: vi.fn(() => ({
    setStrategy: vi.fn()
  }))
}));

describe('Auth Plugin', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should configure local strategy', async () => {
    const mockSetStrategy = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      setStrategy: mockSetStrategy
    } as never);

    await import('@/plugins/auth');

    expect(mockSetStrategy).toHaveBeenCalledWith(
      'local',
      expect.objectContaining({
        endpoints: expect.objectContaining({
          login: { url: 'http://localhost:3000/login', method: 'post' },
          register: { url: 'http://localhost:3000/register', method: 'post' },
          user: { url: 'http://localhost:3000/user', method: 'get' }
        }),
        token: expect.objectContaining({
          property: 'token',
          type: 'Bearer',
          name: 'Authorization'
        }),
        user: expect.objectContaining({
          property: 'user'
        })
      })
    );
  });

  it('should configure google strategy', async () => {
    const mockSetStrategy = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      setStrategy: mockSetStrategy
    } as never);

    await import('@/plugins/auth');

    expect(mockSetStrategy).toHaveBeenCalledWith(
      'google',
      expect.objectContaining({
        endpoints: expect.objectContaining({
          login: { url: 'http://localhost:3000/login/google' },
          callback: { url: 'http://localhost:3000/login/google/callback' },
          user: { url: 'http://localhost:3000/user', method: 'get' }
        }),
        token: expect.objectContaining({
          property: 'token',
          type: 'Bearer',
          name: 'Authorization'
        }),
        user: expect.objectContaining({
          property: 'user'
        })
      })
    );
  });

  it('should call defineNuxtPlugin', async () => {
    await import('@/plugins/auth');
    expect(defineNuxtPlugin).toHaveBeenCalled();
  });
});
