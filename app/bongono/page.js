'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default function BongonoChauffeur() {
  const [zones, setZones] = useState([])
  const [active, setActive] = useState(false)
  const [log, setLog] = useState('Prêt')

  useEffect(() => {
    supabase.from('bongono_zones').select('*').eq('active', true).then(({ data }) => {
      if (data) setZones(data)
    })
  }, [])

  function parler(texte) {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    setTimeout(() => {
      const t = texte.replace(/BONGONO/g, 'Bongono')
      const u = new SpeechSynthesisUtterance(t)
      u.lang = 'fr-FR'
      u.rate = 0.9
      u.volume = 1
      window.speechSynthesis.speak(u)
      setLog('🔊 ' + t)
    }, 100)
  }

  function toggleGuidage() {
    if (!active) {
      setActive(true)
      parler('Bongono guidage, je vous guide tout au long de votre route, bonne route')
      setLog('✅ Guidage ACTIVÉ')
    } else {
      setActive(false)
      window.speechSynthesis.cancel()
      parler('Bongono guidage désactivé, à bientôt')
      setLog('⏸️ Guidage désactivé')
    }
  }

  return (
    <div style={{padding:20, fontFamily:'sans-serif', maxWidth:500, margin:'0 auto'}}>
      <h1 style={{fontSize:22}}>🚨 Bongono Chauffeur</h1>
      <p style={{fontSize:12, color:'#666'}}>{log}</p>
      <p style={{fontSize:14}}>{zones.length} panneaux actifs sur votre route</p>
      
      <button 
        onClick={toggleGuidage} 
        style={{
          padding:20, 
          background: active ? '#28a745' : '#FF3B30', 
          color:'white', 
          border:'none', 
          borderRadius:12, 
          width:'100%', 
          fontSize:18, 
          fontWeight:'bold', 
          marginTop:15
        }}
      >
        {active ? '✅ GUIDAGE ACTIF - Cliquer pour arrêter' : '▶️ Démarrer le guidage'}
      </button>

      <div style={{marginTop:20}}>
        <h3>Panneaux sur la route :</h3>
        {zones.length === 0 && <p style={{color:'#999', fontSize:13}}>Aucun panneau pour le moment. Va dans l'admin pour en créer un.</p>}
        {zones.map(z => (
          <div key={z.id} style={{border:'1px solid #ddd', padding:12, borderRadius:10, marginBottom:10, background: active ? '#f0fff0' : 'white'}}>
            <b>{z.type || 'Info'}</b><br/>
            <span>{z.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
