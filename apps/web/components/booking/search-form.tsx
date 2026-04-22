'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, MapPin, Clock, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { LocationPicker } from '@/components/map/location-picker'
import { MapContainer } from '@/components/map/map-container'
import { pricingAPI, PriceBreakdown } from '@/lib/api/pricing'
import { calculateRoute } from '@/lib/geocoding/nominatim'
import { formatPrice, formatDistance, formatDuration } from '@/lib/utils'

interface Location {
  address: string
  lat: number
  lng: number
}

interface VehiclePrice {
  price: PriceBreakdown | null
  isLoading: boolean
}

const vehicleOptions = [
  { type: 'motobike' as const, name: 'Xe Máy', icon: '🛵', description: 'Nhanh chóng, tiết kiệm' },
  { type: 'car' as const, name: 'Xe 4 Chỗ', icon: '🚗', description: 'Thoải mái, riêng tư' },
  { type: 'car7' as const, name: 'Xe 7 Chỗ', icon: '🚐', description: 'Rộng rãi, gia đình' },
]

export function SearchForm() {
  const router = useRouter()
  const [pickup, setPickup] = useState<Location | null>(null)
  const [dropoff, setDropoff] = useState<Location | null>(null)
  const [mapCenter, setMapCenter] = useState({ lat: 10.762622, lng: 106.660172 })
  const [selectedVehicle, setSelectedVehicle] = useState<string>('car')
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null)
  const [vehiclePrices, setVehiclePrices] = useState<Record<string, VehiclePrice>>({})
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false)

  useEffect(() => {
    const calculateRouteInfo = async () => {
      if (!pickup || !dropoff) {
        setRouteInfo(null)
        setVehiclePrices({})
        return
      }

      setIsCalculatingRoute(true)
      
      try {
        const route = await calculateRoute(
          { lat: pickup.lat, lng: pickup.lng },
          { lat: dropoff.lat, lng: dropoff.lng }
        )
        
        if (route) {
          setRouteInfo({ distance: route.distance, duration: route.duration })
        }
      } catch (error) {
        console.error('Error calculating route:', error)
      } finally {
        setIsCalculatingRoute(false)
      }
    }

    calculateRouteInfo()
  }, [pickup, dropoff])

  useEffect(() => {
    const calculatePrices = async () => {
      if (!pickup || !dropoff || !routeInfo) {
        setVehiclePrices({})
        return
      }

      const newPrices: Record<string, VehiclePrice> = {}
      vehicleOptions.forEach(v => { newPrices[v.type] = { price: null, isLoading: true } })
      setVehiclePrices(newPrices)

      await Promise.all(
        vehicleOptions.map(async (vehicle) => {
          try {
            const response = await pricingAPI.calculatePrice({
              pickupLat: pickup.lat,
              pickupLng: pickup.lng,
              pickupAddress: pickup.address,
              dropoffLat: dropoff.lat,
              dropoffLng: dropoff.lng,
              dropoffAddress: dropoff.address,
              vehicleType: vehicle.type,
              distance: routeInfo.distance,
              duration: routeInfo.duration,
            })

            setVehiclePrices(prev => ({
              ...prev,
              [vehicle.type]: { price: response.data, isLoading: false }
            }))
          } catch (error) {
            console.error(`Error calculating price for ${vehicle.type}:`, error)
            setVehiclePrices(prev => ({
              ...prev,
              [vehicle.type]: { price: null, isLoading: false }
            }))
          }
        })
      )
    }

    calculatePrices()
  }, [pickup, dropoff, routeInfo])

  const markers = [
    ...(pickup ? [{ lat: pickup.lat, lng: pickup.lng, type: 'pickup' as const, label: 'Điểm đón' }] : []),
    ...(dropoff ? [{ lat: dropoff.lat, lng: dropoff.lng, type: 'dropoff' as const, label: 'Điểm đến' }] : []),
  ]

  const route = pickup && dropoff ? {
    pickup: { lat: pickup.lat, lng: pickup.lng },
    dropoff: { lat: dropoff.lat, lng: dropoff.lng },
  } : undefined

  const handleSearch = () => {
    if (!pickup || !dropoff) {
      alert('Vui lòng chọn điểm đón và điểm đến')
      return
    }

    const vehicle = vehicleOptions.find(v => v.type === selectedVehicle)
    const vehiclePrice = vehiclePrices[selectedVehicle]?.price

    if (!vehiclePrice) {
      alert('Đang tính giá, vui lòng đợi...')
      return
    }

    const params = new URLSearchParams({
      pickupLat: pickup.lat.toString(),
      pickupLng: pickup.lng.toString(),
      pickupAddress: pickup.address,
      dropoffLat: dropoff.lat.toString(),
      dropoffLng: dropoff.lng.toString(),
      dropoffAddress: dropoff.address,
      vehicleType: selectedVehicle,
      vehicleName: vehicle?.name || '',
      finalPrice: vehiclePrice.finalPrice.toString(),
      basePrice: vehiclePrice.basePrice.toString(),
      distance: vehiclePrice.distance.toString(),
      duration: vehiclePrice.estimatedDuration.toString(),
      surgeLevel: vehiclePrice.surgeLevel || 'normal',
      surgeMultiplier: vehiclePrice.surgeMultiplier.toString(),
    })

    router.push(`/book/confirm?${params.toString()}`)
  }

  const handlePickupChange = (location: Location) => {
    setPickup(location)
    setMapCenter({ lat: location.lat, lng: location.lng })
  }

  const getSurgeBadge = (price: PriceBreakdown) => {
    if (price.surgeLevel === 'normal' || price.surgeMultiplier <= 1) return null
    
    const colors: Record<string, string> = {
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-orange-100 text-orange-700',
      peak: 'bg-red-100 text-red-700',
    }
    
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${colors[price.surgeLevel] || colors.medium}`}>
        <Zap className="w-3 h-3 inline mr-1" />
        {price.surgeMultiplier}x
      </span>
    )
  }

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            Đặt xe dễ dàng, <br />
            <span className="text-primary">An toàn - Nhanh chóng</span>
          </h1>
          <p className="text-gray-600">Chỉ vài bước đơn giản để có ngay chuyến đi</p>
        </div>

        <Card className="p-6">
          <div className="space-y-6">
            <LocationPicker
              label="Điểm đón"
              placeholder="Bạn đang ở đâu?"
              value={pickup?.address}
              onChange={handlePickupChange}
            />

            <LocationPicker
              label="Điểm đến"
              placeholder="Bạn muốn đi đâu?"
              value={dropoff?.address}
              onChange={setDropoff}
            />

            {pickup && dropoff && routeInfo && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{formatDistance(routeInfo.distance)}</span>
                  <span className="mx-2">•</span>
                  <Clock className="w-4 h-4" />
                  <span>{formatDuration(routeInfo.duration)}</span>
                </div>
              </div>
            )}

            {pickup && dropoff && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">Chọn loại xe</label>
                <div className="space-y-2">
                  {vehicleOptions.map((vehicle) => {
                    const vehicleData = vehiclePrices[vehicle.type]
                    const price = vehicleData?.price
                    const isLoading = vehicleData?.isLoading || isCalculatingRoute
                    const isSelected = selectedVehicle === vehicle.type

                    return (
                      <div
                        key={vehicle.type}
                        onClick={() => !isLoading && price && setSelectedVehicle(vehicle.type)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          isLoading || !price
                            ? 'border-gray-200 opacity-60 cursor-not-allowed'
                            : isSelected
                            ? 'border-primary bg-primary/5 cursor-pointer'
                            : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{vehicle.icon}</span>
                            <div>
                              <div className="font-medium">{vehicle.name}</div>
                              <div className="text-sm text-gray-500">{vehicle.description}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            {isLoading ? (
                              <div className="text-sm text-gray-400">Đang tính...</div>
                            ) : price ? (
                              <>
                                <div className="text-xl font-bold text-primary">
                                  {formatPrice(price.finalPrice)}
                                </div>
                                <div className="flex items-center justify-end gap-1">
                                  {getSurgeBadge(price)}
                                </div>
                              </>
                            ) : (
                              <div className="text-sm text-red-400">Lỗi</div>
                            )}
                          </div>
                        </div>
                        {isSelected && price && (
                          <div className="mt-2 text-xs text-gray-500">
                            <div className="flex items-center gap-4">
                              <span>🚗 {price.distance} km</span>
                              <span>⏱️ {price.estimatedDuration} phút</span>
                            </div>
                            {price.surgeLevel !== 'normal' && price.breakdown.surgeReason && (
                              <div className="mt-1 text-orange-600">
                                ⚡ {price.breakdown.surgeReason}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <Button
              onClick={handleSearch}
              className="w-full h-12 text-base"
              disabled={!pickup || !dropoff || !routeInfo || !vehiclePrices[selectedVehicle]?.price || isCalculatingRoute}
            >
              {isCalculatingRoute ? 'Đang tính lộ trình...' : 'Tìm chuyến xe'}
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div><div className="text-2xl font-bold text-primary">24/7</div><div className="text-sm text-gray-600">Hỗ trợ</div></div>
          <div><div className="text-2xl font-bold text-primary">5★</div><div className="text-sm text-gray-600">Đánh giá</div></div>
          <div><div className="text-2xl font-bold text-primary">10k+</div><div className="text-sm text-gray-600">Tài xế</div></div>
        </div>
      </div>

      <div className="relative h-[600px] lg:h-auto rounded-lg overflow-hidden sticky top-20">
        <MapContainer
          center={mapCenter}
          zoom={12}
          markers={markers}
          route={route}
          onMapClick={(location) => {
            if (!pickup) {
              setPickup({ address: `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`, ...location })
            } else if (!dropoff) {
              setDropoff({ address: `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`, ...location })
            }
          }}
        />
      </div>
    </div>
  )
}