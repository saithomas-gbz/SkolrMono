import { vi } from 'vitest';

/** Stubs for Nuxt `#imports`; tests override via `vi.mocked(...)`. */
export const defineNuxtPlugin = vi.fn((fn: () => void) => fn);
export const useAuthState = vi.fn();
export const useRoute = vi.fn();
export const useAuth = vi.fn();
export const navigateTo = vi.fn();
export const onMounted = vi.fn((fn: () => void) => {
  fn();
});
