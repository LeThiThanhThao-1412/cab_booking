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
import { NotificationService } from '../services/notification.service';
import { CreateNotificationDto, SendBulkNotificationDto, MarkAsReadDto } from '../dto/notification.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  async createNotification(@Body() createDto: CreateNotificationDto) {
    return this.notificationService.createNotification(createDto);
  }

  @Post('bulk')
  async sendBulk(@Body() dto: SendBulkNotificationDto) {
    return this.notificationService.sendBulkNotifications(dto);
  }

  @Get()
  async getMyNotifications(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.notificationService.getUserNotifications(req.user.sub, page, limit);
  }

  @Get('unread/count')
  async getUnreadCount(@Request() req) {
    return { count: await this.notificationService.getUnreadCount(req.user.sub) };
  }

  @Put('read')
  async markAsRead(@Request() req, @Body() body: MarkAsReadDto) {
    await this.notificationService.markAsRead(req.user.sub, body.notificationIds);
    return { message: 'Marked as read' };
  }

  @Put('read/all')
  async markAllAsRead(@Request() req) {
    await this.notificationService.markAllAsRead(req.user.sub);
    return { message: 'All marked as read' };
  }

  @Delete(':id')
  async deleteNotification(@Request() req, @Param('id') id: string) {
    await this.notificationService.deleteNotification(req.user.sub, id);
    return { message: 'Deleted' };
  }
}