import 'server-only'
// SEMER LES PAGES ET LE LOGO D'UNE INSTITUTION, À LA GÉNÉRATION (lot 4, 2026-11-26).
//
// Appelé par la génération (`/api/chat`) juste après l'insertion du site,
// pour une institution seulement. Écrit :
//   · les pages et sous-pages de `squeletteInstitution` dans `site_pages`
//     (publiées, dans le menu) — l'éditeur visuel les modifie ensuite ;
//   · un logo PROVISOIRE (le sigle sur la couleur du site, en PNG), seulement
//     si le site n'a pas de logo ; le client le remplace depuis « Éditer ».
// Ne lève jamais : un échec ici ne doit pas défaire un site déjà créé —
// il est RENDU dans le compte-rendu, et journalisé par l'appelant.
import sharp from 'sharp'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { designationValable, familleInstitution, type FamilleInstitution } from './familleInstitution'
import { institution, sigleDuSite } from './institution'
import { missionsDe, RECHERCHE_PHOTOS, squeletteInstitution, svgLogoProvisoire } from './squeletteInstitution'
import { CHIFFRES_PAR_FAMILLE, phrasesBandeau, photoAfricaine } from './institutionVisuel'

export type GenerationInstitution = {
  name?: unknown; type?: unknown; lang?: unknown; designation?: unknown
  about?: unknown; mission?: unknown; sections?: unknown; primaryColor?: unknown
}

export type CompteRenduSemis = { pages: number; logo: boolean; famille: FamilleInstitution; erreurs: string[] }

type Dependances = {
  admin: typeof supabaseAdmin
  versPng: (svg: string) => Promise<Buffer>
  maintenant: () => number
}

const texte = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null)

export async function semerInstitution(
  o: { slug: string; demande: string; genere: GenerationInstitution; photos: (recherche: string) => Promise<{ url: string; alt: string }[]> },
  d: Dependances = { admin: supabaseAdmin, versPng: (svg) => sharp(Buffer.from(svg)).png().toBuffer(), maintenant: Date.now },
): Promise<CompteRenduSemis> {
  const famille = familleInstitution(o.demande) ?? familleInstitution(texte(o.genere.type)) ?? 'agence_publique'
  const rendu: CompteRenduSemis = { pages: 0, logo: false, famille, erreurs: [] }
  const { data: site, error: eSite } = await d.admin.from('sites').select('id,logo_url,assistant_actif').eq('slug', o.slug).maybeSingle()
  const s = site as { id: string; logo_url: string | null; assistant_actif?: boolean | null } | null
  if (eSite !== null || s === null) { rendu.erreurs.push(`site introuvable : ${eSite?.message ?? o.slug}`); return rendu }

  // DEUX PHOTOS DIFFÉRENTES, AU CONTEXTE AFRICAIN VÉRIFIÉ (lot 4b) : la première
  // recherche qui en donne une l'emporte ; aucune : pas de photo plutôt qu'un décor d'ailleurs.
  const q = RECHERCHE_PHOTOS[famille]
  const premiere = async (recherches: readonly string[], exclue: string | null): Promise<string | null> => {
    for (const r of recherches) {
      const trouvee = (await o.photos(r).catch(() => [])).find((p) => photoAfricaine(p.alt) && p.url !== exclue)
      if (trouvee) return trouvee.url
    }
    return null
  }
  const presentation = await premiere(q.presentation, null)
  const activite = await premiere(q.activite, presentation)

  const pages = squeletteInstitution({
    famille,
    inst: institution(texte(o.genere.lang), designationValable(o.genere.designation)),
    about: texte(o.genere.about), mission: texte(o.genere.mission),
    missions: missionsDe(o.genere.sections, 'missions'),
    services: missionsDe(o.genere.sections, 'services'),
    photos: { presentation, activite },
    bandeau: phrasesBandeau(texte(o.genere.mission), texte(o.genere.about)),
    chiffres: CHIFFRES_PAR_FAMILLE[famille],
    assistant: s.assistant_actif === true,
  })
  const { error: ePages } = await d.admin.from('site_pages').insert(pages.map((p) => ({ ...p, site_id: s.id })))
  if (ePages !== null) rendu.erreurs.push(`pages : ${ePages.message}`)
  else rendu.pages = pages.length

  // LOT 4c — UNE INSTITUTION GÉNÉRÉE NAÎT « MAQUETTE DE DÉMONSTRATION » : un
  // bandeau « non officielle » sur toutes les pages, que le propriétaire retire
  // dans « Éditer » une fois le site validé par l'institution. Personne ne
  // prend une maquette pour le site officiel d'un ministère.
  const { error: eMaquette } = await d.admin.from('sites').update({ maquette_demo: true }).eq('id', s.id)
  if (eMaquette !== null) rendu.erreurs.push(`maquette : ${eMaquette.message}`)

  // LE LOGO PROVISOIRE — jamais par-dessus un logo existant.
  if (!s.logo_url) {
    try {
      const png = await d.versPng(svgLogoProvisoire(sigleDuSite(texte(o.genere.name)), texte(o.genere.primaryColor)))
      const chemin = `${o.slug}/logo-provisoire-${String(d.maintenant())}.png`
      const { error: eUp } = await d.admin.storage.from('site-images').upload(chemin, png, { contentType: 'image/png', cacheControl: '31536000', upsert: false })
      if (eUp !== null) throw new Error(eUp.message)
      const url = d.admin.storage.from('site-images').getPublicUrl(chemin).data.publicUrl
      const { error: eMaj } = await d.admin.from('sites').update({ logo_url: url }).eq('id', s.id).is('logo_url', null)
      if (eMaj !== null) throw new Error(eMaj.message)
      rendu.logo = true
    } catch (e) {
      rendu.erreurs.push(`logo : ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return rendu
}
