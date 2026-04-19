import 'dotenv/config';
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, '..');
const envPath = join(packageRoot, '.env');
const examplePath = join(packageRoot, '.env.example');

/**
 * Gateway has no DB: this script ensures a local .env when missing
 * and prints curl hints (matches auth-service prisma seed accounts).
 */
function ensureEnvFromExample() {
  if (existsSync(envPath)) {
    console.log('Gateway: .env already present, skipping copy from .env.example.');
    return;
  }
  if (!existsSync(examplePath)) {
    console.warn('Gateway: .env.example missing; create .env manually.');
    return;
  }
  copyFileSync(examplePath, envPath);
  console.log('Gateway: created .env from .env.example.');
}

function main() {
  ensureEnvFromExample();

  const port = process.env.PORT || '3001';
  const authUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3000';

  console.log('\n--- Gateway (dev) ---');
  console.log(`PORT=${port}`);
  console.log(`AUTH_SERVICE_URL=${authUrl}`);
  console.log('\nTest accounts (after `bun run db:seed` in packages/auth-service):');
  console.log('  dev.admin@skolr.local / dev-admin-123');
  console.log('  dev.user@skolr.local  / dev-user-123');
  console.log('\nLogin via gateway:');
  console.log(
    `  curl -s -X POST http://localhost:${port}/auth/login ` +
      `-H 'Content-Type: application/json' ` +
      `-d '{"email":"dev.user@skolr.local","password":"dev-user-123"}'`,
  );
  console.log('\nDirect auth-service (no /auth prefix):');
  console.log(
    `  curl -s -X POST ${authUrl}/login ` +
      `-H 'Content-Type: application/json' ` +
      `-d '{"email":"dev.user@skolr.local","password":"dev-user-123"}'`,
  );
}

main();
