export interface NominatimResult {
  place_id: number
  licence: string
  osm_type: string
  osm_id: number
  lat: string
  lon: string
  display_name: string
  address: {
    road?: string
    suburb?: string
    city?: string
    county?: string
    state?: string
    postcode?: string
    country?: string
    country_code?: string
  }
  boundingbox: [string, string, string, string]
}

export interface GeocodeResult {
  address: string
  lat: number
  lng: number
}

const geocodeCache = new Map<string, GeocodeResult>()
const reverseGeocodeCache = new Map<string, GeocodeResult>()

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (geocodeCache.has(address)) {
    return geocodeCache.get(address)!
  }

  try {
    await delay(1000)
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=vn`
    
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'vi',
        'User-Agent': 'CabBookingApp/1.0',
      },
    })

    const data: NominatimResult[] = await response.json()

    if (data.length === 0) {
      return null
    }

    const result: GeocodeResult = {
      address: data[0].display_name,
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    }

    geocodeCache.set(address, result)
    return result
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null> {
  const cacheKey = `${lat},${lng}`
  
  if (reverseGeocodeCache.has(cacheKey)) {
    return reverseGeocodeCache.get(cacheKey)!
  }

  try {
    await delay(1000)
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'vi',
        'User-Agent': 'CabBookingApp/1.0',
      },
    })

    const data = await response.json()

    if (!data || data.error) {
      return null
    }

    const result: GeocodeResult = {
      address: data.display_name,
      lat: parseFloat(data.lat),
      lng: parseFloat(data.lon),
    }

    reverseGeocodeCache.set(cacheKey, result)
    return result
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return null
  }
}

export async function searchPlaces(query: string): Promise<GeocodeResult[]> {
  if (query.length < 3) {
    return []
  }

  try {
    await delay(500)
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=vn`
    
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'vi',
        'User-Agent': 'CabBookingApp/1.0',
      },
    })

    const data: NominatimResult[] = await response.json()

    return data.map(item => ({
      address: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }))
  } catch (error) {
    console.error('Search places error:', error)
    return []
  }
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

export async function calculateRoute(
  pickup: { lat: number; lng: number },
  dropoff: { lat: number; lng: number }
): Promise<{
  distance: number
  duration: number
  geometry: any
} | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?overview=full&geometries=geojson`
    
    const response = await fetch(url)
    const data = await response.json()

    if (data.code !== 'Ok' || !data.routes?.[0]) {
      const straightDistance = calculateDistance(
        pickup.lat,
        pickup.lng,
        dropoff.lat,
        dropoff.lng
      )
      
      return {
        distance: straightDistance * 1.4,
        duration: (straightDistance * 1.4) / 8,
        geometry: null,
      }
    }

    const route = data.routes[0]
    
    return {
      distance: route.distance,
      duration: route.duration,
      geometry: route.geometry,
    }
  } catch (error) {
    console.error('Route calculation error:', error)
    
    const straightDistance = calculateDistance(
      pickup.lat,
      pickup.lng,
      dropoff.lat,
      dropoff.lng
    )
    
    return {
      distance: straightDistance * 1.4,
      duration: (straightDistance * 1.4) / 8,
      geometry: null,
    }
  }
}