import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from '../modules/app.module';

export const nestFastifyApplicationAdapter =
  async (): Promise<NestFastifyApplication> => {
    const app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter(),
      {
        logger: ['error', 'warn', 'log', 'debug'],
      },
    );

    app
      .getHttpAdapter()
      .getInstance()
      .addHook('onRequest', (req: any, res: any, done: any) => {
        res.setHeader = (key: string, value: string) => {
          res.raw.setHeader(key, value);
        };
        res.end = (data?: any) => {
          res.raw.end(data);
        };
        req.res = res;
        done();
      });

    return app;
  };
