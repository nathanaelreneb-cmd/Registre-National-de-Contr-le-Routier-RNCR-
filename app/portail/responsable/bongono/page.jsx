'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import dynamic from 'next/dynamic'

const MapComponent = dynamic(() => import('./MapBongono'), { ssr: false, loading: () => <p>Chargement carte...</p> })

export default function AdminBongono() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const [zones, setZones] = useState([])
  const [type, setType] = useState('travaux')
  const [message, setMessage] = useState('Travaux de route')
  const [pos, setPos] = useState(null)

  useEffect(() => { loadZones() }, [])

  async function loadZones() {
    const { data } = await supabase.from('bongono_zones').select('*').order('created_at', {ascending:false})
    if(data) setZones(data)
  }

  async function confirmer() {
    if(!pos) return alert('Clique sur la carte d’abord')
    if(!message) return alert('Mets une description')
    const { error } = await supabase.from('bongono_zones').insert({ 
      lat: pos.lat, lng: pos.lng, type, message, active: true 
    })
    if(error) return alert(error.message)
    setPos(null)
    loadZones()
    alert('✅ Panneau affiché sur la carte !')
  }

  return (
    <div style={{padding:12}}>
      <h3>🛡️ Admin Bongono</h3>
      <div style={{display:'flex', gap:6, marginBottom:10}}>
        <select value={type} onChange={e=>setType(e.target.value)} style={{padding:10, borderRadius:8}}>
          <option value="travaux">🚧 Travaux</option>
          <option value="accident">🚨 Accident</option>
          <option value="police">👮 Police</option>
          <option value="crime">🔴 Zone Crime - Braquage</option>
          <option value="danger">⚠️ Danger</option>
        </select>
        <input value={message} onChange={e=>setMessage(e.target.value)} style={{padding:10, flex:1, borderRadius:8}} placeholder="Description" />
      </div>

      {pos && (
        <div style={{background:'#e8f5e9', border:'1px solid green', padding:10, borderRadius:10, marginBottom:10}}>
          📍 <b>{pos.lat.toFixed(6)}, {pos.lng.toFixed(6)}</b><br/>
          📝 {type} : {message}<br/>
          <button onClick={confirmer} style={{marginTop:8, width:'100%', padding:12, background:'green', color:'white', border:'none', borderRadius:8, fontWeight:'bold'}}>✅ AFFICHER SUR LA CARTE</button>
        </div>
      )}

      <MapComponent onMapClick={(lat,lng)=>setPos({lat,lng})} zones={zones} selectedPos={pos} />
    </div>
  )
}
