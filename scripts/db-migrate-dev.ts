import { DB_SERVICES } from './db/registry';
import { ensurePackageEnv, runPackageScript } from './db/run-package';

async function main() {
  const onlyArg = process.argv.find((a) => a.startsWith('--only='));
  const only = onlyArg?.slice('--only='.length);

  const services = only
    ? DB_SERVICES.filter((s) => s.packageDir === only)
    : DB_SERVICES;

  if (only && services.length === 0) {
    console.error(
      `Unknown --only=${only}. Available: ${DB_SERVICES.map((s) => s.packageDir).join(', ')}`,
    );
    process.exit(1);
  }

  console.log('SkolrMono: apply Prisma migrations (migrate deploy)');

  for (const service of services) {
    const databaseUrl = ensurePackageEnv(service);
    await runPackageScript(service, 'prisma:generate', databaseUrl);
    await runPackageScript(service, service.migrateScript, databaseUrl);
  }

  console.log('\n✓ Migrations applied.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
