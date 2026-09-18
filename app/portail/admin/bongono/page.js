"use client"
import { useState, useEffect } from 'react'
import { ajouterZone } from '@/lib/bongono'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function PageBongonoAdmin() {
  const [zones, setZones] = useState([])
  const [form, setForm] = useState({ lat: '', lon: '', ville: '', type: 'virage', message: '' })

  const charger = async () => {
    const { data } = await supabase.from('bongono_zones').select('*').order('created_at', { ascending: false })
    if (data) setZones(data)
  }
  useEffect(() => { charger() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.lat || !form.lon || !form.message) return alert("Remplis tout")
    await ajouterZone(parseFloat(form.lat), parseFloat(form.lon), form.message, form.ville, form.type)
    setForm({ lat: '', lon: '', ville: '', type: 'virage', message: '' })
    charger()
  }

  const supprimer = async (id) => {
    if (!confirm("Supprimer cette zone ?")) return
    await supabase.from('bongono_zones').delete().eq('id', id)
    charger()
  }

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: 'auto' }}>
      <h1>📍 BONGONO - Gestion des Zones</h1>
      <p>C'est ici que les responsables enregistrent les dangers. Tous les motards seront alertés.</p>

      <form onSubmit={handleAdd} style={{ background: '#f5f5f5', padding: 15, borderRadius: 10, marginBottom: 20 }}>
        <h3>Ajouter une zone dangereuse</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <input placeholder="Latitude ex: 9.537" value={form.lat} onChange={e => setForm({...form, lat: e.target.value})} />
          <input placeholder="Longitude ex: -13.678" value={form.lon} onChange={e => setForm({...form, lon: e.target.value})} />
          <input placeholder="Ville ex: Coyah" value={form.ville} onChange={e => setForm({...form, ville: e.target.value})} />
          <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
            <option value="virage">Virage dangereux</option>
            <option value="pont">Pont troué / étroit</option>
            <option value="village">Entrée village</option>
            <option value="dos_dane">Dos d'âne</option>
            <option value="trou">Gros trou / nid de poule</option>
          </select>
        </div>
        <input style={{ width: '100%', marginTop: 10 }} placeholder="Message vocal ex: Attention pont troué, ralentir" value={form.message} onChange={e => setForm({...form, message: e.target.value})} />
        <button type="submit" style={{ marginTop: 10, background: 'red', color: 'white', padding: '10px 20px', border: 'none', borderRadius: 5 }}>✅ Enregistrer Zone</button>
        <p style={{ fontSize: 12, marginTop: 5 }}>Astuce: Va sur Google Maps, clic droit sur le danger -> Copier les coordonnées</p>
      </form>

      <h3>Zones enregistrées ({zones.length})</h3>
      {zones.map(z => (
        <div key={z.id} style={{ border: '1px solid #ddd', padding: 10, borderRadius: 8, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
          <div><b>{z.type.toUpperCase()} - {z.ville}</b><br/>{z.message}<br/><small>{z.lat}, {z.lon}</small></div>
          <button onClick={() => supprimer(z.id)} style={{ background: 'black', color: 'white', borderRadius: 5 }}>Supprimer</button>
        </div>
      ))}
    </div>
  )
}
