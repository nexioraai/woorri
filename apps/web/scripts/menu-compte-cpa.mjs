// LOT 17 — « Mon compte » dans le menu du site de la CPA.
//
// Mesuré le 2026-11-10 : aucun lien du site ne menait à /inscription ni à
// /connexion — la création de compte existait, mais personne ne pouvait la
// trouver. On DÉCLARE trois pages aux chemins des écrans du moteur : le
// moteur sert toujours l'écran, la page déclarée porte le LIBELLÉ du menu, le
// titre et la phrase d'introduction — tous modifiables depuis l'éditeur
// (« Pages du site »), comme n'importe quelle page.
//
// Rejouable : une page déjà déclarée n'est pas touchée.
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')
  .filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] }))
const { createClient } = await import('@supabase/supabase-js')
const srv = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data: site } = await srv.from('sites').select('id').eq('slug', 'centrale-pharmaceutique-d-achats-cpa-1793979506814').single()
const { data: pages } = await srv.from('site_pages').select('chemin,ordre').eq('site_id', site.id)
const max = Math.max(0, ...(pages ?? []).map((p) => p.ordre ?? 0))
const A_POSER = [
  { chemin: 'espace-client', parent: null, titre: 'Mon compte', chapeau: null, ordre: max + 1 },
  { chemin: 'connexion', parent: 'espace-client', titre: 'Se connecter', chapeau: 'Entrez avec l’adresse électronique de votre compte.', ordre: 1 },
  { chemin: 'inscription', parent: 'espace-client', titre: 'Créer un compte', chapeau: 'Remplissez ce formulaire : votre compte est créé tout de suite, sans attente.', ordre: 2 },
]
for (const p of A_POSER) {
  if ((pages ?? []).some((x) => x.chemin === p.chemin)) { console.log('déjà là :', p.chemin); continue }
  const { error } = await srv.from('site_pages').insert({ site_id: site.id, ...p, menu: true, publie: true })
  console.log(error ? `REFUS ${p.chemin} : ${error.message}` : `posée : /${p.chemin} — « ${p.titre} »`)
}
const { data: relu } = await srv.from('site_pages').select('chemin,parent,titre,menu,publie').eq('site_id', site.id).in('chemin', A_POSER.map((p) => p.chemin))
console.log('relu :', JSON.stringify(relu))
