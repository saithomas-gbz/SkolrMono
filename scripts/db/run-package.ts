import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DbService } from './registry';
import { rootDir, workspacePath } from './paths';

function parseEnvFile(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  const content = readFileSync(path, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

export function ensurePackageEnv(service: DbService): string {
  const cwd = workspacePath(service.packageDir);
  const envPath = join(cwd, '.env');
  const examplePath = join(cwd, '.env.example');

  if (!existsSync(envPath) && existsSync(examplePath)) {
    copyFileSync(examplePath, envPath);
    console.log(`  • ${service.packageDir}: created .env from .env.example`);
  }

  if (existsSync(envPath)) {
    const parsed = parseEnvFile(envPath);
    if (parsed.DATABASE_URL) {
      return parsed.DATABASE_URL;
    }
  }

  return service.defaultDatabaseUrl;
}

export async function runWorkspaceScript(
  packageDir: string,
  script: string,
  extraEnv: Record<string, string | undefined> = {},
) {
  const cwd = workspacePath(packageDir);
  console.log(`\n▶ ${packageDir}: bun run ${script}`);

  const proc = Bun.spawn(['bun', 'run', script], {
    cwd,
    stdout: 'inherit',
    stderr: 'inherit',
    env: {
      ...process.env,
      ...extraEnv,
    },
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`${packageDir} (${script}) failed (exit ${exitCode})`);
  }
}

export async function runPackageScript(
  service: DbService,
  script: string,
  databaseUrl: string,
) {
  await runWorkspaceScript(service.packageDir, script, {
    DATABASE_URL: databaseUrl,
  });
}

export async function runCompose(args: string[]) {
  console.log(`\n▶ docker compose ${args.join(' ')}`);
  const proc = Bun.spawn(['docker', 'compose', ...args], {
    cwd: rootDir,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`docker compose failed (exit ${exitCode})`);
  }
}
