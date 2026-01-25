import { DiskDayLogRepository } from './infrastructure/repository';
import { buildHttpApp } from './infrastructure/http';

const PORT = process.env.PORT || 4000;

async function main() {
  const repo = new DiskDayLogRepository();
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

