import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ReviewService } from '../services/review.service';
import { CreateReviewDto, UpdateReviewDto, FlagReviewDto } from '../dto/review.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  async createReview(@Request() req, @Body() createDto: CreateReviewDto) {
    return this.reviewService.createReview(req.user.sub, createDto);
  }

  @Get('user/:userId')
  async getReviewsByUser(
    @Param('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reviewService.getReviewsByUser(userId, page, limit);
  }

  @Get('ride/:rideId')
  async getReviewsByRide(@Param('rideId') rideId: string) {
    return this.reviewService.getReviewsByRide(rideId);
  }

  @Get('stats/:userId')
  async getStatsByUser(
    @Param('userId') userId: string,
    @Query('role') role?: string,
  ) {
    return this.reviewService.getStatsByUser(userId, role);
  }

  @Get('my-reviews')
  async getMyReviews(@Request() req, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.reviewService.getReviewsByUser(req.user.sub, page, limit);
  }

  @Get('my-stats')
  async getMyStats(@Request() req, @Query('role') role?: string) {
    return this.reviewService.getStatsByUser(req.user.sub, role);
  }

  @Get(':id')
  async getReview(@Param('id') id: string) {
    return this.reviewService.getReviewById(id);
  }

  @Put(':id')
  async updateReview(@Request() req, @Param('id') id: string, @Body() updateDto: UpdateReviewDto) {
    return this.reviewService.updateReview(id, req.user.sub, updateDto);
  }

  @Post(':id/flag')
  async flagReview(@Request() req, @Param('id') id: string, @Body() flagDto: FlagReviewDto) {
    return this.reviewService.flagReview(id, req.user.sub, flagDto);
  }

  @Post(':id/helpful')
  async markHelpful(@Request() req, @Param('id') id: string) {
    return this.reviewService.markHelpful(id, req.user.sub);
  }

  @Delete(':id')
  async deleteReview(@Request() req, @Param('id') id: string) {
    await this.reviewService.deleteReview(id, req.user.sub);
    return { message: 'Review deleted successfully' };
  }
}