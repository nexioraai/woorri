import { socialUrl } from '@/lib/social'
import { Instagram, Facebook, TikTok, WhatsApp, X, YouTube, LinkedIn, Telegram } from './BrandIcons'

// ============================================================================
// LOT 15.4 — LES RÉSEAUX, EN UN SEUL ENDROIT.
//
// LE DÉFAUT, MESURÉ : chaque thème recopiait son propre bloc de liens, avec
// ses quatre réseaux écrits à la main. Quatre thèmes × quatre réseaux, et
// aucun moyen d'en ajouter un sans toucher quatre fichiers — donc sans en
// oublier un.
//
// Ici la liste est UNE. Ajouter un réseau se fait à une ligne, et les quatre
// thèmes le servent le jour même.
//
// LES QUATRE PREMIERS SONT LA PANOPLIE D'UN MARCHAND ; les quatre suivants
// celle d'une institution. Aucun n'est obligatoire : un site n'affiche que
// ce qu'il a rempli, et aucun bloc ne paraît s'il n'a rien.
// ============================================================================

type Social = Record<string, string | undefined>

/** L'ordre d'affichage. Il est STABLE : deux chargements rendent le même. */
const RESEAUX = [
  { cle: 'facebook', nom: 'Facebook', Icone: Facebook, fond: '#1877F2' },
  { cle: 'x', nom: 'X', Icone: X, fond: '#000000' },
  { cle: 'linkedin', nom: 'LinkedIn', Icone: LinkedIn, fond: '#0A66C2' },
  { cle: 'youtube', nom: 'YouTube', Icone: YouTube, fond: '#FF0000' },
  { cle: 'telegram', nom: 'Telegram', Icone: Telegram, fond: '#229ED9' },
  { cle: 'instagram', nom: 'Instagram', Icone: Instagram, fond: '#C13584' },
  { cle: 'tiktok', nom: 'TikTok', Icone: TikTok, fond: '#010101' },
  { cle: 'whatsapp', nom: 'WhatsApp', Icone: WhatsApp, fond: '#25D366' },
] as const

/** Les réseaux RÉELLEMENT renseignés, avec leur adresse résolue. */
export function reseauxRemplis(social: Social | null | undefined) {
  const s = social ?? {}
  return RESEAUX
    .map((r) => ({ ...r, url: socialUrl(r.cle, s[r.cle]) }))
    .filter((r): r is typeof r & { url: string } => !!r.url)
}

/**
 * DEUX APPARENCES, UNE SEULE LISTE.
 *
 * Les thèmes ne dessinent pas leurs icônes pareil : Editorial emploie des
 * pastilles aux couleurs des marques, Vif, Noir et Aurora des traits nus.
 * Imposer une apparence unique abîmerait trois thèmes sur quatre ; recopier
 * la liste dans chacun ramènerait le défaut qu'on ferme ici.
 */
export default function ReseauxSociaux({
  social, libelle, className = '', variante = 'pastilles', couleur,
}: {
  social: Social | null | undefined
  libelle?: string
  className?: string
  variante?: 'pastilles' | 'traits'
  couleur?: string
}) {
  const liens = reseauxRemplis(social)
  // AUCUN BLOC SI RIEN N'EST REMPLI. Un titre « Suivez-nous » au-dessus de
  // zéro lien annonce une présence qui n'existe pas.
  if (liens.length === 0) return null

  return (
    <div className={className}>
      {libelle && (
        <div className="text-xs uppercase tracking-wider opacity-60 mb-3">{libelle}</div>
      )}
      <div className={`flex flex-wrap ${variante === 'pastilles' ? 'gap-2.5' : 'gap-4'}`}>
        {liens.map(({ cle, nom, Icone, fond, url }) => (
          <a
            key={cle}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={nom}
            title={nom}
            className={
              variante === 'pastilles'
                ? 'flex items-center justify-center w-11 h-11 rounded-xl text-white transition-transform hover:-translate-y-0.5 focus-visible:-translate-y-0.5'
                : 'transition-opacity hover:opacity-70 focus-visible:opacity-70'
            }
            style={variante === 'pastilles' ? { backgroundColor: fond } : (couleur ? { color: couleur } : undefined)}
          >
            <Icone className="w-5 h-5" />
          </a>
        ))}
      </div>
    </div>
  )
}
