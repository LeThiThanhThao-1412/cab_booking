'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  CreditCard, 
  Clock, 
  Shield, 
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { bookingAPI, PaymentUrlResponse } from '@/lib/api/booking'
import { formatPrice } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'

type PaymentStatus = 'loading' | 'ready' | 'processing' | 'completed' | 'failed' | 'expired'

export default function PaymentPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  
  const bookingId = params.bookingId as string
  
  const [status, setStatus] = useState<PaymentStatus>('loading')
  const [paymentData, setPaymentData] = useState<PaymentUrlResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number>(0)
  const [isPolling, setIsPolling] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(`/auth/login?redirect=/payment/${bookingId}`)
      return
    }

    loadPaymentUrl()
  }, [bookingId, isAuthenticated, router])

  useEffect(() => {
    if (!paymentData?.expiresAt) return

    const expiryTime = new Date(paymentData.expiresAt).getTime()
    
    const timer = setInterval(() => {
      const now = Date.now()
      const remaining = Math.max(0, Math.floor((expiryTime - now) / 1000))
      
      setCountdown(remaining)
      
      if (remaining === 0) {
        setStatus('expired')
        clearInterval(timer)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [paymentData])

  useEffect(() => {
    if (status !== 'processing' || isPolling) return

    setIsPolling(true)
    
    const interval = setInterval(async () => {
      try {
        const response = await bookingAPI.checkPaymentStatus(bookingId)
        
        if (response.data.status === 'completed') {
          setStatus('completed')
          clearInterval(interval)
          
          setTimeout(() => {
            router.push(`/booking/${bookingId}/tracking`)
          }, 2000)
        } else if (response.data.status === 'failed') {
          setStatus('failed')
          setError('Thanh toán thất bại, vui lòng thử lại')
          clearInterval(interval)
        }
      } catch (error) {
        console.error('Poll error:', error)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [status, bookingId, router, isPolling])

  const loadPaymentUrl = async () => {
    try {
      setStatus('loading')
      const response = await bookingAPI.getPaymentUrl(bookingId)
      setPaymentData(response.data)
      setStatus('ready')
    } catch (error: any) {
      setError(error.response?.data?.message || 'Không thể tạo thanh toán')
      setStatus('failed')
    }
  }

  const handleProceedToPayment = () => {
    if (!paymentData?.paymentUrl) return
    
    setStatus('processing')
    window.open(paymentData.paymentUrl, '_blank')
  }

  const handleRetry = () => {
    loadPaymentUrl()
  }

  const handleCancel = async () => {
    if (confirm('Bạn có chắc muốn hủy thanh toán?')) {
      router.push(`/booking/${bookingId}/tracking`)
    }
  }

  const formatCountdown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">Đang tạo thanh toán...</p>
        </div>
      </div>
    )
  }

  if (status === 'failed' || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md w-full p-8 text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Thanh toán thất bại</h1>
          <p className="text-gray-600 mb-6">{error || 'Đã có lỗi xảy ra'}</p>
          <div className="space-y-3">
            <Button onClick={handleRetry} className="w-full">
              Thử lại
            </Button>
            <Button onClick={handleCancel} variant="outline" className="w-full">
              Hủy thanh toán
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md w-full p-8 text-center">
          <Clock className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Hết thời gian thanh toán</h1>
          <p className="text-gray-600 mb-6">
            Thời gian thanh toán đã hết hạn. Vui lòng tạo lại giao dịch mới.
          </p>
          <div className="space-y-3">
            <Button onClick={handleRetry} className="w-full">
              Tạo lại thanh toán
            </Button>
            <Button onClick={handleCancel} variant="outline" className="w-full">
              Quay lại
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (status === 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md w-full p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Thanh toán thành công!</h1>
          <p className="text-gray-600 mb-6">
            Cảm ơn bạn đã thanh toán. Đang chuyển đến trang theo dõi chuyến đi...
          </p>
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container max-w-2xl">
        <div className="mb-6">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại
          </button>
        </div>

        <Card className="p-8">
          <h1 className="text-2xl font-bold text-center mb-6">
            Thanh toán chuyến đi
          </h1>

          <div className="text-center mb-8">
            <p className="text-sm text-gray-500 mb-2">Số tiền cần thanh toán</p>
            <p className="text-4xl font-bold text-primary">
              {formatPrice(paymentData?.amount || 0)}
            </p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="p-4 bg-primary/5 border-2 border-primary rounded-lg">
              <div className="flex items-center gap-3">
                <CreditCard className="w-6 h-6 text-primary" />
                <div>
                  <p className="font-medium">Thanh toán qua thẻ/Cổng thanh toán</p>
                  <p className="text-sm text-gray-500">
                    Bạn sẽ được chuyển đến cổng thanh toán an toàn
                  </p>
                </div>
              </div>
            </div>
          </div>

          {countdown > 0 && (
            <div className="flex items-center justify-center gap-2 mb-6 text-orange-600">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">
                Còn {formatCountdown(countdown)} để hoàn tất thanh toán
              </span>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 mb-6 text-sm text-gray-500">
            <Shield className="w-4 h-4" />
            <span>Thanh toán an toàn & bảo mật</span>
          </div>

          <Button
            onClick={handleProceedToPayment}
            className="w-full h-12 text-base mb-4"
          >
            Tiến hành thanh toán
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>

          <Button
            onClick={handleCancel}
            variant="outline"
            className="w-full"
          >
            Thanh toán sau (Tiền mặt)
          </Button>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Lưu ý:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Sau khi thanh toán, bạn sẽ được chuyển hướng về ứng dụng</li>
                  <li>Nếu thanh toán thành công nhưng chưa được ghi nhận, vui lòng đợi vài phút</li>
                  <li>Mọi thắc mắc vui lòng liên hệ hotline 1900 1234</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}