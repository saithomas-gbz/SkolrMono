// Setup file for Vitest
import { config } from '@vue/test-utils';

// Configure Vue Test Utils
config.global.mocks = {
  $t: (key: string) => key
};
