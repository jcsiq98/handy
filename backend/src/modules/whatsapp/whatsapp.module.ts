import { Module, Global, forwardRef } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppProviderHandler } from './whatsapp-provider.handler';
import { WhatsAppOnboardingHandler } from './whatsapp-onboarding.handler';
import { WhatsAppBookingListener } from './whatsapp-booking.listener';
import { WhatsAppNotificationQueueService } from './whatsapp-notification-queue.service';
import { BookingsModule } from '../bookings/bookings.module';
import { MessagesModule } from '../messages/messages.module';
import { RatingsModule } from '../ratings/ratings.module';
import { ZonesModule } from '../zones/zones.module';
import { OnboardingModule } from '../onboarding/onboarding.module';

/**
 * WhatsApp integration module.
 * @Global() makes WhatsAppService available to AuthModule for OTP delivery
 * without creating circular dependencies.
 */
@Global()
@Module({
  imports: [
    BookingsModule, // To access BookingsGateway
    forwardRef(() => MessagesModule), // To save bridged messages
    RatingsModule, // For WA rating flow
    ZonesModule, // For onboarding zone matching
    OnboardingModule, // For verification token generation
  ],
  controllers: [WhatsAppController],
  providers: [
    WhatsAppService,
    WhatsAppOnboardingHandler,
    WhatsAppProviderHandler,
    WhatsAppBookingListener,
    WhatsAppNotificationQueueService,
  ],
  exports: [WhatsAppService, WhatsAppProviderHandler],
})
export class WhatsAppModule {}
