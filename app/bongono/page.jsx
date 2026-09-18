'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Page() {
  const [zones, setZones] = useState([])
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')
  const [message, setMessage] = useState('')
  const [ville, setVille] = useState('Conakry')
  const [type, setType] = useState('pont')

  useEffect(() => { load() }, [])
  async function load() {
    const { data } = await supabase.from('bongono_zones').select('*').order('created_at', { ascending: false })
    if (data) setZones(data)
  }
  async function submit(e) {
    e.preventDefault()
    const { error } = await supabase.from('bongono_zones').insert([{ lat: parseFloat(lat), lon: parseFloat(lon), message, ville, type }])
    if (error) alert('Erreur: ' + error.message)
    else { alert('Ajouté!'); setLat(''); setLon(''); setMessage(''); load() }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>BONGONO - Test</h1>
      <form onSubmit={submit} style={{ background: '#eee', padding: 15, borderRadius: 10 }}>
        <input value={lat} onChange={e=>setLat(e.target.value)} placeholder="Latitude" style={{ width: '100%', padding: 8, marginTop: 5 }} />
        <input value={lon} onChange={e=>setLon(e.target.value)} placeholder="Longitude" style={{ width: '100%', padding: 8, marginTop: 5 }} />
        <input value={message} onChange={e=>setMessage(e.target.value)} placeholder="Message ex: Pont troué" style={{ width: '100%', padding: 8, marginTop: 5 }} />
        <button type="submit" style={{ background: 'black', color: 'white', padding: 10, marginTop: 10, width: '100%' }}>AJOUTER</button>
      </form>
      <div style={{ marginTop: 20 }}>{zones.map(z => <div key={z.id} style={{ border: '1px solid #ccc', padding: 5, marginTop: 5 }}>{z.ville} - {z.message}</div>)}</div>
    </div>
  )
}
