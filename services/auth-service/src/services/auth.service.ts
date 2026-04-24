import { 
  Injectable, 
  UnauthorizedException, 
  ConflictException,
  Logger,
  BadRequestException 
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RabbitMQService } from '@cab-booking/shared';
import { ConfigService } from '@nestjs/config';
import { User, UserRole, UserStatus } from '../entities/user.entity';
import { RegisterDto, LoginDto, TokenResponseDto, UserResponseDto } from '../dto/auth.dto';
import * as crypto from 'crypto';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private rabbitMQService: RabbitMQService,
    private configService: ConfigService,
  ) {}

  async approveUser(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.status = UserStatus.ACTIVE;
    await this.userRepository.save(user);

    return user;
  }
  
  async register(registerDto: RegisterDto): Promise<UserResponseDto> {
    this.logger.log(`Registering new user: ${registerDto.email}`);

    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email đã được đăng ký');
    }

    const role = registerDto.role as UserRole || UserRole.CUSTOMER;
    const isDriver = role === UserRole.DRIVER;

    const user = this.userRepository.create({
      email: registerDto.email,
      password: registerDto.password,
      fullName: registerDto.fullName,
      phone: registerDto.phone,
      role: role,
      status: isDriver ? UserStatus.PENDING : UserStatus.ACTIVE,
      isEmailVerified: !isDriver,
    });

    await this.userRepository.save(user);

    await this.rabbitMQService.publish(
      'auth.events',
      'auth.user.registered',
      {
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        status: user.status,
        timestamp: new Date().toISOString(),
      },
      {
        correlationId: `reg_${user.id}`,
      }
    );

    this.logger.log(`User registered successfully: ${user.id}`);

    return new UserResponseDto({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
      status: user.status,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    });
  }

  async approveDriver(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.role !== 'driver') {
      throw new Error('User is not a driver');
    }

    user.status = UserStatus.ACTIVE;
    await this.userRepository.save(user);

    await this.rabbitMQService.publish(
      'auth.events',  // Đổi từ driver.exchange sang auth.events
      'driver.approved',
      {
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone
      }
    );
  }

  async login(loginDto: LoginDto): Promise<TokenResponseDto> {
    this.logger.log(`Login attempt: ${loginDto.email}`);

    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const isValid = await user.validatePassword(loginDto.password);
    if (!isValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Tài khoản chưa được kích hoạt hoặc đã bị khóa');
    }

    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    const tokens = await this.generateTokens(user);

    await this.rabbitMQService.publish(
      'auth.events',
      'auth.user.login',
      {
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString(),
      }
    );

    this.logger.log(`User logged in successfully: ${user.id}`);
    return tokens;
  }

  async refreshToken(refreshToken: string): Promise<TokenResponseDto> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET', 'refresh-secret'),
      });

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Refresh token không hợp lệ');
      }

      return this.generateTokens(user);
    } catch (error) {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }
  }

  async validateUser(userId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User không tồn tại');
    }

    return new UserResponseDto({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
      status: user.status,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    });
  }

  async logout(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      refreshToken: undefined,
    });

    await this.rabbitMQService.publish(
      'auth.events',
      'auth.user.logout',
      {
        userId,
        timestamp: new Date().toISOString(),
      }
    );
  }

  private async generateTokens(user: User): Promise<TokenResponseDto> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET', 'refresh-secret'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    await this.userRepository.update(user.id, {
      refreshToken,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600,
      tokenType: 'Bearer',
    };
  }

  async verifyEmail(token: string): Promise<boolean> {
    return true;
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) return;
    const resetToken = crypto.randomBytes(32).toString('hex');
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {}
}