import { Injectable, Logger, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RabbitMQService } from '@cab-booking/shared';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Review, ReviewDocument } from '../schemas/review.schema';
import { CreateReviewDto, UpdateReviewDto, FlagReviewDto, ReviewResponseDto, ReviewStatsResponseDto } from '../dto/review.dto';
import { ReviewType, ReviewStatus, FlagReason } from '../enums/review.enum';

@Injectable()
export class ReviewService implements OnModuleInit {
  private readonly logger = new Logger(ReviewService.name);
  private isSubscribed = false;

  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    private rabbitMQService: RabbitMQService,
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  async onModuleInit() {
    await new Promise(resolve => setTimeout(resolve, 3000));
    await this.subscribeWithRetry();
  }

  async subscribeWithRetry(retryCount = 0) {
    const maxRetries = 10;
    const retryDelay = 5000;

    if (this.isSubscribed) {
      this.logger.log('Already subscribed to events');
      return;
    }

    try {
      await this.subscribeToEvents();
      this.isSubscribed = true;
      this.logger.log('✅ Successfully subscribed to events');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (retryCount < maxRetries) {
        this.logger.warn(`Failed to subscribe (attempt ${retryCount + 1}/${maxRetries}): ${errorMessage}`);
        setTimeout(() => this.subscribeWithRetry(retryCount + 1), retryDelay);
      } else {
        this.logger.error(`Failed to subscribe after ${maxRetries} attempts`);
      }
    }
  }

