'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Car, Mail, Lock, User, Phone, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/store/auth.store'

const registerSchema = z.object({
  fullName: z.string().min(2, 'Họ tên ít nhất 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  phone: z.string().regex(/^[0-9]{10,11}$/, 'Số điện thoại không hợp lệ (10-11 số)'),
  password: z.string()
    .min(8, 'Mật khẩu ít nhất 8 ký tự')
    .regex(/[A-Z]/, 'Mật khẩu phải có ít nhất 1 chữ hoa')
    .regex(/[a-z]/, 'Mật khẩu phải có ít nhất 1 chữ thường')
    .regex(/[0-9]/, 'Mật khẩu phải có ít nhất 1 số')
    .regex(/[^A-Za-z0-9]/, 'Mật khẩu phải có ít nhất 1 ký tự đặc biệt'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Mật khẩu không khớp',
  path: ['confirmPassword'],
})

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const { register: registerUser, isLoading, error, clearError } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })
  
  const onSubmit = async (data: RegisterForm) => {
    const { confirmPassword, ...registerData } = data
    const success = await registerUser({
      ...registerData,
      role: 'customer',
    })
    
    if (success) {
      router.push('/')
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 via-white to-green-50 px-4 py-8">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-yellow-400 rounded-2xl flex items-center justify-center shadow-lg">
              <Car className="w-10 h-10 text-black" />
            </div>
          </div>
          <div>
            <CardTitle className="text-3xl font-bold">Đăng ký tài khoản</CardTitle>
            <CardDescription className="text-base mt-2">
              Tạo tài khoản để bắt đầu đặt xe
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Họ và tên</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Nguyễn Văn A"
                  className="pl-10 h-11 border-2 focus:border-primary"
                  {...register('fullName')}
                  onChange={() => clearError()}
                />
              </div>
              {errors.fullName && (
                <p className="text-sm text-red-500 mt-1">{errors.fullName.message}</p>
              )}
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="email"
                  placeholder="example@email.com"
                  className="pl-10 h-11 border-2 focus:border-primary"
                  {...register('email')}
                  onChange={() => clearError()}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Số điện thoại</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="tel"
                  placeholder="0912345678"
                  className="pl-10 h-11 border-2 focus:border-primary"
                  {...register('phone')}
                  onChange={() => clearError()}
                />
              </div>
              {errors.phone && (
                <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>
              )}
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ít nhất 8 ký tự, có hoa, thường, số, đặc biệt"
                  className="pl-10 pr-10 h-11 border-2 focus:border-primary"
                  {...register('password')}
                  onChange={() => clearError()}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 hover:bg-gray-100 p-1 rounded"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-gray-500" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
              )}
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Xác nhận mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Nhập lại mật khẩu"
                  className="pl-10 pr-10 h-11 border-2 focus:border-primary"
                  {...register('confirmPassword')}
                  onChange={() => clearError()}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 hover:bg-gray-100 p-1 rounded"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4 text-gray-500" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-500 mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-11 text-base font-semibold bg-primary hover:bg-primary/90 text-black mt-6"
              disabled={isLoading}
            >
              {isLoading ? 'Đang đăng ký...' : 'Đăng ký'}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="flex justify-center pb-6">
          <p className="text-sm text-gray-600">
            Đã có tài khoản?{' '}
            <Link href="/auth/login" className="text-primary font-semibold hover:underline">
              Đăng nhập
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}