import { normalizeApiError } from '~/composables/useClass';

const passwordResetErrorHints: Record<string, string> = {
  'Invalid or expired token': 'Ce lien de réinitialisation est invalide ou a expiré.',
};

export function normalizePasswordResetError(e: unknown): string {
  const base = normalizeApiError(e);
  return passwordResetErrorHints[base] ?? base;
}

export function usePasswordReset() {
  const api = useApi();

  async function requestPasswordReset(email: string) {
    return api<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    });
  }

  async function resetPassword(token: string, password: string) {
    return api<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: { token, password },
    });
  }

  return {
    requestPasswordReset,
    resetPassword,
    normalizePasswordResetError,
  };
}
