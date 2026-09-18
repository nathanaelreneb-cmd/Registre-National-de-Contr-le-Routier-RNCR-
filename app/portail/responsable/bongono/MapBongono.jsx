'use client'
import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

export default function MapBongono({ onMapClick, zones=[] }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)

  useEffect(() => {
    if (mapInstance.current) return
    let L
    (async () => {
      L = await import('leaflet')

      // Fix icône
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current).setView([9.537, -13.678], 13)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)
      map.on('click', (e) => {
        if(onMapClick) onMapClick(e.latlng.lat, e.latlng.lng)
      })
      mapInstance.current = map
    })()
  }, [])

  // Ajouter les panneaux existants
  useEffect(() => {
    if (!mapInstance.current ||!window.L) return
    const L = window.L
    zones.forEach(z => {
      L.marker([Number(z.lat), Number(z.lng)]).addTo(mapInstance.current).bindPopup(`<b>${z.type}</b><br/>${z.message}`)
    })
  }, [zones])

  return <div ref={mapRef} style={{height:'400px', width:'100%', borderRadius:12, border:'2px solid #ddd'}} />
}
