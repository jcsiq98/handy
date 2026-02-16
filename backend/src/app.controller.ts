import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('api/health')
  getHealth() {
    return {
      status: 'ok',
      service: 'handy-api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
