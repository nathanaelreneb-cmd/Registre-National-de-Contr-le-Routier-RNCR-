'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default function BongonoAdminPro() {
  const [zones, setZones] = useState([])
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')
  const [msg, setMsg] = useState('')
  const [ville, setVille] = useState('Conakry')
  const [type, setType] = useState('pont')
  const [loadingGPS, setLoadingGPS] = useState(false)

  useEffect(() => { charger() }, [])
  async function charger() {
    const { data } = await supabase.from('bongono_zones').select('*').order('created_at', { ascending: false })
    if (data) setZones(data)
  }

  // PRENDRE POSITION AUTO
  function prendrePosition() {
    setLoadingGPS(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6))
        setLon(pos.coords.longitude.toFixed(6))
        setLoadingGPS(false)
        alert('Position prise : ' + pos.coords.latitude.toFixed(4))
      },
      (err) => { alert('Active le GPS ! ' + err.message); setLoadingGPS(false) },
      { enableHighAccuracy: true }
    )
  }

  async function ajouter(e) {
    e.preventDefault()
    if(!lat || !lon || !msg) return alert('Remplis tout')
    const { error } = await supabase.from('bongono_zones').insert([{ lat: Number(lat), lon: Number(lon), message: msg, ville, type }])
    if(error) alert(error.message)
    else {
      // TEST VOCAL DIRECT
      if('speechSynthesis' in window){
        const u = new SpeechSynthesisUtterance('BONGONO guidage activé, ' + msg)
        u.lang = 'fr-FR'; speechSynthesis.speak(u)
      }
      alert('Zone ajoutée + Guidage BONGONO activé !'); setMsg(''); charger()
    }
  }

  return (
    <div style={{ padding: 15, maxWidth: 650, margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontWeight: 'bold', fontSize: 22 }}>BONGONO - Admin PRO</h1>
      <p style={{ color: 'green' }}>✅ Guidage BONGONO activé</p>

      <div style={{ background: '#f0f0f0', padding: 15, borderRadius: 12, marginTop: 10 }}>
        <button onClick={prendrePosition} style={{ width: '100%', padding: 12, background: '#007AFF', color: 'white', borderRadius: 8, fontWeight: 'bold', border: 'none' }}>
          {loadingGPS ? 'Recherche GPS...' : '📍 PRENDRE MA POSITION ACTUELLE'}
        </button>
        
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input value={lat} onChange={e=>setLat(e.target.value)} placeholder="Latitude auto" style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #ccc' }} />
          <input value={lon} onChange={e=>setLon(e.target.value)} placeholder="Longitude auto" style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #ccc' }} />
        </div>
        
        <input value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Ce que la voix doit dire ex: Attention pont troué ralentir à 20" style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', marginTop: 10 }} />
        
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input value={ville} onChange={e=>setVille(e.target.value)} style={{ flex: 1, padding: 10 }} />
          <select value={type} onChange={e=>setType(e.target.value)} style={{ flex: 1, padding: 10 }}>
            <option value="pont">pont</option><option value="virage">virage</option><option value="village">village</option><option value="dos_dane">dos d'âne</option>
          </select>
        </div>

        <button onClick={ajouter} style={{ width: '100%', marginTop: 12, background: 'black', color: 'white', padding: 12, borderRadius: 8, fontWeight: 'bold', border: 'none' }}>AJOUTER LE PANNEAU VIRTUEL</button>
      </div>

      {/* CARTE */}
      <div style={{ marginTop: 20 }}>
        <h3>🗺️ Carte des zones ({zones.length})</h3>
        <iframe 
          width="100%" 
          height="350" 
          style={{ borderRadius: 12, border: '1px solid #ccc', marginTop: 8 }}
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${-13.7},9.5,-13.5,9.7&layer=mapnik&marker=${zones[0]?.lat || 9.537}%2C${zones[0]?.lon || -13.6785}`}
        ></iframe>
        <div style={{ marginTop: 10 }}>
          {zones.map(z => (
            <div key={z.id} style={{ background: 'white', border: '1px solid #ddd', padding: 10, borderRadius: 8, marginTop: 6 }}>
              <b>{z.type.toUpperCase()}</b> - {z.ville}<br/>{z.message}<br/><small style={{color:'#666'}}>{z.lat}, {z.lon}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
                                                                                                   }
