'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin, Navigation, X, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { searchPlaces, reverseGeocode, GeocodeResult } from '@/lib/geocoding/nominatim'

interface LocationPickerProps {
  label: string
  placeholder: string
  value?: string
  onChange?: (location: { address: string; lat: number; lng: number }) => void
  onUseCurrentLocation?: () => void
  className?: string
}

export function LocationPicker({
  label,
  placeholder,
  value = '',
  onChange,
  onUseCurrentLocation,
  className = '',
}: LocationPickerProps) {
  const [inputValue, setInputValue] = useState(value)
  const [isFocused, setIsFocused] = useState(false)
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value)
    }
  }, [value])

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (inputValue.length >= 3 && isFocused) {
      searchTimeoutRef.current = setTimeout(async () => {
        setIsSearching(true)
        const results = await searchPlaces(inputValue)
        setSuggestions(results)
        setIsSearching(false)
      }, 500)
    } else {
      setSuggestions([])
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [inputValue, isFocused])

  const handleSelect = (result: GeocodeResult) => {
    setInputValue(result.address)
    setSuggestions([])
    setIsFocused(false)
    onChange?.(result)
  }

  const handleClear = () => {
    setInputValue('')
    setSuggestions([])
  }

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Trình duyệt không hỗ trợ định vị')
      return
    }

    setIsGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        const result = await reverseGeocode(latitude, longitude)
        
        if (result) {
          setInputValue(result.address)
          onChange?.(result)
        } else {
          const fallbackResult = {
            address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            lat: latitude,
            lng: longitude,
          }
          setInputValue(fallbackResult.address)
          onChange?.(fallbackResult)
        }

        setIsGettingLocation(false)
        onUseCurrentLocation?.()
      },
      (error) => {
        console.error('Error getting location:', error)
        alert('Không thể lấy vị trí hiện tại')
        setIsGettingLocation(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div className={`relative ${className}`}>
      <label className="text-sm font-medium mb-1.5 block text-gray-700">
        {label}
      </label>

      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          </div>
        )}
        {!isSearching && inputValue && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2"
          >
            <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      <button
        onClick={handleUseCurrentLocation}
        disabled={isGettingLocation}
        className="mt-2 text-sm text-primary flex items-center gap-1 hover:underline disabled:opacity-50"
      >
        {isGettingLocation ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            Đang lấy vị trí...
          </>
        ) : (
          <>
            <Navigation className="w-3 h-3" />
            Sử dụng vị trí hiện tại
          </>
        )}
      </button>

      {isFocused && suggestions.length > 0 && (
        <Card className="absolute z-50 w-full mt-1 max-h-64 overflow-y-auto">
          <ul className="py-1">
            {suggestions.map((suggestion, index) => (
              <li
                key={index}
                onClick={() => handleSelect(suggestion)}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
              >
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{suggestion.address}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}