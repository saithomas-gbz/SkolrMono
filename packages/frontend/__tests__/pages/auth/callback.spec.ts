import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CallbackPage from '@/pages/auth/callback.vue'

vi.mock('#imports', () => ({
  useRoute: () => ({
    query: {}
  }),
  useAuth: () => ({
    setToken: vi.fn(),
    user: {},
    loggedIn: false
  }),
  navigateTo: vi.fn(),
  onMounted: vi.fn((fn) => fn())
}))

describe('CallbackPage', () => {
  let mockSetToken: any
  let mockNavigateTo: any
  let mockUseRoute: any

  beforeEach(() => {
    mockSetToken = vi.fn()
    mockNavigateTo = vi.fn()
    mockUseRoute = { query: {} }

    vi.mocked(useAuth).mockReturnValue({
      setToken: mockSetToken,
      user: {},
      loggedIn: false
    })

    vi.mocked(useRoute).mockReturnValue(mockUseRoute)
    vi.mocked(navigateTo).mockImplementation(mockNavigateTo)
  })

  it('should render loading message', () => {
    const wrapper = mount(CallbackPage)
    expect(wrapper.text()).toContain('Loading...')
  })

  it('should handle token from query', async () => {
    mockUseRoute.query = { token: 'test-token' }

    mount(CallbackPage)

    await new Promise(process.nextTick)

    expect(mockSetToken).toHaveBeenCalledWith('test-token')
    expect(mockNavigateTo).toHaveBeenCalledWith('/')
  })

  it('should not navigate when no token', async () => {
    mockUseRoute.query = {}

    mount(CallbackPage)

    await new Promise(process.nextTick)

    expect(mockSetToken).not.toHaveBeenCalled()
    expect(mockNavigateTo).not.toHaveBeenCalled()
  })

  it('should handle empty token', async () => {
    mockUseRoute.query = { token: '' }

    mount(CallbackPage)

    await new Promise(process.nextTick)

    expect(mockSetToken).not.toHaveBeenCalled()
    expect(mockNavigateTo).not.toHaveBeenCalled()
  })
})