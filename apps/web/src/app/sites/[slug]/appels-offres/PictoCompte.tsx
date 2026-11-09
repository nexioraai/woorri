import type { ComptesAvis } from './comptesAvis'

// ============================================================================
// LOT 15.8 — LE DESSIN D'UN COMPTEUR D'AVIS.
//
// ── POURQUOI UNE ICÔNE SUR UN CHIFFRE.
//
// Les quatre compteurs disaient « 12 » et « avis actifs » : justes, et
// indistincts. Sur la page d'EPSS que le propriétaire a mise à côté de la
// nôtre, chaque carte porte un carré teinté et son dessin — on retrouve
// « ce qui ferme bientôt » sans relire les quatre libellés.
//
// ── LE DESSIN DIT LE MÊME ÉTAT QUE LE CHIFFRE.
//
// Une horloge sur « archivés » serait pire qu'aucune icône : elle
// contredirait le libellé, et le lecteur croirait le dessin. La
// correspondance porte donc sur LES CLÉS DE `ComptesAvis` elles-mêmes, et le
// cliquet exige que les deux listes coïncident dans les deux sens.
//
// ── EN LIGNE, COMME CEUX DU MENU.
//
// Même raison qu'au lot 15.7 : aucune requête, rien qui arrive après le
// texte sur une connexion lente, et aucune police à parier.
// ============================================================================

export type CleDeCompte = keyof ComptesAvis

const DESSINS: Record<CleDeCompte, React.ReactNode> = {
  // CE QUI COURT — l'avis lui-même, une pièce écrite.
  actifs: (
    <>
      <path d="M13.9 3.2H7.6A1.5 1.5 0 0 0 6.1 4.7v14.6a1.5 1.5 0 0 0 1.5 1.5h8.8a1.5 1.5 0 0 0 1.5-1.5V7.1z" />
      <path d="M13.9 3.2v3.9h4" />
      <path d="M9 11.8h6M9 15.1h6M9 8.6h2.2" />
    </>
  ),

  // CE QUI EST OUVERT AUX OFFRES — le cadenas OUVERT.
  //
  // PAS UNE COCHE : une coche dit « validé », et un avis ouvert aux offres
  // n'est validé de rien.
  //
  // ET PLUS UNE PORTE. Premier jet, le 2026-11-09 : une porte entrebâillée.
  // Vu sur la capture de la page en ligne, à 20 px, elle se lisait comme un
  // fanion. Un pictogramme qu'on doit deviner coûte plus d'attention qu'il
  // n'en fait gagner — autant n'en mettre aucun. L'anse relevée sur le côté
  // se lit à n'importe quelle taille, et elle dit littéralement « ouvert ».
  ouverts: (
    <>
      <path d="M6.3 11.2h10.4a1.5 1.5 0 0 1 1.5 1.5v6.4a1.5 1.5 0 0 1-1.5 1.5H6.3a1.5 1.5 0 0 1-1.5-1.5v-6.4a1.5 1.5 0 0 1 1.5-1.5z" />
      <path d="M14.2 11.2V8a3.4 3.4 0 0 1 6.8 0v1.5" />
      <path d="M11.5 14.5v2.3" />
    </>
  ),

  // CE QUI FERME BIENTÔT — l'horloge. Le seul des quatre qui demande d'agir.
  clotureProchaine: (
    <>
      <circle cx="12" cy="12.4" r="8.2" />
      <path d="M12 7.6v4.8l3.2 2" />
    </>
  ),

  // CE QUI EST CLOS — le carton d'archive, couvercle posé.
  archives: (
    <>
      <path d="M3.3 6.6h17.4v3.5H3.3z" />
      <path d="M4.9 10.1v9a1.4 1.4 0 0 0 1.4 1.4h11.4a1.4 1.4 0 0 0 1.4-1.4v-9" />
      <path d="M10 14h4" />
    </>
  ),
}

/** Les clés qui ont un tracé. Exportée pour que le cliquet énumère. */
export const COMPTES_DESSINES = Object.keys(DESSINS) as CleDeCompte[]

/**
 * Le dessin d'un compteur, dans son carré teinté.
 *
 * `aria-hidden` : le libellé sous le chiffre dit déjà de quoi il s'agit, et
 * un lecteur d'écran qui annoncerait « image douze avis actifs » ajouterait
 * du bruit, pas du sens.
 *
 * La teinte vient de la carte — jamais d'une valeur en dur : le compteur
 * « actifs » prend la couleur du SITE, et les trois autres leur état.
 */
export default function PictoCompte({ cle, couleur }: { cle: CleDeCompte; couleur: string }) {
  return (
    <span aria-hidden="true" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: 38, height: 38, borderRadius: 11, marginBottom: 12,
      background: `color-mix(in srgb, ${couleur} 13%, #ffffff)`,
    }}>
      <svg focusable="false" width="20" height="20" viewBox="0 0 24 24"
        fill="none" stroke={couleur} strokeWidth={1.7}
        strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
        {DESSINS[cle]}
      </svg>
    </span>
  )
}
