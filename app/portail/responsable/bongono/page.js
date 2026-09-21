'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'

export default function BongonoAdminPro() {
  const router = useRouter()
  const [autorise, setAutorise] = useState(null)
  const [zones, setZones] = useState([])
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')
  const [msg, setMsg] = useState('')
  const [ville, setVille] = useState('Conakry')
  const [type, setType] = useState('pont')
  const [loadingGPS, setLoadingGPS] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.push('/agent/login')
        return
      }
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', data.session.user.id)
        .maybeSingle()

      if (!agent) {
        await supabase.auth.signOut()
        router.push('/agent/login')
        return
      }

      setAutorise(true)
      charger()
    })
  }, [])

  async function charger() {
    const { data } = await supabase.from('bongono_zones').select('*').order('created_at', { ascending: false })
    if (data) setZones(data)
  }

  function prendrePosition() {
    setLoadingGPS(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6))
        setLon(pos.coords.longitude.toFixed(6))
        setLoadingGPS(false)
      },
      (err) => { alert('Active le GPS ! ' + err.message); setLoadingGPS(false) },
      { enableHighAccuracy: true }
    )
  }

  async function ajouter(e) {
    e.preventDefault()
    if (!lat || !lon || !msg) return alert('Remplis tout')
    const { error } = await supabase.from('bongono_zones').insert([{ lat: Number(lat), lon: Number(lon), message: msg, ville, type }])
    if (error) alert(error.message)
    else {
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance('BONGONO guidage activé, ' + msg)
        u.lang = 'fr-FR'; speechSynthesis.speak(u)
      }
      setMsg('')
      setLat('')
      setLon('')
      charger()
    }
  }

  async function supprimer(id) {
    if (!confirm('Supprimer ce panneau ?')) return
    await supabase.from('bongono_zones').delete().eq('id', id)
    charger()
  }

  if (autorise === null) {
    return (
      <div className="shell">
        <div className="content"><p>Chargement…</p></div>
      </div>
    )
  }

  return (
    <div style={{ padding: 15, maxWidth: 650, margin: '0 auto', fontFamily: 'sans-serif' }}>
      <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: '#1E3A5F', fontSize: 14, padding: 0, marginBottom: 10, cursor: 'pointer' }}>← Retour</button>
      <h1 style={{ fontWeight: 'bold', fontSize: 22 }}>BONGONO — Panneaux virtuels</h1>
      <p style={{ color: '#666', fontSize: 13 }}>Zones publiques, sans donnée personnelle. Réservé aux agents.</p>

      <div style={{ background: '#f0f0f0', padding: 15, borderRadius: 12, marginTop: 10 }}>
        <button onClick={prendrePosition} style={{ width: '100%', padding: 12, background: '#007AFF', color: 'white', borderRadius: 8, fontWeight: 'bold', border: 'none' }}>
          {loadingGPS ? 'Recherche GPS...' : '📍 PRENDRE MA POSITION ACTUELLE'}
        </button>

        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input value={lat} onChange={e => setLat(e.target.value)} placeholder="Latitude auto" style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #ccc' }} />
          <input value={lon} onChange={e => setLon(e.target.value)} placeholder="Longitude auto" style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #ccc' }} />
        </div>

        <input value={msg} onChange={e => setMsg(e.target.value)} placeholder="Ce que la voix doit dire ex: Attention pont troué ralentir à 20" style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', marginTop: 10 }} />

        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input value={ville} onChange={e => setVille(e.target.value)} style={{ flex: 1, padding: 10 }} />
          <select value={type} onChange={e => setType(e.target.value)} style={{ flex: 1, padding: 10 }}>
            <option value="pont">pont</option><option value="virage">virage</option><option value="village">village</option><option value="dos_dane">dos d'âne</option>
          </select>
        </div>

        <button onClick={ajouter} style={{ width: '100%', marginTop: 12, background: 'black', color: 'white', padding: 12, borderRadius: 8, fontWeight: 'bold', border: 'none' }}>AJOUTER LE PANNEAU VIRTUEL</button>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>📋 Zones enregistrées ({zones.length})</h3>
        {zones.map(z => (
          <div key={z.id} style={{ background: 'white', border: '1px solid #ddd', padding: 10, borderRadius: 8, marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <b>{(z.type || '').toUpperCase()}</b> - {z.ville}<br />{z.message}<br /><small style={{ color: '#666' }}>{z.lat}, {z.lon}</small>
            </div>
            <button onClick={() => supprimer(z.id)} style={{ background: 'red', color: 'white', border: 'none', padding: '6px 10px', borderRadius: 6 }}>Suppr.</button>
          </div>
        ))}
      </div>
    </div>
  )
}
