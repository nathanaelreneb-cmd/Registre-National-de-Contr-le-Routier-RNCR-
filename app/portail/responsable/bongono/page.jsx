'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import dynamic from 'next/dynamic'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

// Map en dynamique pour éviter bug Next.js
const MapComponent = dynamic(() => import('./MapBongono'), { ssr: false })

export default function AdminBongono() {
  const [zones, setZones] = useState([])
  const [type, setType] = useState('danger')
  const [message, setMessage] = useState('')

  useEffect(() => { load() }, [])
  async function load() {
    const { data } = await supabase.from('bongono_zones').select('*').order('created_at', {ascending:false})
    if(data) setZones(data)
  }

  async function addZone(lat, lng) {
    if(!message) return alert('Écris le message du panneau')
    await supabase.from('bongono_zones').insert({ type, message, lat, lng, active: true })
    setMessage('')
    load()
    alert('Panneau créé! Les chauffeurs vont le voir')
  }

  return (
    <div style={{padding:15}}>
      <h2>🛡️ Admin Bongono</h2>
      <div style={{display:'flex', gap:8, marginBottom:10, flexWrap:'wrap'}}>
        <select value={type} onChange={e=>setType(e.target.value)} style={{padding:10}}>
          <option value="travaux">🚧 Travaux</option>
          <option value="accident">🚨 Accident</option>
          <option value="police">👮 Contrôle Police</option>
          <option value="danger">⚠️ Danger / Nid de poule</option>
          <option value="barree">🚫 Route Barrée</option>
          <option value="crime">🔴 Zone Crime - Braquage</option>
        </select>
        <input value={message} onChange={e=>setMessage(e.target.value)} placeholder="Ex: Contrôle à Bambeto" style={{padding:10, flex:1, minWidth:180}} />
      </div>
      <p style={{fontSize:12}}>Clique sur la carte pour poser le panneau</p>

      <MapComponent onMapClick={addZone} zones={zones} />

      <div style={{marginTop:15}}>
        {zones.map(z=>(
          <div key={z.id} style={{border:'1px solid #ddd', padding:8, borderRadius:8, marginBottom:6, display:'flex', justifyContent:'space-between'}}>
            <span><b>{z.type}</b>: {z.message}</span>
            <button onClick={async()=>{ await supabase.from('bongono_zones').delete().eq('id', z.id); load() }}>Supprimer</button>
          </div>
        ))}
      </div>
    </div>
  )
  }
