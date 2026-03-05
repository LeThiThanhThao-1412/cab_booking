import { 
  Controller, 
  Get, 
  Post,
  Patch, 
  Body, 
  Param, 
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InternalAuthGuard } from '@cab-booking/shared';
import { AuthService } from '../services/auth.service';
import { UserResponseDto } from '../dto/auth.dto';

@Controller('internal')
@UseGuards(InternalAuthGuard) // Zero Trust: chỉ service nội bộ mới gọi được
export class InternalController {
  constructor(private readonly authService: AuthService) {}

  @Get('users/:userId')
  async getUserById(@Param('userId') userId: string): Promise<UserResponseDto> {
    return this.authService.validateUser(userId);
  }

  @Post('users/:userId/verify')
  @HttpCode(HttpStatus.OK)
  async verifyUser(@Param('userId') userId: string): Promise<{ verified: boolean }> {
    // Logic để verify user từ service khác (ví dụ: driver service)
    return { verified: true };
  }
  @Patch('users/:userId/approve')
  @HttpCode(HttpStatus.OK)
  async approveUser(
    @Param('userId') userId: string,
  ): Promise<{ message: string }> {
    await this.authService.approveUser(userId);

    return {
      message: 'User approved successfully',
    };
  }


  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'auth-service',
      timestamp: new Date().toISOString(),
    };
  }

  // Endpoint để các service khác validate token
  @Post('validate-token')
  async validateToken(@Body() body: { token: string }): Promise<any> {
    try {
      // Logic validate token
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}