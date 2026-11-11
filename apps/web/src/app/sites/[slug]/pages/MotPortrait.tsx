// ============================================================================
// LE MOT D'UN RESPONSABLE — le bloc « citation » quand il porte une PHOTO.
//
// Demande CPA (2026-11-11), sur le modèle de la page « Mot de la DG » d'un site
// institutionnel voisin : le portrait à gauche avec le nom et la fonction, le
// mot à droite. Sans photo, le bloc citation garde son rendu d'avant : rien ne
// change pour les sites qui l'emploient déjà.
//
// Le texte se découpe en paragraphes sur les lignes vides. Le PREMIER est le
// mot, mis en avant ; les suivants le développent.
// ============================================================================

export default function MotPortrait({
  photo, titre, texte, auteur, fonction, primary,
}: { photo: string; titre?: string; texte: string; auteur?: string; fonction?: string; primary: string }) {
  const [premier, ...suite] = texte.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  return (
    <section className="motPortrait">
      <style>{`
        .motPortrait { display: grid; grid-template-columns: minmax(200px, 300px) 1fr; gap: 40px; align-items: start }
        .motPortrait figure { margin: 0 }
        .motPortrait img { width: 100%; aspect-ratio: 4 / 5; object-fit: cover; border-radius: 14px; display: block;
          box-shadow: 0 18px 40px -22px rgba(0,0,0,.45) }
        @media (max-width: 720px) {
          .motPortrait { grid-template-columns: 1fr; gap: 22px }
          .motPortrait figure { max-width: 280px }
        }
      `}</style>
      <figure>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt={auteur ? `Portrait — ${auteur}` : 'Portrait'} loading="lazy" />
        {(auteur || fonction) && (
          <figcaption style={{ marginTop: 14 }}>
            {auteur && <div style={{ fontSize: 17, fontWeight: 700, color: primary }}>{auteur}</div>}
            {fonction && <div style={{ fontSize: 14, color: '#5b5b5b', marginTop: 2 }}>{fonction}</div>}
          </figcaption>
        )}
      </figure>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: primary, fontSize: 13, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' }}>
          <span aria-hidden style={{ width: 36, height: 2, background: primary, display: 'inline-block' }} />
          Message
        </div>
        {titre && <h2 style={{ fontSize: 30, lineHeight: 1.2, margin: '12px 0 18px', color: '#111111', textWrap: 'balance' }}>{titre}</h2>}
        <blockquote style={{ margin: 0 }}>
          <p style={{ fontSize: 20, lineHeight: 1.6, color: '#111111', margin: 0 }}>« {premier} »</p>
          {suite.map((p, i) => (
            <p key={i} style={{ fontSize: 17, lineHeight: 1.7, color: '#4a4a4a', margin: '16px 0 0' }}>{p}</p>
          ))}
          {auteur && <footer style={{ marginTop: 22, fontSize: 17, fontStyle: 'italic', color: primary }}>— {auteur}</footer>}
        </blockquote>
      </div>
    </section>
  )
}
