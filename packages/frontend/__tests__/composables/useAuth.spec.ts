import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAuth } from '@/composables/useAuth';
import { navigateTo, useCookie, useRuntimeConfig, useState } from '#imports';

vi.mock('#imports', () => ({
  useRuntimeConfig: vi.fn(),
  useCookie: vi.fn(),
  useState: vi.fn(),
  navigateTo: vi.fn()
}));

describe('useAuth', () => {
  let tokenHolder: { value: string | null };
  let userHolder: { value: Record<string, unknown> | null };
  const $fetchMock = vi.fn();

  beforeEach(() => {
    tokenHolder = { value: null };
    userHolder = { value: null };
    $fetchMock.mockReset();
    vi.mocked(useRuntimeConfig).mockReturnValue({
      public: { authBaseURL: 'http://localhost:3001' }
    } as ReturnType<typeof useRuntimeConfig>);
    vi.mocked(useCookie).mockReturnValue(tokenHolder as ReturnType<typeof useCookie>);
    vi.mocked(useState).mockReturnValue(userHolder as ReturnType<typeof useState>);
    vi.mocked(navigateTo).mockResolvedValue(undefined as never);
    vi.stubGlobal('$fetch', $fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should login successfully', async () => {
    $fetchMock.mockResolvedValue({
      token: 'jwt-token',
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test',
        role: 'user'
      }
    });
    const { login } = useAuth();
    const result = await login('test@example.com', 'password');
    expect(result).toEqual({ success: true });
    expect(tokenHolder.value).toBe('jwt-token');
    expect(userHolder.value).toEqual({
      id: '1',
      email: 'test@example.com',
      name: 'Test',
      role: 'user'
    });
    expect($fetchMock).toHaveBeenCalledWith('/auth/login', {
      baseURL: 'http://localhost:3001',
      method: 'POST',
      body: { email: 'test@example.com', password: 'password' }
    });
  });

  it('should handle login error', async () => {
    $fetchMock.mockRejectedValue(new Error('Login failed'));
    const { login } = useAuth();
    const result = await login('test@example.com', 'wrong');
    expect(result).toEqual({ success: false, error: expect.any(Error) });
  });

  it('should register successfully', async () => {
    $fetchMock.mockResolvedValue({
      token: 'jwt-reg',
      user: {
        id: '2',
        email: 'new@example.com',
        name: 'New User',
        role: 'user'
      }
    });
    const { register } = useAuth();
    const result = await register('new@example.com', 'password', 'New User');
    expect(result).toEqual({ success: true });
    expect($fetchMock).toHaveBeenCalledWith('/auth/register', {
      baseURL: 'http://localhost:3001',
      method: 'POST',
      body: { email: 'new@example.com', password: 'password', name: 'New User' }
    });
  });

  it('should handle registration error', async () => {
    $fetchMock.mockRejectedValue(new Error('Registration failed'));
    const { register } = useAuth();
    const result = await register('test@example.com', 'password');
    expect(result).toEqual({ success: false, error: expect.any(Error) });
  });

  it('should redirect to Google OAuth', () => {
    const { loginWithGoogle } = useAuth();
    const stub = { href: '' };
    vi.stubGlobal('location', stub as Location);
    loginWithGoogle();
    expect(stub.href).toBe('http://localhost:3001/auth/login/google');
  });

  it('should logout', () => {
    tokenHolder.value = 'x';
    userHolder.value = { id: '1' };
    const { logout } = useAuth();
    logout();
    expect(tokenHolder.value).toBeNull();
    expect(userHolder.value).toBeNull();
    expect(navigateTo).toHaveBeenCalledWith('/login');
  });

  it('should expose loggedIn from token', () => {
    tokenHolder.value = null;
    const { loggedIn: out1 } = useAuth();
    expect(out1.value).toBe(false);
    tokenHolder.value = 'jwt';
    const { loggedIn: out2 } = useAuth();
    expect(out2.value).toBe(true);
  });

  it('should set token and decode user from JWT payload', () => {
    const payload = btoa(JSON.stringify({ userId: '9', email: 'jwt@example.com', role: 'admin' }));
    const jwt = `h.${payload}.s`;
    const { setToken, user } = useAuth();
    setToken(jwt);
    expect(tokenHolder.value).toBe(jwt);
    expect(user.value).toMatchObject({
      id: '9',
      email: 'jwt@example.com',
      role: 'admin'
    });
  });
});
