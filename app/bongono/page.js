'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default function BongonoChauffeur() {
  const [zones, setZones] = useState([])
  const [active, setActive] = useState(false)

  useEffect(() => {
    supabase.from('bongono_zones').select('*').eq('active', true).then(({ data }) => {
      if (data) setZones(data)
    })
  }, [])

  function parler(texte) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      // CORRECTION ICI : on remplace BONGONO par Bongono pour la prononciation
      const texteCorrige = texte.replace(/BONGONO/g, 'Bongono')
      const utterance = new SpeechSynthesisUtterance(texteCorrige)
      utterance.lang = 'fr-FR'
      utterance.rate = 0.95
      utterance.pitch = 1
      window.speechSynthesis.speak(utterance)
    }
  }

  function demarrerGuidage() {
    setActive(true)
    parler('Bongono guidage, je vous guide tout au long de votre route, bonne route')
  }

  return (
    <div style={{padding:20, fontFamily:'sans-serif'}}>
      <h1 style={{fontSize:22}}>🚨 Bongono Chauffeur</h1>
      <p style={{color:'#666', fontSize:14}}>{zones.length} panneaux actifs sur votre route</p>
      
      <button onClick={demarrerGuidage} style={{padding:18, background:'#FF3B30', color:'white', border:'none', borderRadius:12, width:'100%', fontSize:16, fontWeight:'bold', marginTop:15}}>
        {active ? '✅ Guidage Actif' : '▶️ Démarrer le guidage'}
      </button>

      <div style={{marginTop:20}}>
        {zones.map(z => (
          <div key={z.id} style={{border:'1px solid #ddd', padding:12, borderRadius:10, marginBottom:10}}>
            <b>{z.type}</b><br/>
            <span>{z.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
