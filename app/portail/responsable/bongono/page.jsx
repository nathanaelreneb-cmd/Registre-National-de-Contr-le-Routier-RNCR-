'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
const MapComponent = dynamic(() => import('./MapBongono'), { ssr: false, loading: () => <p>Chargement carte...</p> })

export default function AdminBongono() {
  const [pos, setPos] = useState(null)
  const [type, setType] = useState('travaux')
  const [message, setMessage] = useState('Travaux de route')
  const [zones, setZones] = useState([])
  const [logs, setLogs] = useState('')

  useEffect(() => {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if(!url || !key){
        setLogs('❌ SUPABASE_URL ou KEY manquant dans Vercel')
        return
      }
      // On charge sans crasher
      import('@supabase/supabase-js').then(({createClient}) => {
        const supa = createClient(url, key)
        supa.from('bongono_zones').select('*').then(({data, error}) => {
          if(error) setLogs('Erreur Supabase: '+error.message)
          else if(data) setZones(data)
        })
      })
    } catch(e) {
      setLogs('Erreur: '+e.message)
    }
  }, [])

  async function confirmer(){
    if(!pos) return alert('Clique sur la carte')
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      const { error } = await supa.from('bongono_zones').insert({ lat: pos.lat, lng: pos.lng, type, message, active: true })
      if(error) alert(error.message)
      else {
        alert('✅ Panneau posé!')
        setPos(null)
      }
    } catch(e) { alert(e.message) }
  }

  return (
    <div style={{padding:12}}>
      <h3>Admin Bongono - Test stable</h3>
      {logs && <div style={{background:'red', color:'white', padding:8, borderRadius:8}}>{logs}</div>}
      
      <div style={{display:'flex', gap:6, margin:'10px 0'}}>
        <select value={type} onChange={e=>setType(e.target.value)} style={{padding:10}}><option value="travaux">Travaux</option><option value="crime">Crime</option><option value="police">Police</option></select>
        <input value={message} onChange={e=>setMessage(e.target.value)} style={{padding:10, flex:1}} />
      </div>

      {pos && (
        <div style={{background:'#e8f5e9', border:'1px solid green', padding:10, borderRadius:8, marginBottom:10}}>
          📍 {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)} - {message}<br/>
          <button onClick={confirmer} style={{width:'100%', padding:12, background:'green', color:'white', border:'none', borderRadius:8, marginTop:6}}>✅ AFFICHER</button>
        </div>
      )}
      <MapComponent onMapClick={(lat,lng)=>setPos({lat,lng})} zones={zones} selectedPos={pos} />
    </div>
  )
}
