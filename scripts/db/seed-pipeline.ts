import { DB_SERVICES } from './registry';
import { ensurePackageEnv, runPackageScript } from './run-package';

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
}
