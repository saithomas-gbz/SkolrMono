import { normalizeApiError } from '~/composables/useClass';
import type { AuthSuccess } from '~/composables/useAuth';

export type InvitableRole = 'USER' | 'TEACHER' | 'STAFF' | 'PARENT';

export type InvitationPreview = {
  email: string;
  role: InvitableRole;
};

export function useInvitation() {
  const api = useApi();

  async function createInvitation(email: string, role: InvitableRole) {
    return api<{ message: string }>('/auth/invite', {
      method: 'POST',
      body: { email, role },
    });
  }

  async function fetchInvitation(token: string) {
    return api<InvitationPreview>(`/auth/invitations/${token}`);
  }

  async function acceptInvitation(token: string, password: string, name?: string) {
    return api<AuthSuccess>('/auth/accept-invitation', {
      method: 'POST',
      body: { token, password, ...(name?.trim() ? { name: name.trim() } : {}) },
    });
  }

  return {
    createInvitation,
    fetchInvitation,
    acceptInvitation,
    normalizeApiError,
  };
}
