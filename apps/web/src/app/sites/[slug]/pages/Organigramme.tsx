// ============================================================================
// LOT 4 — L'ORGANIGRAMME.
//
// « INTERACTIF » SANS JAVASCRIPT. Les branches se replient avec `<details>`
// natif. La page reste entière si le script échoue, et le dépliant fonctionne
// au doigt comme au clavier.
//
// « ALTERNATIVE 2D » : il n'y en a pas DEUX. Un schéma au trait ne se lit pas
// au lecteur d'écran, ne se traduit pas et ne s'édite pas. Ce rendu EST la
// forme accessible — une liste imbriquée `<ul>/<li>`, que le lecteur d'écran
// annonce comme « niveau 2, élément 3 sur 5 ». Donner un dessin PLUS une
// liste, c'est entretenir deux vérités qui divergeront.
//
// L'ARBRE EST RECONSTRUIT DEPUIS UN JSON PLAT. Chaque entrée porte son
// `parent`, comme `site_pages`.
//
// UNE ENTRÉE ORPHELINE N'EST PAS PERDUE. Si son `parent` ne désigne rien,
// elle remonte à la racine plutôt que de disparaître : un responsable qui
// s'évapore parce qu'on a mal tapé une clé est pire qu'un responsable mal
// placé — personne ne comprend pourquoi il a disparu.
// ============================================================================

export type EntreeOrg = {
  cle: string
  parent?: string | null
  fonction: string
  nom?: string
  detail?: string
}

/** Profondeur maximale rendue. Au-delà, un organigramme ne se lit plus. */
export const PROFONDEUR_MAX = 4

const ENCRE = '#111111'
const SOURDINE = '#5b5b5b'
const TRAIT = '#e3e3e3'

/**
 * Les enfants d'une clé. `null` rend les RACINES : les entrées sans parent,
 * et celles dont le parent ne désigne aucune clé connue.
 */
export function enfantsDe(items: EntreeOrg[], parent: string | null): EntreeOrg[] {
  const cles = new Set(items.map((i) => i.cle))
  return items.filter((i) => {
    const p = i.parent ?? null
    const rattache = p !== null && cles.has(p) && p !== i.cle
    return parent === null ? !rattache : p === parent
  })
}

