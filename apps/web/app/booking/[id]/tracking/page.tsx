'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  MapPin, 
  Clock, 
  Phone, 
  MessageCircle, 
  Star,
  Loader2,
  AlertTriangle,
  XCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { MapContainer } from '@/components/map/map-container'
import { bookingAPI, BookingResponse } from '@/lib/api/booking'
import { paymentAPI } from '@/lib/api/payment'
import { formatPrice, formatDistance, formatDuration } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'

type RideStatus = 'pending' | 'accepted' | 'driver_assigned' | 'arrived' | 'started' | 'completed' | 'cancelled'

const statusLabels: Record<RideStatus, string> = {
  pending: 'Đang tìm tài xế...',
  accepted: 'Tài xế đã nhận chuyến',
  driver_assigned: 'Tài xế đang đến',
  arrived: 'Tài xế đã đến điểm đón',
  started: 'Đang di chuyển',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
}

const statusColors: Record<RideStatus, string> = {
  pending: 'text-yellow-600 bg-yellow-50',
  accepted: 'text-blue-600 bg-blue-50',
  driver_assigned: 'text-blue-600 bg-blue-50',
  arrived: 'text-green-600 bg-green-50',
  started: 'text-green-600 bg-green-50',
  completed: 'text-gray-600 bg-gray-50',
  cancelled: 'text-red-600 bg-red-50',
}

export default function TrackingPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  
  const bookingId = params.id as string
  
  const [booking, setBooking] = useState<BookingResponse | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<string>('pending')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(`/auth/login?redirect=/booking/${bookingId}/tracking`)
      return
    }

    loadBookingData()
    
    const interval = setInterval(loadBookingData, 5000)
    
    return () => clearInterval(interval)
  }, [bookingId, isAuthenticated, router])

  const loadBookingData = async () => {
    try {
      const [bookingRes, paymentRes] = await Promise.all([
        bookingAPI.getBooking(bookingId),
        paymentAPI.getPaymentByRide(bookingId).catch(() => ({ data: { status: 'pending' } })),
      ])
      
      setBooking(bookingRes.data)
      setPaymentStatus(paymentRes.data.status)
      setIsLoading(false)
    } catch (error: any) {
      setError(error.response?.data?.message || 'Không thể tải thông tin chuyến đi')
      setIsLoading(false)
    }
  }

  const handleCancelBooking = async () => {
    if (!confirm('Bạn có chắc muốn hủy chuyến đi này?')) return
    
    try {
      await bookingAPI.cancelBooking(bookingId, { reason: 'Khách hàng hủy' })
      loadBookingData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Không thể hủy chuyến đi')
    }
  }

  const handleContactDriver = () => {
    alert('Tính năng đang phát triển')
  }

  const handleCompleteRide = () => {
    router.push(`/review/${bookingId}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Không thể tải chuyến đi</h1>
          <p className="text-gray-600 mb-4">{error || 'Không tìm thấy chuyến đi'}</p>
          <Button onClick={() => router.push('/')}>Về trang chủ</Button>
        </Card>
      </div>
    )
  }

  const status = booking.status as RideStatus
  const pickupLocation = booking.pickupLocation
  const dropoffLocation = booking.dropoffLocation
  const mapCenter = {
    lat: (pickupLocation.lat + dropoffLocation.lat) / 2,
    lng: (pickupLocation.lng + dropoffLocation.lng) / 2,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-6">
        <div className="mb-6">
          <button
            onClick={() => router.push('/')}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Về trang chủ
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column - Map */}
          <div className="lg:col-span-2">
            <div className="h-[500px] lg:h-[600px] rounded-lg overflow-hidden sticky top-6">
              <MapContainer
                center={mapCenter}
                zoom={13}
                markers={[
                  { lat: pickupLocation.lat, lng: pickupLocation.lng, type: 'pickup', label: 'Đón' },
                  { lat: dropoffLocation.lat, lng: dropoffLocation.lng, type: 'dropoff', label: 'Đến' },
                ]}
                route={{
                  pickup: { lat: pickupLocation.lat, lng: pickupLocation.lng },
                  dropoff: { lat: dropoffLocation.lat, lng: dropoffLocation.lng },
                }}
              />
            </div>
          </div>

          {/* Right column - Info */}
          <div className="space-y-6">
            <Card className="p-6">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-4 ${statusColors[status]}`}>
                {statusLabels[status]}
              </div>
              
              {['accepted', 'driver_assigned', 'arrived', 'started'].includes(status) && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-lg font-bold">
                      T
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">Tài xế đang đến</p>
                      <p className="text-sm text-gray-600">Nguyễn Văn A • 4.8 ★</p>
                      <p className="text-sm text-gray-600">51F-123.45 • Xe 4 chỗ</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={handleContactDriver}>
                      <Phone className="w-4 h-4 mr-1" /> Gọi
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleContactDriver}>
                      <MessageCircle className="w-4 h-4 mr-1" /> Nhắn tin
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-500">Điểm đón</p>
                    <p className="font-medium truncate">{pickupLocation.address}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-500">Điểm đến</p>
                    <p className="font-medium truncate">{dropoffLocation.address}</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-4">Chi tiết chuyến đi</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Khoảng cách</span>
                  <span className="font-medium">{formatDistance(booking.distance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Thời gian dự kiến</span>
                  <span className="font-medium">{formatDuration(booking.duration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phương thức thanh toán</span>
                  <span className="font-medium">
                    {booking.paymentMethod === 'cash' ? 'Tiền mặt' : 
                     booking.paymentMethod === 'card' ? 'Thẻ' : 'Ví điện tử'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Trạng thái thanh toán</span>
                  <span className={`font-medium ${
                    paymentStatus === 'completed' ? 'text-green-600' : 
                    paymentStatus === 'failed' ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {paymentStatus === 'completed' ? 'Đã thanh toán' :
                     paymentStatus === 'failed' ? 'Thất bại' : 'Chưa thanh toán'}
                  </span>
                </div>
              </div>

              {paymentStatus === 'pending' && booking.paymentMethod !== 'cash' && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Chưa thanh toán</p>
                      <p className="text-xs text-yellow-700 mt-1">
                        Vui lòng thanh toán để hoàn tất chuyến đi
                      </p>
                      <Button 
                        size="sm" 
                        className="mt-2"
                        onClick={() => router.push(`/payment/${bookingId}`)}
                      >
                        Thanh toán ngay
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-6">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Tổng tiền</span>
                <span className="text-2xl font-bold text-primary">
                  {formatPrice(booking.price)}
                </span>
              </div>
            </Card>

            {['pending', 'accepted', 'driver_assigned'].includes(status) && (
              <Button 
                variant="outline" 
                className="w-full text-red-600 border-red-200 hover:bg-red-50"
                onClick={handleCancelBooking}
              >
                Hủy chuyến
              </Button>
            )}

            {status === 'completed' && (
              <Button 
                className="w-full"
                onClick={handleCompleteRide}
              >
                <Star className="w-4 h-4 mr-2" />
                Đánh giá chuyến đi
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}