import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppProviderHandler } from './whatsapp-provider.handler';

/**
 * Webhook controller for WhatsApp Cloud API.
 * Handles Meta verification (GET) and incoming messages (POST).
 */
@ApiTags('WhatsApp Webhook')
@Controller('api/webhook')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(
    private whatsappService: WhatsAppService,
    private providerHandler: WhatsAppProviderHandler,
  ) {}

  // ─── GET /api/webhook — Meta verification challenge ──────

  @Get()
  @Public()
  @ApiOperation({ summary: 'WhatsApp webhook verification (Meta challenge)' })
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const verifyToken = this.whatsappService.getVerifyToken();

    if (mode === 'subscribe' && token === verifyToken) {
      this.logger.log('Webhook verification successful ✅');
      return res.status(200).send(challenge);
    }

    this.logger.warn('Webhook verification failed — invalid token');
    return res.status(403).json({ error: 'Forbidden' });
  }

  // ─── POST /api/webhook — Incoming WhatsApp messages ──────

  @Post()
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint() // Don't show in Swagger (webhook is called by Meta)
  async receiveMessage(@Body() body: any, @Res() res: Response) {
    // Always respond 200 quickly to avoid Meta retries
    res.status(200).json({ status: 'received' });

    try {
      // Validate it's a WhatsApp message notification
      const value = body?.entry?.[0]?.changes?.[0]?.value;
      if (!value) return;

      // Handle message status updates (sent, delivered, read) — just log
      if (value.statuses) {
        for (const status of value.statuses) {
          this.logger.debug(
            `Message ${status.id} status: ${status.status}`,
          );
        }
        return;
      }

      // Handle incoming messages
      if (!value.messages || value.messages.length === 0) return;

      for (const message of value.messages) {
        const senderPhone = message.from;
        const senderName =
          value.contacts?.[0]?.profile?.name || 'Unknown';
        const messageId = message.id;

        this.logger.log(
          `Message from ${senderPhone} (${senderName}): type=${message.type}`,
        );

        // Mark as read
        await this.whatsappService.markAsRead(messageId);

        // Route to the provider handler (providers interact via WA)
        await this.providerHandler.handleIncomingMessage(
          senderPhone,
          senderName,
          message,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Error processing webhook: ${error.message}`,
        error.stack,
      );
    }
  }
}

