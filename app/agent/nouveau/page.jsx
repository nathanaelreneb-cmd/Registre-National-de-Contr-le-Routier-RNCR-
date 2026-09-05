'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

function genererCodeQr() {
  // Code lisible, préfixé, unique — ex: RNCR-8F3K2C1A
  const alea = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `RNCR-${alea}`;
}

export default function NouvelEngin() {
  const router = useRouter();
  const [form, setForm] = useState({
    type_engin: 'moto',
    marque: '',
    modele: '',
    plaque: '',
    numero_chassis: '',
    proprietaire_nom: '',
    proprietaire_telephone: '',
    proprietaire_cni: '',
  });
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);

  function majChamp(champ, valeur) {
    setForm((f) => ({ ...f, [champ]: valeur }));
  }

  async function enregistrer(e) {
    e.preventDefault();
    setErreur('');

    if (!form.proprietaire_nom || !form.proprietaire_telephone || !form.proprietaire_cni) {
      setErreur('Le nom, le téléphone et le numéro CNI du propriétaire sont obligatoires.');
      return;
    }

    setChargement(true);

    const qrCode = genererCodeQr();

    const { data, error } = await supabase
      .from('engins')
      .insert({ ...form, qr_code: qrCode, statut: 'actif' })
      .select('id')
      .single();

    setChargement(false);

    if (error) {
      setErreur("Erreur lors de l'enregistrement. Réessayez.");
      return;
    }

    router.push(`/agent/fiche/${data.id}`);
  }

  return (
    <div className="shell">
      <div className="header">
        <p className="sigle">Espace agent</p>
        <h1>Enregistrer un engin</h1>
      </div>
      <div className="content">
        {erreur && <div className="erreur">{erreur}</div>}

        <form onSubmit={enregistrer}>
          <div className="field">
            <label htmlFor="type_engin">Type d'engin</label>
            <select
              id="type_engin"
              value={form.type_engin}
              onChange={(e) => majChamp('type_engin', e.target.value)}
            >
              <option value="moto">Moto</option>
              <option value="tricycle">Tricycle</option>
              <option value="voiture">Voiture</option>
              <option value="camion">Camion</option>
              <option value="autre">Autre</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="marque">Marque</label>
            <input id="marque" value={form.marque} onChange={(e) => majChamp('marque', e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="modele">Modèle</label>
            <input id="modele" value={form.modele} onChange={(e) => majChamp('modele', e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="plaque">Plaque d'immatriculation</label>
            <input id="plaque" value={form.plaque} onChange={(e) => majChamp('plaque', e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="chassis">Numéro de châssis (optionnel)</label>
            <input id="chassis" value={form.numero_chassis} onChange={(e) => majChamp('numero_chassis', e.target.value)} />
          </div>

          <div className="divider" />

          <div className="field">
            <label htmlFor="nom">Nom du propriétaire</label>
            <input id="nom" required value={form.proprietaire_nom} onChange={(e) => majChamp('proprietaire_nom', e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="tel">Téléphone du propriétaire</label>
            <input id="tel" required value={form.proprietaire_telephone} onChange={(e) => majChamp('proprietaire_telephone', e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="cni">Numéro CNI du propriétaire</label>
            <input id="cni" required value={form.proprietaire_cni} onChange={(e) => majChamp('proprietaire_cni', e.target.value)} />
          </div>

          <button type="submit" className="btn" disabled={chargement}>
            {chargement ? 'Enregistrement…' : "Enregistrer et générer le QR code"}
          </button>
        </form>
      </div>
    </div>
  );
}
