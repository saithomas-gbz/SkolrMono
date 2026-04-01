import { describe, it, expect, vi } from 'vitest'
import { defineNuxtPlugin } from '#imports'

vi.mock('#imports', () => ({
  defineNuxtPlugin: vi.fn((fn) => fn),
  useAuth: vi.fn(() => ({
    setStrategy: vi.fn()
  }))
}))

describe('Auth Plugin', () => {
  it('should configure local strategy', () => {
    const mockSetStrategy = vi.fn()
    vi.mocked(useAuth).mockReturnValue({
      setStrategy: mockSetStrategy
    } as any)

    require('@/plugins/auth')

    expect(mockSetStrategy).toHaveBeenCalledWith('local', expect.objectContaining({
      endpoints: expect.objectContaining({
        login: { url: 'http://localhost:3000/login', method: 'post' },
        register: { url: 'http://localhost:3000/register', method: 'post' },
        user: { url: 'http://localhost:3000/user', method: 'get' }
      }),
      token: expect.objectContaining({
        property: 'token',
        type: 'Bearer',
        name: 'Authorization'
      }),
      user: expect.objectContaining({
        property: 'user'
      })
    }))
  })

  it('should configure google strategy', () => {
    const mockSetStrategy = vi.fn()
    vi.mocked(useAuth).mockReturnValue({
      setStrategy: mockSetStrategy
    } as any)

    require('@/plugins/auth')

    expect(mockSetStrategy).toHaveBeenCalledWith('google', expect.objectContaining({
      endpoints: expect.objectContaining({
        login: { url: 'http://localhost:3000/login/google' },
        callback: { url: 'http://localhost:3000/login/google/callback' },
        user: { url: 'http://localhost:3000/user', method: 'get' }
      }),
      token: expect.objectContaining({
        property: 'token',
        type: 'Bearer',
        name: 'Authorization'
      }),
      user: expect.objectContaining({
        property: 'user'
      })
    }))
  })

  it('should call defineNuxtPlugin', () => {
    require('@/plugins/auth')
    expect(defineNuxtPlugin).toHaveBeenCalled()
  })
})