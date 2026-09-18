'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function PageBongonoAdmin() {
  const [zones, setZones] = useState([])
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')
  const [message, setMessage] = useState('')
  const [ville, setVille] = useState('Conakry')
  const [type, setType] = useState('pont')

  useEffect(() => { chargerZones() }, [])

  async function chargerZones() {
    const { data } = await supabase.from('bongono_zones').select('*').order('created_at', { ascending: false })
    if (data) setZones(data)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const { error } = await supabase.from('bongono_zones').insert([{ 
      lat: parseFloat(lat), 
      lon: parseFloat(lon), 
      message, ville, type 
    }])
    if (error) alert(error.message)
    else { setLat(''); setLon(''); setMessage(''); chargerZones(); alert('Zone ajoutée!') }
  }

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 'bold' }}>BONGONO Admin</h1>
      <form onSubmit={handleSubmit} style={{ background: '#f5f5f5', padding: 15, borderRadius: 10, marginTop: 15 }}>
        <input placeholder="Latitude ex: 9.5370" value={lat} onChange={e=>setLat(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 8 }} />
        <input placeholder="Longitude ex: -13.6785" value={lon} onChange={e=>setLon(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 8 }} />
        <input placeholder="Message ex: Pont troué ralentir" value={message} onChange={e=>setMessage(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 8 }} />
        <input placeholder="Ville" value={ville} onChange={e=>setVille(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 8 }} />
        <select value={type} onChange={e=>setType(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 8 }}>
          <option value="pont">pont</option><option value="virage">virage</option><option value="village">village</option><option value="dos_dane">dos_dane</option>
        </select>
        <button type="submit" style={{ marginTop: 12, background: 'black', color: 'white', padding: '10px 15px', borderRadius: 8, width: '100%' }}>Ajouter la zone</button>
      </form>
      <h3 style={{ marginTop: 20 }}>Zones ({zones.length})</h3>
      {zones.map(z => <div key={z.id} style={{ border: '1px solid #ddd', padding: 8, borderRadius: 8, marginTop: 8 }}><b>{z.type}</b> - {z.ville} - {z.message}<br/><small>{z.lat}, {z.lon}</small></div>)}
    </div>
  )
  }
