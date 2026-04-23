import { apiClient } from './client'

export type PaymentMethod = 'cash' | 'card' | 'wallet'
export type BookingStatus = 'pending' | 'accepted' | 'driver_assigned' | 'arrived' | 'started' | 'completed' | 'cancelled'

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
  vehicleType: 'motorbike' | 'car_4' | 'car_7'
  distance: number  // km
  duration: number  // minutes
  note?: string
  paymentMethod?: PaymentMethod
  couponCode?: string
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
  status: BookingStatus
  price: number
  distance: number
  duration: number
  paymentMethod: PaymentMethod
  paymentStatus?: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'
  createdAt: string
  updatedAt: string
  estimatedPickupTime?: number // seconds
}

export interface CancelBookingRequest {
  reason: string
}

export interface PaymentUrlResponse {
  paymentId: string
  paymentUrl: string
  amount: number
  expiresAt: string
}

export interface DriverInfo {
  id: string
  name: string
  phone: string
  avatar?: string
  vehicleType: string
  vehiclePlate: string
  rating: number
  totalRides: number
  currentLocation?: {
    lat: number
    lng: number
  }
  estimatedArrival?: number // seconds
}

export const bookingAPI = {
  // ============ Booking CRUD ============
  
  // Tạo booking mới
  createBooking: (data: CreateBookingRequest) =>
    apiClient.post<BookingResponse>('/bookings', data),

  // Lấy thông tin booking theo ID
  getBooking: (id: string) =>
    apiClient.get<BookingResponse & { driver?: DriverInfo }>(`/bookings/${id}`),

  // Lấy danh sách booking của user hiện tại
  getMyBookings: (params?: { status?: BookingStatus; limit?: number; offset?: number }) =>
    apiClient.get<{ data: BookingResponse[]; total: number }>('/bookings/my', { params }),

  // Hủy booking
  cancelBooking: (id: string, data: CancelBookingRequest) =>
    apiClient.post<BookingResponse>(`/bookings/${id}/cancel`, data),

  // ============ Driver Actions ============
  
  // Driver accept booking
  acceptBooking: (id: string) =>
    apiClient.patch<BookingResponse>(`/bookings/${id}/accept`),

  // Driver cập nhật trạng thái
  updateBookingStatus: (id: string, status: string) =>
    apiClient.patch<BookingResponse>(`/bookings/${id}/status`, { status }),

  // Driver đến điểm đón
  arriveAtPickup: (id: string) =>
    apiClient.patch<BookingResponse>(`/bookings/${id}/arrive`),

  // Bắt đầu chuyến đi
  startRide: (id: string) =>
    apiClient.patch<BookingResponse>(`/bookings/${id}/start`),

  // Hoàn thành chuyến đi
  completeRide: (id: string) =>
    apiClient.patch<BookingResponse>(`/bookings/${id}/complete`),

  // ============ Payment ============
  
  // Lấy URL thanh toán (cho card/wallet)
  getPaymentUrl: (bookingId: string) =>
    apiClient.get<PaymentUrlResponse>(`/bookings/${bookingId}/payment-url`),

  // Kiểm tra trạng thái thanh toán
  checkPaymentStatus: (bookingId: string) =>
    apiClient.get<{ status: 'pending' | 'processing' | 'completed' | 'failed' }>(`/bookings/${bookingId}/payment-status`),

  // ============ Tracking ============
  
  // Lấy vị trí hiện tại của driver
  getDriverLocation: (bookingId: string) =>
    apiClient.get<{ lat: number; lng: number; updatedAt: string }>(`/bookings/${bookingId}/driver-location`),

  // Lấy ETA cập nhật
  getETA: (bookingId: string) =>
    apiClient.get<{ estimatedArrival: number; distance: number }>(`/bookings/${bookingId}/eta`),

  // ============ Review ============
  
  // Gửi đánh giá chuyến đi
  submitReview: (bookingId: string, data: { rating: number; comment?: string }) =>
    apiClient.post(`/bookings/${bookingId}/review`, data),

  // Lấy đánh giá của chuyến đi
  getReview: (bookingId: string) =>
    apiClient.get<{ rating: number; comment?: string; createdAt: string }>(`/bookings/${bookingId}/review`),
}