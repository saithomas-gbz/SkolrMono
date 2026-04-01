// Setup file for Vitest
import { config } from '@vue/test-utils'

// Mock Nuxt imports
vi.mock('#imports', () => ({
  defineNuxtPlugin: vi.fn((fn) => fn),
  useAuthState: vi.fn(),
  useRoute: vi.fn(),
  useAuth: vi.fn(),
  navigateTo: vi.fn(),
  onMounted: vi.fn((fn) => fn())
}))

// Configure Vue Test Utils
config.global.mocks = {
  $t: (key: string) => key
}