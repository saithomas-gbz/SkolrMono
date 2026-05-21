import { COMPOSE_DB_SERVICES, DB_SERVICES } from './db/registry';
import { ensurePackageEnv, runCompose, runPackageScript } from './db/run-package';
import { runSeedPipeline } from './db/seed-pipeline';

async function main() {
  const skipDocker = process.argv.includes('--no-docker');
  const skipSeed = process.argv.includes('--no-seed');

  console.log('SkolrMono: db:run:stack (postgres → migrate → seed)');

  if (!skipDocker) {
    await runCompose(['up', '-d', '--wait', ...COMPOSE_DB_SERVICES]);
  } else {
    console.log('\n(skipping docker — --no-docker)');
  }

  for (const service of DB_SERVICES) {
    const databaseUrl = ensurePackageEnv(service);
    await runPackageScript(service, 'prisma:generate', databaseUrl);
    await runPackageScript(service, service.migrateScript, databaseUrl);
  }

  if (!skipSeed) {
    await runSeedPipeline();
  } else {
    console.log('\n(skipping seed — --no-seed)');
  }

  console.log('\n✓ Stack DB ready (postgres up, migrations applied' +
    (skipSeed ? '' : ', dev data seeded') +
    ').');
  console.log('  Auth DB:  localhost:5432 / skolr_auth');
  console.log('  Class DB: localhost:5433 / skolr_class');
  console.log('  Next: bun run seed:dev (if you skipped seed) or start services.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
