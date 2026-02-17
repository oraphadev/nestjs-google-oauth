import { nestFastifyApplicationAdapter } from './config/nest-fastify-application.adapter';

const bootstrap = async () => {
  const app = await nestFastifyApplicationAdapter();
  app.setGlobalPrefix('api');
  app.enableCors({ origin: process.env.FRONTEND_URL });
  await app.listen(process.env.PORT ?? 8080, '0.0.0.0');
};

void bootstrap();
