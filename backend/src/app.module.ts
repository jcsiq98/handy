import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './config/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ServicesModule } from './modules/services/services.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { MessagesModule } from './modules/messages/messages.module';
import { RatingsModule } from './modules/ratings/ratings.module';
import { ZonesModule } from './modules/zones/zones.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { ProviderDashboardModule } from './modules/provider-dashboard/provider-dashboard.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AdminModule } from './modules/admin/admin.module';
import { TrustScoreModule } from './modules/trust-score/trust-score.module';
import { ReportsModule } from './modules/reports/reports.module';
import { VerificationModule } from './modules/verification/verification.module';
import { SafetyModule } from './modules/safety/safety.module';
import { QueueModule } from './common/queues/queue.module';
import { CryptoModule } from './common/crypto/crypto.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';

const isProd = process.env.NODE_ENV === 'production';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // Structured logging with Pino (JSON in prod, pretty in dev)
    LoggerModule.forRoot({
      pinoHttp: {
        level: isProd ? 'info' : 'debug',
        transport: isProd
          ? undefined
          : { target: 'pino-pretty', options: { colorize: true, singleLine: true } },
        autoLogging: {
          ignore: (req: any) =>
            req.url === '/api/health' || req.url === '/api/health/whatsapp',
        },
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'res.headers["set-cookie"]',
          ],
          censor: '[REDACTED]',
        },
        customProps: (req: any) => ({
          correlationId: req.headers['x-correlation-id'],
        }),
      },
    }),

    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),

    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),

    // Infrastructure
    PrismaModule,
    RedisModule,
    QueueModule.register(),
    CryptoModule,

    // WhatsApp (global)
    WhatsAppModule,

    // Auth
    AuthModule,

    // Feature modules
    UsersModule,
    ServicesModule,
    ProvidersModule,
    BookingsModule,
    MessagesModule,
    RatingsModule,
    ZonesModule,
    OnboardingModule,
    AddressesModule,
    ProviderDashboardModule,
    AdminModule,
    TrustScoreModule,
    ReportsModule,
    VerificationModule,
    SafetyModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
