import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../config/redis.service';
import { WhatsAppService } from './whatsapp.service';
import { BookingsGateway } from '../bookings/bookings.gateway';
import { MessagesService } from '../messages/messages.service';
import { RatingsService } from '../ratings/ratings.service';
import { BookingStatus } from '@prisma/client';

// ─── Provider session states ────────────────────────────────

export enum ProviderState {
  IDLE = 'IDLE',
  REQUEST_RECEIVED = 'REQUEST_RECEIVED',
  ACCEPTED = 'ACCEPTED',
  ARRIVING = 'ARRIVING',
  IN_PROGRESS = 'IN_PROGRESS',
  AWAITING_RATING = 'AWAITING_RATING',
  AWAITING_RATING_COMMENT = 'AWAITING_RATING_COMMENT',
}

interface ProviderSession {
  state: ProviderState;
  bookingId?: string;
  providerProfileId?: string;
  providerUserId?: string;
  customerName?: string;
  customerId?: string;
  pendingRatingScore?: number; // Temp: holds the score while awaiting comment
}

const SESSION_PREFIX = 'wa_provider_session:';
const SESSION_TTL = 86400; // 24 hours

@Injectable()
export class WhatsAppProviderHandler {
  private readonly logger = new Logger(WhatsAppProviderHandler.name);

  constructor(
    private whatsapp: WhatsAppService,
    private prisma: PrismaService,
    private redis: RedisService,
    private bookingsGateway: BookingsGateway,
    private eventEmitter: EventEmitter2,
    @Inject(forwardRef(() => MessagesService))
    private messagesService: MessagesService,
    private ratingsService: RatingsService,
  ) {}

  // ─── Session management ──────────────────────────────────

