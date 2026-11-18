// ============================================================================
// LE MOT DU DIRIGEANT, SOUS LE HERO DE L'ACCUEIL (CPA, 2026-11-18).
//
// Demande : « regarde l'ANIE, l'EPSS, et fais un mix pour avoir une identité
// CPA ». De l'ANIE : le grand portrait, le surtitre « Message officiel », la
// signature. De l'EPSS : la carte, le bandeau de couleur, le badge de rang.
// Propre à la CPA : le bandeau à la couleur DU SITE et un second ton « santé »
// (vert) pour les filets — la couleur choisie par le site n'est jamais changée.
//
// Rendu SEULEMENT sur l'accueil, pour un bloc « citation » avec photo posé sous
// le hero. Les pages de fiche gardent leur rendu (MotPortrait / FicheResponsable).
// Aucun HTML accepté : chaque champ passe par JSX comme du texte.
// ============================================================================

const VERT_SANTE = '#2F9E5A'

export default function MotAccueil({
  photo, titre, texte, auteur, fonction, primary,
}: { photo: string; titre?: string; texte: string; auteur?: string; fonction?: string; primary: string }) {
  const [premier, ...suite] = texte.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  return (
    <article className="motAccueil">
      <style>{`
        .motAccueil { display: grid; grid-template-columns: minmax(260px, 380px) 1fr; background: #ffffff;
          border-radius: 28px; overflow: hidden; box-shadow: 0 30px 60px -34px rgba(0,30,70,.45), 0 0 0 1px rgba(0,30,70,.06) }
        .motAccueil .maPanneau { position: relative; padding: 44px 36px 36px; color: #ffffff;
          background: linear-gradient(160deg, ${primary} 0%, ${primary} 55%, color-mix(in srgb, ${primary} 70%, #000) 100%);
          display: flex; flex-direction: column; align-items: center; text-align: center; overflow: hidden }
        .motAccueil .maPanneau::before { content: ''; position: absolute; width: 260px; height: 260px; border-radius: 50%;
          top: -90px; right: -110px; background: rgba(255,255,255,.07) }
        .motAccueil .maPanneau::after { content: ''; position: absolute; width: 180px; height: 180px; border-radius: 50%;
          bottom: -70px; left: -60px; border: 18px solid rgba(255,255,255,.05) }
        .motAccueil .maBadge { position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 8px; padding: 7px 14px;
          border-radius: 999px; background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.22);
          font-size: 12px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase }
        .motAccueil .maBadge i { width: 8px; height: 8px; border-radius: 50%; background: ${VERT_SANTE}; box-shadow: 0 0 0 3px rgba(47,158,90,.3) }
        .motAccueil .maPortrait { position: relative; z-index: 1; margin: 26px 0 22px; width: 100%; max-width: 280px; aspect-ratio: 4 / 5;
          border-radius: 22px; padding: 6px; background: rgba(255,255,255,.95); box-shadow: 0 24px 40px -18px rgba(0,0,0,.55) }
        .motAccueil .maCadre { width: 100%; height: 100%; border-radius: 17px; overflow: hidden }
        .motAccueil .maPortrait img { width: 100%; height: 100%; object-fit: cover; display: block }
        .motAccueil .maNom { position: relative; z-index: 1; font-size: 19px; font-weight: 700; line-height: 1.3 }
        .motAccueil .maFonction { position: relative; z-index: 1; font-size: 14px; opacity: .78; margin-top: 4px }
        .motAccueil .maTexte { position: relative; padding: 52px 56px 48px }
        .motAccueil .maGuillemet { position: absolute; bottom: -34px; right: 36px; font-family: var(--font-fraunces), Georgia, serif;
          font-size: 150px; line-height: 1; color: ${primary}; opacity: .07; pointer-events: none; user-select: none }
        .motAccueil .maSurtitre { display: flex; align-items: center; gap: 12px; color: ${VERT_SANTE};
          font-size: 13px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase }
        .motAccueil .maSurtitre span { width: 40px; height: 2px; background: ${VERT_SANTE}; display: inline-block }
        .motAccueil h2 { font-family: var(--font-fraunces), Georgia, serif; font-weight: 600; color: ${primary};
          font-size: clamp(28px, 3.4vw, 42px); line-height: 1.12; margin: 14px 0 22px; text-wrap: balance }
        .motAccueil .maPremier { font-size: clamp(18px, 1.7vw, 21px); line-height: 1.6; color: #14213a; margin: 0 }
        .motAccueil .maSuite { font-size: 16.5px; line-height: 1.75; color: #55607a; margin: 16px 0 0 }
        .motAccueil footer { display: flex; align-items: center; gap: 14px; margin-top: 30px; padding-top: 22px; border-top: 1px solid #e6eaf1 }
        .motAccueil footer i { width: 4px; align-self: stretch; border-radius: 4px; background: linear-gradient(${primary}, ${VERT_SANTE}) }
        .motAccueil footer b { display: block; font-family: var(--font-fraunces), Georgia, serif; font-style: italic; font-weight: 500; font-size: 19px; color: ${primary} }
        .motAccueil footer small { display: block; font-size: 13.5px; color: #6b7590; margin-top: 2px }
        /* LE SURVOL (demande CPA, 2026-11-18 : « il n'y a pas d'animation quand
           je pose la flèche »). La carte se soulève, le portrait s'avance et
           la photo respire, les filets s'allongent. Court, et coupé pour qui
           demande moins de mouvement. */
        .motAccueil { transition: transform .45s cubic-bezier(.22,.8,.3,1), box-shadow .45s ease }
        .motAccueil:hover { transform: translateY(-6px); box-shadow: 0 44px 80px -36px rgba(0,30,70,.55), 0 0 0 1px rgba(0,30,70,.08) }
        .motAccueil .maPortrait { transition: transform .5s cubic-bezier(.22,.8,.3,1), box-shadow .5s ease }
        .motAccueil:hover .maPortrait { transform: translateY(-6px) rotate(-1.5deg); box-shadow: 0 34px 50px -20px rgba(0,0,0,.6) }
        .motAccueil .maPortrait img { transition: transform .8s cubic-bezier(.22,.8,.3,1) }
        .motAccueil:hover .maPortrait img { transform: scale(1.06) }
        .motAccueil .maPanneau::before, .motAccueil .maPanneau::after { transition: transform .9s cubic-bezier(.22,.8,.3,1) }
        .motAccueil:hover .maPanneau::before { transform: translate(-24px, 18px) scale(1.08) }
        .motAccueil:hover .maPanneau::after { transform: translate(14px, -12px) rotate(20deg) }
        .motAccueil .maBadge i { transition: box-shadow .4s ease }
        .motAccueil:hover .maBadge i { box-shadow: 0 0 0 6px rgba(47,158,90,.22) }
        .motAccueil .maSurtitre span { transition: width .45s cubic-bezier(.22,.8,.3,1) }
        .motAccueil:hover .maSurtitre span { width: 68px }
        .motAccueil .maGuillemet { transition: transform .7s cubic-bezier(.22,.8,.3,1), opacity .7s ease }
        .motAccueil:hover .maGuillemet { transform: translateX(-14px); opacity: .12 }
        .motAccueil footer i { transition: transform .45s cubic-bezier(.22,.8,.3,1); transform-origin: top }
        .motAccueil:hover footer i { transform: scaleY(1.25) }
        @media (prefers-reduced-motion: reduce) {
          .motAccueil, .motAccueil * , .motAccueil .maPanneau::before, .motAccueil .maPanneau::after { transition: none !important }
          .motAccueil:hover, .motAccueil:hover .maPortrait, .motAccueil:hover .maPortrait img { transform: none }
        }
        @media (max-width: 860px) {
          .motAccueil { grid-template-columns: 1fr; border-radius: 22px }
          .motAccueil .maPanneau { padding: 34px 24px 28px }
          .motAccueil .maPortrait { max-width: 220px; margin: 20px 0 18px }
          .motAccueil .maTexte { padding: 32px 24px 30px }
          .motAccueil .maGuillemet { font-size: 110px; right: 16px; bottom: -26px }
        }
      `}</style>
      <div className="maPanneau">
        <span className="maBadge"><i aria-hidden />Message officiel</span>
        <figure className="maPortrait">
          {/* eslint-disable-next-line @next/next/no-img-element -- fichier du site, hors loader */}
          <div className="maCadre"><img src={photo} alt={auteur ? `Portrait — ${auteur}` : 'Portrait'} loading="lazy" /></div>
        </figure>
        {auteur && <div className="maNom">{auteur}</div>}
        {fonction && <div className="maFonction">{fonction}</div>}
      </div>
      <div className="maTexte">
        <span className="maGuillemet" aria-hidden>»</span>
        <div className="maSurtitre"><span aria-hidden />Le mot de la direction</div>
        {titre && <h2>{titre}</h2>}
        <blockquote style={{ margin: 0 }}>
          {premier && <p className="maPremier">« {premier} »</p>}
          {suite.map((p, i) => <p key={i} className="maSuite">{p}</p>)}
          {(auteur || fonction) && (
            <footer>
              <i aria-hidden />
              <span>
                {auteur && <b>{auteur}</b>}
                {fonction && <small>{fonction}</small>}
              </span>
            </footer>
          )}
        </blockquote>
      </div>
    </article>
  )
}
