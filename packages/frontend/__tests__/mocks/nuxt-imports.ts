import { vi } from 'vitest';

/** Stubs for Nuxt `#imports`; tests override via `vi.mocked(...)`. */
export const defineNuxtPlugin = vi.fn((fn: () => void) => fn);
export const useRoute = vi.fn();
export const navigateTo = vi.fn();
export const onMounted = vi.fn((fn: () => void) => {
  fn();
});
export const useRuntimeConfig = vi.fn(() => ({
  public: { authBaseURL: 'http://localhost:3001' }
}));
export const useCookie = vi.fn();
export const useState = vi.fn();
