import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../config/redis.service';
import { WhatsAppService } from './whatsapp.service';

// ─── Onboarding steps ─────────────────────────────────────

export enum OnboardingStep {
  WELCOME = 'WELCOME',
  NAME = 'NAME',
  SERVICES = 'SERVICES',
  EXPERIENCE = 'EXPERIENCE',
  ZONES = 'ZONES',
  BIO = 'BIO',
  REVIEW = 'REVIEW',
}

interface OnboardingSession {
  step: OnboardingStep;
  applicationId?: string;
  name?: string;
  categories?: string[];
  yearsExperience?: number;
  serviceZones?: string[];
  bio?: string;
}

// Service category catalog (mirrors seed data)
const SERVICE_CATEGORIES = [
  { num: 1, slug: 'plumbing', icon: '🔧', name: 'Plomería' },
  { num: 2, slug: 'electrical', icon: '⚡', name: 'Electricidad' },
  { num: 3, slug: 'cleaning', icon: '🧹', name: 'Limpieza' },
  { num: 4, slug: 'gardening', icon: '🌿', name: 'Jardinería' },
  { num: 5, slug: 'painting', icon: '🎨', name: 'Pintura' },
  { num: 6, slug: 'locksmith', icon: '🔑', name: 'Cerrajería' },
  { num: 7, slug: 'repair', icon: '🔨', name: 'Reparaciones' },
  { num: 8, slug: 'moving', icon: '📦', name: 'Mudanzas' },
];

const SESSION_PREFIX = 'wa_onboarding:';
const SESSION_TTL = 86400; // 24 hours

@Injectable()
export class WhatsAppOnboardingHandler {
  private readonly logger = new Logger(WhatsAppOnboardingHandler.name);

