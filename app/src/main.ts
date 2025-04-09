import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import { RateLimitMiddleware } from './common/middlewares/rate-limit/rate-limit.middleware';
import { SystemUsageLimitMiddleware } from './common/middlewares/system-usage-limit/system-usage-limit.middleware';
import { SpaceReservedMiddleware } from './common/middlewares/space-reserved/space-reserved.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
