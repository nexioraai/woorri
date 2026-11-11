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

// ============================================================================
// AFFICHAGE « BOÎTES » (demande CPA, 2026-11-11) : le schéma classique, de haut
// en bas, des boîtes reliées par des traits, les subordonnés côte à côte.
//
// FACULTATIF. Sans `affichage: 'boites'` sur le bloc, rien ne change : l'arbre
// replié ci-dessus reste le rendu par défaut de tous les sites.
//
// TOUJOURS UNE LISTE IMBRIQUÉE `<ul>/<li>` : les traits sont du CSS posé sur la
// même structure. Le lecteur d'écran lit le même arbre que dans l'autre rendu.
// Un schéma large se fait glisser de côté dans son cadre, jamais la page.
// ============================================================================

export const AFFICHAGE_BOITES = 'boites'

function BrancheBoites({ items, parent, niveau }: { items: EntreeOrg[]; parent: string | null; niveau: number }) {
  const enfants = enfantsDe(items, parent)
  if (enfants.length === 0 || niveau > PROFONDEUR_MAX) return null
  return (
    <ul>
      {enfants.map((e) => (
        <li key={e.cle}>
          <div className="boiteOrg">
            <div className="boiteFonction">{e.fonction}</div>
            {e.nom && <div className="boiteNom">{e.nom}</div>}
          </div>
          <BrancheBoites items={items} parent={e.cle} niveau={niveau + 1} />
        </li>
      ))}
    </ul>
  )
}

function OrganigrammeBoites({ items, titre }: { items: EntreeOrg[]; titre?: string }) {
  return (
    <div className="organigramme organigrammeBoites">
      <style>{`
        .organigrammeBoites .cadreOrg { overflow-x: auto; overscroll-behavior-x: contain; padding: 4px 0 10px }
        .organigrammeBoites .arbreOrg { display: flex; justify-content: center; min-width: max-content; margin: 0 auto }
        .organigrammeBoites ul { display: flex; justify-content: center; margin: 0; padding: 22px 0 0; list-style: none; position: relative }
        .organigrammeBoites .arbreOrg > ul { padding-top: 0 }
        .organigrammeBoites li { position: relative; padding: 22px 6px 0; display: flex; flex-direction: column; align-items: center }
        .organigrammeBoites .arbreOrg > ul > li { padding-top: 0 }
        /* Les traits : une moitié de barre horizontale de chaque côté, plus la
           descente vers la boîte. */
        .organigrammeBoites li::before, .organigrammeBoites li::after {
          content: ''; position: absolute; top: 0; width: 50%; height: 22px; border-top: 1.5px solid ${TRAIT_BOITES};
        }
        .organigrammeBoites li::before { right: 50% }
        .organigrammeBoites li::after { left: 50%; border-left: 1.5px solid ${TRAIT_BOITES} }
        .organigrammeBoites li:only-child::before { display: none }
        .organigrammeBoites li:only-child::after { border-top: none }
        .organigrammeBoites li:first-child::before, .organigrammeBoites li:last-child::after { border-top: none }
        .organigrammeBoites li:last-child::before { border-right: 1.5px solid ${TRAIT_BOITES}; border-top: 1.5px solid ${TRAIT_BOITES} }
        .organigrammeBoites li:last-child:first-child::before { display: none }
        .organigrammeBoites .arbreOrg > ul > li::before, .organigrammeBoites .arbreOrg > ul > li::after { display: none }
        /* La descente du supérieur vers la barre de ses subordonnés. */
        .organigrammeBoites ul ul::before {
          content: ''; position: absolute; top: 0; left: 50%; height: 22px; border-left: 1.5px solid ${TRAIT_BOITES};
        }
        .organigrammeBoites .boiteOrg {
          background: #ffffff; border: 1px solid #d6d6d6; border-radius: 4px;
          box-shadow: 0 2px 6px rgba(0,0,0,.12);
          padding: 14px 10px; width: 144px; min-height: 92px; box-sizing: border-box;
          display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;
        }
        .organigrammeBoites .arbreOrg > ul > li > .boiteOrg { width: 220px }
        .organigrammeBoites .boiteFonction {
          font-size: 12px; line-height: 1.55; letter-spacing: .02em; color: #444444; text-transform: uppercase;
        }
        .organigrammeBoites .boiteNom { font-size: 13px; color: #111111; margin-top: 8px; font-weight: 600 }
      `}</style>
      {titre && (
        <h3 style={{
          fontSize: 15, fontWeight: 700, letterSpacing: '0.04em',
          textTransform: 'uppercase', color: SOURDINE, margin: '0 0 18px', textAlign: 'center',
        }}>{titre}</h3>
      )}
      <div className="cadreOrg">
        <div className="arbreOrg">
          <BrancheBoites items={items} parent={null} niveau={1} />
        </div>
      </div>
    </div>
  )
}

const TRAIT_BOITES = '#9a9a9a'

export default function Organigramme({
  items, titre, affichage, primary = '#1e4d8c',
}: { items: EntreeOrg[]; titre?: string; affichage?: string; primary?: string }) {
  if (items.length === 0) return null
  if (affichage !== AFFICHAGE_BOITES) return <OrganigrammeArbre items={items} titre={titre} primary={primary} />
  // Les boîtes sur écran large ; sur écran étroit, le schéma ne tient pas et
  // son sommet sortirait du cadre : l'arbre replié prend le relais. Une seule
  // des deux formes est AFFICHÉE, donc une seule est lue (display:none retire
  // l'autre de l'arbre d'accessibilité).
  return (
    <>
      <style>{`
        /* Le schéma SORT de la colonne de texte, centré sur la page : un
           organigramme se lit en largeur, la colonne de lecture est trop
           étroite pour lui. Jamais plus large que l'écran moins ses marges. */
        .orgSeulementLarge {
          display: block;
          /* Une MARGE calculée, pas un décalage transformé : la boîte occupe
             réellement sa place, donc aucun ancêtre ne devient défilant de
             côté (un translate laissait une zone fantôme à droite). */
          width: min(1180px, calc(100vw - 48px));
          margin-left: calc(50% - min(590px, calc(50vw - 24px)));
        }
        .orgSeulementEtroit { display: none }
        @media (max-width: 1023px) {
          .orgSeulementLarge { display: none }
          .orgSeulementEtroit { display: block }
        }
      `}</style>
      <div className="orgSeulementLarge"><OrganigrammeBoites items={items} titre={titre} /></div>
      <div className="orgSeulementEtroit"><OrganigrammeArbre items={items} titre={titre} primary={primary} /></div>
    </>
  )
}

function OrganigrammeArbre({
  items, titre, primary,
}: { items: EntreeOrg[]; titre?: string; primary: string }) {
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
