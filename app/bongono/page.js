'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'

const RAYON_ALERTE = 300 // mètres
const RAYON_RESET = 400 // mètres — distance à laquelle on "oublie" avoir déjà annoncé la zone
const ANGLE_MAX_DEVANT = 100 // degrés d'ouverture considérés comme "devant"

function distanceMetres(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function capVersZone(lat1, lon1, lat2, lon2) {
  const y = Math.sin((lon2 - lon1) * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
    Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos((lon2 - lon1) * Math.PI / 180)
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}

function differenceAngle(a, b) {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

export default function BongonoChauffeur() {
  const [active, setActive] = useState(false)
  const [zones, setZones] = useState([])
  const [pos, setPos] = useState(null)
  const [debug, setDebug] = useState([])
  const dejaAnnoncees = useRef({}) // { [zoneId]: true } tant qu'on est dans la zone
  const verrouEcranRef = useRef(null)

  function parler(texte) {
    const u = new SpeechSynthesisUtterance(texte)
    u.lang = 'fr-FR'
    u.rate = 0.9
    u.volume = 1
    window.speechSynthesis.speak(u) // on ne "cancel" plus : ça coupait les annonces en cours
  }

  useEffect(() => {
    supabase.from('bongono_zones').select('*').then(({ data }) => {
      if (data) setZones(data)
    })
  }, [])

  async function activerEcranAllume() {
    try {
      if ('wakeLock' in navigator) {
        verrouEcranRef.current = await navigator.wakeLock.request('screen')
      }
    } catch (e) {
      // Pas grave si indisponible, le guidage continue quand même tant que l'écran reste allumé manuellement
    }
  }

  function relacherEcran() {
    if (verrouEcranRef.current) {
      verrouEcranRef.current.release().catch(() => {})
      verrouEcranRef.current = null
    }
  }

  useEffect(() => {
    if (!active) return
    parler('Guidage Bongono activé. Je vous guide.')
    activerEcranAllume()
    dejaAnnoncees.current = {}

    const watch = navigator.geolocation.watchPosition(p => {
      const cur = { lat: p.coords.latitude, lon: p.coords.longitude, cap: p.coords.heading }
      setPos(cur)
      let logs = []

      zones.forEach(z => {
        const d = distanceMetres(cur.lat, cur.lon, z.lat, z.lon)

        // Une fois sorti de la zone élargie, on oublie l'avoir déjà annoncée (pour un futur passage)
        if (d > RAYON_RESET && dejaAnnoncees.current[z.id]) {
          delete dejaAnnoncees.current[z.id]
        }

        // Filtre de direction : si on connait le cap du déplacement, on ignore ce qui est derrière
        let devant = true
        if (cur.cap !== null && cur.cap !== undefined) {
          const capVersLaZone = capVersZone(cur.lat, cur.lon, z.lat, z.lon)
          devant = differenceAngle(cur.cap, capVersLaZone) <= ANGLE_MAX_DEVANT
        }

        logs.push(`${z.type} à ${Math.round(d)}m ${devant ? '(devant)' : '(derrière, ignoré)'}`)

        if (d < RAYON_ALERTE && devant && !dejaAnnoncees.current[z.id]) {
          dejaAnnoncees.current[z.id] = true
          parler(`Attention ${z.type} à ${Math.round(d)} mètres, ${z.message}`)
        }
      })
      setDebug(logs)
    }, e => alert('GPS Erreur: ' + e.message), { enableHighAccuracy: true, maximumAge: 0 })

    return () => {
      navigator.geolocation.clearWatch(watch)
      relacherEcran()
    }
  }, [active, zones])

  return (
    <div style={{ padding: 15, fontFamily: 'sans-serif' }}>
      <h2>🚨 Bongono — Guidage Vocal</h2>
      <p>Zones trouvées : {zones.length}</p>
      <p>Ma position (jamais transmise) : {pos ? `${pos.lat.toFixed(5)}, ${pos.lon.toFixed(5)}` : 'En attente GPS...'}</p>

      <button onClick={() => {
        const nouveauEtat = !active
        setActive(nouveauEtat)
        if (!nouveauEtat) {
          window.speechSynthesis.cancel()
          relacherEcran()
        }
      }}
        style={{ padding: 20, width: '100%', background: active ? 'green' : 'red', color: 'white', borderRadius: 10, fontSize: 18, border: 'none' }}>
        {active ? 'GUIDAGE ACTIF (écran allumé)' : 'DÉMARRER'}
      </button>

      <button onClick={() => parler('Test vocal Bongono, virage dangereux')} style={{ marginTop: 10, width: '100%', padding: 10 }}>🔊 Tester le son</button>

      {active && (
        <p style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
          Garde cette page ouverte à l'écran pendant que tu roules — le guidage s'arrête si tu changes d'application ou si l'écran s'éteint.
        </p>
      )}

      <div style={{ marginTop: 15, background: '#000', color: '#0f0', padding: 10, borderRadius: 8, fontFamily: 'monospace' }}>
        <b>DISTANCES :</b><br />
        {debug.length ? debug.map((d, i) => <div key={i}>{d}</div>) : 'Roule vers une zone signalée...'}
      </div>
    </div>
  )
}
