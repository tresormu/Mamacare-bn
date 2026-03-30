import { createApp } from './app';
import { connectDb } from './config/db';
import { port } from './config/env';

async function bootstrap() {
  await connectDb();

  const app = createApp();
  app.listen(port, () => {
    console.log(`MamaCare+ API listening on port ${port}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
