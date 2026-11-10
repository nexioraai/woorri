// LOT 17 — les textes visibles du site, rendus modifiables dans l'éditeur.
// Trois pages déclarées, préremplies avec les mots actuels :
//   · assistant-du-site     (NON publiée) — les textes de la bulle ;
//   · inscription/formulaire (NON publiée) — les intitulés du formulaire ;
//   · plan-du-site          (publiée, hors menu) — le libellé du plan.
// Rejouable : une page déjà déclarée n'est pas touchée.
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')
  .filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] }))
const { createClient } = await import('@supabase/supabase-js')
const srv = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data: site } = await srv.from('sites').select('id').eq('slug', 'centrale-pharmaceutique-d-achats-cpa-1793979506814').single()
const { data: pages } = await srv.from('site_pages').select('chemin').eq('site_id', site.id)

const A_POSER = [
  { chemin: 'assistant-du-site', parent: null, titre: 'Assistant CPA', menu: false, publie: false, ordre: 0,
    chapeau: 'Bonjour, bienvenue sur le site de la Centrale Pharmaceutique d’Achats.\n\nComment puis-je vous aider ?',
    corps: 'Cette page n’est pas publiée : elle contient les textes de la bulle d’assistant. Le titre est l’en-tête de la bulle, l’introduction est le message d’accueil, et chaque question ci-dessous est un bouton. Une adresse du site écrite dans une réponse (par exemple /inscription) devient un bouton de lien.',
    blocs: [{ type: 'questions', titre: 'Boutons de la bulle', items: [
      { question: 'Appels d’offres', reponse: 'Tous les appels d’offres publiés sont ici, avec leur date limite de remise et leur portée (nationale, internationale ou ouverte à tous). Voici le lien : /appels-offres' },
      { question: 'Devenir fournisseur', reponse: 'Les conditions et la marche à suivre pour devenir fournisseur sont détaillées ici. Voici le lien : /fournisseurs/enregistrement — et les conditions d’achat : /fournisseurs/conditions' },
      { question: 'Créer un compte', reponse: 'Remplissez le formulaire d’inscription : nom, organisation, téléphone, adresse électronique et mot de passe. Votre compte est créé tout de suite, sans attente. Voici le lien : /inscription' },
      { question: 'Actualités', reponse: 'Les communiqués et l’agenda de la Centrale sont publiés ici : /actualites/communiques et /actualites/evenements' },
      { question: 'Recrutement', reponse: 'Pour une candidature ou une question sur le recrutement, écrivez-nous depuis la page Contact : /#contact' },
      { question: 'Contact', reponse: 'Les coordonnées de la Centrale et le formulaire de contact sont sur la page d’accueil : /#contact — pour les achats, la direction des achats : /fournisseurs/contact' },
    ] }] },
  { chemin: 'inscription/formulaire', parent: 'inscription', titre: 'Formulaire d’inscription — intitulés', menu: false, publie: false, ordre: 0,
    chapeau: 'Cette page n’est pas publiée. Changez seulement la colonne « Texte affiché » ; la colonne « Champ » sert de repère et ne doit pas changer.',
    corps: null,
    blocs: [{ type: 'tableau', titre: 'Intitulés du formulaire', entetes: ['Champ', 'Texte affiché'], lignes: [
      ['Nom', 'Nom complet'], ['Organisation', 'Organisation ou entreprise'], ['Vous êtes', 'Vous êtes'],
      ['Fournisseur', 'Fournisseur'], ['Structure sanitaire', 'Structure sanitaire'], ['Téléphone', 'Téléphone'],
      ['Adresse électronique', 'Adresse électronique'], ['Mot de passe', 'Mot de passe'], ['Bouton', 'Créer mon compte'],
    ] }] },
  { chemin: 'plan-du-site', parent: null, titre: 'Plan du site', menu: false, publie: true, ordre: 0, chapeau: null, corps: null, blocs: [] },
]
for (const p of A_POSER) {
  if ((pages ?? []).some((x) => x.chemin === p.chemin)) { console.log('déjà là :', p.chemin); continue }
  const { error } = await srv.from('site_pages').insert({ site_id: site.id, ...p })
  console.log(error ? `REFUS ${p.chemin} : ${error.message}` : `posée : /${p.chemin} — « ${p.titre} »`)
}
