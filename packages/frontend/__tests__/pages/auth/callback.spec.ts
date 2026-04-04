import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import CallbackPage from '@/pages/auth/callback.vue';
import { useAuth, useRoute, navigateTo } from '#imports';

describe('CallbackPage', () => {
  let mockSetToken: ReturnType<typeof vi.fn>;
  let mockNavigateTo: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSetToken = vi.fn();
    mockNavigateTo = vi.fn();

    vi.mocked(useRoute).mockReturnValue({ query: {} } as never);
    vi.mocked(useAuth).mockReturnValue({
      setToken: mockSetToken,
      user: {},
      loggedIn: false
    } as never);
    vi.mocked(navigateTo).mockImplementation(mockNavigateTo);
  });

  it('should render loading message', () => {
    const wrapper = mount(CallbackPage);
    expect(wrapper.text()).toContain('Loading...');
  });

  it('should handle token from query', async () => {
    vi.mocked(useRoute).mockReturnValue({ query: { token: 'test-token' } } as never);

    mount(CallbackPage);

    await new Promise(process.nextTick);

    expect(mockSetToken).toHaveBeenCalledWith('test-token');
    expect(mockNavigateTo).toHaveBeenCalledWith('/');
  });

  it('should not navigate when no token', async () => {
    vi.mocked(useRoute).mockReturnValue({ query: {} } as never);

    mount(CallbackPage);

    await new Promise(process.nextTick);

    expect(mockSetToken).not.toHaveBeenCalled();
    expect(mockNavigateTo).not.toHaveBeenCalled();
  });

  it('should handle empty token', async () => {
    vi.mocked(useRoute).mockReturnValue({ query: { token: '' } } as never);

    mount(CallbackPage);

    await new Promise(process.nextTick);

    expect(mockSetToken).not.toHaveBeenCalled();
    expect(mockNavigateTo).not.toHaveBeenCalled();
  });
});
