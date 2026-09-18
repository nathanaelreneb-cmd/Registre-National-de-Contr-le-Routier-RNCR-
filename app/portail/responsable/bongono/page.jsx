'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import dynamic from 'next/dynamic'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const MapComponent = dynamic(() => import('./MapBongono'), { ssr: false })

export default function AdminBongono() {
  const [zones, setZones] = useState([])
  const [type, setType] = useState('danger')
  const [message, setMessage] = useState('')
  const [pos, setPos] = useState(null)

  useEffect(() => { load() }, [])
  async function load() {
    const { data } = await supabase.from('bongono_zones').select('*').order('created_at',{ascending:false})
    if(data) setZones(data)
  }

  async function confirmerPanneau(){
    if(!pos) return alert('Clique d’abord sur la carte')
    if(!message) return alert('Écris le message')
    const { error } = await supabase.from('bongono_zones').insert({ type, message, lat: pos.lat, lng: pos.lng, active:true })
    if(error) return alert(error.message)
    setMessage(''); setPos(null); load()
    alert('✅ Panneau posé!')
  }

  return (
    <div style={{padding:15}}>
      <h2>🛡️ Admin Bongono</h2>
      <div style={{display:'flex', gap:8, marginBottom:10, flexWrap:'wrap'}}>
        <select value={type} onChange={e=>setType(e.target.value)} style={{padding:10, borderRadius:8}}>
          <option value="travaux">🚧 Travaux</option>
          <option value="accident">🚨 Accident</option>
          <option value="police">👮 Contrôle Police</option>
          <option value="danger">⚠️ Danger</option>
          <option value="barree">🚫 Route Barrée</option>
          <option value="crime">🔴 Zone Crime</option>
        </select>
        <input value={message} onChange={e=>setMessage(e.target.value)} placeholder="Ex: Travaux de route" style={{padding:10, flex:1, borderRadius:8, border:'1px solid #999'}} />
      </div>
      {pos && (
        <div style={{background:'#e8f5e9', padding:10, borderRadius:8, marginBottom:10, border:'1px solid green'}}>
          📍 <b>{pos.lat.toFixed(6)}, {pos.lng.toFixed(6)}</b><br/>
          <button onClick={confirmerPanneau} style={{marginTop:8, padding:'12px', background:'green', color:'white', border:'none', borderRadius:8, width:'100%', fontWeight:'bold'}}>✅ CONFIRMER LE PANNEAU ICI</button>
        </div>
      )}
      <MapComponent onMapClick={(lat,lng)=>setPos({lat,lng})} zones={zones} selectedPos={pos} />
    </div>
  )
}
