import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

/**
 * Core WhatsApp Cloud API service.
 * Migrated from whatsapp/backend/src/services/whatsappService.js
 */
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly client: AxiosInstance;
  private readonly phoneNumberId: string;
  private readonly verifyToken: string;
  private readonly isEnabled: boolean;

  constructor(private config: ConfigService) {
    const apiUrl =
      config.get<string>('WHATSAPP_API_URL') ||
      'https://graph.facebook.com/v21.0';
    const accessToken = config.get<string>('WHATSAPP_TOKEN') || '';
    this.phoneNumberId =
      config.get<string>('WHATSAPP_PHONE_NUMBER_ID') || '';
    this.verifyToken =
      config.get<string>('WHATSAPP_VERIFY_TOKEN') || 'handy-verify-token';

    // Only enable WA sending if we have real credentials
    this.isEnabled =
      !!accessToken &&
      accessToken !== 'your_whatsapp_token' &&
      !!this.phoneNumberId &&
      this.phoneNumberId !== 'your_phone_number_id';

    this.client = axios.create({
      baseURL: `${apiUrl}/${this.phoneNumberId}`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 15_000,
    });

    if (this.isEnabled) {
      this.logger.log('WhatsApp Cloud API enabled ✅');
    } else {
      this.logger.warn(
        'WhatsApp Cloud API DISABLED — set WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env',
      );
    }
  }

  // ─── Public getters ──────────────────────────────────────

  getVerifyToken(): string {
    return this.verifyToken;
  }

  isWhatsAppEnabled(): boolean {
    return this.isEnabled;
  }

  // ─── Phone normalization ─────────────────────────────────

  /**
   * Normalize phone numbers for the WhatsApp Cloud API.
   * Mexican numbers: WA sometimes sends "521XXXXXXXXXX" (13 digits)
   * but the API expects "52XXXXXXXXXX" (12 digits) — removes the extra "1".
   */
  normalizePhone(phone: string): string {
    if (!phone) return phone;
    let cleaned = phone.replace(/\D/g, '');
    // Mexican numbers: if starts with "521" followed by 10 digits → remove the "1"
    if (cleaned.length === 13 && cleaned.startsWith('521')) {
      cleaned = '52' + cleaned.slice(3);
      this.logger.debug(`Normalized MX phone: ${phone} → ${cleaned}`);
    }
    return cleaned;
  }

  // ─── Sending methods ────────────────────────────────────

  /**
   * Send a plain text message.
   */
  async sendTextMessage(
    to: string,
    text: string,
  ): Promise<{ success: boolean; data?: any; error?: any }> {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.normalizePhone(to),
      type: 'text',
      text: { body: text },
    };
    return this.sendMessage(payload);
  }

  /**
   * Send interactive reply buttons (max 3 buttons).
   */
  async sendInteractiveButtons(
    to: string,
    bodyText: string,
    buttons: { id: string; title: string }[],
  ): Promise<{ success: boolean; data?: any; error?: any }> {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.normalizePhone(to),
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: bodyText },
        action: {
          buttons: buttons.map((btn) => ({
            type: 'reply',
            reply: { id: btn.id, title: btn.title },
          })),
        },
      },
    };
    return this.sendMessage(payload);
  }

  /**
   * Send an interactive list message.
   */
  async sendInteractiveList(
    to: string,
    headerText: string,
    bodyText: string,
    footerText: string,
    buttonText: string,
    sections: {
      title: string;
      rows: { id: string; title: string; description?: string }[];
    }[],
  ): Promise<{ success: boolean; data?: any; error?: any }> {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.normalizePhone(to),
      type: 'interactive',
      interactive: {
        type: 'list',
        header: { type: 'text', text: headerText },
        body: { text: bodyText },
        footer: { text: footerText },
        action: { button: buttonText, sections },
      },
    };
    return this.sendMessage(payload);
  }

  /**
   * Mark a message as read.
   */
  async markAsRead(
    messageId: string,
  ): Promise<{ success: boolean; data?: any; error?: any }> {
    const payload = {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    };
    return this.sendMessage(payload);
  }

  // ─── Core sender ────────────────────────────────────────

  private async sendMessage(payload: Record<string, any>): Promise<{
    success: boolean;
    data?: any;
    error?: any;
  }> {
    // In dev/disabled mode, just log the message
    if (!this.isEnabled) {
      this.logger.log(
        `[WA-DEV] Would send to ${payload.to}: ${JSON.stringify(payload).slice(0, 300)}`,
      );
      return { success: true, data: { dev: true } };
    }

    try {
      const response = await this.client.post('/messages', payload);
      this.logger.log(`Message sent to ${payload.to}: ${response.data?.messages?.[0]?.id || 'ok'}`);
      return { success: true, data: response.data };
    } catch (error: any) {
      const errData = error.response?.data || error.message;
      this.logger.error(
        `Error sending message to ${payload.to}: ${JSON.stringify(errData)}`,
      );
      return { success: false, error: errData };
    }
  }
}

