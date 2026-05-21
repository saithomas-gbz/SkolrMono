import { DB_SERVICES } from './registry';
import { ensurePackageEnv, runPackageScript, runWorkspaceScript } from './run-package';

const OPTIONAL_SEED = [{ packageDir: 'gateway', script: 'seed:dev' as const }];

export async function runSeedPipeline(only?: string) {
  const services = only
    ? DB_SERVICES.filter((s) => s.packageDir === only && s.seedScript)
    : DB_SERVICES.filter((s) => s.seedScript);

  if (only && services.length === 0) {
    throw new Error(
      `Unknown --only=${only}. Available: ${DB_SERVICES.map((s) => s.packageDir).join(', ')}`,
    );
  }

  for (const service of services) {
    const databaseUrl = ensurePackageEnv(service);
    await runPackageScript(service, service.seedScript!, databaseUrl);
  }

  if (!only) {
    for (const step of OPTIONAL_SEED) {
      await runWorkspaceScript(step.packageDir, step.script);
    }
  }
}
