import { Controller, Get, Post, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { MatchingService } from '../services/matching.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('matching')
@UseGuards(JwtAuthGuard)
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Get('status/:bookingId')
  async getMatchingStatus(@Param('bookingId') bookingId: string) {
    return this.matchingService.getMatchingStatus(bookingId);
  }

  @Delete('cancel/:bookingId')
  async cancelMatching(@Param('bookingId') bookingId: string) {
    await this.matchingService.cancelMatching(bookingId);
    return { message: 'Matching cancelled successfully' };
  }
}