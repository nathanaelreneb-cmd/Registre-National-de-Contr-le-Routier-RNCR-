'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import dynamic from 'next/dynamic'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const MapView = dynamic(() => import('./MapView'), { ssr: false })

export default function BongonoChauffeur() {
  const [active, setActive] = useState(false)
  const [zones, setZones] = useState([])

  useEffect(() => {
    supabase.from('bongono_zones').select('*').eq('active', true).then(({data})=>{ if(data) setZones(data) })
  }, [])

  function parler(texte) {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(texte)
    u.lang = 'fr-FR'
    u.rate = 0.9
    window.speechSynthesis.speak(u)
  }

  return (
    <div style={{padding:15, maxWidth:600, margin:'0 auto'}}>
      <h1>🚨 Bongono Chauffeur</h1>
      <button
        onClick={() => {
          if (!active) {
            setActive(true)
            parler('Bongono guidage, je vous guide tout au long de votre route, bonne route')
          } else {
            setActive(false)
            window.speechSynthesis.cancel()
          }
        }}
        style={{padding:20, background: active? 'green' : 'red', color:'white', border:'none', borderRadius:12, width:'100%', fontSize:18, fontWeight:'bold'}}
      >
        {active? '✅ GUIDAGE ACTIF' : '▶️ DÉMARRER LE GUIDAGE'}
      </button>

      <p style={{marginTop:10, fontSize:13}}>{zones.length} panneaux sur la carte</p>
      <MapView zones={zones} active={active} parler={parler} />
    </div>
  )
}
