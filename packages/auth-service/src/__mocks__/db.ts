import { mock } from 'bun:test';

export default {
  user: {
    findUnique: mock(),
    findFirst: mock(),
    create: mock()
  },
  account: {
    create: mock()
  }
};
