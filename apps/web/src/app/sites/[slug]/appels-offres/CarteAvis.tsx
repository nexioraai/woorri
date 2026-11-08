import Link from 'next/link'
import { joursRestants } from './comptesAvis'

// ============================================================================
// LOT 5bis — UN AVIS EST UNE CARTE, PAS UNE LIGNE DE TABLEAU.
//
// LE DÉFAUT : une ligne de tableau met la référence, l'objet, la date et
// l'état sur le même plan. Un fournisseur cherche d'abord DEUX choses — est-ce
// encore ouvert, et combien de temps me reste-t-il. Une carte peut les mettre
// en avant ; une ligne ne le peut pas.
//
// LE COMPTE À REBOURS EST ARRONDI AU JOUR. EPSS affiche
// « 32.406850914144 jours restants » : douze décimales sur un portail d'État
// disent au lecteur que personne n'a relu la page.
//
// L'URGENCE SE VOIT SANS LIRE. Moins de sept jours → la pastille change de
// couleur. C'est une information, pas une décoration : un dossier se prépare
// en une semaine, pas en une journée.
//
// AUCUN TEXTE EN DUR : tous les libellés arrivent traduits.
// ============================================================================

const TRAIT = '#e3e3e3'
const ENCRE = '#111111'
const SOURDINE = '#5b5b5b'

/** La couleur d'un état VISIBLE. Jamais celle de la colonne `etat` brute. */
const TON: Record<string, { fond: string; encre: string }> = {
  ouvert: { fond: '#e8f4ee', encre: '#15603f' },
  preparation: { fond: '#eef2f7', encre: '#3b5068' },
  clos: { fond: '#f1f1f2', encre: '#5b5b5b' },
  attribue: { fond: '#eceaf7', encre: '#4a3f8f' },
}

export default function CarteAvis({
  reference, objet, methode, echeance, etatVisible, libelleEtat,
  href, remiseLe, maintenant, libelles, primary, urgenceSeuil = 7,
}: {
  reference: string
  objet: string
  methode: string | null
  echeance: string | null
  etatVisible: string
  libelleEtat: string
  href: string
  remiseLe: string | null
  maintenant: Date
  libelles: { remise: string; joursRestants: string; nonRenseigne: string }
  primary: string
  urgenceSeuil?: number
}) {
  const jours = joursRestants(remiseLe, maintenant)
  const urgent = jours !== null && jours <= urgenceSeuil && etatVisible === 'ouvert'
  const ton = TON[etatVisible] ?? TON.clos

  return (
    <article className="carteAvis" style={{
      border: `1px solid ${urgent ? '#f0c08a' : TRAIT}`,
      borderRadius: 14, padding: '18px 20px', background: '#ffffff',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <code style={{
          fontSize: 12.5, background: '#f4f4f5', border: `1px solid ${TRAIT}`,
          borderRadius: 7, padding: '3px 8px', color: SOURDINE,
        }}>{reference}</code>

        {methode && (
          <span style={{
            fontSize: 12, fontWeight: 600, borderRadius: 999, padding: '3px 10px',
            background: `color-mix(in srgb, ${primary} 12%, white)`, color: primary,
          }}>{methode}</span>
        )}

        <span style={{
          marginInlineStart: 'auto', fontSize: 12, fontWeight: 700,
          borderRadius: 999, padding: '4px 11px',
          background: ton.fond, color: ton.encre, whiteSpace: 'nowrap',
        }}>{libelleEtat}</span>
      </div>

      <h3 style={{ fontSize: 'clamp(16px, 4vw, 18px)', fontWeight: 600, color: ENCRE, margin: 0, lineHeight: 1.4 }}>
        <Link href={href} style={{ color: 'inherit', textDecoration: 'none' }}>{objet}</Link>
      </h3>

      <div style={{ display: 'flex', gap: 14, alignItems: 'baseline', flexWrap: 'wrap', fontSize: 14 }}>
        <span style={{ color: SOURDINE }}>
          {libelles.remise} <strong style={{ color: ENCRE, fontVariantNumeric: 'tabular-nums' }}>
            {echeance ?? libelles.nonRenseigne}
          </strong>
        </span>
        {/* LE COMPTE À REBOURS NE PARAÎT QUE S'IL INFORME : pas d'échéance,
            ou échéance passée, et il se tait plutôt que d'afficher « -3 ». */}
        {jours !== null && (
          <span style={{
            fontSize: 13, fontWeight: 700, borderRadius: 999, padding: '3px 10px',
            background: urgent ? '#fdf0e1' : '#f4f4f5',
            color: urgent ? '#8a4c08' : SOURDINE,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {jours} {libelles.joursRestants}
          </span>
        )}
      </div>
    </article>
  )
}