  constructor(
    private whatsapp: WhatsAppService,
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  // ─── Session management ──────────────────────────────────

  private async getSession(phone: string): Promise<OnboardingSession | null> {
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
    session: OnboardingSession,
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

  // ─── Public: handle message from non-provider ─────────────

  /**
   * Called when a message comes from a phone that is NOT a registered provider.
   * Manages the onboarding conversational flow.
   */
  async handleMessage(
    senderPhone: string,
    senderName: string,
    text: string,
  ): Promise<void> {
    // Check if there's an existing onboarding session
    let session = await this.getSession(senderPhone);

    // Check if there's already an approved or pending-review application
    const existing = await this.prisma.providerApplication.findUnique({
      where: { phone: this.normalizePhoneForDb(senderPhone) },
    });

    if (existing) {
      if (existing.verificationStatus === 'APPROVED') {
        await this.whatsapp.sendTextMessage(
          senderPhone,
          `✅ ¡Tu solicitud ya fue aprobada! Deberías estar recibiendo trabajos pronto.\n\nSi tienes problemas, escribe *"ayuda"*.`,
        );
        return;
      }
      if (
        existing.verificationStatus === 'PENDING' &&
        existing.onboardingStep === 'REVIEW'
      ) {
        await this.whatsapp.sendTextMessage(
          senderPhone,
          `⏳ Tu solicitud está *en revisión*.\n\nTe notificaremos cuando sea aprobada (24-48 horas).\n\n¡Gracias por tu paciencia!`,
        );
        return;
      }
      if (existing.verificationStatus === 'REJECTED') {
        // Allow re-application
        await this.prisma.providerApplication.delete({
          where: { id: existing.id },
        });
        await this.clearSession(senderPhone);
        session = null;
        // Fall through to start fresh
      }
    }

    // Global commands
    if (text === 'cancelar' || text === 'cancel') {
      await this.clearSession(senderPhone);
      // Delete partial application if exists
      const partial = await this.prisma.providerApplication.findUnique({
        where: { phone: this.normalizePhoneForDb(senderPhone) },
      });
      if (partial && partial.onboardingStep !== 'REVIEW') {
        await this.prisma.providerApplication.delete({
          where: { id: partial.id },
        });
      }
      await this.whatsapp.sendTextMessage(
        senderPhone,
        `❌ Registro cancelado.\n\nSi cambias de opinión, envía cualquier mensaje para comenzar de nuevo.`,
      );
      return;
    }

    // No session = start fresh
    if (!session) {
      return this.handleWelcome(senderPhone, senderName, text);
    }

    // Route to the correct step
    switch (session.step) {
      case OnboardingStep.WELCOME:
        return this.handleWelcomeResponse(senderPhone, text, session);
      case OnboardingStep.NAME:
        return this.handleNameResponse(senderPhone, text, session);
      case OnboardingStep.SERVICES:
        return this.handleServicesResponse(senderPhone, text, session);
      case OnboardingStep.EXPERIENCE:
        return this.handleExperienceResponse(senderPhone, text, session);
      case OnboardingStep.ZONES:
        return this.handleZonesResponse(senderPhone, text, session);
      case OnboardingStep.BIO:
        return this.handleBioResponse(senderPhone, text, session);
      case OnboardingStep.REVIEW:
        await this.whatsapp.sendTextMessage(
          senderPhone,
          `⏳ Tu solicitud ya está *en revisión*.\n\nTe notificaremos cuando sea aprobada (24-48 horas).`,
        );
        return;
      default:
        return this.handleWelcome(senderPhone, senderName, text);
    }
  }

  // ─── Step: WELCOME ────────────────────────────────────────

  private async handleWelcome(
    phone: string,
    name: string,
    text: string,
  ): Promise<void> {
    await this.setSession(phone, { step: OnboardingStep.WELCOME });

    await this.whatsapp.sendTextMessage(
      phone,
      `👋 ¡Hola${name ? ` ${name}` : ''}! Bienvenido a *Handy*.\n\n` +
        `Somos una plataforma que conecta clientes con proveedores de servicios del hogar.\n\n` +
        `🛠 ¿Te gustaría ofrecer tus servicios en Handy?\n\n` +
        `✅ Escribe *"si"* para comenzar tu registro\n` +
        `❌ Escribe *"no"* si solo estás explorando`,
    );
  }

  private async handleWelcomeResponse(
    phone: string,
    text: string,
    session: OnboardingSession,
  ): Promise<void> {
    if (
      text === 'si' ||
      text === 'sí' ||
      text === 'yes' ||
      text === 'quiero' ||
      text === 'dale'
    ) {
      // Move to NAME step
      session.step = OnboardingStep.NAME;
      await this.setSession(phone, session);

      await this.whatsapp.sendTextMessage(
        phone,
        `¡Genial! 🎉 Vamos a registrarte. Son solo unas preguntas rápidas.\n\n` +
          `📝 *Paso 1 de 5*\n\n` +
          `¿Cuál es tu *nombre completo*?\n` +
          `_(Ejemplo: Juan Pérez López)_`,
      );
      return;
    }

    if (text === 'no') {
      await this.clearSession(phone);
      await this.whatsapp.sendTextMessage(
        phone,
        `👌 ¡Sin problema! Si cambias de opinión, envía cualquier mensaje a este número.\n\n` +
          `Si eres *cliente*, descarga nuestra app para solicitar servicios. 📱`,
      );
      return;
    }

    // Unknown response
    await this.whatsapp.sendTextMessage(
      phone,
      `🤔 No entendí tu respuesta.\n\n` +
        `✅ Escribe *"si"* para registrarte como proveedor\n` +
        `❌ Escribe *"no"* si no estás interesado`,
    );
  }

  // ─── Step: NAME ───────────────────────────────────────────

  private async handleNameResponse(
    phone: string,
    text: string,
    session: OnboardingSession,
  ): Promise<void> {
    // Validate name: at least 2 words, only letters/spaces
    const trimmed = text.trim();
    if (trimmed.length < 3) {
      await this.whatsapp.sendTextMessage(
        phone,
        `❌ El nombre parece muy corto. Escribe tu *nombre completo*.\n_(Ejemplo: Juan Pérez López)_`,
      );
      return;
    }

    // Save name
    session.name = trimmed
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    session.step = OnboardingStep.SERVICES;
    await this.setSession(phone, session);

    // Show service categories
    const categoryList = SERVICE_CATEGORIES.map(
      (c) => `${c.num}. ${c.icon} ${c.name}`,
    ).join('\n');

    await this.whatsapp.sendTextMessage(
      phone,
      `Perfecto, *${session.name}* 👋\n\n` +
        `📝 *Paso 2 de 5*\n\n` +
        `¿Qué servicios ofreces? Elige uno o varios:\n\n` +
        `${categoryList}\n\n` +
        `Escribe los *números separados por coma*\n` +
        `_(Ejemplo: 1,3,5)_`,
    );
  }

  // ─── Step: SERVICES ───────────────────────────────────────

  private async handleServicesResponse(
    phone: string,
    text: string,
    session: OnboardingSession,
  ): Promise<void> {
    // Parse comma-separated numbers
    const numbers = text
      .split(/[,\s]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));

    const validNums = numbers.filter(
      (n) => n >= 1 && n <= SERVICE_CATEGORIES.length,
    );

    if (validNums.length === 0) {
      const categoryList = SERVICE_CATEGORIES.map(
        (c) => `${c.num}. ${c.icon} ${c.name}`,
      ).join('\n');

      await this.whatsapp.sendTextMessage(
        phone,
        `❌ No reconocí ningún servicio válido.\n\nEscribe los números de los servicios que ofreces:\n\n${categoryList}\n\n_(Ejemplo: 1,3,5)_`,
      );
      return;
    }

    // Remove duplicates
    const uniqueNums = [...new Set(validNums)];
    const selected = uniqueNums.map(
      (n) => SERVICE_CATEGORIES.find((c) => c.num === n)!,
    );
    session.categories = selected.map((c) => c.slug);

    // Move to EXPERIENCE
    session.step = OnboardingStep.EXPERIENCE;
    await this.setSession(phone, session);

    const selectedNames = selected
      .map((c) => `${c.icon} ${c.name}`)
      .join(', ');

    await this.whatsapp.sendTextMessage(
      phone,
      `✅ Servicios seleccionados: ${selectedNames}\n\n` +
        `📝 *Paso 3 de 5*\n\n` +
        `¿Cuántos *años de experiencia* tienes en estos servicios?\n` +
        `_(Escribe solo el número, ejemplo: 5)_`,
    );
  }

  // ─── Step: EXPERIENCE ─────────────────────────────────────

  private async handleExperienceResponse(
    phone: string,
    text: string,
    session: OnboardingSession,
  ): Promise<void> {
    const years = parseInt(text.trim(), 10);
    if (isNaN(years) || years < 0 || years > 60) {
      await this.whatsapp.sendTextMessage(
        phone,
        `❌ Escribe un número válido de años de experiencia (0-60).\n_(Ejemplo: 5)_`,
      );
      return;
    }

    session.yearsExperience = years;
    session.step = OnboardingStep.ZONES;
    await this.setSession(phone, session);

    await this.whatsapp.sendTextMessage(
      phone,
      `✅ ${years} años de experiencia 💪\n\n` +
        `📝 *Paso 4 de 5*\n\n` +
        `¿En qué *zonas o colonias* ofreces tus servicios?\n\n` +
        `Escríbelas separadas por coma.\n` +
        `_(Ejemplo: Condesa, Roma Norte, Del Valle, Polanco)_`,
    );
  }

  // ─── Step: ZONES ──────────────────────────────────────────

  private async handleZonesResponse(
    phone: string,
    text: string,
    session: OnboardingSession,
  ): Promise<void> {
    const zones = text
      .split(',')
      .map((z) => z.trim())
      .filter((z) => z.length > 0);

    if (zones.length === 0) {
      await this.whatsapp.sendTextMessage(
        phone,
        `❌ Escribe al menos una zona o colonia.\n_(Ejemplo: Condesa, Roma Norte, Del Valle)_`,
      );
      return;
    }

    // Capitalize first letter of each zone
    session.serviceZones = zones.map(
      (z) => z.charAt(0).toUpperCase() + z.slice(1),
    );
    session.step = OnboardingStep.BIO;
    await this.setSession(phone, session);

    await this.whatsapp.sendTextMessage(
      phone,
      `✅ Zonas: ${session.serviceZones.join(', ')}\n\n` +
        `📝 *Paso 5 de 5 (opcional)*\n\n` +
        `Escribe una *descripción corta* sobre ti y tu trabajo. Esto lo verán los clientes.\n\n` +
        `_(Ejemplo: "Plomero con 10 años de experiencia, especialista en fugas y drenaje. Puntual y garantía en mi trabajo.")_\n\n` +
        `Escribe *"skip"* para omitir este paso.`,
    );
  }

  // ─── Step: BIO ────────────────────────────────────────────

  private async handleBioResponse(
    phone: string,
    text: string,
    session: OnboardingSession,
  ): Promise<void> {
    if (text !== 'skip' && text !== 'omitir') {
      session.bio = text.trim();
    }

    // Save the application to the database
    try {
      const dbPhone = this.normalizePhoneForDb(phone);

      const application = await this.prisma.providerApplication.upsert({
        where: { phone: dbPhone },
        update: {
          name: session.name,
          bio: session.bio || null,
          yearsExperience: session.yearsExperience || 0,
          categories: session.categories || [],
          serviceZones: session.serviceZones || [],
          onboardingStep: OnboardingStep.REVIEW,
          verificationStatus: 'PENDING',
        },
        create: {
          phone: dbPhone,
          name: session.name,
          bio: session.bio || null,
          yearsExperience: session.yearsExperience || 0,
          categories: session.categories || [],
          serviceZones: session.serviceZones || [],
          onboardingStep: OnboardingStep.REVIEW,
          verificationStatus: 'PENDING',
        },
      });

      session.applicationId = application.id;
      session.step = OnboardingStep.REVIEW;
      await this.setSession(phone, session);

      // Send summary
      const categorySlugs = session.categories || [];
      const categoryNames = categorySlugs
        .map((slug) => {
          const cat = SERVICE_CATEGORIES.find((c) => c.slug === slug);
          return cat ? `${cat.icon} ${cat.name}` : slug;
        })
        .join(', ');

      await this.whatsapp.sendTextMessage(
        phone,
        `📋 *Resumen de tu solicitud:*\n\n` +
          `👤 Nombre: ${session.name}\n` +
          `🔧 Servicios: ${categoryNames}\n` +
          `📅 Experiencia: ${session.yearsExperience || 0} años\n` +
          `📍 Zonas: ${(session.serviceZones || []).join(', ')}\n` +
          `📝 Bio: ${session.bio || '(sin descripción)'}\n` +
          `📸 Identidad: Pendiente de verificación\n\n` +
          `─────────────────────\n\n` +
          `✅ *¡Solicitud enviada!*\n\n` +
          `Te notificaremos cuando tu cuenta sea aprobada (24-48 horas).\n\n` +
          `¡Gracias por tu interés en Handy! 🙌`,
      );

      this.logger.log(
        `New provider application from ${phone}: ${session.name} (${categorySlugs.join(', ')})`,
      );
    } catch (error: any) {
      this.logger.error(
        `Error saving provider application: ${error.message}`,
      );
      await this.whatsapp.sendTextMessage(
        phone,
        `❌ Ocurrió un error guardando tu solicitud. Intenta de nuevo enviando cualquier mensaje.`,
      );
      await this.clearSession(phone);
    }
  }

  // ─── Helpers ──────────────────────────────────────────────

  /**
   * Normalizes phone to "+52XXXXXXXXXX" format for DB storage.
   */
  private normalizePhoneForDb(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    // Remove extra "1" from Mexican numbers: 521... → 52...
    if (cleaned.length === 13 && cleaned.startsWith('521')) {
      cleaned = '52' + cleaned.slice(3);
    }
    return `+${cleaned}`;
  }
}

