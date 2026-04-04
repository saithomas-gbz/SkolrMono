import { computed } from 'vue';
import { useCookie, useState, useRuntimeConfig, navigateTo } from '#imports';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthResponse {
  token: string;
  user: User;
}

const decodeJwtUser = (token: string): Partial<User> => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: payload.userId ?? payload.id,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    return {};
  }
};

export const useAuth = () => {
  const config = useRuntimeConfig();
  const token = useCookie<string | null>('auth_token', { sameSite: 'lax' });
  const user = useState<User | null>('auth_user', () => null);
  const loggedIn = computed(() => !!token.value);

  const login = async (email: string, password: string) => {
    try {
      const data = await $fetch<AuthResponse>('/auth/login', {
        baseURL: config.public.authBaseURL as string,
        method: 'POST',
        body: { email, password },
      });
      token.value = data.token;
      user.value = data.user;
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    try {
      const data = await $fetch<AuthResponse>('/auth/register', {
        baseURL: config.public.authBaseURL as string,
        method: 'POST',
        body: { email, password, name: name || undefined },
      });
      token.value = data.token;
      user.value = data.user;
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  };

  const loginWithGoogle = () => {
    window.location.href = `${config.public.authBaseURL}/auth/login/google`;
  };

  const setToken = (newToken: string) => {
    token.value = newToken;
    user.value = decodeJwtUser(newToken) as User;
  };

  const logout = () => {
    token.value = null;
    user.value = null;
    void navigateTo('/login');
  };

  return {
    login,
    register,
    loginWithGoogle,
    setToken,
    logout,
    user,
    loggedIn,
  };
};
