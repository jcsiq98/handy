import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WhatsAppProviderHandler } from './whatsapp-provider.handler';

const BOOKING_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Listens for booking events and triggers WhatsApp notifications.
 * Runs in the WhatsApp module so there's no circular dependency with BookingsModule.
 */
@Injectable()
export class WhatsAppBookingListener {
  private readonly logger = new Logger(WhatsAppBookingListener.name);

  // Track active timeouts so they can be cleared if handled before expiry
  private timeouts = new Map<string, NodeJS.Timeout>();

  constructor(private providerHandler: WhatsAppProviderHandler) {}

  @OnEvent('booking.created')
  async handleBookingCreated(payload: { bookingId: string }) {
    this.logger.log(
      `Received booking.created event for ${payload.bookingId}`,
    );

    // Send WhatsApp notification to the provider
    await this.providerHandler.notifyProviderOfNewBooking(payload.bookingId);

    // Set a 10-minute timeout for auto-rejection
    const timeout = setTimeout(async () => {
      this.logger.log(
        `Booking ${payload.bookingId} timeout reached, auto-rejecting`,
      );
      await this.providerHandler.handleBookingTimeout(payload.bookingId);
      this.timeouts.delete(payload.bookingId);
    }, BOOKING_TIMEOUT_MS);

    this.timeouts.set(payload.bookingId, timeout);
  }

  @OnEvent('booking.responded')
  handleBookingResponded(payload: { bookingId: string }) {
    // Clear the timeout if the provider responded
    const timeout = this.timeouts.get(payload.bookingId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(payload.bookingId);
      this.logger.log(
        `Cleared timeout for booking ${payload.bookingId} (provider responded)`,
      );
    }
  }
}

