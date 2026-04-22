import { apiClient } from './client'

export const vehicleTypeMap: Record<string, string> = {
  bike: 'motorbike',
  car: 'car_4',
  car7: 'car_7',
}

export interface CreateBookingRequest {
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
  vehicleType: string
  distance: number
  duration: number
  note?: string
  paymentMethod?: 'cash' | 'card' | 'wallet'
}

export interface BookingResponse {
  id: string
  customerId: string
  driverId: string | null
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
  vehicleType: string
  status: 'pending' | 'accepted' | 'driver_assigned' | 'arrived' | 'started' | 'completed' | 'cancelled'
  price: number
  distance: number
  duration: number
  createdAt: string
  updatedAt: string
}

export interface DriverInfo {
  id: string
  name: string
  phone: string
  avatar?: string
  vehicleType: string
  vehiclePlate: string
  rating: number
  currentLocation?: {
    lat: number
    lng: number
  }
}

export const bookingAPI = {
  createBooking: (data: CreateBookingRequest) =>
    apiClient.post<BookingResponse>('/bookings', data),

  getBooking: (id: string) =>
    apiClient.get<BookingResponse & { driver?: DriverInfo }>(`/bookings/${id}`),

  cancelBooking: (id: string, reason?: string) =>
    apiClient.post(`/bookings/${id}/cancel`, { reason }),

  getMyBookings: (status?: string) =>
    apiClient.get<BookingResponse[]>('/bookings/my', { params: { status } }),

  trackDriver: (bookingId: string) =>
    apiClient.get<{ driver: DriverInfo; estimatedArrival: number }>(`/bookings/${bookingId}/track`),
}