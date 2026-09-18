import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

let dernierAlerte = 0

function parler(texte) {
  if (Date.now() - dernierAlerte < 8000) return
  dernierAlerte = Date.now()
  const voix = new SpeechSynthesisUtterance(texte)
  voix.lang = 'fr-FR'
  voix.rate = 0.9
  speechSynthesis.speak(voix)
}

function distance(lat1, lon1, lat2, lon2) {
  const R = 6371e3
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export function demarrerGuidage(setVitesse, setStatus) {
  parler("Guidage Bongono activé. Bonne route.")
  
  if (!navigator.geolocation) {
    alert("GPS non supporté")
    return
  }

  navigator.geolocation.watchPosition(async (pos) => {
    const lat = pos.coords.latitude
    const lon = pos.coords.longitude
    const vitesse = (pos.coords.speed || 0) * 3.6
    setVitesse(vitesse.toFixed(0))
    setStatus(`Position: ${lat.toFixed(4)}, ${lon.toFixed(4)}`)

    const { data: zones } = await supabase.from('bongono_zones').select('*')
    if (!zones) return

    for (const zone of zones) {
      const d = distance(lat, lon, zone.lat, zone.lon)
      if (d < 200 && d > 20) {
        parler(`${zone.message} dans ${d.toFixed(0)} mètres`)
        setStatus(zone.message)
      }
    }
  }, 
  (e) => alert(e.message), 
  { enableHighAccuracy: true, maximumAge: 0 })
}

export async function ajouterZone(lat, lon, message, ville, type) {
  const { error } = await supabase.from('bongono_zones').insert([{ lat, lon, message, ville, type }])
  if (error) alert(error.message)
  else alert(`✅ Zone "${type}" ajoutée à ${ville}`)
}
