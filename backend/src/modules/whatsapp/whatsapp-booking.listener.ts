import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WhatsAppProviderHandler } from './whatsapp-provider.handler';
import { WhatsAppService } from './whatsapp.service';

const BOOKING_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Listens for booking events and triggers WhatsApp notifications.
 * Runs in the WhatsApp module so there's no circular dependency with BookingsModule.
 *
 * Robust handling:
 * - Wraps notification in try/catch so booking creation never fails
 * - Logs clear messages on notification success/failure
 * - Timeout auto-rejection continues even if WhatsApp notification fails
 */
@Injectable()
export class WhatsAppBookingListener {
  private readonly logger = new Logger(WhatsAppBookingListener.name);

  // Track active timeouts so they can be cleared if handled before expiry
  private timeouts = new Map<string, NodeJS.Timeout>();

  constructor(
    private providerHandler: WhatsAppProviderHandler,
    private whatsappService: WhatsAppService,
  ) {}

  @OnEvent('booking.created')
  async handleBookingCreated(payload: { bookingId: string }) {
    this.logger.log(
      `📩 Received booking.created event for ${payload.bookingId}`,
    );

    // Pre-check: is WhatsApp working?
    if (!this.whatsappService.isWhatsAppEnabled()) {
      this.logger.warn(
        `⚠️  WhatsApp disabled — booking ${payload.bookingId} notification skipped`,
      );
      // Still set timeout so booking doesn't hang forever
      this.setAutoRejectTimeout(payload.bookingId);
      return;
    }

    if (this.whatsappService.isWhatsAppEnabled() && !this.whatsappService.isTokenValid()) {
      this.logger.warn(
        `⚠️  WhatsApp token may be expired — attempting to send anyway for booking ${payload.bookingId}`,
      );
    }

    // Send WhatsApp notification — wrapped in try/catch
    try {
      await this.providerHandler.notifyProviderOfNewBooking(payload.bookingId);
      this.logger.log(
        `✅ Provider notified for booking ${payload.bookingId}`,
      );
    } catch (error: any) {
      // CRITICAL: Never let notification failure crash the booking flow
      this.logger.error(
        `❌ Failed to notify provider for booking ${payload.bookingId}: ${error.message}`,
      );
      this.logger.error(
        '   The booking was created successfully but the provider may not have been notified.',
      );
    }

    // Set auto-reject timeout regardless of notification result
    this.setAutoRejectTimeout(payload.bookingId);
  }

  @OnEvent('booking.responded')
  handleBookingResponded(payload: { bookingId: string }) {
    // Clear the timeout if the provider responded
    const timeout = this.timeouts.get(payload.bookingId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(payload.bookingId);
      this.logger.log(
        `⏰ Cleared timeout for booking ${payload.bookingId} (provider responded)`,
      );
    }
  }

  private setAutoRejectTimeout(bookingId: string) {
    const timeout = setTimeout(async () => {
      this.logger.log(
        `⏱ Booking ${bookingId} timeout reached, auto-rejecting`,
      );
      try {
        await this.providerHandler.handleBookingTimeout(bookingId);
      } catch (err: any) {
        this.logger.error(
          `Error during auto-reject of ${bookingId}: ${err.message}`,
        );
      }
      this.timeouts.delete(bookingId);
    }, BOOKING_TIMEOUT_MS);

    this.timeouts.set(bookingId, timeout);
  }
}
