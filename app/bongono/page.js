"use client"
import { useState } from 'react'
import { demarrerGuidage } from '@/lib/bongono'

export default function BongonoPage(){
  const [vitesse, setVitesse] = useState(0)
  const [status, setStatus] = useState("Prêt")
  const [actif, setActif] = useState(false)

  const lancer = () => {
    setActif(true)
    demarrerGuidage(setVitesse, setStatus)
  }

  return (
    <div className="shell">
      <div className="header">
        <p className="sigle">RNCR - BONGONO</p>
        <h1>Guidage Vocal</h1>
      </div>
      <div className="content" style={{textAlign:'center'}}>
        <h2 style={{fontSize:'60px', margin:'20px 0'}}>{vitesse} <span style={{fontSize:'20px'}}>km/h</span></h2>
        <p style={{background:'#f1f5f9', padding:'15px', borderRadius:'12px', minHeight:'60px'}}>{status}</p>
        
        {!actif ? (
          <button onClick={lancer} className="btn" style={{background:'#dc2626', width:'100%', padding:'20px', fontSize:'22px', marginTop:'20px', borderRadius:'99px'}}>
            🔴 DÉMARRER LE GUIDAGE
          </button>
        ) : (
          <button onClick={()=>window.location.reload()} className="btn secondaire" style={{width:'100%', marginTop:'20px'}}>
            ARRÊTER
          </button>
        )}
      </div>
    </div>
  )
  }
