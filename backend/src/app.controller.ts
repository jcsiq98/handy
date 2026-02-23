import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  @Get('api/health')
  @Public()
  getHealth() {
    return {
      status: 'ok',
      service: 'handy-api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
