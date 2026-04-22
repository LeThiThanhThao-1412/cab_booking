
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(price)
}

export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`
  }
  return `${(meters / 1000).toFixed(1)}km`
}

export const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${Math.round(seconds)} giây`
  }
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes} phút`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours} giờ ${remainingMinutes} phút`
}

export const formatDateTime = (date: string | Date): string => {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}