'use client'

import { useState } from 'react'
import { Ticket, X, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { paymentAPI, ApplyCouponResponse } from '@/lib/api/payment'
import { formatPrice } from '@/lib/utils'

interface CouponInputProps {
  amount: number
  onCouponApplied: (discount: number, finalAmount: number, couponCode: string) => void
  onCouponRemoved: () => void
  className?: string
}

export function CouponInput({ 
  amount, 
  onCouponApplied, 
  onCouponRemoved, 
  className = '' 
}: CouponInputProps) {
  const [couponCode, setCouponCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [appliedCoupon, setAppliedCoupon] = useState<ApplyCouponResponse | null>(null)

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setError('Vui lòng nhập mã giảm giá')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await paymentAPI.applyCoupon({
        couponCode: couponCode.trim().toUpperCase(),
        amount,
      })

      const data = response.data

      // Kiểm tra điều kiện đơn hàng tối thiểu
      if (data.minOrderValue && amount < data.minOrderValue) {
        setError(`Đơn hàng tối thiểu ${formatPrice(data.minOrderValue)} để sử dụng mã này`)
        return
      }

      setAppliedCoupon(data)
      onCouponApplied(data.discount, data.finalAmount, couponCode.trim().toUpperCase())
      setCouponCode('')
    } catch (err: any) {
      const message = err.response?.data?.message || 'Mã giảm giá không hợp lệ'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponCode('')
    setError(null)
    onCouponRemoved()
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {!appliedCoupon ? (
        <>
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Ticket className="w-4 h-4" />
            Mã giảm giá
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value.toUpperCase())
                  setError(null)
                }}
                placeholder="Nhập mã giảm giá"
                className="pr-8 uppercase"
                disabled={isLoading}
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
              disabled={!couponCode.trim() || isLoading}
              variant="outline"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Áp dụng'
              )}
            </Button>
          </div>
          {error && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <span>⚠️</span> {error}
            </p>
          )}
        </>
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
    </div>
  )
}