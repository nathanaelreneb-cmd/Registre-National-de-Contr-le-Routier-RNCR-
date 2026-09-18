'use client'
import { useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) { onMapClick(e.latlng.lat, e.latlng.lng) }
  })
  return null
}

export default function MapBongono({ onMapClick, zones }) {
  const [satellite, setSatellite] = useState(false)

  return (
    <>
      <div style={{marginBottom:8}}>
        <button onClick={()=>setSatellite(false)} style={{padding:8, background:!satellite? 'black':'#eee', color:!satellite?'white':'black', marginRight:5}}>🗺️ Plan</button>
        <button onClick={()=>setSatellite(true)} style={{padding:8, background: satellite? 'black':'#eee', color: satellite?'white':'black'}}>🛰️ Satellite</button>
      </div>
      <MapContainer center={[9.537, -13.678]} zoom={12} style={{height: '400px', borderRadius:12}}>
        <TileLayer url={satellite? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"} />
        <ClickHandler onMapClick={onMapClick} />
        {zones.map(z=>(
          <Marker key={z.id} position={[z.lat, z.lng]}>
            <Popup><b>{z.type}</b><br/>{z.message}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </>
  )
}
