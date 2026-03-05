import { 
  Controller, 
  Get,
  Post,
  Delete, 
  Put, 
  Patch, 
  Body, 
  Param, 
  UseGuards,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfile } from '../entities/user-profile.entity';
import { UpdateProfileDto, SavedPlaceDto, UserProfileResponseDto } from '../dto/user.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
  ) {}

  @Get('profile')
  async getMyProfile(@Request() req): Promise<UserProfileResponseDto> {
    const userId = req.user.sub;
    const profile = await this.userProfileRepository.findOne({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile;
  }

  @Get(':userId')
  async getProfile(@Param('userId') userId: string): Promise<UserProfileResponseDto> {
    const profile = await this.userProfileRepository.findOne({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile;
  }

  @Patch('profile')
  async updateProfile(
    @Request() req,
    @Body() updateDto: UpdateProfileDto,
  ): Promise<UserProfileResponseDto> {
    const userId = req.user.sub;
    const profile = await this.userProfileRepository.findOne({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    Object.assign(profile, updateDto);
    await this.userProfileRepository.save(profile);

    return profile;
  }

  @Post('places')
  async addSavedPlace(
    @Request() req,
    @Body() placeDto: SavedPlaceDto,
  ): Promise<UserProfileResponseDto> {
    const userId = req.user.sub;
    const profile = await this.userProfileRepository.findOne({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    if (!profile.savedPlaces) {
      profile.savedPlaces = [];
    }

    profile.savedPlaces.push(placeDto);
    await this.userProfileRepository.save(profile);

    return profile;
  }

  @Delete('places/:placeName')
  async removeSavedPlace(
    @Request() req,
    @Param('placeName') placeName: string,
  ): Promise<UserProfileResponseDto> {
    const userId = req.user.sub;
    const profile = await this.userProfileRepository.findOne({
      where: { userId },
    });

    if (!profile || !profile.savedPlaces) {
      throw new NotFoundException('Profile or place not found');
    }

    profile.savedPlaces = profile.savedPlaces.filter(
      place => place.name !== placeName,
    );
    await this.userProfileRepository.save(profile);

    return profile;
  }
}