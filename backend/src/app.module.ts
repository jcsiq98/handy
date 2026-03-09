import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
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

@Module({
  imports: [
    // Global config from .env
    ConfigModule.forRoot({ isGlobal: true }),

    // Event bus for decoupled module communication
    EventEmitterModule.forRoot(),

    // Cron jobs (weekly summary, etc.)
    ScheduleModule.forRoot(),

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

    // WhatsApp integration (global — provides WhatsAppService to all modules)
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
export class AppModule {}
