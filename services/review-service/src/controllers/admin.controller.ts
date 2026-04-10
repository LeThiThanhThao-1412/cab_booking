import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReviewService } from '../services/review.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('admin/reviews')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get('flagged')
  async getFlaggedReviews(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.reviewService.getFlaggedReviews(page, limit);
  }

  @Post(':id/hide')
  async hideReview(@Param('id') id: string, @Body('reason') reason: string) {
    return this.reviewService.adminHideReview(id, reason);
  }

  @Post(':id/approve')
  async approveReview(@Param('id') id: string) {
    return this.reviewService.adminApproveReview(id);
  }

  @Delete(':id')
  async deleteReview(@Param('id') id: string) {
    await this.reviewService.deleteReview(id, '', true);
    return { message: 'Review deleted by admin' };
  }
}