'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default function BongonoChauffeur() {
  const [zones, setZones] = useState([])
  const [active, setActive] = useState(false)

  useEffect(() => {
    supabase.from('bongono_zones').select('*').then(r => { if(r.data) setZones(r.data) })
  }, [])

  function demarrerGuidage(){
    setActive(true)
    if('speechSynthesis' in window){
      const u = new SpeechSynthesisUtterance('Guidage BONGONO activé. Bonne route, je vous préviens en cas de danger.')
      u.lang='fr-FR'; speechSynthesis.speak(u)
    }
    // Ici ton ancien code de guidage GPS qui surveille la position
    alert('Guidage BONGONO activé - ' + zones.length + ' zones surveillées')
  }

  return (
    <div style={{ padding: 20, textAlign: 'center' }}>
      <h1 style={{ fontSize: 28, fontWeight: 'bold' }}>BONGONO</h1>
      <p style={{ color: 'green', fontWeight: 'bold', marginTop: 10 }}>✅ {zones.length} panneaux virtuels actifs</p>
      
      <div style={{ background: '#f5f5f5', padding: 20, borderRadius: 15, marginTop: 20 }}>
        <p>Appuie pour activer l'alerte vocale sur la route</p>
        <button onClick={demarrerGuidage} style={{ width: '100%', padding: 18, background: active ? 'green' : 'black', color: 'white', borderRadius: 12, fontSize: 18, fontWeight: 'bold', marginTop: 15, border: 'none' }}>
          {active ? '✅ GUIDAGE ACTIVÉ' : '▶️ DÉMARRER LE GUIDAGE'}
        </button>
      </div>
      <p style={{ marginTop: 20, fontSize: 12, color: '#888' }}>Pour chauffeurs - OUTI 2026</p>
    </div>
  )
}
