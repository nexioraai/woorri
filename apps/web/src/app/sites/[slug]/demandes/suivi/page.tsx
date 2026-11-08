import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { resolveSiteBaseUrl } from '../../themes/shared'
import HtmlLang from '../../themes/HtmlLang'
import { lireBlocs } from '../../pages/blocs'
import BlocsDePage from '../../pages/BlocsDePage'
import FormulaireSuivi from '../FormulaireSuivi'

// ============================================================================
// LOT 8 — LA PAGE DE SUIVI D'UNE DEMANDE.
//
// UNE ROUTE MOTEUR, comme `/appels-offres` : tout portail en a besoin, et la
// câbler sur une page déclarée obligerait chaque site à la nommer pareil.
//
// SES TEXTES SONT ÉDITABLES SANS ÉCRAN NEUF : ils viennent d'une page
// déclarée au chemin `demandes/suivi`, même table, même éditeur, même
// vocabulaire de blocs. Rien n'est écrit en dur que le client ne puisse
// remplacer.
//
// `noindex` EST POSÉ. Une page qui consulte des données personnelles n'a
// rien à faire dans un moteur de recherche : elle n'apporte aucun contenu
// public, et l'indexer invite à y entrer des références au hasard.
// ============================================================================

type Props = { params: Promise<{ slug: string }> }

async function site(slug: string) {
  const { data } = await supabase
    .from('sites_public')
    .select('id,slug,name,primary_color,lang,custom_domain')
    .eq('slug', slug)
    .maybeSingle()
  return data as { id: string; slug: string; name: string; primary_color: string | null; lang: string | null; custom_domain: string | null } | null
}

const L = {
  fr: {
    titre: 'Suivre une demande', accueil: '← Accueil',
    phrase: 'Entrez la référence reçue lors de votre envoi et l’adresse électronique qui a servi à l’envoyer.',
    reference: 'Référence', email: 'Adresse électronique',
    chercher: 'Consulter', cherche: 'Recherche…',
    etat: 'État', deposee: 'Déposée le', majLe: 'Mise à jour le',
    etats: { recu: 'Reçue', en_cours: 'En cours de traitement', repondu: 'Répondue', clos: 'Close' } as Record<string, string>,
    trop: 'Trop de tentatives, ou service momentanément indisponible. Réessayez plus tard.',
  },
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const s = await site(slug)
  if (!s) return {}
  const base = resolveSiteBaseUrl(s, (await headers()).get('host'))
  return {
    title: `${L.fr.titre} — ${s.name}`,
    description: L.fr.phrase,
    alternates: { canonical: `${base}/demandes/suivi` },
    // Une page qui consulte des données personnelles ne s'indexe pas.
    robots: { index: false, follow: false },
  }
}

export default async function SuiviPage({ params }: Props) {
  const { slug } = await params
  const s = await site(slug)
  if (!s) notFound()

  const base = resolveSiteBaseUrl(s, (await headers()).get('host'))
  const accent = s.primary_color || '#1e4d8c'

  const { data: declaree } = await supabase
    .from('site_pages_public')
    .select('blocs')
    .eq('site_id', s.id)
    .eq('chemin', 'demandes/suivi')
    .maybeSingle()
  const textes = lireBlocs((declaree as { blocs?: unknown } | null)?.blocs)

  return (
    <div lang={s.lang ?? 'fr'}>
      <HtmlLang lang={s.lang ?? 'fr'} />
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '56px 20px 80px' }}>
        <p style={{ fontSize: 14, margin: '0 0 18px' }}>
          <Link href={base} style={{ color: accent }}>{L.fr.accueil}</Link>
        </p>

        <h1 style={{ fontSize: 'clamp(26px, 6vw, 36px)', fontWeight: 700, margin: '0 0 10px' }}>
          {L.fr.titre}
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.6, opacity: 0.75, margin: '0 0 28px', maxWidth: '60ch' }}>
          {L.fr.phrase}
        </p>

        {textes.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <BlocsDePage blocs={textes} base={base} primary={accent} lang={s.lang} />
          </div>
        )}

        <FormulaireSuivi primary={accent} libelles={L.fr} />
      </main>
    </div>
  )
}
