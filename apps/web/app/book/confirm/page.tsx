'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  Banknote, 
  Zap,
  Loader2,
  Ticket,
  CheckCircle2,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { MapContainer } from '@/components/map/map-container'
import { bookingAPI, CreateBookingRequest } from '@/lib/api/booking'
import { paymentAPI, ApplyCouponResponse } from '@/lib/api/payment'
import { formatPrice, formatDistance, formatDuration } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'

function ConfirmBookingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated } = useAuthStore()
  
  const [isLoading, setIsLoading] = useState(false)
  const [note, setNote] = useState('')
  
  // Coupon state
  const [couponCode, setCouponCode] = useState('')
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState<ApplyCouponResponse | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)

  // Lấy params từ URL
  const pickupLat = parseFloat(searchParams.get('pickupLat') || '0')
  const pickupLng = parseFloat(searchParams.get('pickupLng') || '0')
  const pickupAddress = searchParams.get('pickupAddress') || ''
  const dropoffLat = parseFloat(searchParams.get('dropoffLat') || '0')
  const dropoffLng = parseFloat(searchParams.get('dropoffLng') || '0')
  const dropoffAddress = searchParams.get('dropoffAddress') || ''
  const vehicleType = searchParams.get('vehicleType') || 'car'
  const vehicleName = searchParams.get('vehicleName') || 'Xe 4 Chỗ'
  const originalPrice = parseFloat(searchParams.get('finalPrice') || '0')
  const distance = parseFloat(searchParams.get('distance') || '0')
  const duration = parseInt(searchParams.get('duration') || '0')
  const surgeLevel = searchParams.get('surgeLevel') || 'normal'
  const surgeMultiplier = parseFloat(searchParams.get('surgeMultiplier') || '1')

  // Tính giá hiển thị
  const displayPrice = appliedCoupon?.finalAmount ?? originalPrice
  const discountAmount = appliedCoupon?.discount ?? 0

  const mapCenter = {
    lat: (pickupLat + dropoffLat) / 2,
    lng: (pickupLng + dropoffLng) / 2,
  }

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Vui lòng nhập mã giảm giá')
      return
    }

    setIsApplyingCoupon(true)
    setCouponError(null)

    try {
      const response = await paymentAPI.applyCoupon({
        couponCode: couponCode.trim().toUpperCase(),
        amount: originalPrice,
      })

      const data = response.data

      if (data.minOrderValue && originalPrice < data.minOrderValue) {
        setCouponError(`Đơn hàng tối thiểu ${formatPrice(data.minOrderValue)} để sử dụng mã này`)
        return
      }

      setAppliedCoupon(data)
      setCouponCode('')
    } catch (err: any) {
      const message = err.response?.data?.message || 'Mã giảm giá không hợp lệ'
      setCouponError(message)
    } finally {
      setIsApplyingCoupon(false)
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponCode('')
    setCouponError(null)
  }

  const handleConfirm = async () => {
    if (!isAuthenticated) {
      router.push(`/auth/login?redirect=/book/confirm?${searchParams.toString()}`)
      return
    }

    setIsLoading(true)
    
    try {
      const backendVehicleType = (
        vehicleType === 'bike' ? 'motorbike' :
        vehicleType === 'car' ? 'car_4' :
        vehicleType === 'car7' ? 'car_7' : 'car_4'
      ) as 'motorbike' | 'car_4' | 'car_7'

      const bookingData: CreateBookingRequest = {
        pickupLocation: {
          lat: pickupLat,
          lng: pickupLng,
          address: pickupAddress,
        },
        dropoffLocation: {
          lat: dropoffLat,
          lng: dropoffLng,
          address: dropoffAddress,
        },
        vehicleType: backendVehicleType,
        distance: distance,
        duration: duration,
        paymentMethod: 'cash',
        ...(appliedCoupon && { couponCode: appliedCoupon.couponCode }),
      }

      console.log('📤 Booking payload:', bookingData)

      const response = await bookingAPI.createBooking(bookingData)
      const booking = response.data

      // Chuyển thẳng đến tracking page
      router.push(`/booking/${booking.id}/tracking`)
    } catch (error: any) {
      const message = error.response?.data?.message || 'Đặt xe thất bại, vui lòng thử lại'
      alert(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container py-8">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Quay lại chọn xe
      </button>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <h1 className="text-2xl font-bold mb-6">Xác nhận chuyến đi</h1>

          {/* Route info */}
          <Card className="p-6 mb-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Thông tin chuyến đi
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-500">Điểm đón</p>
                  <p className="font-medium truncate">{pickupAddress}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-500">Điểm đến</p>
                  <p className="font-medium truncate">{dropoffAddress}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-gray-400" />
                {formatDistance(distance * 1000)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-gray-400" />
                {formatDuration(duration * 60)}
              </span>
            </div>
          </Card>

          {/* Vehicle info */}
          <Card className="p-6 mb-6">
            <h2 className="font-semibold mb-4">Loại xe đã chọn</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-lg">{vehicleName}</p>
                <p className="text-sm text-gray-500">Tài xế đến trong 3-5 phút</p>
              </div>
              {surgeLevel !== 'normal' && (
                <div className="flex items-center gap-1 text-orange-600">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm font-medium">Cao điểm x{surgeMultiplier}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Payment method - CASH ONLY */}
          <Card className="p-6 mb-6">
            <h2 className="font-semibold mb-4">Phương thức thanh toán</h2>
            <div className="p-4 rounded-lg border-2 border-primary bg-primary/5">
              <div className="flex items-center gap-3">
                <Banknote className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Tiền mặt</p>
                  <p className="text-sm text-gray-500">Thanh toán trực tiếp cho tài xế</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Note input */}
          <Card className="p-6 mb-6">
            <h2 className="font-semibold mb-4">Ghi chú (không bắt buộc)</h2>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Đón tại cổng chính..."
              className="w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              rows={3}
            />
          </Card>

          {/* Coupon & Total */}
          <Card className="p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Ticket className="w-5 h-5 text-primary" />
              Mã giảm giá
            </h2>

            {!appliedCoupon ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value.toUpperCase())
                        setCouponError(null)
                      }}
                      placeholder="Nhập mã giảm giá"
                      className="pr-8 uppercase"
                      disabled={isApplyingCoupon}
                    />
                    {couponCode && (
                      <button
                        onClick={() => setCouponCode('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                      >
                        <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                      </button>
                    )}
                  </div>
                  <Button
                    onClick={handleApplyCoupon}
                    disabled={!couponCode.trim() || isApplyingCoupon}
                    variant="outline"
                  >
                    {isApplyingCoupon ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Áp dụng'
                    )}
                  </Button>
                </div>
                {couponError && (
                  <p className="text-sm text-red-500">{couponError}</p>
                )}
              </div>
            ) : (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-700">
                        Mã {appliedCoupon.couponCode} đã áp dụng
                      </p>
                      <p className="text-sm text-green-600">
                        {appliedCoupon.type === 'percentage' 
                          ? `Giảm ${appliedCoupon.value}% (tối đa ${formatPrice(appliedCoupon.maxDiscount || 0)})`
                          : `Giảm ${formatPrice(appliedCoupon.value)}`
                        }
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 pt-6 border-t">
              {discountAmount > 0 && (
                <>
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Tổng tiền</span>
                    <span>{formatPrice(originalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-600 mb-2">
                    <span className="flex items-center gap-1">
                      <Ticket className="w-4 h-4" />
                      Giảm giá ({appliedCoupon?.couponCode})
                    </span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                </>
              )}
              
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Tổng cộng</span>
                <span className="text-2xl font-bold text-primary">
                  {formatPrice(displayPrice)}
                </span>
              </div>
            </div>

            <Button
              onClick={handleConfirm}
              className="w-full h-12 text-base mt-6"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                'Xác nhận đặt xe'
              )}
            </Button>
          </Card>
        </div>

        {/* Right column - Map */}
        <div className="h-[600px] lg:h-auto sticky top-20">
          <MapContainer
            center={mapCenter}
            zoom={12}
            markers={[
              { lat: pickupLat, lng: pickupLng, type: 'pickup', label: 'Đón' },
              { lat: dropoffLat, lng: dropoffLng, type: 'dropoff', label: 'Đến' },
            ]}
            route={{
              pickup: { lat: pickupLat, lng: pickupLng },
              dropoff: { lat: dropoffLat, lng: dropoffLng },
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={
      <div className="container py-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <ConfirmBookingContent />
    </Suspense>
  )
}