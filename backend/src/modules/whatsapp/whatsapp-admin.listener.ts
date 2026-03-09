import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WhatsAppService } from './whatsapp.service';

const TIER_NAMES: Record<number, string> = {
  1: 'Basic',
  2: 'Verified ✅',
  3: 'Pro ⭐',
  4: 'Elite 🏆',
};

const TIER_BENEFITS: Record<number, string> = {
  1: 'Trabajos pequeños, apareces en cola',
  2: 'Trabajos medianos, visible en búsqueda, ratings activos',
  3: 'Badge Pro, dispatch prioritario, acceso a financiamiento',
  4: 'Cuentas corporativas, contratos recurrentes, límites de crédito altos',
};

@Injectable()
export class WhatsAppAdminListener {
  private readonly logger = new Logger(WhatsAppAdminListener.name);

  constructor(private whatsapp: WhatsAppService) {}

  @OnEvent('application.approved')
  async handleApplicationApproved(payload: {
    phone: string;
    name: string | null;
    tier: number;
  }) {
    try {
      const tierName = TIER_NAMES[payload.tier] || `Tier ${payload.tier}`;
      const benefits = TIER_BENEFITS[payload.tier] || '';

      await this.whatsapp.sendTextMessage(
        payload.phone,
        `🎉 *¡Felicidades ${payload.name || ''}!*\n\n` +
          `Tu solicitud como proveedor en *Handy* ha sido *aprobada*. ✅\n\n` +
          `📊 Tu nivel: *${tierName}*\n` +
          `${benefits ? `💼 Beneficios: ${benefits}\n` : ''}\n` +
          `Ya puedes recibir solicitudes de clientes por aquí.\n\n` +
          `📋 Escribe *"menu"* para ver tus opciones\n` +
          `❓ Escribe *"ayuda"* para ver los comandos disponibles\n\n` +
          `¡Bienvenido al equipo! 💪`,
      );
      this.logger.log(`Notified ${payload.phone} of approval (tier ${payload.tier})`);
    } catch (error: any) {
      this.logger.error(`Failed to notify approval: ${error.message}`);
    }
  }

  @OnEvent('application.rejected')
  async handleApplicationRejected(payload: {
    phone: string;
    name: string | null;
    reason: string;
  }) {
    try {
      await this.whatsapp.sendTextMessage(
        payload.phone,
        `😔 *Hola ${payload.name || ''}*\n\n` +
          `Lamentamos informarte que tu solicitud como proveedor en *Handy* no fue aprobada en esta ocasión.\n\n` +
          `📋 *Motivo:* ${payload.reason}\n\n` +
          `Puedes volver a enviar tu solicitud corrigiendo los puntos mencionados. ` +
          `Envía cualquier mensaje a este número para comenzar de nuevo.\n\n` +
          `Si tienes dudas, escribe *"ayuda"*.`,
      );
      this.logger.log(`Notified ${payload.phone} of rejection`);
    } catch (error: any) {
      this.logger.error(`Failed to notify rejection: ${error.message}`);
    }
  }

  @OnEvent('provider.tier.upgraded')
  async handleTierUpgraded(payload: {
    phone: string;
    name: string | null;
    oldTier: number;
    newTier: number;
  }) {
    try {
      const newTierName = TIER_NAMES[payload.newTier] || `Tier ${payload.newTier}`;
      const benefits = TIER_BENEFITS[payload.newTier] || '';

      await this.whatsapp.sendTextMessage(
        payload.phone,
        `🎊 *¡Felicidades ${payload.name || ''}!*\n\n` +
          `¡Has subido de nivel en Handy! 🚀\n\n` +
          `📊 Tier ${payload.oldTier} → *${newTierName}*\n\n` +
          `${benefits ? `🔓 *Nuevos beneficios:*\n${benefits}\n\n` : ''}` +
          `¡Sigue así! 💪`,
      );
      this.logger.log(
        `Notified ${payload.phone} of tier upgrade ${payload.oldTier} → ${payload.newTier}`,
      );
    } catch (error: any) {
      this.logger.error(`Failed to notify tier upgrade: ${error.message}`);
    }
  }
}
