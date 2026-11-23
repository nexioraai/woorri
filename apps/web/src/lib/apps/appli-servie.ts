import 'server-only'
/**
 * L'APPLI PUBLIÉE SOUS CE NOM, pour ses fichiers d'installation (2026-11-22).
 *
 * Les mêmes garanties que `/a/[sous]` : un nom valide, une ligne publiée
 * (jeton présent). Sinon `null`, et la route répond 404 — un nom enregistré
 * mais non payé n'a ni manifeste, ni icône, ni service worker.
 */
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'
import { nomValide } from '@/lib/apps/sous-domaine'
import { apparenceDuDocument } from '@/lib/apps/apparence'
import { identitePwa, pageDOuverture, type IdentitePwa } from '@/lib/apps/pwa'
import { lecturePubliqueDe, type EntiteDeclaree } from '@/lib/apps/entites-declarees'

export type AppliServie = { readonly identite: IdentitePwa; readonly ouverture: string }

export async function identiteDeLAppliServie(sous: string): Promise<IdentitePwa | null> {
  return (await appliServie(sous))?.identite ?? null
}

/** L'appli publiée sous ce nom : son identité, et la page où elle s'ouvre une fois installée. */
export async function appliServie(sous: string): Promise<AppliServie | null> {
  if (!nomValide(sous)) return null
  const lu = await supabaseAdmin
    .from(TABLE_GENERATIONS)
    .select('nom, document, publication_jeton')
    .eq('publication_slug', sous)
    .maybeSingle()
  if (lu.error !== null || lu.data === null || lu.data.publication_jeton === null) return null
  const titre = typeof lu.data.nom === 'string' && lu.data.nom !== '' ? lu.data.nom : 'Application'
  const doc = lu.data.document as { schema?: string; entites?: readonly EntiteDeclaree[] } | null
  return {
    identite: identitePwa(titre, apparenceDuDocument(lu.data.document)),
    ouverture: pageDOuverture({
      aUneBase: (doc?.schema ?? '').includes('create table'),
      aUnePagePublique: (doc?.entites ?? []).some(lecturePubliqueDe),
    }),
  }
}

// ── L'ARRÊT D'URGENCE DE L'INSTALLATION (décision du propriétaire, 2026-11-22).
//
// Un seul réglage, `quota_reglages.pwa_arret = 'oui'`, et TOUTES les applis :
//   · servent un service worker qui efface son cache et se désinstalle ;
//   · ne servent plus de manifeste (404) : plus d'invitation à installer ;
//   · leur page ne porte plus le lien du manifeste ni l'inscription, mais un
//     petit script qui retire un service worker déjà installé.
// Réglage absent, vide, autre que « oui », ou ILLISIBLE : marche normale —
// l'arrêt est un geste du propriétaire, jamais l'effet d'une panne de lecture.
export const CLE_ARRET_INSTALLATION = 'pwa_arret'

export async function installationArretee(): Promise<boolean> {
  try {
    const r = await supabaseAdmin.from('quota_reglages').select('valeur').eq('cle', CLE_ARRET_INSTALLATION).maybeSingle()
    if (r.error !== null || r.data === null) return false
    return String((r.data as { valeur?: unknown }).valeur ?? '').trim().toLowerCase() === 'oui'
  } catch {
    return false
  }
}

export const introuvable = (): Response =>
  new Response('Cette application est introuvable.', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  })
