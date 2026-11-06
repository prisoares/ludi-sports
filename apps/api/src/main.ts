import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const swagger = new DocumentBuilder()
    .setTitle('LUDI API')
    .setDescription(
      'Marketplace de reserva de quadras — Porto Alegre (pt-BR). Fase 1b: mapa, filtros, partner-web, taxa mapa 1% GMV.',
    )
    .setVersion('0.3.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger));

  const port = Number(process.env.API_PORT ?? process.env.PORT ?? 3000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`LUDI API listening on http://localhost:${port} (docs: /docs)`);
}

bootstrap();
