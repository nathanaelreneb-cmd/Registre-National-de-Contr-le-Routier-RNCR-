'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default function BongonoChauffeur() {
  const [active, setActive] = useState(false)
  const [zones, setZones] = useState([])
  const [pos, setPos] = useState([9.537, -13.678])
  const [sat, setSat] = useState(false)

  // Ta fonction parler qui marche chez toi
  function parler(texte) {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(texte)
    u.lang = 'fr-FR'
    u.rate = 0.9
    window.speechSynthesis.speak(u)
  }

  // Charger les panneaux
  useEffect(() => {
    supabase.from('bongono_zones').select('*').eq('active', true).then(({data}) => {
      if(data) setZones(data)
    })
  }, [])

  // Suivi GPS + alerte vocale à 300m
  useEffect(() => {
    if(!active) return
    const watch = navigator.geolocation.watchPosition(p => {
      const curLat = p.coords.latitude
      const curLng = p.coords.longitude
      setPos([curLat, curLng])
      
      // Vérifie chaque panneau
      zones.forEach(z => {
        const R = 6371e3
        const dLat = (z.lat - curLat) * Math.PI/180
        const dLon = (z.lng - curLng) * Math.PI/180
        const a = Math.sin(dLat/2)**2 + Math.cos(curLat*Math.PI/180)*Math.cos(z.lat*Math.PI/180)*Math.sin(dLon/2)**2
        const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
        if(d < 300) {
          parler(`Bongono : Attention ${z.type} à ${Math.round(d)} mètres, ${z.message}`)
        }
      })
    })
    return () => navigator.geolocation.clearWatch(watch)
  }, [active, zones])

  return (
    <div style={{padding:15, fontFamily:'sans-serif', maxWidth:600, margin:'0 auto'}}>
      <h1>🚨 Bongono Chauffeur</h1>
      <p>{zones.length} panneaux actifs</p>

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
        style={{padding:20, background: active? '#16a34a' : '#dc2626', color:'white', border:'none', borderRadius:12, width:'100%', fontSize:18, fontWeight:'bold'}}
      >
        {active? '✅ GUIDAGE ACTIF - Couper' : '▶️ DÉMARRER LE GUIDAGE'}
      </button>

      <div style={{marginTop:15, display:'flex', gap:5}}>
        <button onClick={()=>setSat(false)} style={{flex:1, padding:10, background: !sat? 'black':'#eee', color: !sat? 'white':'black', borderRadius:8}}>🗺️ Plan</button>
        <button onClick={()=>setSat(true)} style={{flex:1, padding:10, background: sat? 'black':'#eee', color: sat? 'white':'black', borderRadius:8}}>🛰️ Satellite</button>
      </div>

      {/* CARTE - Simple iframe, pas besoin de leaflet */}
      <div style={{marginTop:10, height:450, borderRadius:12, overflow:'hidden', border:'1px solid #ddd'}}>
        <iframe
          width="100%"
          height="450"
          style={{border:0}}
          src={`https://maps.google.com/maps?q=${pos[0]},${pos[1]}&z=15&output=embed`}
          key={sat ? 'sat' : 'plan'}
        ></iframe>
      </div>

      <div style={{marginTop:10}}>
        {zones.map(z=>(
          <div key={z.id} style={{fontSize:12, padding:6, borderBottom:'1px solid #eee'}}>
            <b>{z.type}</b>: {z.message}
          </div>
        ))}
      </div>
    </div>
  )
}
