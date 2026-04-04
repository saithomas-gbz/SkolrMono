import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import CallbackPage from '@/pages/auth/callback.vue';
import { useAuth } from '@/composables/useAuth';
import { navigateTo, useRoute } from '#imports';

vi.mock('@/composables/useAuth', () => ({
  useAuth: vi.fn()
}));

type RouteQuery = Record<string, string | string[] | undefined>;

function stubRouteQuery(query: RouteQuery) {
  vi.mocked(useRoute).mockReturnValue({ query } as ReturnType<typeof useRoute>);
}

describe('CallbackPage', () => {
  const mockSetToken = vi.fn();
  const mockNavigateTo = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ setToken: mockSetToken } as ReturnType<typeof useAuth>);
    vi.mocked(navigateTo).mockImplementation(mockNavigateTo);
    stubRouteQuery({});
  });

  async function mountAndFlush() {
    mount(CallbackPage);
    await flushPromises();
  }

  it('renders loading state', () => {
    const wrapper = mount(CallbackPage);
    expect(wrapper.text()).toContain('Loading...');
  });

  it('stores token from query and navigates home', async () => {
    stubRouteQuery({ token: 'test-token' });
    await mountAndFlush();
    expect(mockSetToken).toHaveBeenCalledWith('test-token');
    expect(mockNavigateTo).toHaveBeenCalledWith('/');
  });

  it.each([
    ['missing token', {} as RouteQuery],
    ['empty token', { token: '' }]
  ])('ignores OAuth callback when %s', async (_label, query) => {
    stubRouteQuery(query);
    await mountAndFlush();
    expect(mockSetToken).not.toHaveBeenCalled();
    expect(mockNavigateTo).not.toHaveBeenCalled();
  });
});
