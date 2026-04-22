'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Map, { MapRef, Marker, NavigationControl, GeolocateControl, Source, Layer, ViewState } from 'react-map-gl/maplibre'
import type { MapMouseEvent } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

interface MapContainerProps {
  center?: { lat: number; lng: number }
  zoom?: number
  markers?: Array<{
    lat: number
    lng: number
    color?: string
    label?: string
    type?: 'pickup' | 'dropoff' | 'driver'
  }>
  route?: {
    pickup: { lat: number; lng: number }
    dropoff: { lat: number; lng: number }
    geometry?: any
  }
  onMapClick?: (location: { lat: number; lng: number }) => void
  onMarkerClick?: (index: number) => void
  height?: string
  interactive?: boolean
}

const defaultCenter = { lat: 10.762622, lng: 106.660172 }

const mapStyle = {
  version: 8,
  sources: {
    osm: {
      type: 'raster' as const,
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster' as const,
      source: 'osm',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
}

const routeLayerStyle = {
  id: 'route',
  type: 'line' as const,
  layout: {
    'line-join': 'round' as const,
    'line-cap': 'round' as const,
  },
  paint: {
    'line-color': '#FFD700',
    'line-width': 4,
    'line-opacity': 0.8,
  },
}

export function MapContainer({
  center = defaultCenter,
  zoom = 13,
  markers = [],
  route,
  onMapClick,
  onMarkerClick,
  height = '100%',
  interactive = true,
}: MapContainerProps) {
  const mapRef = useRef<MapRef>(null)
  const [viewState, setViewState] = useState({
    longitude: center.lng,
    latitude: center.lat,
    zoom: zoom,
  })

  useEffect(() => {
    setViewState({
      longitude: center.lng,
      latitude: center.lat,
      zoom: zoom,
    })
  }, [center.lng, center.lat, zoom])

  const handleMapClick = useCallback(
    (event: MapMouseEvent) => {
      if (!interactive || !onMapClick) return
      
      onMapClick({
        lat: event.lngLat.lat,
        lng: event.lngLat.lng,
      })
    },
    [interactive, onMapClick]
  )

  useEffect(() => {
    if (route && mapRef.current) {
      const bounds: [[number, number], [number, number]] = [
        [route.pickup.lng, route.pickup.lat],
        [route.dropoff.lng, route.dropoff.lat],
      ]
      
      mapRef.current.fitBounds(bounds, {
        padding: 50,
        duration: 1000,
      })
    }
  }, [route])

  const getMarkerColor = (type?: string) => {
    switch (type) {
      case 'pickup':
        return '#22c55e'
      case 'dropoff':
        return '#ef4444'
      case 'driver':
        return '#3b82f6'
      default:
        return '#FFD700'
    }
  }

  return (
    <Map
      ref={mapRef}
      {...viewState}
      onMove={(evt: { viewState: ViewState }) => setViewState(evt.viewState)}
      onClick={handleMapClick}
      mapStyle={mapStyle as any}
      style={{ width: '100%', height }}
      interactive={interactive}
      attributionControl={true}
    >
      <NavigationControl position="top-right" />
      <GeolocateControl position="top-right" />

      {route && route.geometry && (
        <Source id="route-source" type="geojson" data={route.geometry}>
          <Layer {...routeLayerStyle as any} />
        </Source>
      )}

      {route && !route.geometry && (
        <Source
          id="route-line"
          type="geojson"
          data={{
            type: 'Feature' as const,
            properties: {},
            geometry: {
              type: 'LineString' as const,
              coordinates: [
                [route.pickup.lng, route.pickup.lat],
                [route.dropoff.lng, route.dropoff.lat],
              ],
            },
          }}
        >
          <Layer
            id="route-line-layer"
            type="line"
            layout={{ 'line-join': 'round' as const, 'line-cap': 'round' as const }}
            paint={{
              'line-color': '#FFD700',
              'line-width': 4,
              'line-opacity': 0.6,
              'line-dasharray': [2, 2],
            }}
          />
        </Source>
      )}

      {markers.map((marker, index) => (
        <Marker
          key={index}
          longitude={marker.lng}
          latitude={marker.lat}
          anchor="bottom"
          onClick={(e: { originalEvent: Event }) => {
            e.originalEvent.stopPropagation()
            onMarkerClick?.(index)
          }}
        >
          <div className="relative cursor-pointer">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-white"
              style={{ backgroundColor: marker.color || getMarkerColor(marker.type) }}
            >
              {marker.type === 'driver' && <span className="text-white text-xs">🚗</span>}
              {marker.type === 'pickup' && <span className="text-white text-xs">📍</span>}
              {marker.type === 'dropoff' && <span className="text-white text-xs">🎯</span>}
            </div>
            
            {marker.label && (
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                <span className="bg-white px-2 py-1 rounded shadow text-xs font-medium">
                  {marker.label}
                </span>
              </div>
            )}
            
            {marker.type === 'driver' && (
              <div className="absolute inset-0 w-6 h-6 rounded-full bg-blue-500 animate-ping opacity-30" />
            )}
          </div>
        </Marker>
      ))}
    </Map>
  )
}