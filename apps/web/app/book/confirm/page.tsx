'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, MapPin, Clock, CreditCard, Wallet, Banknote, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { MapContainer } from '@/components/map/map-container'
import { bookingAPI } from '@/lib/api/booking'
import { formatPrice, formatDistance, formatDuration } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'

function ConfirmBookingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'wallet'>('cash')
  const [note, setNote] = useState('')

  const pickupLat = parseFloat(searchParams.get('pickupLat') || '0')
  const pickupLng = parseFloat(searchParams.get('pickupLng') || '0')
  const pickupAddress = searchParams.get('pickupAddress') || ''
  const dropoffLat = parseFloat(searchParams.get('dropoffLat') || '0')
  const dropoffLng = parseFloat(searchParams.get('dropoffLng') || '0')
  const dropoffAddress = searchParams.get('dropoffAddress') || ''
  const vehicleType = searchParams.get('vehicleType') || 'car'
  const vehicleName = searchParams.get('vehicleName') || 'Xe 4 Chỗ'
  const finalPrice = parseFloat(searchParams.get('finalPrice') || '0')
  const distance = parseFloat(searchParams.get('distance') || '0')
  const duration = parseInt(searchParams.get('duration') || '0')
  const surgeLevel = searchParams.get('surgeLevel') || 'normal'
  const surgeMultiplier = parseFloat(searchParams.get('surgeMultiplier') || '1')

  const center = { lat: (pickupLat + dropoffLat) / 2, lng: (pickupLng + dropoffLng) / 2 }

  const markers = [
    { lat: pickupLat, lng: pickupLng, type: 'pickup' as const, label: 'Điểm đón' },
    { lat: dropoffLat, lng: dropoffLng, type: 'dropoff' as const, label: 'Điểm đến' },
  ]

  const route = { pickup: { lat: pickupLat, lng: pickupLng }, dropoff: { lat: dropoffLat, lng: dropoffLng } }

  const handleConfirmBooking = async () => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/book/confirm')
      return
    }

    setIsLoading(true)

    try {
      const response = await bookingAPI.createBooking({
        pickupLocation: { lat: pickupLat, lng: pickupLng, address: pickupAddress },
        dropoffLocation: { lat: dropoffLat, lng: dropoffLng, address: dropoffAddress },
        vehicleType,
        distance,
        duration,
        note,
        paymentMethod,
      })

      router.push(`/booking/${response.data.id}/tracking`)
    } catch (error: any) {
      console.error('Booking error:', error)
      alert(error.response?.data?.message || 'Đặt xe thất bại, vui lòng thử lại')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container py-8">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeft className="w-4 h-4" /> Quay lại
      </button>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <h1 className="text-2xl font-bold mb-6">Xác nhận chuyến đi</h1>

          <Card className="p-6 mb-6">
            <h2 className="font-semibold mb-4">Thông tin chuyến đi</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0"><div className="w-2 h-2 bg-green-500 rounded-full" /></div>
                <div><p className="text-sm text-gray-500">Điểm đón</p><p className="font-medium">{pickupAddress}</p></div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0"><div className="w-2 h-2 bg-red-500 rounded-full" /></div>
                <div><p className="text-sm text-gray-500">Điểm đến</p><p className="font-medium">{dropoffAddress}</p></div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-600"><MapPin className="w-4 h-4" /><span>{formatDistance(distance * 1000)}</span></div>
              <div className="flex items-center gap-2 text-gray-600"><Clock className="w-4 h-4" /><span>{formatDuration(duration * 60)}</span></div>
            </div>
          </Card>

          <Card className="p-6 mb-6">
            <h2 className="font-semibold mb-4">Loại xe đã chọn</h2>
            <div className="flex items-center justify-between">
              <div><p className="font-medium text-lg">{vehicleName}</p><p className="text-sm text-gray-500">Tài xế đến trong 3-5 phút</p></div>
              <div className="text-2xl">🚗</div>
            </div>
            {surgeLevel !== 'normal' && (
              <div className="mt-3 p-3 bg-orange-50 rounded-lg flex items-center gap-2 text-orange-700">
                <Zap className="w-4 h-4" />
                <span className="text-sm">Giá cao điểm x{surgeMultiplier} - Nhu cầu đặt xe đang cao</span>
              </div>
            )}
          </Card>

          <Card className="p-6 mb-6">
            <h2 className="font-semibold mb-4">Phương thức thanh toán</h2>
            <div className="space-y-2">
              {[
                { value: 'cash', label: 'Tiền mặt', icon: Banknote },
                { value: 'card', label: 'Thẻ ngân hàng', icon: CreditCard },
                { value: 'wallet', label: 'Ví điện tử', icon: Wallet },
              ].map((method) => (
                <div key={method.value} onClick={() => setPaymentMethod(method.value as any)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all flex items-center gap-3 ${
                    paymentMethod === method.value ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <method.icon className="w-5 h-5" /><span className="font-medium">{method.label}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 mb-6">
            <h2 className="font-semibold mb-4">Ghi chú (không bắt buộc)</h2>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: Đón tại cổng chính..."
              className="w-full p-3 border rounded-lg resize-none" rows={3} />
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-600">Tổng cộng</span>
              <span className="text-2xl font-bold text-primary">{formatPrice(finalPrice)}</span>
            </div>
            <Button onClick={handleConfirmBooking} className="w-full h-12 text-base" disabled={isLoading}>
              {isLoading ? 'Đang xử lý...' : 'Xác nhận đặt xe'}
            </Button>
          </Card>
        </div>

        <div className="h-[600px] lg:h-auto sticky top-20">
          <MapContainer center={center} zoom={12} markers={markers} route={route} />
        </div>
      </div>
    </div>
  )
}

export default function ConfirmBookingPage() {
  return <Suspense fallback={<div className="container py-8">Loading...</div>}><ConfirmBookingContent /></Suspense>
}