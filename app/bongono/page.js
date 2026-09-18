'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default function BongonoChauffeur() {
  const [zones, setZones] = useState([])
  const [active, setActive] = useState(false)
  const [log, setLog] = useState('Prêt - Clique pour tester')

  useEffect(() => {
    supabase.from('bongono_zones').select('*').eq('active', true).then(({ data }) => {
      if (data) setZones(data)
    })
    // Pré-charge les voix
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices()
    }
  }, [])

  function parler(texte) {
    try {
      const synth = window.speechSynthesis
      if (!synth) {
        setLog('❌ Pas de voix sur ce tel')
        return
      }
      
      // FIX 1 : on force le son
      synth.cancel()
      synth.resume()

      // FIX 2 : Bongono pas BONGONO
      const propre = texte.replace(/BONGONO/g, 'Bongono')
      
      const u = new SpeechSynthesisUtterance(propre)
      u.lang = 'fr-FR'
      u.volume = 1
      u.rate = 0.9
      u.pitch = 1

      u.onstart = () => setLog('🔊 Ça parle: ' + propre)
      u.onend = () => setLog('✅ Voix terminée')
      u.onerror = (e) => setLog('❌ Erreur: ' + e.error + ' - Volume Média à 0 ?')

      // FIX 3 : ON PARLE DIRECT, SANS setTimeout
      synth.speak(u)
      setLog('▶️ J\'essaye de parler...')
      
    } catch (e) {
      setLog('❌ Bug: ' + e.message)
    }
  }

  return (
    <div style={{padding:20, fontFamily:'sans-serif'}}>
      <h1>🚨 Bongono Chauffeur</h1>
      <p style={{fontSize:12, background:'#eee', padding:8, borderRadius:8}}>{log}</p>
      <p>{zones.length} panneaux actifs</p>
      
      <button 
        onClick={() => {
          // ON PARLE DIRECT DANS LE CLIC - C'EST LA CLÉ
          if (!active) {
            setActive(true)
            parler('Bongono guidage, je vous guide tout au long de votre route, bonne route')
          } else {
            setActive(false)
            window.speechSynthesis.cancel()
            setLog('⏸️ Arrêté')
          }
        }} 
        style={{padding:22, background: active ? '#28a745' : '#FF3B30', color:'white', border:'none', borderRadius:12, width:'100%', fontSize:18, fontWeight:'bold', marginTop:15}}
      >
        {active ? '✅ ACTIF - Re-clique pour couper' : '▶️ DÉMARRER LE GUIDAGE'}
      </button>

      <button onClick={() => parler('Bongono')} style={{marginTop:12, padding:12, width:'100%', borderRadius:8}}>
        🔊 TEST SIMPLE - Dire Bongono
      </button>
    </div>
  )
                }
