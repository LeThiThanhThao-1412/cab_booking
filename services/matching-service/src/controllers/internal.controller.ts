import { Controller, Get, Delete, Param, UseGuards } from '@nestjs/common';
import { InternalAuthGuard } from '@cab-booking/shared';
import { MatchingService } from '../services/matching.service';

@Controller('internal')
@UseGuards(InternalAuthGuard)
export class InternalController {
  constructor(private readonly matchingService: MatchingService) {}

  @Get('matching/status/:bookingId')
  async getMatchingStatus(@Param('bookingId') bookingId: string) {
    return this.matchingService.getMatchingStatus(bookingId);
  }

  @Delete('matching/cancel/:bookingId')
  async cancelMatching(@Param('bookingId') bookingId: string) {
    await this.matchingService.cancelMatching(bookingId);
    return { message: 'Matching cancelled successfully' };
  }

  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'matching-service',
      timestamp: new Date().toISOString(),
    };
  }
}