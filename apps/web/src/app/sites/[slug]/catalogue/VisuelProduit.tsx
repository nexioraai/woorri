import IllustrationForme from './IllustrationForme'

// ============================================================================
// LE VISUEL D'UN PRODUIT (CPA, 2026-11-19 ; illustrations le 2026-11-20).
//
// La photo de la Centrale quand il y en a une (« image indicative », comme les
// catalogues de référence) ; sinon un DESSIN de la forme (plaquette, flacon et
// seringue, sirop, carton de matériel), comme UniCat (MSF) — jamais une case
// grise vide. Image en chargement différé : on consulte aussi depuis un
// téléphone au Tchad.
//
// Trois tailles : vignette (56 px, liste), carte (pleine largeur, grille),
// grand (fiche, avec la mention « image à titre indicatif »).
// ============================================================================

export type FamilleForme = 'injectable' | 'buvable' | 'comprime' | 'materiel'

export function familleForme(forme: string | null | undefined): FamilleForme {
  const f = (forme ?? '').toLowerCase()
  if (/inject|ampoule|vaccin|perfusion/.test(f)) return 'injectable'
  if (/sirop|buvable|solution|suspension|poudre/.test(f)) return 'buvable'
  if (/comprim|g[ée]lule|capsule|plaquette/.test(f)) return 'comprime'
  return 'materiel'
}

export default function VisuelProduit({ photo, forme, denomination, accent, grand = false, carte = false }: {
  photo?: string | null; forme?: string | null; denomination: string; accent: string; grand?: boolean; carte?: boolean
}) {
  const plein = grand || carte
  return (
    <figure style={{ margin: 0 }}>
      <div style={{ position: 'relative', overflow: 'hidden', aspectRatio: carte ? '4 / 3' : '1 / 1', width: plein ? undefined : 56,
        borderRadius: grand ? 24 : carte ? 16 : 14,
        background: `radial-gradient(120% 90% at 20% 10%, color-mix(in srgb, ${accent} 14%, #ffffff), color-mix(in srgb, ${accent} 4%, #ffffff) 60%, #f8fafc)`,
        border: carte ? 'none' : '1px solid #e8eaee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {photo
          // eslint-disable-next-line @next/next/no-img-element -- fichier de la Centrale, hors loader
          ? <img src={photo} alt={denomination} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span className="illu" style={{ display: 'inline-flex' }}>
              <IllustrationForme forme={familleForme(forme)} accent={accent} taille={grand ? 200 : carte ? '58%' : 46} />
            </span>}
      </div>
      {grand && <figcaption style={{ marginTop: 8, fontSize: 12.5, color: '#9ca3af', textAlign: 'center' }}>Image à titre indicatif</figcaption>}
    </figure>
  )
}
