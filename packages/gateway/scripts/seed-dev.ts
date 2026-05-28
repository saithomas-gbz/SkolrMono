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
  console.log('\nTest accounts (after `bun run seed:dev` at repo root):');
  console.log('  dev.admin@skolr.local   / dev-admin-123');
  console.log('  dev.user@skolr.local    / dev-user-123');
  console.log('  dev.teacher@skolr.local / dev-teacher-123');
  console.log('  dev.student@skolr.local / dev-student-123');
  console.log('\nDev classes (class-service seed): CM2-A, 6ème Sciences');
  console.log(
    'Dev grades (grade-service seed): student + user (CM2-A), student (6ème Sciences)',
  );
  console.log('\nGrades via gateway:');
  console.log(`  curl -s http://localhost:${port}/grade/grades`);
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
