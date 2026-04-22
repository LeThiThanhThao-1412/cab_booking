'use client'

import { useEffect } from 'react'  // 👈 Thêm useEffect
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Car, Menu, User, LogOut, History, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/store/auth.store'

export function Header() {
  const router = useRouter()
  const { user, isAuthenticated, logout, hydrate } = useAuthStore()
  
  // 👇 Hydrate auth state khi component mount
  useEffect(() => {
    hydrate()
  }, [])
  
  const handleLogout = async () => {
    await logout()
    router.push('/auth/login')
  }
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Car className="w-4 h-4 text-black" />
            </div>
            <span className="font-bold text-xl hidden sm:inline-block">
              Cab Booking
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm font-medium hover:text-primary">
              Trang chủ
            </Link>
            <Link href="/book" className="text-sm font-medium hover:text-primary">
              Đặt xe
            </Link>
            <Link href="/pricing" className="text-sm font-medium hover:text-primary">
              Bảng giá
            </Link>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-black font-medium">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  Thông tin cá nhân
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/history')}>
                  <History className="mr-2 h-4 w-4" />
                  Lịch sử chuyến đi
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Cài đặt
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => router.push('/auth/login')}>
                Đăng nhập
              </Button>
              <Button onClick={() => router.push('/auth/register')}>
                Đăng ký
              </Button>
            </div>
          )}
          
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}