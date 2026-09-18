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
  const dLat = (lat2-lat1)*Math.PI/180
  const dLon = (lon2-lon1)*Math.PI/180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export async function demarrerGuidage(setVitesse, setMessage) {
  const { data: zones } = await supabase.from('bongono_zones').select('*')
  parler(`Guidage Bongono démarré, ${zones.length} zones chargées`)
  setMessage(`${zones.length} zones chargées`)

  navigator.geolocation.watchPosition(pos => {
    const lat = pos.coords.latitude
    const lon = pos.coords.longitude
    const vit = pos.coords.speed ? (pos.coords.speed * 3.6).toFixed(0) : 0
    setVitesse(vit)

    if (vit > 60) parler("Excès de vitesse, ralentissez")

    zones.forEach(z => {
      if (distance(lat, lon, z.lat, z.lon) < z.rayon) {
        parler(z.message)
        setMessage(z.message)
      }
    })
  }, e => alert(e.message), { enableHighAccuracy: true })
  export async function ajouterZone(lat, lon, message, ville, type){
  const { error } = await supabase.from('bongono_zones').insert([{ lat, lon, message, ville, type }])
  if(error) alert(error.message)
  else alert("✅ Zone "+type+" ajoutée à "+ville)
  }
}


