import { useAuthState } from '#imports';

export const useAuth = () => {
  const auth = useAuthState();

  const login = async (email: string, password: string) => {
    try {
      await auth.loginWith('local', { email, password });
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    try {
      await auth.registerWith('local', { email, password, name });
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  };

  const loginWithGoogle = () => {
    window.location.href = 'http://localhost:3000/login/google';
  };

  const logout = () => {
    auth.logout();
  };

  return {
    login,
    register,
    loginWithGoogle,
    logout,
    user: auth.user,
    loggedIn: auth.loggedIn
  };
};