'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
const MapComponent = dynamic(() => import('./MapBongono'), { ssr: false, loading: () => <p>Chargement carte...</p> })

export default function AdminBongono() {
  const [pos, setPos] = useState(null)
  const [type, setType] = useState('travaux')
  const [message, setMessage] = useState('Travaux de route')
  const [zones, setZones] = useState([])

  useEffect(() => { loadZones() }, [])

  async function loadZones(){
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      const { data } = await supa.from('bongono_zones').select('*').order('created_at', {ascending:false})
      if(data) setZones(data)
    } catch(e){}
  }

  async function confirmer(){
    if(!pos) return alert('Clique sur la carte ou appuie sur Ma Position')
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      const { error } = await supa.from('bongono_zones').insert({ lat: pos.lat, lng: pos.lng, type, message, active: true })
      if(error) alert(error.message)
      else { alert('✅ Panneau posé!'); setPos(null); loadZones() }
    } catch(e){ alert(e.message) }
  }

  async function supprimer(id){
    if(!confirm('Supprimer ce panneau? Travaux terminés?')) return
    const { createClient } = await import('@supabase/supabase-js')
    const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    await supa.from('bongono_zones').delete().eq('id', id)
    loadZones()
  }

  function maPosition(){
    if(!navigator.geolocation) return alert('GPS non supporté')
    navigator.geolocation.getCurrentPosition((p)=>{
      setPos({lat: p.coords.latitude, lng: p.coords.longitude})
    }, (err)=>alert(err.message), {enableHighAccuracy:true})
  }

  return (
    <div style={{padding:12}}>
      <h3>🛡️ Admin Bongono</h3>

      <div style={{display:'flex', gap:6, marginBottom:10}}>
        <select value={type} onChange={e=>setType(e.target.value)} style={{padding:10, borderRadius:8}}>
          <option value="travaux">🚧 Travaux</option>
          <option value="accident">🚨 Accident</option>
          <option value="police">👮 Police</option>
          <option value="crime">🔴 Zone Crime</option>
          <option value="danger">⚠️ Danger</option>
          <option value="barree">🚫 Route Barrée</option>
        </select>
        <input value={message} onChange={e=>setMessage(e.target.value)} style={{padding:10, flex:1, borderRadius:8, border:'1px solid #999'}} />
      </div>

      <button onClick={maPosition} style={{width:'100%', padding:12, background:'#2196F3', color:'white', border:'none', borderRadius:8, marginBottom:10, fontWeight:'bold'}}>📍 UTILISER MA POSITION EXACTE (GPS)</button>

      {pos && (
        <div style={{background:'#e8f5e9', border:'1px solid green', padding:10, borderRadius:10, marginBottom:10}}>
          📍 {pos.lat.toFixed(6)}, {pos.lng.toFixed(6)} <br/> 📝 {message}
          <button onClick={confirmer} style={{marginTop:8, width:'100%', padding:12, background:'green', color:'white', border:'none', borderRadius:8, fontWeight:'bold'}}>✅ AFFICHER SUR LA CARTE</button>
        </div>
      )}

      <MapComponent onMapClick={(lat,lng)=>setPos({lat,lng})} zones={zones} selectedPos={pos} />

      <h4 style={{marginTop:20}}>📋 Panneaux affichés ({zones.length})</h4>
      {zones.map(z=>(
        <div key={z.id} style={{border:'1px solid #ddd', padding:10, borderRadius:8, marginBottom:6, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div>
            <b>{z.type}</b> - {z.message}<br/>
            <small>{Number(z.lat).toFixed(5)}, {Number(z.lng).toFixed(5)}</small>
          </div>
          <button onClick={()=>supprimer(z.id)} style={{background:'red', color:'white', border:'none', padding:'8px 12px', borderRadius:6}}>Supprimer</button>
        </div>
      ))}
    </div>
  )
      }
