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
    // Pré-charge les voix
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices()
    }
  }, [])

  function parler(texte) {
    if (!('speechSynthesis' in window)) {
      setLog('❌ Ce téléphone ne supporte pas la voix')
      return
    }
    
    window.speechSynthesis.cancel()
    const texteCorrige = texte.replace(/BONGONO/g, 'Bongono')
    
    const dire = () => {
      const utterance = new SpeechSynthesisUtterance(texteCorrige)
      utterance.lang = 'fr-FR'
      utterance.rate = 0.9
      utterance.volume = 1
      
      // Cherche une voix française
      const voices = window.speechSynthesis.getVoices()
      const voixFR = voices.find(v => v.lang.includes('fr-FR')) || voices.find(v => v.lang.includes('fr'))
      if (voixFR) utterance.voice = voixFR

      utterance.onstart = () => setLog('🔊 Parle: ' + texteCorrige)
      utterance.onerror = (e) => setLog('❌ Erreur voix: ' + e.error)

      window.speechSynthesis.speak(utterance)
    }

    // Si les voix ne sont pas encore chargées, on attend
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => dire()
      // Force le chargement
      window.speechSynthesis.getVoices()
      setTimeout(dire, 250)
    } else {
      dire()
    }
  }

  function demarrerGuidage() {
    setActive(true)
    // IMPORTANT : la voix doit être lancée DIRECTEMENT sur le clic, pas après
    parler('Bongono guidage, je vous guide tout au long de votre route, bonne route')
    setLog('Guidage démarré...')
  }

  return (
    <div style={{padding:20, fontFamily:'sans-serif'}}>
      <h1 style={{fontSize:22}}>🚨 Bongono Chauffeur</h1>
      <p style={{color:'#666', fontSize:12}}>{log}</p>
      <p style={{color:'#666', fontSize:14}}>{zones.length} panneaux actifs</p>
      
      <button onClick={demarrerGuidage} style={{padding:20, background:'#FF3B30', color:'white', border:'none', borderRadius:12, width:'100%', fontSize:18, fontWeight:'bold', marginTop:15}}>
        {active ? '✅ Guidage Actif - Retester voix' : '▶️ Démarrer le guidage'}
      </button>

      <button onClick={() => parler('Test Bongono')} style={{marginTop:10, padding:10, width:'100%'}}>
        🔊 Test petit son
      </button>

      <div style={{marginTop:20}}>
        {zones.map(z => (
          <div key={z.id} style={{border:'1px solid #ddd', padding:12, borderRadius:10, marginBottom:10}}>
            <b>{z.type}</b><br/><span>{z.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
            }
