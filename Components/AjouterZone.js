"use client"
import { useState } from 'react'
import { ajouterZone } from '@/lib/bongono'

export default function AjouterZoneForm(){
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')
  const [type, setType] = useState('carrefour')
  const [ville, setVille] = useState('Nzerekore')
  const [message, setMessage] = useState('')

  const messagesPredefinis = {
    carrefour: "Attention carrefour dangereux dans 80 mètres, ralentissez fortement",
    ecole: "Attention zone école dans 60 mètres, limitez à 30 km heure",
    pieton: "Attention dans 80 mètres, cédez le passage aux piétons",
    pont: "Attention dans 80 mètres, pont étroit devant vous, cédez le passage",
    stop: "Attention stop obligatoire dans 50 mètres",
    obstacle: "Attention obstacle chantier dans 50 mètres, ralentissez"
  }

  const prendrePosition = () => {
    navigator.geolocation.getCurrentPosition(pos=>{
      setLat(pos.coords.latitude.toFixed(6))
      setLon(pos.coords.longitude.toFixed(6))
    }, e=>alert(e.message), {enableHighAccuracy:true})
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const msgFinal = message || messagesPredefinis[type]
    await ajouterZone(parseFloat(lat), parseFloat(lon), msgFinal, ville, type)
    setMessage(''); // reset
  }

  return (
    <div className="p-4 max-w-md mx-auto bg-white rounded-2xl shadow-lg mt-4">
      <h2 className="text-xl font-bold mb-4">Ajouter Zone Bongono</h2>

      <button onClick={prendrePosition} className="w-full bg-blue-600 text-white p-3 rounded-xl mb-4">
        📍 Prendre Ma Position Actuelle
      </button>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <input value={lat} onChange={e=>setLat(e.target.value)} placeholder="Latitude" className="border p-3 rounded-xl" required />
          <input value={lon} onChange={e=>setLon(e.target.value)} placeholder="Longitude" className="border p-3 rounded-xl" required />
        </div>

        <select value={ville} onChange={e=>setVille(e.target.value)} className="w-full border p-3 rounded-xl">
          <option>Nzerekore</option><option>Conakry</option><option>Kankan</option>
          <option>Labe</option><option>Kindia</option><option>Mamou</option>
        </select>

        <select value={type} onChange={e=>setType(e.target.value)} className="w-full border p-3 rounded-xl">
          <option value="carrefour">Carrefour dangereux</option>
          <option value="ecole">Zone École</option>
          <option value="pieton">Passage Piéton</option>
          <option value="pont">Pont étroit</option>
          <option value="stop">Stop</option>
          <option value="obstacle">Obstacle / Chantier</option>
        </select>

        <input value={message} onChange={e=>setMessage(e.target.value)} placeholder={messagesPredefinis[type]} className="w-full border p-3 rounded-xl" />

        <button type="submit" className="w-full bg-red-600 text-white p-4 rounded-xl font-bold text-lg">
          ENREGISTRER LA ZONE
        </button>
      </form>
    </div>
  )
    }
