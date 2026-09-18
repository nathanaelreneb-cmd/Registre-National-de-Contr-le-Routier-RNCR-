'use client'

export default function BongonoChauffeur() {

  function parler(texte) {
    console.log('Je dois parler:', texte)
    // FIX BONGONO : on écrit Bongono pas BONGONO
    const t = texte.replace(/BONGONO/g, 'Bongono')
    const u = new SpeechSynthesisUtterance(t)
    u.lang = 'fr-FR'
    u.rate = 0.9
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  }

  return (
    <div style={{padding:30}}>
      <h1>TEST ASSISTANCE</h1>
      <button 
        onClick={() => {
          alert('Bouton cliqué ! Maintenant je parle')
          parler('Bongono guidage, je vous guide tout au long de votre route, bonne route')
        }} 
        style={{padding:25, background:'red', color:'white', fontSize:20, width:'100%', borderRadius:10, border:'none'}}
      >
        CLIQUE ICI POUR TESTER
      </button>
    </div>
  )
}