  async subscribeToEvents() {
    try {
      const channel = this.rabbitMQService['channel'];
      if (!channel) {
        throw new Error('RabbitMQ channel is not available');
      }

      this.logger.log('Subscribing to ride.completed events...');

      await this.rabbitMQService.subscribe(
        'review-service.queue',
        async (msg: any) => {
          await this.handleRideCompleted(msg);
        },
        {
          exchange: 'ride.events',
          routingKey: 'ride.completed',
        },
      );

      this.logger.log('✅ Subscribed to ride.completed events');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to subscribe: ${errorMessage}`);
      throw error;
    }
  }

  async handleRideCompleted(event: any) {
    this.logger.log(`Ride completed: ${JSON.stringify(event)}`);
    const data = event.data || event;

    const { rideId, bookingId, customerId, driverId } = data;

    if (customerId) {
      // Gửi thông báo yêu cầu đánh giá cho customer
      await this.rabbitMQService.publish(
        'notification.events',
        'review.requested',
        {
          userId: customerId,
          rideId,
          bookingId,
          type: 'customer_to_driver',
          message: 'Vui lòng đánh giá chuyến đi của bạn',
          timestamp: new Date().toISOString(),
        },
      ).catch(error => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to publish review.requested for customer: ${errorMessage}`);
      });
    }

    if (driverId) {
      // Gửi thông báo yêu cầu đánh giá cho driver
      await this.rabbitMQService.publish(
        'notification.events',
        'review.requested',
        {
          userId: driverId,
          rideId,
          bookingId,
          type: 'driver_to_customer',
          message: 'Vui lòng đánh giá khách hàng của bạn',
          timestamp: new Date().toISOString(),
        },
      ).catch(error => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to publish review.requested for driver: ${errorMessage}`);
      });
    }
  }

  async createReview(userId: string, createDto: CreateReviewDto): Promise<ReviewResponseDto> {
    this.logger.log(`Creating review for ride ${createDto.rideId} by ${userId}`);

    // Kiểm tra xem đã đánh giá chưa
    const existingReview = await this.reviewModel.findOne({
      rideId: createDto.rideId,
      reviewerId: userId,
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this ride');
    }

    // Xác định revieweeId dựa vào type
    let revieweeId: string;
    let rideData: any;

    try {
      // Gọi ride service để lấy thông tin ride
      rideData = await this.getRideInfo(createDto.rideId);
      
      if (createDto.type === ReviewType.CUSTOMER_TO_DRIVER) {
        revieweeId = rideData.driverId;
      } else {
        revieweeId = rideData.customerId;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get ride info: ${errorMessage}`);
      throw new BadRequestException('Invalid ride');
    }

    // Tạo review
    const review = new this.reviewModel({
      rideId: createDto.rideId,
      bookingId: createDto.bookingId,
      reviewerId: userId,
      revieweeId,
      type: createDto.type,
      rating: createDto.rating,
      dimensionRatings: createDto.dimensionRatings || {},
      comment: createDto.comment || '',
      tags: createDto.tags || [],
      images: createDto.images || [],
      status: ReviewStatus.PUBLISHED,
    });

    await review.save();

    // Cập nhật rating trung bình cho driver/customer
    await this.updateAverageRating(revieweeId, createDto.type === ReviewType.CUSTOMER_TO_DRIVER ? 'driver' : 'customer');

    // Publish event
    await this.rabbitMQService.publish(
      'review.events',
      'review.created',
      {
        reviewId: review._id.toString(),
        rideId: createDto.rideId,
        revieweeId,
        rating: createDto.rating,
        timestamp: new Date().toISOString(),
      },
    ).catch(error => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to publish review.created: ${errorMessage}`);
    });

    return this.mapToResponse(review);
  }

  async getReviewById(reviewId: string): Promise<ReviewResponseDto> {
    const review = await this.reviewModel.findById(reviewId);
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    return this.mapToResponse(review);
  }

  async getReviewsByUser(userId: string, page: number = 1, limit: number = 10): Promise<any> {
    const skip = (page - 1) * limit;
    
    const [reviews, total] = await Promise.all([
      this.reviewModel
        .find({ revieweeId: userId, status: ReviewStatus.PUBLISHED })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.reviewModel.countDocuments({ revieweeId: userId, status: ReviewStatus.PUBLISHED }),
    ]);

    return {
      data: reviews.map(r => this.mapToResponse(r)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getReviewsByRide(rideId: string): Promise<ReviewResponseDto[]> {
    const reviews = await this.reviewModel
      .find({ rideId, status: ReviewStatus.PUBLISHED })
      .sort({ createdAt: -1 })
      .exec();
    return reviews.map(r => this.mapToResponse(r));
  }

  async getStatsByUser(userId: string, role?: string): Promise<ReviewStatsResponseDto> {
    const query: any = { revieweeId: userId, status: ReviewStatus.PUBLISHED };
    
    // Nếu role là driver, chỉ lấy customer_to_driver
    if (role === 'driver') {
      query.type = ReviewType.CUSTOMER_TO_DRIVER;
    } else if (role === 'customer') {
      query.type = ReviewType.DRIVER_TO_CUSTOMER;
    }

    const reviews = await this.reviewModel.find(query);
    
    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        recentReviews: [],
      };
    }

    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / reviews.length;

    const ratingDistribution = {
      1: reviews.filter(r => r.rating === 1).length,
      2: reviews.filter(r => r.rating === 2).length,
      3: reviews.filter(r => r.rating === 3).length,
      4: reviews.filter(r => r.rating === 4).length,
      5: reviews.filter(r => r.rating === 5).length,
    };

    // Tính điểm trung bình từng dimension
    const dimensionAverages: any = {};
    const dimensions = ['driving_skill', 'punctuality', 'vehicle_cleanliness', 'attitude', 'comfort'];
    
    for (const dim of dimensions) {
      const dimReviews = reviews.filter(r => r.dimensionRatings?.[dim]);
      if (dimReviews.length > 0) {
        const dimTotal = dimReviews.reduce((sum, r) => sum + (r.dimensionRatings?.[dim] || 0), 0);
        dimensionAverages[dim] = parseFloat((dimTotal / dimReviews.length).toFixed(1));
      }
    }

    const recentReviews = reviews
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)
      .map(r => this.mapToResponse(r));

    return {
      averageRating: parseFloat(averageRating.toFixed(1)),
      totalReviews: reviews.length,
      ratingDistribution,
      dimensionAverages: Object.keys(dimensionAverages).length ? dimensionAverages : undefined,
      recentReviews,
    };
  }

  async updateReview(reviewId: string, userId: string, updateDto: UpdateReviewDto): Promise<ReviewResponseDto> {
    const review = await this.reviewModel.findOne({ _id: reviewId, reviewerId: userId });
    if (!review) {
      throw new NotFoundException('Review not found or you are not the author');
    }

    if (updateDto.rating) review.rating = updateDto.rating;
    if (updateDto.comment) review.comment = updateDto.comment;
    if (updateDto.tags) review.tags = updateDto.tags;

    await review.save();

    // Cập nhật lại rating trung bình
    await this.updateAverageRating(review.revieweeId, review.type === ReviewType.CUSTOMER_TO_DRIVER ? 'driver' : 'customer');

    return this.mapToResponse(review);
  }

  async flagReview(reviewId: string, userId: string, flagDto: FlagReviewDto): Promise<{ message: string }> {
    const review = await this.reviewModel.findById(reviewId);
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    review.reportCount += 1;
    review.flag = {
      reason: flagDto.reason,
      description: flagDto.description || '',
      flaggedBy: userId,
      flaggedAt: new Date(),
    };

    // Nếu bị báo cáo quá 5 lần, tự động ẩn
    if (review.reportCount >= 5) {
      review.status = ReviewStatus.FLAGGED;
    }

    await review.save();

    // Thông báo cho admin
    await this.rabbitMQService.publish(
      'admin.events',
      'review.flagged',
      {
        reviewId,
        reason: flagDto.reason,
        reportCount: review.reportCount,
        timestamp: new Date().toISOString(),
      },
    ).catch(error => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to publish review.flagged: ${errorMessage}`);
    });

    return { message: 'Review flagged successfully' };
  }

  async markHelpful(reviewId: string, userId: string): Promise<{ message: string }> {
    const review = await this.reviewModel.findById(reviewId);
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    review.helpfulCount += 1;
    await review.save();

    return { message: 'Marked as helpful' };
  }

  async deleteReview(reviewId: string, userId: string, isAdmin: boolean = false): Promise<void> {
    const query: any = { _id: reviewId };
    if (!isAdmin) {
      query.reviewerId = userId;
    }

    const review = await this.reviewModel.findOne(query);
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    await review.deleteOne();

    // Cập nhật lại rating trung bình
    await this.updateAverageRating(review.revieweeId, review.type === ReviewType.CUSTOMER_TO_DRIVER ? 'driver' : 'customer');
  }

  async adminHideReview(reviewId: string, reason: string): Promise<ReviewResponseDto> {
    const review = await this.reviewModel.findById(reviewId);
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    review.status = ReviewStatus.HIDDEN;
    if (review.flag) {
      review.flag.resolution = reason;
      review.flag.resolvedAt = new Date();
    }
    await review.save();

    return this.mapToResponse(review);
  }

  async adminApproveReview(reviewId: string): Promise<ReviewResponseDto> {
    const review = await this.reviewModel.findById(reviewId);
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    review.status = ReviewStatus.PUBLISHED;
    review.flag = {} as any;
    await review.save();

    return this.mapToResponse(review);
  }

  async getFlaggedReviews(page: number = 1, limit: number = 10): Promise<any> {
    const skip = (page - 1) * limit;
    
    const [reviews, total] = await Promise.all([
      this.reviewModel
        .find({ status: ReviewStatus.FLAGGED })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.reviewModel.countDocuments({ status: ReviewStatus.FLAGGED }),
    ]);

    return {
      data: reviews.map(r => this.mapToResponse(r)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async updateAverageRating(userId: string, role: string) {
    try {
      const stats = await this.getStatsByUser(userId, role);
      
      // Gọi API đến user-service hoặc driver-service để cập nhật rating
      if (role === 'driver') {
        const driverServiceUrl = this.configService.get('DRIVER_SERVICE_URL', 'http://localhost:3003');
        await firstValueFrom(
          this.httpService.patch(
            `${driverServiceUrl}/api/v1/internal/drivers/${userId}/rating`,
            { rating: stats.averageRating },
            {
              headers: {
                'x-service-id': 'review-service',
                'x-internal-key': this.configService.get('INTERNAL_API_KEY', 'internal-key'),
              },
            }
          )
        );
      } else {
        const userServiceUrl = this.configService.get('USER_SERVICE_URL', 'http://localhost:3002');
        await firstValueFrom(
          this.httpService.patch(
            `${userServiceUrl}/api/v1/internal/users/${userId}/rating`,
            { rating: stats.averageRating },
            {
              headers: {
                'x-service-id': 'review-service',
                'x-internal-key': this.configService.get('INTERNAL_API_KEY', 'internal-key'),
              },
            }
          )
        );
      }

      this.logger.log(`Updated average rating for ${role} ${userId}: ${stats.averageRating}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to update average rating: ${errorMessage}`);
    }
  }

  private async getRideInfo(rideId: string): Promise<any> {
    const rideServiceUrl = this.configService.get('RIDE_SERVICE_URL', 'http://localhost:3005');
    const response = await firstValueFrom(
      this.httpService.get(`${rideServiceUrl}/api/v1/internal/rides/${rideId}`, {
        headers: {
          'x-service-id': 'review-service',
          'x-internal-key': this.configService.get('INTERNAL_API_KEY', 'internal-key'),
        },
      })
    );
    return response.data;
  }

  private mapToResponse(review: ReviewDocument): ReviewResponseDto {
    const obj = review.toObject();
    return {
      id: (obj._id as any).toString(),
      rideId: obj.rideId,
      bookingId: obj.bookingId,
      reviewerId: obj.reviewerId,
      revieweeId: obj.revieweeId,
      type: obj.type,
      rating: obj.rating,
      dimensionRatings: obj.dimensionRatings,
      comment: obj.comment || '',
      tags: obj.tags || [],
      images: obj.images || [],
      status: obj.status,
      helpfulCount: obj.helpfulCount,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    };
  }
}