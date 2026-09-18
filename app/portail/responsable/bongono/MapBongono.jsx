'use client'
import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

export default function MapBongono({ onMapClick, zones = [], selectedPos = null }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef([])
  const tempMarkerRef = useRef(null)

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const L = require('leaflet')
    // Fix icône
    delete L.Icon.Default.prototype._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })

    const map = L.map(mapRef.current).setView([9.5, -13.6], 7)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)

    map.on('click', (e) => {
      if(onMapClick) onMapClick(e.latlng.lat, e.latlng.lng)
    })

    mapInstance.current = map
    return () => { map.remove(); mapInstance.current = null }
  }, [])

  // AFFICHE LES ZONES DÉJÀ ENREGISTRÉES
  useEffect(() => {
    if(!mapInstance.current) return
    const L = require('leaflet')
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    zones.forEach(z => {
      const m = L.marker([z.lat, z.lng]).addTo(mapInstance.current)
      m.bindPopup(`<b>${z.type}</b><br/>${z.message}`)
      markersRef.current.push(m)
    })
  }, [zones])

  // QUAND TU CLIQUES OU GPS, LA CARTE VOLE JUSQU'À LA POSITION
  useEffect(() => {
    if(!mapInstance.current ||!selectedPos) return
    const L = require('leaflet')

    // 1. La carte vole et zoom sur toi
    mapInstance.current.flyTo([selectedPos.lat, selectedPos.lng], 16, { duration: 1.5 })

    // 2. On enlève l'ancien marqueur temporaire
    if(tempMarkerRef.current) tempMarkerRef.current.remove()

    // 3. On met un gros marqueur vert là où tu as cliqué
    const greenIcon = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    })

    tempMarkerRef.current = L.marker([selectedPos.lat, selectedPos.lng], {icon: greenIcon})
     .addTo(mapInstance.current)
     .bindPopup("📍 Nouvelle position ici")
     .openPopup()
  }, [selectedPos])

  return <div ref={mapRef} style={{ height: '500px', width: '100%', borderRadius: '10px', zIndex: 0 }} />
}
