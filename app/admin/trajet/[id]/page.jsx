'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';

export default function TrajetEngin({ params }) {
  const { id } = params;
  const router = useRouter();
  const conteneurCarte = useRef(null);
  const carteRef = useRef(null);
  const [autorise, setAutorise] = useState(null);
  const [engin, setEngin] = useState(null);
  const [points, setPoints] = useState([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.push('/admin/login');
        return;
      }
      const { data: agent } = await supabase
        .from('agents')
        .select('role')
        .eq('user_id', data.session.user.id)
        .single();

      if (!agent || agent.role !== 'admin') {
        router.push('/admin/login');
        return;
      }
      setAutorise(true);
      charger();
    });
  }, [id]);

  async function charger() {
    setChargement(true);

    const { data: enginData } = await supabase
      .from('engins')
      .select('id, plaque, marque, modele')
      .eq('id', id)
      .single();
    setEngin(enginData);

    const { data: verifs } = await supabase
      .from('verifications')
      .select('id, created_at, lieu_latitude, lieu_longitude, resultat, via_public')
      .eq('engin_id', id)
      .not('lieu_latitude', 'is', null)
      .order('created_at', { ascending: true });

    setPoints(verifs || []);
    setChargement(false);
  }

  useEffect(() => {
    if (chargement || points.length === 0 || !conteneurCarte.current) return;

    // Charge Leaflet dynamiquement (bibliothèque de carte gratuite, sans clé API)
    const lienCss = document.createElement('link');
    lienCss.rel = 'stylesheet';
    lienCss.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(lienCss);

    import('leaflet').then((L) => {
      if (carteRef.current) {
        carteRef.current.remove();
      }

      const coords = points.map((p) => [p.lieu_latitude, p.lieu_longitude]);
      const carte = L.map(conteneurCarte.current).setView(coords[0], 14);
      carteRef.current = carte;

      const couchePlan = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(carte);

      const coucheSatellite = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: '© Esri' }
      );

      L.control.layers({ 'Plan': couchePlan, 'Satellite': coucheSatellite }).addTo(carte);

      L.polyline(coords, { color: '#1E3A5F', weight: 3 }).addTo(carte);

      points.forEach((p, index) => {
        const libelleCouleur = p.resultat === 'vole' ? '#C81E2C' : p.resultat === 'suspect' ? '#B9770E' : '#0F7A4E';
        const icone = L.divIcon({
          html: `<div style="background:${libelleCouleur};color:#fff;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border:2px solid #fff;">${index + 1}</div>`,
          className: '',
          iconSize: [26, 26],
        });
        L.marker([p.lieu_latitude, p.lieu_longitude], { icon: icone })
          .addTo(carte)
          .bindPopup(`Point ${index + 1} — ${new Date(p.created_at).toLocaleString('fr-FR')}<br/>${p.via_public ? 'Vérification publique' : 'Contrôle agent'}`);
      });

      carte.fitBounds(coords, { padding: [30, 30] });
    });

    return () => {
      if (carteRef.current) {
        carteRef.current.remove();
        carteRef.current = null;
      }
    };
  }, [chargement, points]);

  if (autorise === null || chargement) {
    return (
      <div className="shell">
        <div className="content"><p>Chargement…</p></div>
      </div>
    );
  }

  return (
    <div className="shell" style={{ maxWidth: 720 }}>
      <div className="header">
        <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: 'var(--brand)', fontSize: 14, padding: 0, marginBottom: 10, cursor: 'pointer' }}>← Retour</button>
        <p className="sigle">Portail Administration</p>
        <h1>Trajet reconstitué</h1>
      </div>
      <div className="content">
        {engin && (
          <p style={{ fontSize: 14, color: 'var(--ink-soft)', marginBottom: 16 }}>
            {engin.marque} {engin.modele} — {engin.plaque || 'sans plaque'}
          </p>
        )}

        {points.length === 0 ? (
          <p style={{ color: 'var(--ink-soft)' }}>
            Aucun point de passage avec position enregistrée pour cet engin. La position n'est enregistrée que si l'appareil qui scanne l'a autorisé.
          </p>
        ) : (
          <>
            <div ref={conteneurCarte} style={{ width: '100%', height: 400, borderRadius: 4, border: '1px solid var(--line)' }} />
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 12 }}>
              {points.length} point{points.length > 1 ? 's' : ''} de passage, du plus ancien (1) au plus récent ({points.length}).
            </p>
          </>
        )}
      </div>
    </div>
  );
}