function Branche({
  items, parent, niveau, primary,
}: { items: EntreeOrg[]; parent: string | null; niveau: number; primary: string }) {
  const enfants = enfantsDe(items, parent)
  if (enfants.length === 0 || niveau > PROFONDEUR_MAX) return null

  return (
    <ul style={{
      margin: 0,
      padding: niveau === 1 ? 0 : '10px 0 0 22px',
      listStyle: 'none',
      // ① LE TRAIT VERTICAL part du supérieur et s'arrête au DERNIER
      //    subordonné : une ligne qui dépasse dans le vide suggère une
      //    branche qu'on aurait oublié d'afficher.
      borderLeft: niveau === 1 ? 'none' : `2px solid ${TRAIT}`,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {enfants.map((e, i) => {
        const dernier = i === enfants.length - 1
        const petits = enfantsDe(items, e.cle)
        const carte = (
          <div className="carteOrg" style={{
            border: `1px solid ${niveau === 1 ? primary : TRAIT}`, borderRadius: 12,
            padding: '12px 14px', background: niveau === 1 ? `color-mix(in srgb, ${primary} 8%, white)` : '#ffffff',
          }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: ENCRE, lineHeight: 1.35 }}>{e.fonction}</div>
            {/* LE NOM EST FACULTATIF. Un organigramme nominatif faux sur un
                site d'État est pire qu'un organigramme sans noms. */}
            {e.nom && <div style={{ fontSize: 15, color: primary, marginTop: 2 }}>{e.nom}</div>}
            {e.detail && <div style={{ fontSize: 14, color: SOURDINE, marginTop: 4, lineHeight: 1.5 }}>{e.detail}</div>}
          </div>
        )

        return (
          <li key={e.cle} style={{ paddingInlineStart: niveau === 1 ? 0 : 14, position: 'relative' }}>
            {niveau > 1 && (
              <>
                {/* ① LE COUDE vers cette entrée. */}
                <span aria-hidden style={{
                  position: 'absolute', insetInlineStart: 0, top: 24,
                  width: 14, height: 2, background: TRAIT,
                }} />
                {/* ET LE MASQUE qui coupe le trait vertical après la
                    DERNIÈRE entrée : sans lui, la ligne descend dans le
                    vide et laisse croire à une branche manquante. */}
                {dernier && (
                  <span aria-hidden style={{
                    position: 'absolute', insetInlineStart: -2, top: 26,
                    width: 2, bottom: -10, background: '#ffffff',
                  }} />
                )}
              </>
            )}
            {petits.length === 0 ? carte : (
              <details open={niveau <= 2}>
                <summary style={{ cursor: 'pointer', listStyle: 'none' }}>
                  <span style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ flex: 1 }}>{carte}</span>
                    <span aria-hidden style={{ fontSize: 13, color: SOURDINE, paddingTop: 14 }}>▾</span>
                  </span>
                </summary>
                <Branche items={items} parent={e.cle} niveau={niveau + 1} primary={primary} />
              </details>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export default function Organigramme({
  items, titre, primary = '#1e4d8c',
}: { items: EntreeOrg[]; titre?: string; primary?: string }) {
  if (items.length === 0) return null
  return (
    <div className="organigramme">
      {/* ① CONNECTEURS · ② PROFONDEUR · ③ DÉPLIAGE ANIMÉ · ④ DÉPLACEMENT.
          TOUT EN CSS. Pas une ligne de JavaScript : l'arbre reste entier si
          le script échoue, et chaque effet se coupe sous
          `prefers-reduced-motion`.

          LA 3D A ÉTÉ ÉCARTÉE, et pour trois raisons vérifiables dans ce
          fichier : un canevas 3D ne s'affiche pas sans script, n'a aucune
          structure pour un lecteur d'écran, et ne passerait pas par
          l'éditeur. Ici l'arbre EST une liste imbriquée. */}
      <style>{`
        .organigramme li { position: relative }
        .organigramme details > summary::-webkit-details-marker { display: none }

        /* ③ LE DÉPLIAGE : la branche glisse au lieu d'apparaître d'un coup. */
        .organigramme details[open] > ul { animation: brancheOuvre .28s cubic-bezier(.22,.8,.3,1) both }
        @keyframes brancheOuvre {
          from { opacity: 0; transform: translateY(-6px) }
          to   { opacity: 1; transform: none }
        }
        .organigramme details > summary > span > span:last-child {
          transition: transform .25s cubic-bezier(.22,.8,.3,1);
        }
        .organigramme details[open] > summary > span > span:last-child { transform: rotate(180deg) }

        /* ② LA PROFONDEUR : la carte se soulève au survol et au clavier. */
        .organigramme .carteOrg {
          transition: transform .22s cubic-bezier(.22,.8,.3,1), box-shadow .22s ease;
          box-shadow: 0 1px 2px rgba(0,0,0,.04);
        }
        .organigramme .carteOrg:hover,
        .organigramme summary:focus-visible .carteOrg {
          transform: translateY(-2px);
          box-shadow: 0 10px 24px -14px rgba(0,0,0,.4);
        }
        .organigramme summary:focus-visible { outline: none }
        .organigramme summary:focus-visible .carteOrg { outline: 3px solid ${primary}; outline-offset: 2px }

        /* ④ LE DÉPLACEMENT : un organigramme large se fait glisser au doigt
           au lieu de forcer la page entière à défiler de côté. */
        .organigramme .cadreOrg { overflow-x: auto; overscroll-behavior-x: contain; padding-bottom: 6px }

        @media (prefers-reduced-motion: reduce) {
          .organigramme details[open] > ul { animation: none }
          .organigramme .carteOrg,
          .organigramme details > summary > span > span:last-child { transition: none }
          .organigramme .carteOrg:hover { transform: none }
        }
      `}</style>
      {titre && (
        <h3 style={{
          fontSize: 15, fontWeight: 700, letterSpacing: '0.04em',
          textTransform: 'uppercase', color: SOURDINE, margin: '0 0 14px',
        }}>{titre}</h3>
      )}
      <div className="cadreOrg">
        <Branche items={items} parent={null} niveau={1} primary={primary} />
      </div>
    </div>
  )
}
