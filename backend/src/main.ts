import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { validateEnv } from './common/config/env.validation';

async function bootstrap() {
  validateEnv();

  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new GlobalExceptionFilter());

  // Security headers
  app.use(helmet());

  // CORS — allow frontend
  const isProd = process.env.NODE_ENV === 'production';
  app.enableCors({
    origin: isProd
      ? [
          process.env.FRONTEND_URL,
          // Allow Vercel preview deployments
          /https:\/\/.*\.vercel\.app$/,
        ].filter(Boolean)
      : ['http://localhost:3001', 'http://localhost:3000'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // Strip unknown properties
      forbidNonWhitelisted: true, // Throw on unknown properties
      transform: true,           // Auto-transform payloads to DTO types
    }),
  );

  // Swagger API docs (dev only)
  if (!isProd) {
    const config = new DocumentBuilder()
      .setTitle('Handy API')
      .setDescription('API for the Handy service marketplace')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 3000;
  // Bind to 0.0.0.0 for Railway/Docker compatibility
  await app.listen(port, '0.0.0.0');

  logger.log('');
  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.log(`🚀 Handy API running on port ${port}`);
  if (!isProd) {
    logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
  }
  logger.log(`💚 Health check: /api/health`);
  logger.log(`📱 WA health:    /api/health/whatsapp`);
  logger.log(`🌍 Environment:  ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.log('');
}

bootstrap();
