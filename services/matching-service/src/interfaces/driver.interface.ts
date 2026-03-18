export interface DriverLocation {
  driverId: string;
  lat: number;
  lng: number;
  timestamp: Date;
}

export interface DriverInfo {
  userId: string;
  fullName: string;
  phone?: string;
  avatar?: string;
  vehicleType: string;
  vehicleModel: string;
  vehicleColor: string;
  vehiclePlate: string;
  rating: number;
  totalTrips: number;
  acceptanceRate: number;
  status: 'online' | 'offline' | 'busy';
}

export interface NearbyDriver {
  driverId: string;
  distance: number; // meters
  location?: {
    lat: number;
    lng: number;
  };
}

export interface ScoredDriver extends NearbyDriver {
  score: number;
  rating: number;
  totalTrips: number;
  vehicleType: string;
  acceptanceRate: number;
}