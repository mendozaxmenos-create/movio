import { DiskDayLogRepository } from './infrastructure/repository';
import { PostgresDayLogRepository } from './infrastructure/repositoryPostgres';
import { buildHttpApp } from './infrastructure/http';

const PORT = process.env.PORT || 4000;

async function createRepository() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) {
    return PostgresDayLogRepository.connect(databaseUrl);
  }
  return new DiskDayLogRepository();
}

async function main() {
  const repo = await createRepository();
  if (process.env.SKIP_SEED !== '1') {
    await repo.seedIfEmpty();
  }
  const app = buildHttpApp(repo);

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Movio backend escuchando en http://localhost:${PORT}`);
  });
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error('Error iniciando Movio backend', err);
  process.exit(1);
});

