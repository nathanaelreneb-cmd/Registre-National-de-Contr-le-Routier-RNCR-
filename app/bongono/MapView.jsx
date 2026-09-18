'use client'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { useEffect, useState } from 'react'
import 'leaflet/dist/leaflet.css'

function distance(lat1, lon1, lat2, lon2) {
  const R = 6371e3
  const dLat = (lat2-lat1)*Math.PI/180
  const dLon = (lon2-lon1)*Math.PI/180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export default function MapView({ zones, active, parler }) {
  const [pos, setPos] = useState([9.537, -13.678])
  const [sat, setSat] = useState(false)
  const [alerted, setAlerted] = useState({})

  useEffect(()=>{
    if(!active) return
    const watch = navigator.geolocation.watchPosition(p=>{
      const cur = [p.coords.latitude, p.coords.longitude]
      setPos(cur)
      zones.forEach(z=>{
        const d = distance(cur[0], cur[1], z.lat, z.lng)
        if(d < 300 &&!alerted[z.id]) {
          parler(`Bongono : Attention ${z.type} à ${Math.round(d)} mètres, ${z.message}`)
          setAlerted(a=>({...a, [z.id]:true}))
          setTimeout(()=> setAlerted(a=>{ const n={...a}; delete n[z.id]; return n}), 60000)
        }
      })
    })
    return ()=> navigator.geolocation.clearWatch(watch)
  }, [active, zones])

  return (
    <>
      <div style={{margin:'10px 0'}}>
        <button onClick={()=>setSat(false)} style={{padding:6, background:!sat?'black':'#eee', color:!sat?'white':'black', marginRight:5}}>Plan</button>
        <button onClick={()=>setSat(true)} style={{padding:6, background: sat?'black':'#eee', color:sat?'white':'black'}}>Satellite</button>
      </div>
      <MapContainer center={pos} zoom={14} style={{height:'450px', borderRadius:12}}>
        <TileLayer url={sat? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"} />
        <Marker position={pos}><Popup>Toi ici</Popup></Marker>
        {zones.map(z=>(
          <Marker key={z.id} position={[z.lat, z.lng]}><Popup><b>{z.type}</b><br/>{z.message}</Popup></Marker>
        ))}
      </MapContainer>
    </>
  )
        }
