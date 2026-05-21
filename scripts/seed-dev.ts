import { runSeedPipeline } from './db/seed-pipeline';

async function main() {
  const onlyArg = process.argv.find((a) => a.startsWith('--only='));
  const only = onlyArg?.slice('--only='.length);

  console.log('SkolrMono dev seed');
  if (only) {
    console.log(`(filtered: ${only})`);
  }

  await runSeedPipeline(only);

  console.log('\n✓ Dev seed complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
