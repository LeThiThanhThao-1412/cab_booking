import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface Location {
  lat: number;
  lng: number;
  address: string;
}

export interface DistanceResult {
  distance: number;
  duration: number;
}

@Injectable()
export class DistanceService {
  private readonly logger = new Logger(DistanceService.name);
  private readonly AVERAGE_SPEED = 30;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  async calculateDistance(origin: Location, destination: Location): Promise<DistanceResult> {
    try {
      const useGoogle = this.configService.get('USE_GOOGLE_MAPS') === 'true';
      
      if (useGoogle && this.configService.get('GOOGLE_MAPS_API_KEY')) {
        return await this.calculateWithGoogleMaps(origin, destination);
      } else {
        return await this.calculateWithOSRM(origin, destination);
      }
    } catch (error) {
      this.logger.error(`Error calculating distance: ${error.message}`);
      return this.calculateStraightLine(origin, destination);
    }
  }

  private async calculateWithGoogleMaps(origin: Location, destination: Location): Promise<DistanceResult> {
    const apiKey = this.configService.get('GOOGLE_MAPS_API_KEY');
    const url = 'https://maps.googleapis.com/maps/api/distancematrix/json';
    
    const response = await firstValueFrom(
      this.httpService.get(url, {
        params: {
          origins: `${origin.lat},${origin.lng}`,
          destinations: `${destination.lat},${destination.lng}`,
          key: apiKey,
          units: 'metric',
        },
      }),
    );

    const data = response.data;
    if (data.status !== 'OK') {
      throw new Error(`Google Maps API error: ${data.status}`);
    }

    const element = data.rows[0]?.elements[0];
    if (element.status !== 'OK') {
      throw new Error(`No route found`);
    }

    return {
      distance: Number((element.distance.value / 1000).toFixed(2)),
      duration: Number((element.duration.value / 60).toFixed(0)),
    };
  }

  private async calculateWithOSRM(origin: Location, destination: Location): Promise<DistanceResult> {
    const osrmUrl = this.configService.get('OSRM_URL', 'http://router.project-osrm.org');
    const url = `${osrmUrl}/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    
    const response = await firstValueFrom(
      this.httpService.get(url, {
        params: {
          overview: 'false',
          steps: 'false',
        },
      }),
    );

    const data = response.data;
    if (data.code !== 'Ok') {
      throw new Error(`OSRM API error: ${data.code}`);
    }

    const route = data.routes[0];
    return {
      distance: Number((route.distance / 1000).toFixed(2)),
      duration: Number((route.duration / 60).toFixed(0)),
    };
  }

  private calculateStraightLine(origin: Location, destination: Location): DistanceResult {
    const R = 6371;
    const dLat = this.toRad(destination.lat - origin.lat);
    const dLng = this.toRad(destination.lng - origin.lng);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(origin.lat)) * Math.cos(this.toRad(destination.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = Number((R * c).toFixed(2));
    const duration = Number(((distance / this.AVERAGE_SPEED) * 60).toFixed(0));
    
    return { distance, duration };
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}