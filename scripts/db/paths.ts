import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const rootDir = join(dirname(fileURLToPath(import.meta.url)), '../..');

export function workspacePath(packageDir: string) {
  return join(rootDir, 'packages', packageDir);
}
