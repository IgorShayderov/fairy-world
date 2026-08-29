import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    snapshot: true,
    logger: process.env.ENABLE_LOGS === 'TRUE' ? ['log', 'error', 'warn', 'debug', 'verbose'] : ['error', 'warn'],
  });

  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: process.env.FRONT_URL,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Fairy World API')
    .setDescription('API documentation for Fairy World game')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.useGlobalInterceptors(new TransformInterceptor());

  await app.listen(process.env.PORT ?? 3333);
}
bootstrap().catch((err) => {
  console.error('Критическая ошибка при запуске сервера:', err);
  process.exit(1);
});
