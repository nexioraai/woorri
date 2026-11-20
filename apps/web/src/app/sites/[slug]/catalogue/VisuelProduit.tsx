import { Pill, Syringe, FlaskConical, PackageOpen } from 'lucide-react'

// ============================================================================
// LE VISUEL D'UN PRODUIT (CPA, 2026-11-19).
//
// La photo de la Centrale quand il y en a une (« image indicative », comme les
// catalogues de référence) ; sinon une vignette dessinée selon la FORME
// (comprimé, injectable, buvable, matériel) — jamais une case grise vide.
// Image en chargement différé : on consulte aussi depuis un téléphone au Tchad.
// ============================================================================

export type FamilleForme = 'injectable' | 'buvable' | 'comprime' | 'materiel'

export function familleForme(forme: string | null | undefined): FamilleForme {
  const f = (forme ?? '').toLowerCase()
  if (/inject|ampoule|vaccin|perfusion/.test(f)) return 'injectable'
  if (/sirop|buvable|solution|suspension|poudre/.test(f)) return 'buvable'
  if (/comprim|g[ée]lule|capsule|plaquette/.test(f)) return 'comprime'
  return 'materiel'
}

function IconeForme({ forme, size, color }: { forme: FamilleForme; size: number; color: string }) {
  const p = { size, strokeWidth: 1.4, color, 'aria-hidden': true, style: { opacity: 0.85 } } as const
  if (forme === 'injectable') return <Syringe {...p} />
  if (forme === 'buvable') return <FlaskConical {...p} />
  if (forme === 'comprime') return <Pill {...p} />
  return <PackageOpen {...p} />
}

export default function VisuelProduit({ photo, forme, denomination, accent, grand = false }: {
  photo?: string | null; forme?: string | null; denomination: string; accent: string; grand?: boolean
}) {
  const taille = grand ? undefined : 56
  return (
    <figure style={{ margin: 0 }}>
      <div style={{ position: 'relative', overflow: 'hidden', aspectRatio: '1 / 1', width: taille, borderRadius: grand ? 24 : 14,
        background: `radial-gradient(120% 90% at 20% 10%, color-mix(in srgb, ${accent} 18%, #ffffff), color-mix(in srgb, ${accent} 6%, #ffffff) 60%, #f8fafc)`,
        border: '1px solid #e8eaee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {photo
          // eslint-disable-next-line @next/next/no-img-element -- fichier de la Centrale, hors loader
          ? <img src={photo} alt={denomination} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <IconeForme forme={familleForme(forme)} size={grand ? 96 : 26} color={accent} />}
      </div>
      {grand && <figcaption style={{ marginTop: 8, fontSize: 12.5, color: '#9ca3af', textAlign: 'center' }}>Image à titre indicatif</figcaption>}
    </figure>
  )
}
