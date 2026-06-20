export type ParentChild = {
  id: string;
  studentId: string;
  linkType: 'LEGAL_GUARDIAN' | 'EMERGENCY_CONTACT' | 'OTHER';
  isPrimary: boolean;
  student: { id: string; name: string | null; email: string } | null;
};

export function useParent() {
  const api = useApi();

  async function fetchChildren(): Promise<ParentChild[]> {
    const response = await api<{ data: ParentChild[] }>('/parent/children');
    return response.data;
  }

  return { fetchChildren };
}
