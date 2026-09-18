'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default function BongonoChauffeur() {
  const [zones, setZones] = useState([])

  useEffect(() => {
    supabase.from('bongono_zones').select('*').eq('active', true).then(({ data }) => {
      if (data) setZones(data)
    })
  }, [])

  function parler(texte) {
    const utterance = new SpeechSynthesisUtterance(texte)
    utterance.lang = 'fr-FR'
    utterance.rate = 0.95
    window.speechSynthesis.speak(utterance)
  }

  return (
    <div style={{padding:20, fontFamily:'sans-serif'}}>
      <h1>🚨 Bongono Chauffeur</h1>
      <p>{zones.length} panneaux actifs</p>
      
      <button onClick={() => parler('Bongono guidage, je vous guide tout au long de votre route, bonne route')} style={{padding:18, background:'#FF3B30', color:'white', border:'none', borderRadius:12, width:'100%', fontSize:16, fontWeight:'bold'}}>
        ▶️ Démarrer le guidage
      </button>

      <div style={{marginTop:20}}>
        {zones.map(z => (
          <div key={z.id} style={{border:'1px solid #ddd', padding:12, borderRadius:10, marginBottom:10}}>
            <b>{z.type}</b> - {z.message}
          </div>
        ))}
      </div>
    </div>
  )
          }
