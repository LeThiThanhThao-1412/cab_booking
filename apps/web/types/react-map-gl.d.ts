declare module 'react-map-gl' {
  import * as React from 'react'
  
  export interface ViewState {
    longitude: number
    latitude: number
    zoom: number
    pitch?: number
    bearing?: number
    padding?: {
      top: number
      bottom: number
      left: number
      right: number
    }
  }
  
  export interface MapRef {
    getMap: () => any
    fitBounds: (bounds: [[number, number], [number, number]], options?: any) => void
    flyTo: (options: any) => void
    getCenter: () => { lng: number; lat: number }
    getZoom: () => number
  }
  
  export interface MapMouseEvent {
    lngLat: {
      lat: number
      lng: number
    }
    point: { x: number; y: number }
    originalEvent: Event
    target: any
    type: string
  }
  
  export interface MapProps {
    ref?: React.Ref<MapRef>
    longitude: number
    latitude: number
    zoom: number
    pitch?: number
    bearing?: number
    onMove?: (evt: { viewState: ViewState }) => void
    onClick?: (evt: MapMouseEvent) => void
    mapStyle?: any
    style?: React.CSSProperties
    interactive?: boolean
    attributionControl?: boolean
    children?: React.ReactNode
  }
  
  export const Map: React.FC<MapProps>
  
  export interface MarkerProps {
    longitude: number
    latitude: number
    anchor?: string
    offset?: [number, number]
    onClick?: (e: { originalEvent: Event }) => void
    children?: React.ReactNode
    style?: React.CSSProperties
    className?: string
  }
  
  export const Marker: React.FC<MarkerProps>
  
  export interface NavigationControlProps {
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
    visualizePitch?: boolean
    showCompass?: boolean
    showZoom?: boolean
  }
  
  export const NavigationControl: React.FC<NavigationControlProps>
  
  export interface GeolocateControlProps {
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
    fitBoundsOptions?: any
    trackUserLocation?: boolean
    showUserHeading?: boolean
    showAccuracyCircle?: boolean
  }
  
  export const GeolocateControl: React.FC<GeolocateControlProps>
  
  export interface SourceProps {
    id: string
    type: string
    data?: any
    url?: string
    tiles?: string[]
    tileSize?: number
    attribution?: string
    children?: React.ReactNode
  }
  
  export const Source: React.FC<SourceProps>
  
  export interface LayerProps {
    id: string
    type: string
    source?: string
    layout?: any
    paint?: any
    filter?: any[]
    minzoom?: number
    maxzoom?: number
    beforeId?: string
  }
  
  export const Layer: React.FC<LayerProps>
  
  // Default export
  const MapComponent: React.FC<MapProps>
  export default MapComponent
}

declare module 'maplibre-gl/dist/maplibre-gl.css' {
  const content: any
  export default content
}