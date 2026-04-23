import { apiClient } from './client'

// ============ Types ============
export type PaymentMethod = 'cash' | 'card' | 'wallet'
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'
export type CouponType = 'percentage' | 'fixed'

export interface ApplyCouponRequest {
  couponCode: string
  amount: number
}

export interface ApplyCouponResponse {
  couponCode: string
  type: CouponType
  value: number
  discount: number
  finalAmount: number
  minOrderValue?: number
  maxDiscount?: number
}

export interface PaymentInfo {
  id: string
  transactionId: string
  rideId: string
  amount: number
  discountAmount: number
  finalAmount: number
  method: PaymentMethod
  status: PaymentStatus
  paidAt?: string
  refundedAt?: string
  metadata?: {
    refundReason?: string
    refundTransactionId?: string
    couponCode?: string
  }
}

export interface RefundRequest {
  reason: string
}

// ============ API Functions ============
export const paymentAPI = {
  // Áp dụng mã giảm giá (trước khi thanh toán)
  applyCoupon: (data: ApplyCouponRequest) =>
    apiClient.post<ApplyCouponResponse>('/payments/apply-coupon', data),

  // Lấy thông tin thanh toán theo chuyến xe
  getPaymentByRide: (rideId: string) =>
    apiClient.get<PaymentInfo>(`/payments/ride/${rideId}`),

  // Tra cứu theo mã giao dịch
  getPaymentByTransaction: (transactionId: string) =>
    apiClient.get<PaymentInfo>(`/payments/transaction/${transactionId}`),

  // Hoàn tiền
  refundPayment: (paymentId: string, data: RefundRequest) =>
    apiClient.post<PaymentInfo>(`/payments/${paymentId}/refund`, data),
}