  private async getSession(phone: string): Promise<ProviderSession | null> {
    const raw = await this.redis.get(`${SESSION_PREFIX}${phone}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private async setSession(
    phone: string,
    session: ProviderSession,
  ): Promise<void> {
    await this.redis.set(
      `${SESSION_PREFIX}${phone}`,
      JSON.stringify(session),
      SESSION_TTL,
    );
  }

  private async clearSession(phone: string): Promise<void> {
    await this.redis.del(`${SESSION_PREFIX}${phone}`);
  }

  // ─── Find provider by phone ──────────────────────────────

  private async findProviderByPhone(phone: string) {
    // WA phone may or may not have +, normalize
    const normalized = this.whatsapp.normalizePhone(phone);
    // Try to match: the DB stores "+52XXXXXXXXXX" format
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phone: `+${normalized}` },
          { phone: normalized },
          { phone },
        ],
        role: 'PROVIDER',
      },
      include: {
        providerProfile: true,
      },
    });
    return user;
  }

  // ─── Public: Notify provider of new booking ──────────────

  /**
   * Called by BookingsService when a new booking is created.
   * Sends a WhatsApp message to the provider with Accept / Reject buttons.
   */
  async notifyProviderOfNewBooking(bookingId: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: { select: { id: true, name: true, phone: true, ratingAverage: true } },
        provider: {
          include: {
            user: { select: { id: true, name: true, phone: true } },
          },
        },
        category: true,
      },
    });

    if (!booking || !booking.provider?.user?.phone) {
      this.logger.warn(`Cannot notify: booking ${bookingId} missing provider phone`);
      return;
    }

    const providerPhone = booking.provider.user.phone;
    const customerName = booking.customer?.name || 'Cliente';
    const customerRating = booking.customer?.ratingAverage
      ? `⭐ ${booking.customer.ratingAverage.toFixed(1)}`
      : 'Sin calificación';
    const categoryName = booking.category?.name || 'Servicio';
    const categoryIcon = booking.category?.icon || '🛠';

    // Build notification message
    const msg =
      `🔔 *¡Nuevo trabajo!*\n\n` +
      `${categoryIcon} Servicio: ${categoryName}\n` +
      `📝 "${booking.description}"\n` +
      `📍 ${booking.address || 'Sin dirección'}\n` +
      `📅 ${booking.scheduledAt ? new Date(booking.scheduledAt).toLocaleDateString('es-MX') : 'Lo antes posible'}\n` +
      `👤 Cliente: ${customerName} (${customerRating})\n\n` +
      `⏱ Responde en los próximos 10 minutos`;

    // Send as plain text (interactive buttons fail in WhatsApp test/sandbox mode)
    await this.whatsapp.sendTextMessage(
      providerPhone,
      msg + `\n\n✅ Responde *aceptar* para tomar el trabajo\n❌ Responde *rechazar* para pasar`,
    );

    // Set provider session to REQUEST_RECEIVED
    await this.setSession(providerPhone, {
      state: ProviderState.REQUEST_RECEIVED,
      bookingId,
      providerProfileId: booking.provider.id,
      providerUserId: booking.provider.user.id,
      customerName,
      customerId: booking.customer?.id,
    });

    this.logger.log(
      `Notified provider ${providerPhone} about booking ${bookingId}`,
    );
  }

  // ─── Public: Handle incoming WhatsApp message ────────────

  async handleIncomingMessage(
    senderPhone: string,
    senderName: string,
    message: any,
  ): Promise<void> {
    // Check if this phone belongs to a provider
    const provider = await this.findProviderByPhone(senderPhone);
    if (!provider) {
      // Not a provider — ignore (or send a generic message)
      this.logger.debug(`Message from non-provider ${senderPhone}, ignoring`);
      await this.whatsapp.sendTextMessage(
        senderPhone,
        `👋 Hola! Esta línea es solo para proveedores de Handy.\n\nSi eres cliente, usa la app en tu navegador.`,
      );
      return;
    }

    // Get or init session
    let session = await this.getSession(senderPhone);
    if (!session) {
      session = {
        state: ProviderState.IDLE,
        providerProfileId: provider.providerProfile?.id,
        providerUserId: provider.id,
      };
    }

    // Extract text and interactive content
    const text = this.extractText(message);
    const buttonReply = this.extractButtonReply(message);

    // ── Global keywords ──
    if (text === 'help' || text === 'ayuda') {
      return this.sendHelpMenu(senderPhone);
    }
    if (text === 'menu' || text === 'inicio') {
      return this.sendProviderDashboard(senderPhone, provider.name || senderName);
    }

    // ── Check for accept/reject button presses (handle regardless of state) ──
    if (buttonReply) {
      const acceptMatch = buttonReply.id.match(/^accept_(.+)$/);
      const rejectMatch = buttonReply.id.match(/^reject_(.+)$/);
      if (acceptMatch || rejectMatch) {
        const bookingId = (acceptMatch || rejectMatch)![1];
        // Override session with the booking info
        session.bookingId = bookingId;
        session.state = ProviderState.REQUEST_RECEIVED;
        session.providerProfileId = provider.providerProfile?.id;
        session.providerUserId = provider.id;
        if (acceptMatch) {
          return this.acceptBooking(senderPhone, session);
        } else {
          return this.rejectBooking(senderPhone, session);
        }
      }

      // Check for rating button presses
      const rateLowMatch = buttonReply.id.match(/^rate_low_(.+)$/);
      const rateMidMatch = buttonReply.id.match(/^rate_mid_(.+)$/);
      const rateHighMatch = buttonReply.id.match(/^rate_high_(.+)$/);
      if (rateLowMatch || rateMidMatch || rateHighMatch) {
        const ratingBookingId = (rateLowMatch || rateMidMatch || rateHighMatch)![1];
        let score: number;
        if (rateLowMatch) score = 2;
        else if (rateMidMatch) score = 3;
        else score = 5;

        session.bookingId = ratingBookingId;
        session.pendingRatingScore = score;
        session.state = ProviderState.AWAITING_RATING_COMMENT;
        session.providerProfileId = provider.providerProfile?.id;
        session.providerUserId = provider.id;
        await this.setSession(senderPhone, session);

        await this.whatsapp.sendTextMessage(
          senderPhone,
          `Has seleccionado ${score} estrella${score > 1 ? 's' : ''}.\n\n💬 ¿Quieres dejar un comentario? Escríbelo ahora, o escribe *"skip"* para omitir.`,
        );
        return;
      }
    }

    // ── State machine ──
    switch (session.state) {
      case ProviderState.IDLE:
        return this.handleIdle(senderPhone, senderName, text, session);

      case ProviderState.REQUEST_RECEIVED:
        return this.handleRequestReceived(
          senderPhone,
          text,
          buttonReply,
          session,
        );

      case ProviderState.ACCEPTED:
        return this.handleAccepted(senderPhone, text, buttonReply, session);

      case ProviderState.ARRIVING:
        return this.handleArriving(senderPhone, text, session);

      case ProviderState.IN_PROGRESS:
        return this.handleInProgress(senderPhone, text, session);

      case ProviderState.AWAITING_RATING:
        return this.handleAwaitingRating(senderPhone, text, buttonReply, session);

      case ProviderState.AWAITING_RATING_COMMENT:
        return this.handleAwaitingRatingComment(senderPhone, text, session);

      default:
        return this.sendProviderDashboard(senderPhone, senderName);
    }
  }

  // ─── State: IDLE ─────────────────────────────────────────

  private async handleIdle(
    phone: string,
    name: string,
    text: string,
    session: ProviderSession,
  ) {
    // Check for any pending bookings the provider might have
    if (session.providerProfileId) {
      const pendingBooking = await this.prisma.booking.findFirst({
        where: {
          providerId: session.providerProfileId,
          status: BookingStatus.PENDING,
        },
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, ratingAverage: true } },
          category: true,
        },
      });

      if (pendingBooking) {
        const customerName = pendingBooking.customer?.name || 'Cliente';
        const customerRating = pendingBooking.customer?.ratingAverage
          ? `⭐ ${pendingBooking.customer.ratingAverage.toFixed(1)}`
          : 'Sin calificación';
        const categoryIcon = pendingBooking.category?.icon || '🛠';
        const categoryName = pendingBooking.category?.name || 'Servicio';

        // Update session to REQUEST_RECEIVED with booking info
        const updatedSession: ProviderSession = {
          ...session,
          state: ProviderState.REQUEST_RECEIVED,
          bookingId: pendingBooking.id,
          customerName,
          customerId: pendingBooking.customer?.id,
        };
        await this.setSession(phone, updatedSession);

        // If user already typed "aceptar"/"rechazar", process immediately
        if (text === 'aceptar' || text === 'accept' || text === 'si' || text === 'sí') {
          return this.acceptBooking(phone, updatedSession);
        }
        if (text === 'rechazar' || text === 'reject' || text === 'no') {
          return this.rejectBooking(phone, updatedSession);
        }

        // Otherwise show booking details and instructions
        await this.whatsapp.sendTextMessage(
          phone,
          `🔔 *¡Tienes un trabajo pendiente!*\n\n` +
            `${categoryIcon} Servicio: ${categoryName}\n` +
            `📝 "${pendingBooking.description}"\n` +
            `📍 ${pendingBooking.address || 'Sin dirección'}\n` +
            `📅 ${pendingBooking.scheduledAt ? new Date(pendingBooking.scheduledAt).toLocaleDateString('es-MX') : 'Lo antes posible'}\n` +
            `👤 Cliente: ${customerName} (${customerRating})\n\n` +
            `✅ Escribe *"aceptar"* para tomar el trabajo\n` +
            `❌ Escribe *"rechazar"* para pasar`,
        );
        return;
      }
    }

    return this.sendProviderDashboard(phone, name);
  }

  // ─── State: REQUEST_RECEIVED ────────────────────────────

  private async handleRequestReceived(
    phone: string,
    text: string,
    buttonReply: { id: string; title: string } | null,
    session: ProviderSession,
  ) {
    const bookingId = session.bookingId;
    if (!bookingId) {
      await this.clearSession(phone);
      await this.whatsapp.sendTextMessage(
        phone,
        '❌ No se encontró la solicitud. Escribe "menu" para volver al inicio.',
      );
      return;
    }

    // Check button reply
    if (buttonReply) {
      if (buttonReply.id === `accept_${bookingId}` || buttonReply.id.startsWith('accept_')) {
        return this.acceptBooking(phone, session);
      }
      if (buttonReply.id === `reject_${bookingId}` || buttonReply.id.startsWith('reject_')) {
        return this.rejectBooking(phone, session);
      }
    }

    // Check text commands
    if (text === 'aceptar' || text === 'accept' || text === 'si' || text === 'sí') {
      return this.acceptBooking(phone, session);
    }
    if (text === 'rechazar' || text === 'reject' || text === 'no') {
      return this.rejectBooking(phone, session);
    }

    // Unknown input during request
    await this.whatsapp.sendTextMessage(
      phone,
      `🤔 Toca *Aceptar* o *Rechazar* en la notificación, o escribe "aceptar" o "rechazar".`,
    );
  }

  // ─── Accept booking ──────────────────────────────────────

  private async acceptBooking(
    phone: string,
    session: ProviderSession,
  ) {
    const bookingId = session.bookingId!;

    try {
      // Verify booking is still PENDING
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          customer: { select: { id: true, name: true } },
          category: true,
        },
      });

      if (!booking) {
        await this.whatsapp.sendTextMessage(phone, '❌ La solicitud ya no existe.');
        await this.setSession(phone, { ...session, state: ProviderState.IDLE, bookingId: undefined });
        return;
      }

      if (booking.status !== BookingStatus.PENDING) {
        await this.whatsapp.sendTextMessage(
          phone,
          `❌ Esta solicitud ya fue ${booking.status === BookingStatus.CANCELLED ? 'cancelada' : 'procesada'}.`,
        );
        await this.setSession(phone, { ...session, state: ProviderState.IDLE, bookingId: undefined });
        return;
      }

      // Update booking status to ACCEPTED
      const updated = await this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.ACCEPTED },
        include: {
          provider: {
            include: {
              user: { select: { id: true, name: true, avatarUrl: true } },
            },
          },
          category: true,
          customer: { select: { id: true, name: true, avatarUrl: true } },
        },
      });

      // Notify customer via WebSocket
      this.bookingsGateway.sendBookingUpdate(booking.customer!.id, {
        id: updated.id,
        status: updated.status,
        providerId: updated.providerId,
        providerName: updated.provider?.user?.name,
      });

      // Send confirmation to provider
      await this.whatsapp.sendTextMessage(
        phone,
        `✅ *¡Trabajo aceptado!*\n\n` +
          `El cliente ${booking.customer?.name || ''} será notificado.\n\n` +
          `📍 Dirección: ${booking.address || 'Sin dirección'}\n` +
          `📝 ${booking.description}\n\n` +
          `Cuando estés en camino, escribe *"en camino"*`,
      );

      await this.whatsapp.sendTextMessage(
        phone,
        `¿Qué deseas hacer?\n\n📍 Escribe *"en camino"* cuando vayas para allá\n💬 Escribe cualquier mensaje para chatear con el cliente`,
      );

      // Update session
      await this.setSession(phone, {
        ...session,
        state: ProviderState.ACCEPTED,
      });

      // Clear the auto-reject timeout
      this.eventEmitter.emit('booking.responded', { bookingId });

      this.logger.log(`Provider accepted booking ${bookingId}`);
    } catch (error: any) {
      this.logger.error(`Error accepting booking: ${error.message}`);
      await this.whatsapp.sendTextMessage(
        phone,
        '❌ Ocurrió un error. Intenta de nuevo.',
      );
    }
  }

  // ─── Reject booking ──────────────────────────────────────

  private async rejectBooking(
    phone: string,
    session: ProviderSession,
  ) {
    const bookingId = session.bookingId!;

    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          customer: { select: { id: true, name: true } },
        },
      });

      if (!booking || booking.status !== BookingStatus.PENDING) {
        await this.whatsapp.sendTextMessage(
          phone,
          '❌ Esta solicitud ya no está disponible.',
        );
        await this.setSession(phone, { ...session, state: ProviderState.IDLE, bookingId: undefined });
        return;
      }

      // Update booking status to REJECTED
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.REJECTED },
      });

      // Notify customer via WebSocket
      this.bookingsGateway.sendBookingUpdate(booking.customer!.id, {
        id: booking.id,
        status: 'REJECTED',
      });

      await this.whatsapp.sendTextMessage(
        phone,
        `❌ Has rechazado la solicitud de ${session.customerName || 'el cliente'}.\n\nSeguirás recibiendo nuevas solicitudes.`,
      );

      // Return to IDLE
      await this.setSession(phone, {
        ...session,
        state: ProviderState.IDLE,
        bookingId: undefined,
      });

      // Clear the auto-reject timeout
      this.eventEmitter.emit('booking.responded', { bookingId });

      this.logger.log(`Provider rejected booking ${bookingId}`);
    } catch (error: any) {
      this.logger.error(`Error rejecting booking: ${error.message}`);
      await this.whatsapp.sendTextMessage(
        phone,
        '❌ Ocurrió un error. Intenta de nuevo.',
      );
    }
  }

  // ─── State: ACCEPTED (waiting for "on my way") ──────────

  private async handleAccepted(
    phone: string,
    text: string,
    buttonReply: { id: string; title: string } | null,
    session: ProviderSession,
  ) {
    // "On my way" via button
    if (buttonReply?.id === 'btn_on_my_way') {
      return this.markArriving(phone, session);
    }
    // Chat button
    if (buttonReply?.id === 'btn_chat') {
      await this.whatsapp.sendTextMessage(
        phone,
        `💬 Escribe tu mensaje y se lo enviaré al cliente.\n\n_Recuerda: para comandos usa *"en camino"*, *"empezar"* o *"completar"*_`,
      );
      return;
    }
    // "On my way" via text
    if (
      text === 'en camino' ||
      text === 'on my way' ||
      text === 'voy en camino' ||
      text === 'ya voy'
    ) {
      return this.markArriving(phone, session);
    }
    // "Start" via text
    if (text === 'empezar' || text === 'start' || text === 'iniciar') {
      return this.markInProgress(phone, session);
    }

    // If there's text and a booking, treat it as a chat message
    if (text && session.bookingId && session.providerUserId) {
      return this.bridgeChatToApp(phone, text, session);
    }

    await this.whatsapp.sendTextMessage(
      phone,
      `👋 ¡Ya aceptaste este trabajo!\n\nEscribe:\n📍 *"en camino"* — cuando vayas saliendo\n🔧 *"empezar"* — cuando inicies el trabajo\n💬 Cualquier otro texto se enviará como mensaje al cliente`,
    );
  }

  // ─── Mark as ARRIVING ────────────────────────────────────

  private async markArriving(phone: string, session: ProviderSession) {
    const bookingId = session.bookingId!;

    try {
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.PROVIDER_ARRIVING },
      });

      // Notify customer
      if (session.customerId) {
        this.bookingsGateway.sendBookingUpdate(session.customerId, {
          id: bookingId,
          status: 'PROVIDER_ARRIVING',
        });
      }

      await this.whatsapp.sendTextMessage(
        phone,
        `📍 *¡En camino!* El cliente ha sido notificado.\n\nCuando llegues y empieces el trabajo, escribe *"empezar"*`,
      );

      await this.setSession(phone, {
        ...session,
        state: ProviderState.ARRIVING,
      });

      this.logger.log(`Provider arriving for booking ${bookingId}`);
    } catch (error: any) {
      this.logger.error(`Error marking arriving: ${error.message}`);
      await this.whatsapp.sendTextMessage(
        phone,
        '❌ Ocurrió un error. Intenta de nuevo.',
      );
    }
  }

  // ─── State: ARRIVING ────────────────────────────────────

  private async handleArriving(
    phone: string,
    text: string,
    session: ProviderSession,
  ) {
    if (text === 'empezar' || text === 'start' || text === 'iniciar') {
      return this.markInProgress(phone, session);
    }

    // If there's text and a booking, treat it as a chat message
    if (text && session.bookingId && session.providerUserId) {
      return this.bridgeChatToApp(phone, text, session);
    }

    await this.whatsapp.sendTextMessage(
      phone,
      `📍 Estás en camino...\n\nEscribe *"empezar"* cuando inicies el trabajo.\n💬 Cualquier otro texto se enviará como mensaje al cliente.`,
    );
  }

  // ─── Mark as IN_PROGRESS ────────────────────────────────

  private async markInProgress(phone: string, session: ProviderSession) {
    const bookingId = session.bookingId!;

    try {
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.IN_PROGRESS },
      });

      if (session.customerId) {
        this.bookingsGateway.sendBookingUpdate(session.customerId, {
          id: bookingId,
          status: 'IN_PROGRESS',
        });
      }

      await this.whatsapp.sendTextMessage(
        phone,
        `🔧 *¡Trabajo iniciado!* El cliente ha sido notificado.\n\nCuando termines, escribe *"completar"*`,
      );

      await this.setSession(phone, {
        ...session,
        state: ProviderState.IN_PROGRESS,
      });

      this.logger.log(`Provider started work on booking ${bookingId}`);
    } catch (error: any) {
      this.logger.error(`Error marking in progress: ${error.message}`);
      await this.whatsapp.sendTextMessage(
        phone,
        '❌ Ocurrió un error. Intenta de nuevo.',
      );
    }
  }

  // ─── State: IN_PROGRESS ─────────────────────────────────

  private async handleInProgress(
    phone: string,
    text: string,
    session: ProviderSession,
  ) {
    if (text === 'completar' || text === 'complete' || text === 'terminar' || text === 'listo') {
      return this.markCompleted(phone, session);
    }

    // If there's text and a booking, treat it as a chat message
    if (text && session.bookingId && session.providerUserId) {
      return this.bridgeChatToApp(phone, text, session);
    }

    await this.whatsapp.sendTextMessage(
      phone,
      `🔧 Trabajo en progreso...\n\nEscribe *"completar"* cuando termines.\n💬 Cualquier otro texto se enviará como mensaje al cliente.`,
    );
  }

  // ─── Mark as COMPLETED ──────────────────────────────────

  private async markCompleted(phone: string, session: ProviderSession) {
    const bookingId = session.bookingId!;

    try {
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      // Update provider's total_jobs count
      if (session.providerProfileId) {
        await this.prisma.providerProfile.update({
          where: { id: session.providerProfileId },
          data: { totalJobs: { increment: 1 } },
        });
      }

      // Notify customer
      if (session.customerId) {
        this.bookingsGateway.sendBookingUpdate(session.customerId, {
          id: bookingId,
          status: 'COMPLETED',
        });
      }

      await this.whatsapp.sendTextMessage(
        phone,
        `✅ *¡Trabajo completado!* 🎉\n\nEl cliente ha sido notificado y podrá calificarte.\n\n¡Ahora te toca a ti! ¿Cómo fue tu experiencia con ${session.customerName || 'el cliente'}?`,
      );

      // Send rating as text
      await this.whatsapp.sendTextMessage(
        phone,
        `⭐ ¿Cómo calificarías a ${session.customerName || 'el cliente'}?\n\nResponde con un número del *1* al *5*\nO escribe *"skip"* para omitir`,
      );

      // Transition to AWAITING_RATING
      await this.setSession(phone, {
        ...session,
        state: ProviderState.AWAITING_RATING,
      });

      this.logger.log(`Provider completed booking ${bookingId}, awaiting rating`);
    } catch (error: any) {
      this.logger.error(`Error marking completed: ${error.message}`);
      await this.whatsapp.sendTextMessage(
        phone,
        '❌ Ocurrió un error. Intenta de nuevo.',
      );
    }
  }

  // ─── State: AWAITING_RATING ─────────────────────────────

  private async handleAwaitingRating(
    phone: string,
    text: string,
    buttonReply: { id: string; title: string } | null,
    session: ProviderSession,
  ) {
    const bookingId = session.bookingId;
    if (!bookingId) {
      await this.setSession(phone, { ...session, state: ProviderState.IDLE, bookingId: undefined });
      await this.whatsapp.sendTextMessage(phone, 'No se encontró la reserva para calificar. Escribe "menu" para continuar.');
      return;
    }

    // If they type skip
    if (text === 'skip' || text === 'omitir' || text === 'no') {
      return this.skipRating(phone, session);
    }

    // If they type a number 1-5 directly
    const numScore = parseInt(text, 10);
    if (!isNaN(numScore) && numScore >= 1 && numScore <= 5) {
      session.pendingRatingScore = numScore;
      session.state = ProviderState.AWAITING_RATING_COMMENT;
      await this.setSession(phone, session);
      await this.whatsapp.sendTextMessage(
        phone,
        `Has seleccionado ${numScore} estrella${numScore > 1 ? 's' : ''}.\n\n💬 ¿Quieres dejar un comentario? Escríbelo ahora, o escribe *"skip"* para omitir.`,
      );
      return;
    }

    // Remind them about the rating options
    await this.whatsapp.sendTextMessage(
      phone,
      `⭐ ¿Cómo calificarías a ${session.customerName || 'el cliente'}?\n\nResponde con un número del *1* al *5*\nO escribe *"skip"* para omitir`,
    );
  }

  // ─── State: AWAITING_RATING_COMMENT ────────────────────

  private async handleAwaitingRatingComment(
    phone: string,
    text: string,
    session: ProviderSession,
  ) {
    const bookingId = session.bookingId;
    const score = session.pendingRatingScore;

    if (!bookingId || !score || !session.providerUserId) {
      await this.setSession(phone, { ...session, state: ProviderState.IDLE, bookingId: undefined });
      await this.whatsapp.sendTextMessage(phone, 'Error en la calificación. Escribe "menu" para continuar.');
      return;
    }

    const comment = (text === 'skip' || text === 'omitir') ? undefined : text || undefined;

    try {
      await this.ratingsService.rateFromWhatsApp(bookingId, session.providerUserId, score, comment);

      await this.whatsapp.sendTextMessage(
        phone,
        `⭐ *¡Gracias por tu calificación!*\n\n` +
          `Calificaste a ${session.customerName || 'el cliente'} con ${score} estrella${score > 1 ? 's' : ''}` +
          (comment ? `. Comentario: "${comment}"` : '') +
          `\n\n¡Sigue recibiendo solicitudes! 🔔`,
      );

      this.logger.log(`Provider rated customer via WA: booking ${bookingId}, score ${score}`);
    } catch (error: any) {
      if (error.status === 409) {
        await this.whatsapp.sendTextMessage(phone, '⚠️ Ya calificaste esta reserva anteriormente.');
      } else {
        this.logger.error(`Error rating via WA: ${error.message}`);
        await this.whatsapp.sendTextMessage(phone, '❌ Error al guardar la calificación. Intenta de nuevo.');
      }
    }

    // Return to IDLE
    await this.setSession(phone, {
      ...session,
      state: ProviderState.IDLE,
      bookingId: undefined,
      customerName: undefined,
      customerId: undefined,
      pendingRatingScore: undefined,
    });
  }

  // ─── Skip rating ───────────────────────────────────────

  private async skipRating(phone: string, session: ProviderSession) {
    await this.whatsapp.sendTextMessage(
      phone,
      '👌 Sin problema, se omitió la calificación.\n\n¡Sigue recibiendo solicitudes! 🔔',
    );

    await this.setSession(phone, {
      ...session,
      state: ProviderState.IDLE,
      bookingId: undefined,
      customerName: undefined,
      customerId: undefined,
      pendingRatingScore: undefined,
    });
  }

  // ─── Chat bridge: WhatsApp → App ────────────────────────

  /**
   * When a provider sends a free-text message during an active booking,
   * save it in the DB and push it to the customer via WebSocket.
   */
  private async bridgeChatToApp(
    phone: string,
    text: string,
    session: ProviderSession,
  ) {
    try {
      await this.messagesService.saveFromWhatsApp(
        session.bookingId!,
        session.providerUserId!,
        text,
      );
      await this.whatsapp.sendTextMessage(
        phone,
        `✅ Mensaje enviado al cliente.`,
      );
      this.logger.log(
        `Bridged WA→App: provider ${phone} → booking ${session.bookingId}`,
      );
    } catch (error: any) {
      this.logger.error(`Error bridging WA→App: ${error.message}`);
      await this.whatsapp.sendTextMessage(
        phone,
        `❌ No se pudo enviar el mensaje. Intenta de nuevo.`,
      );
    }
  }

  // ─── Dashboard / Help ───────────────────────────────────

  private async sendProviderDashboard(phone: string, name: string) {
    await this.whatsapp.sendTextMessage(
      phone,
      `👋 Hola ${name}! Bienvenido a *Handy*.\n\n` +
        `Recibirás notificaciones aquí cuando un cliente solicite tus servicios.\n\n` +
        `📋 Comandos:\n` +
        `• *"ayuda"* — Ver opciones\n` +
        `• *"menu"* — Ver este menú\n\n` +
        `¡Mantente atento a nuevas solicitudes! 🔔`,
    );
  }

  private async sendHelpMenu(phone: string) {
    await this.whatsapp.sendTextMessage(
      phone,
      `❓ *Ayuda — Handy Proveedor*\n\n` +
        `Cuando recibas una solicitud:\n` +
        `✅ *"aceptar"* — Aceptar el trabajo\n` +
        `❌ *"rechazar"* — Rechazar el trabajo\n\n` +
        `Durante un trabajo:\n` +
        `📍 *"en camino"* — Indicar que vas en camino\n` +
        `🔧 *"empezar"* — Iniciar el trabajo\n` +
        `✅ *"completar"* — Marcar como terminado\n\n` +
        `General:\n` +
        `📋 *"menu"* — Ver menú principal\n` +
        `❓ *"ayuda"* — Ver este mensaje`,
    );
  }

  // ─── Helpers ─────────────────────────────────────────────

  private extractText(message: any): string {
    if (message.type === 'text') {
      return message.text?.body?.trim().toLowerCase() || '';
    }
    return '';
  }

  private extractButtonReply(
    message: any,
  ): { id: string; title: string } | null {
    if (message.type !== 'interactive') return null;
    if (message.interactive?.type === 'button_reply') {
      return {
        id: message.interactive.button_reply.id,
        title: message.interactive.button_reply.title,
      };
    }
    return null;
  }

  // ─── Timeout handling ────────────────────────────────────

  /**
   * Called by the scheduler to auto-reject bookings that providers
   * haven't responded to within 10 minutes.
   */
  async handleBookingTimeout(bookingId: string): Promise<void> {
    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          customer: { select: { id: true } },
          provider: {
            include: {
              user: { select: { phone: true } },
            },
          },
        },
      });

      if (!booking || booking.status !== BookingStatus.PENDING) {
        // Already handled (accepted, rejected, or cancelled)
        return;
      }

      // Auto-reject
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.REJECTED },
      });

      // Notify customer via WebSocket
      this.bookingsGateway.sendBookingUpdate(booking.customer.id, {
        id: bookingId,
        status: 'REJECTED',
        reason: 'timeout',
      });

      // Notify provider via WhatsApp
      if (booking.provider?.user?.phone) {
        const providerPhone = booking.provider.user.phone;
        await this.whatsapp.sendTextMessage(
          providerPhone,
          `⏱ La solicitud expiró. No respondiste a tiempo.\n\nEscribe "menu" para ver tus opciones.`,
        );
        // Clear their session
        await this.setSession(providerPhone, {
          state: ProviderState.IDLE,
          providerProfileId: booking.provider.id,
          providerUserId: booking.provider.user?.phone ? undefined : undefined,
        });
      }

      this.logger.log(`Booking ${bookingId} auto-rejected (timeout)`);
    } catch (error: any) {
      this.logger.error(
        `Error handling booking timeout: ${error.message}`,
      );
    }
  }
}

