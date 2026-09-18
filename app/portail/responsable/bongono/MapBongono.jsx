'use client'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import L from 'leaflet'

// Fix icône cassée
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function ClickHandler({ onMapClick }){
  useMapEvents({
    click(e){ onMapClick(e.latlng.lat, e.latlng.lng) }
  })
  return null
}

export default function MapBongono({ onMapClick, zones }){
  return (
    <MapContainer center={[9.537, -13.678]} zoom={13} style={{height:'400px', width:'100%', borderRadius:10}}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ClickHandler onMapClick={onMapClick} />
      {zones && zones.map(z=>(
        <Marker key={z.id} position={[z.lat, z.lng]}>
          <Popup><b>{z.type}</b><br/>{z.message}</Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
