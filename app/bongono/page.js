'use client'
import { useState } from 'react'

export default function BongonoChauffeur() {
  const [active, setActive] = useState(false)

  function parler(texte) {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(texte)
    u.lang = 'fr-FR'
    u.rate = 0.9
    window.speechSynthesis.speak(u)
  }

  return (
    <div style={{padding:30, fontFamily:'sans-serif'}}>
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
        style={{padding:22, background: active ? 'green' : 'red', color:'white', border:'none', borderRadius:12, width:'100%', fontSize:18, fontWeight:'bold'}}
      >
        {active ? '✅ GUIDAGE ACTIF' : '▶️ DÉMARRER LE GUIDAGE'}
      </button>
    </div>
  )
}
