import {
  Controller,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { InternalAuthGuard } from '@cab-booking/shared';
import { ReviewService } from '../services/review.service';

@Controller('internal')
@UseGuards(InternalAuthGuard)
export class InternalController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get('reviews/ride/:rideId')
  async getReviewsByRide(@Param('rideId') rideId: string) {
    return this.reviewService.getReviewsByRide(rideId);
  }

  @Get('users/:userId/stats')
  async getUserStats(@Param('userId') userId: string) {
    return this.reviewService.getStatsByUser(userId);
  }

  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'review-service',
      timestamp: new Date().toISOString(),
    };
  }
}