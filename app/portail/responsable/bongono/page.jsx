'use client'
import dynamic from 'next/dynamic'
const MapComponent = dynamic(() => import('./MapBongono'), { ssr: false, loading: () => <p>Chargement carte...</p> })

export default function Test() {
  return (
    <div style={{padding:10}}>
      <h3>Test Carte</h3>
      <MapComponent onMapClick={(lat,lng)=>alert(lat+','+lng)} zones={[]} />
    </div>
  )
}
