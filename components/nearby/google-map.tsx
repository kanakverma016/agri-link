'use client'

import { useEffect, useRef, useState } from 'react'
import type { Category, Place } from '@/lib/nearby'

type LatLng = { lat: number; lng: number }

const ICON_COLORS: Record<Category, string> = { mandi: '#16a34a', storage: '#2563eb', shop: '#ca8a04' }

let mapsPromise: Promise<void> | null = null
function loadGoogleMaps(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.google?.maps) return Promise.resolve()
  if (mapsPromise) return mapsPromise
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!key) return Promise.reject(new Error('Google Maps is not configured (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY).'))
  mapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly`
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      mapsPromise = null
      reject(new Error('Failed to load Google Maps.'))
    }
    document.head.appendChild(script)
  })
  return mapsPromise
}

export type RouteRequest = { id: number; lat: number; lng: number }

export function GoogleMap({
  places,
  category,
  center,
  prices,
  cropName,
  route,
  onRouteResult,
  onBookTruck,
  onError,
}: {
  places: (Place & { distance: number })[]
  category: Category
  center: LatLng
  prices: Record<string, number>
  cropName: string
  route: RouteRequest | null
  onRouteResult: (ok: boolean, message?: string) => void
  onBookTruck: (name: string) => void
  onError: (message: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const infoRef = useRef<google.maps.InfoWindow | null>(null)
  const userMarkerRef = useRef<google.maps.Marker | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const servicesRef = useRef<{ service: google.maps.DirectionsService; renderer: google.maps.DirectionsRenderer } | null>(null)
  const [ready, setReady] = useState(false)
  const callbacks = useRef({ onBookTruck, onRouteResult, onError })
  const routeActive = useRef(false)
  const centerRef = useRef(center)

  useEffect(() => {
    callbacks.current = { onBookTruck, onRouteResult, onError }
  })
  useEffect(() => {
    centerRef.current = center
  }, [center])

  useEffect(() => {
    let cancelled = false
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current) return
        const map = new google.maps.Map(containerRef.current, {
          center: centerRef.current,
          zoom: 12,
          disableDefaultUI: true,
          zoomControl: true,
        })
        const renderer = new google.maps.DirectionsRenderer()
        renderer.setMap(map)
        mapRef.current = map
        infoRef.current = new google.maps.InfoWindow()
        servicesRef.current = { service: new google.maps.DirectionsService(), renderer }
        setReady(true)
      })
      .catch((e: Error) => callbacks.current.onError(e.message))
    return () => {
      cancelled = true
    }
  }, [])

  // user marker + recenter
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    map.setCenter(center)
    userMarkerRef.current?.setMap(null)
    userMarkerRef.current = new google.maps.Marker({
      position: center,
      map,
      title: 'Your Location',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#3b82f6',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
      },
    })
  }, [ready, center])

  // place markers for current category
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []
    servicesRef.current?.renderer.setDirections({ routes: [] } as unknown as google.maps.DirectionsResult)
    routeActive.current = false
    userMarkerRef.current?.setVisible(true)

    places
      .filter((p) => p.category === category)
      .forEach((p) => {
        const marker = new google.maps.Marker({
          position: { lat: p.lat, lng: p.lng },
          map,
          title: p.name,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: ICON_COLORS[p.category],
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        })
        marker.addListener('click', () => {
          const root = document.createElement('div')
          root.style.cssText = 'padding:12px;width:230px'
          const h = document.createElement('h3')
          h.textContent = p.name
          h.style.cssText = 'font-size:1.05rem;font-weight:700;color:#1f2937;margin-bottom:4px'
          root.appendChild(h)
          const line = (text: string, style = '') => {
            const el = document.createElement('p')
            el.textContent = text
            el.style.cssText = `font-size:.875rem;color:#4b5563;margin-bottom:2px;${style}`
            root.appendChild(el)
          }
          line(`Distance: ${p.distance.toFixed(1)} km away`)
          if (p.category === 'mandi') {
            const price = prices[p.name.toLowerCase()]
            if (price) line(`Price (${cropName}): ₹${price}/kg`, 'font-weight:600;color:#16a34a')
            else line("Price: Visit 'Live Prices' tab first", 'font-style:italic;color:#6b7280')
          } else if (p.category === 'storage') {
            line(`Timings: ${p.timings}`)
          }
          const actions = document.createElement('div')
          actions.style.cssText = 'display:flex;gap:8px;margin-top:12px;border-top:1px solid #f3f4f6;padding-top:12px'
          const btn = (label: string, bg: string, color: string, onClick: () => void) => {
            const b = document.createElement('button')
            b.type = 'button'
            b.textContent = label
            b.style.cssText = `flex:1;padding:8px 12px;font-size:.875rem;font-weight:600;border-radius:8px;border:none;cursor:pointer;background:${bg};color:${color}`
            b.addEventListener('click', onClick)
            actions.appendChild(b)
          }
          btn('Directions', '#f0fdf4', '#15803d', () => directionsTo(p.lat, p.lng))
          btn('Book Truck', '#16a34a', '#ffffff', () => callbacks.current.onBookTruck(p.name))
          root.appendChild(actions)
          infoRef.current?.close()
          infoRef.current?.setContent(root)
          infoRef.current?.open(map, marker)
        })
        markersRef.current.push(marker)
      })

    function directionsTo(lat: number, lng: number) {
      const svc = servicesRef.current
      if (!svc) return
      svc.service.route(
        { origin: centerRef.current, destination: { lat, lng }, travelMode: google.maps.TravelMode.DRIVING },
        (res, status) => {
          if (status === 'OK' && res) {
            infoRef.current?.close()
            markersRef.current.forEach((m) => m.setVisible(false))
            userMarkerRef.current?.setVisible(false)
            svc.renderer.setDirections(res)
            routeActive.current = true
            callbacks.current.onRouteResult(true)
          } else {
            callbacks.current.onRouteResult(false, `Directions request failed: ${status}`)
          }
        },
      )
    }
  }, [ready, places, category, prices, cropName])

  // route requested from list cards
  useEffect(() => {
    const svc = servicesRef.current
    if (!ready || !route || !svc) return
    svc.service.route(
      { origin: centerRef.current, destination: { lat: route.lat, lng: route.lng }, travelMode: google.maps.TravelMode.DRIVING },
      (res, status) => {
        if (status === 'OK' && res) {
          infoRef.current?.close()
          markersRef.current.forEach((m) => m.setVisible(false))
          userMarkerRef.current?.setVisible(false)
          svc.renderer.setDirections(res)
          routeActive.current = true
          callbacks.current.onRouteResult(true)
        } else {
          callbacks.current.onRouteResult(false, `Directions request failed: ${status}`)
        }
      },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.id, ready])

  return <div ref={containerRef} className="h-[450px] w-full rounded-2xl bg-gray-100" role="region" aria-label="Map of nearby places" />
}
