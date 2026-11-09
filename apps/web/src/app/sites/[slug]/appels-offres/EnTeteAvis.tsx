import { type ComptesAvis } from './comptesAvis'
import PictoCompte, { type CleDeCompte } from './PictoCompte'

// ============================================================================
// LOT 5bis — LE BANDEAU ET LES QUATRE COMPTEURS.
//
// LE DÉFAUT, VU SUR LES CAPTURES : notre page servait un tableau nu sur fond
// blanc. Celle d'EPSS sert la même information, et un fournisseur y trouve
// en trois secondes ce qu'il cherche.
//
// UN CHIFFRE AFFICHÉ EST UN CHIFFRE MESURÉ. Les quatre nombres arrivent
// DÉJÀ calculés depuis les avis réels (`comptesAvis.ts`). Aucun n'est
// saisissable, et ce composant n'en invente aucun.
//
// LA COULEUR VIENT DU SITE. `primary` est celle du thème — la CPA a son
// vert et ne s'en servait presque pas. Rien n'est écrit en dur ici, sinon
// les 42 sites auraient le même bandeau bleu.
//
// AUCUN TEXTE EN DUR NON PLUS : titre et phrase sont passés par la page,
// qui les tient des libellés traduits ou des blocs déclarés par le client.
// ============================================================================

function teinte(hex: string, alpha: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

export default function EnTeteAvis({
  titre, phrase, filDAriane, comptes, libelles, primary, rtl = false,
}: {
  titre: string
  phrase: string
  filDAriane: React.ReactNode
  comptes: ComptesAvis
  libelles: { actifs: string; ouverts: string; clotureProchaine: string; archives: string }
  primary: string
  rtl?: boolean
}) {
  // LA CLÉ VOYAGE AVEC LA CARTE. Sans elle, le dessin se choisirait sur le
  // LIBELLÉ — traduit, donc différent dans chaque langue, donc faux dès la
  // deuxième. Les quatre clés sont celles de `ComptesAvis`.
  const cartes: { k: CleDeCompte; n: number; l: string; c: string }[] = [
    { k: 'actifs', n: comptes.actifs, l: libelles.actifs, c: primary },
    { k: 'ouverts', n: comptes.ouverts, l: libelles.ouverts, c: '#16794a' },
    { k: 'clotureProchaine', n: comptes.clotureProchaine, l: libelles.clotureProchaine, c: '#b45309' },
    { k: 'archives', n: comptes.archives, l: libelles.archives, c: '#5b5b5b' },
  ]

  return (
    <>
      <style>{`
        .enteteAvis { animation: enteteEntre .5s cubic-bezier(.22,.8,.3,1) both; }
        @keyframes enteteEntre { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
        .carteCompte { transition: transform .25s cubic-bezier(.22,.8,.3,1), box-shadow .25s ease; }
        .carteCompte:hover { transform: translateY(-3px); box-shadow: 0 10px 26px -12px rgba(0,0,0,.25); }
        @media (prefers-reduced-motion: reduce) {
          .enteteAvis { animation: none }
          .carteCompte { transition: none }
          .carteCompte:hover { transform: none }
        }
      `}</style>

      <header className="enteteAvis" style={{
        background: `linear-gradient(135deg, ${primary} 0%, ${teinte(primary, 0.78)} 100%)`,
        color: '#ffffff',
        borderRadius: 16,
        padding: 'clamp(24px, 5vw, 40px)',
        marginBottom: 20,
      }}>
        <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 10 }}>{filDAriane}</div>
        <h1 style={{ fontSize: 'clamp(26px, 6vw, 40px)', fontWeight: 700, margin: '0 0 10px', lineHeight: 1.15 }}>
          {titre}
        </h1>
        <p style={{ fontSize: 'clamp(15px, 3.8vw, 17px)', lineHeight: 1.6, margin: 0, maxWidth: '60ch', opacity: 0.93 }}>
          {phrase}
        </p>
      </header>

      {/* LES QUATRE COMPTEURS. À zéro, ils affichent 0 — jamais rien :
          une case vide laisserait croire que la donnée manque. */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 12, marginBottom: 28,
        direction: rtl ? 'rtl' : 'ltr',
      }}>
        {cartes.map((c) => (
          <div key={c.l} className="carteCompte" style={{
            border: '1px solid #e3e3e3', borderRadius: 14, padding: '18px 18px',
            background: '#ffffff',
          }}>
            <PictoCompte cle={c.k} couleur={c.c} />
            <div style={{
              fontSize: 30, fontWeight: 800, lineHeight: 1.05,
              color: c.c, fontVariantNumeric: 'tabular-nums',
            }}>{c.n}</div>
            <div style={{ fontSize: 14, color: '#5b5b5b', marginTop: 6, lineHeight: 1.4 }}>{c.l}</div>
          </div>
        ))}
      </div>
    </>
  )
}
