'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function BongonoChauffeur() {
  const [active, setActive] = useState(false)
  const [zones, setZones] = useState([])
  const [pos, setPos] = useState(null)
  const [debug, setDebug] = useState([])

  function parler(texte) {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(texte)
    u.lang = 'fr-FR'
    u.rate = 0.9
    u.volume = 1
    window.speechSynthesis.speak(u)
  }

  useEffect(() => {
    // Toutes les zones sont publiques par défaut, pas de colonne "active" dans la table
    supabase.from('bongono_zones').select('*').then(({ data }) => {
      if (data) setZones(data)
    })
  }, [])

  useEffect(() => {
    if (!active) return
    parler('Guidage Bongono activé. Je vous guide.')

    // La position n'est utilisée que localement sur ce téléphone, jamais envoyée au serveur
    const watch = navigator.geolocation.watchPosition(p => {
      const cur = { lat: p.coords.latitude, lon: p.coords.longitude }
      setPos(cur)
      let logs = []
      zones.forEach(z => {
        const R = 6371000
        const dLat = (z.lat - cur.lat) * Math.PI / 180
        const dLon = (z.lon - cur.lon) * Math.PI / 180
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(cur.lat * Math.PI / 180) * Math.cos(z.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2
        const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        logs.push(`${z.type} à ${Math.round(d)}m`)
        if (d < 300) {
          parler(`Attention ${z.type} à ${Math.round(d)} mètres, ${z.message}`)
        }
      })
      setDebug(logs)
    }, e => alert('GPS Erreur: ' + e.message), { enableHighAccuracy: true, maximumAge: 0 })

    return () => navigator.geolocation.clearWatch(watch)
  }, [active, zones])

  return (
    <div style={{ padding: 15, fontFamily: 'sans-serif' }}>
      <h2>🚨 Bongono — Guidage Vocal</h2>
      <p>Zones trouvées : {zones.length}</p>
      <p>Ma position (jamais transmise) : {pos ? `${pos.lat.toFixed(5)}, ${pos.lon.toFixed(5)}` : 'En attente GPS...'}</p>

      <button onClick={() => { setActive(!active); if (active) window.speechSynthesis.cancel() }}
        style={{ padding: 20, width: '100%', background: active ? 'green' : 'red', color: 'white', borderRadius: 10, fontSize: 18, border: 'none' }}>
        {active ? 'GUIDAGE ACTIF' : 'DÉMARRER'}
      </button>

      <button onClick={() => parler('Test vocal Bongono, virage dangereux')} style={{ marginTop: 10, width: '100%', padding: 10 }}>🔊 Tester le son</button>

      <div style={{ marginTop: 15, background: '#000', color: '#0f0', padding: 10, borderRadius: 8, fontFamily: 'monospace' }}>
        <b>DISTANCES :</b><br />
        {debug.length ? debug.map((d, i) => <div key={i}>{d}</div>) : 'Roule vers une zone signalée...'}
      </div>
    </div>
  )
}
