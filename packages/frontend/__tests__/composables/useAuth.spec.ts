import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuth } from '@/composables/useAuth'
import { useAuthState } from '#imports'

vi.mock('#imports', () => ({
  useAuthState: vi.fn()
}))

describe('useAuth', () => {
  let mockAuthState: any

  beforeEach(() => {
    mockAuthState = {
      loginWith: vi.fn(),
      registerWith: vi.fn(),
      logout: vi.fn(),
      setToken: vi.fn(),
      user: {},
      loggedIn: false
    }
    vi.mocked(useAuthState).mockReturnValue(mockAuthState)
  })

  it('should login successfully', async () => {
    mockAuthState.loginWith.mockResolvedValue({})
    const { login } = useAuth()
    const result = await login('test@example.com', 'password')
    expect(result).toEqual({ success: true })
    expect(mockAuthState.loginWith).toHaveBeenCalledWith('local', {
      email: 'test@example.com',
      password: 'password'
    })
  })

  it('should handle login error', async () => {
    mockAuthState.loginWith.mockRejectedValue(new Error('Login failed'))
    const { login } = useAuth()
    const result = await login('test@example.com', 'wrong')
    expect(result).toEqual({ success: false, error: expect.any(Error) })
  })

  it('should register successfully', async () => {
    mockAuthState.registerWith.mockResolvedValue({})
    const { register } = useAuth()
    const result = await register('test@example.com', 'password', 'Test User')
    expect(result).toEqual({ success: true })
    expect(mockAuthState.registerWith).toHaveBeenCalledWith('local', {
      email: 'test@example.com',
      password: 'password',
      name: 'Test User'
    })
  })

  it('should handle registration error', async () => {
    mockAuthState.registerWith.mockRejectedValue(new Error('Registration failed'))
    const { register } = useAuth()
    const result = await register('test@example.com', 'password')
    expect(result).toEqual({ success: false, error: expect.any(Error) })
  })

  it('should redirect to Google OAuth', () => {
    const { loginWithGoogle } = useAuth()
    delete window.location
    window.location = { href: '' } as any
    loginWithGoogle()
    expect(window.location.href).toBe('http://localhost:3000/login/google')
  })

  it('should logout', () => {
    const { logout } = useAuth()
    logout()
    expect(mockAuthState.logout).toHaveBeenCalled()
  })

  it('should expose user and loggedIn state', () => {
    mockAuthState.user = { id: 1, name: 'Test User' }
    mockAuthState.loggedIn = true
    const { user, loggedIn } = useAuth()
    expect(user).toEqual({ id: 1, name: 'Test User' })
    expect(loggedIn).toBe(true)
  })
})