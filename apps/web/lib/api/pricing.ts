import { apiClient } from './client'

const frontendToBackendVehicle: Record<string, string> = {
  bike: 'motobike',
  car: 'car_4',
  car7: 'car_7',
}

export interface CalculatePriceRequest {
  vehicleType: string
  pickupLocation: {
    lat: number
    lng: number
    address: string
  }
  dropoffLocation: {
    lat: number
    lng: number
    address: string
  }
  distance: number
  duration: number
}

export interface PriceBreakdown {
  basePrice: number
  distancePrice: number
  timePrice: number
  subtotal: number
  surgeMultiplier: number
  surgeLevel: 'normal' | 'medium' | 'high' | 'peak'
  surgeAmount: number
  couponDiscount: number
  finalPrice: number
  currency: string
  distance: number
  estimatedDuration: number
  breakdown: {
    baseFare: number
    perKm: number
    perMinute: number
    distance: number
    duration: number
    surgeReason?: string
  }
}

export const pricingAPI = {
  calculatePrice: async (data: {
    pickupLat: number
    pickupLng: number
    pickupAddress: string
    dropoffLat: number
    dropoffLng: number
    dropoffAddress: string
    vehicleType: string
    distance: number
    duration: number
  }) => {
    const backendVehicleType = frontendToBackendVehicle[data.vehicleType] || 'car_4'
    
    const payload: CalculatePriceRequest = {
      vehicleType: backendVehicleType,
      pickupLocation: {
        lat: data.pickupLat,
        lng: data.pickupLng,
        address: data.pickupAddress,
      },
      dropoffLocation: {
        lat: data.dropoffLat,
        lng: data.dropoffLng,
        address: data.dropoffAddress,
      },
      distance: data.distance / 1000,
      duration: Math.ceil(data.duration / 60),
    }

    return apiClient.post<PriceBreakdown>('/pricing/calculate', payload)
  },

  validateCoupon: (code: string, amount: number) =>
    apiClient.post<{ valid: boolean; discount: number; message?: string }>(
      '/pricing/apply-coupon',
      { code, amount }
    ),
}