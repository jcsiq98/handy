import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './config/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ServicesModule } from './modules/services/services.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

@Module({
  imports: [
    // Global config from .env
    ConfigModule.forRoot({ isGlobal: true }),

    // Rate limiting: 60 requests per 60 seconds per IP
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),

    // Database
    PrismaModule,

    // Cache
    RedisModule,

    // Auth (must be before feature modules)
    AuthModule,

    // Feature modules
    UsersModule,
    ServicesModule,
  ],
  controllers: [AppController],
  providers: [
    // Apply rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Apply JWT authentication globally
    // Routes marked with @Public() will bypass auth
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
