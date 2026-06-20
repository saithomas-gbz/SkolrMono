export type ParentLinkType = 'LEGAL_GUARDIAN' | 'EMERGENCY_CONTACT' | 'OTHER';

export type ParentChild = {
  id: string;
  studentId: string;
  linkType: ParentLinkType;
  isPrimary: boolean;
  student: { id: string; name: string | null; email: string } | null;
};

export type ParentLink = {
  id: string;
  parentId: string;
  studentId: string;
  linkType: ParentLinkType;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ParentLinkFilters = {
  parentId?: string;
  studentId?: string;
};

export type CreateParentLinkBody = {
  parentId: string;
  studentId: string;
  linkType?: ParentLinkType;
  isPrimary?: boolean;
};

export function useParent() {
  const api = useApi();

  async function fetchChildren(): Promise<ParentChild[]> {
    const response = await api<{ data: ParentChild[] }>('/parent/children');
    return response.data;
  }

  async function fetchParentLinks(filters?: ParentLinkFilters): Promise<ParentLink[]> {
    const response = await api<{ data: ParentLink[] }>('/parent/links', { params: filters });
    return response.data;
  }

  async function createParentLink(body: CreateParentLinkBody): Promise<ParentLink> {
    return api<ParentLink>('/parent/links', { method: 'POST', body });
  }

  async function deleteParentLink(id: string): Promise<void> {
    await api(`/parent/links/${id}`, { method: 'DELETE' });
  }

  return { fetchChildren, fetchParentLinks, createParentLink, deleteParentLink };
}
