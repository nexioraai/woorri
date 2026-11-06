/**
 * MESURER `appels_offres` SUR LA VRAIE BASE — 21 points.
 *
 * ── POURQUOI CE FICHIER EXISTE (GEN-D032, 2026-11-06).
 *
 * Le 2026-11-06 j'ai annoncé « 14 points verts » sur cette table. Les 14
 * étaient justes sur ce qu'ils testaient ; aucun ne regardait le SITE. Et
 * l'instrument lui-même était un script jetable, écrit à côté du dépôt :
 * quand le propriétaire a demandé de le rejouer, IL N'EXISTAIT PLUS. Il n'y
 * avait rien à rejouer.
 *
 * La règle qui en sort : un relevé ne vaut que si l'instrument qui le produit
 * ENTRE DANS LE DÉPÔT AVEC LUI. Un chiffre annoncé depuis un script écrit à
 * côté n'est pas un relevé, c'est un souvenir.
 *
 * Ce fichier n'est donc PAS les 14 points rejoués — ils n'existent plus. Ce
 * sont 21 points réécrits, dont les 14 d'origine sont un sous-ensemble par
 * intention. La distinction est écrite ici plutôt que lissée.
 *
 * ── CE QU'IL NE FAIT PAS, ET C'EST DÉLIBÉRÉ.
 *
 * Il ne crée AUCUN site. Les trois états de site dont il a besoin (publié /
 * non publié / archivé) sont DÉCOUVERTS parmi les sites réels, et seuls des
 * AVIS témoins y sont rattachés. Publier ou archiver un site réel pour une
 * mesure serait toucher à l'œuvre d'un client ; découvrir son état ne l'est
 * pas. Si un état manque, le point est déclaré NON MESURABLE — jamais
 * supposé.
 *
 * ── LES QUATRE RÈGLES DE `temoin-en-base.mjs`, TENUES ICI AUSSI.
 *
 * ① MARQUE RÉSERVÉE, SUR DEUX COLONNES. Tout témoin porte `reference_slug`
 *   préfixé par `temoin-jetable-` ET `reference` préfixé par
 *   `TÉMOIN JETABLE`. `appels_offres` n'a pas d'`owner_id` — sa location est
 *   `site_id` — donc la marque vit dans les colonnes à valeur réservable.
 *
 *   POURQUOI DEUX, ET C'EST UN DÉFAUT MESURÉ DE CE FICHIER MÊME. La première
 *   version ne balayait que `reference_slug`. Or le point 4 pose DÉLIBÉRÉMENT
 *   un `reference_slug` malformé (« Z Z/É! ») : tant que la borne manquait,
 *   la ligne était acceptée — et elle a SURVÉCU au nettoyage, mesuré le
 *   2026-11-06. Le balayage filtrait sur la seule colonne que le cas de test
 *   corrompt exprès.
 *
 *   L'INVARIANT QUI FERME LA CLASSE : chaque cas n'altère QU'UN champ. Le
 *   balayage interroge les DEUX. Aucune ligne ne peut donc échapper aux deux
 *   filtres à la fois — y compris le point 6, qui vide `reference`.
 * ② NETTOYAGE GARANTI ET VÉRIFIÉ, par `try/finally` puis relecture.
 * ③ JOURNALISÉ : chaque pose et chaque retrait s'impriment.
 * ④ BALAYAGE D'OUVERTURE : un `finally` ne protège pas d'un SIGKILL.
 *
 * Usage : node scripts/mesurer-appels-offres.mjs
 */
import { clientAdmin } from './temoin-en-base.mjs'

const MARQUE = 'temoin-jetable-'
const MARQUE_REF = 'TÉMOIN JETABLE'
const sb = clientAdmin()

let vus = 0, verts = 0
const horodate = () => new Date().toISOString().slice(11, 19)
const journal = (quoi, detail) => console.log(`  [${horodate()}] ${quoi}${detail ? ' — ' + detail : ''}`)

function point(n, libelle, obtenu, attendu) {
  vus += 1
  const ok = obtenu === attendu
  if (ok) verts += 1
  console.log(`  ${ok ? '🟢' : '🔴'} ${String(n).padStart(2)}. ${libelle}`)
  if (!ok) console.log(`        attendu « ${attendu} » · obtenu « ${obtenu} »`)
  return ok
}
/** Le code d'erreur, ou 'accordé' — jamais un booléen : un refus a une CAUSE. */
const issue = (r) => (r.error ? r.error.code : 'accordé')

/** Le filtre de retrait : les DEUX colonnes marquables. Voir règle ①. */
const FILTRE = `reference_slug.like.${MARQUE}*,reference.like.${MARQUE_REF}*`

async function balayer() {
  const r = await sb.from('appels_offres').delete().or(FILTRE).select('id')
  if (r.error) return journal('balayage impossible', r.error.message)
  if ((r.data ?? []).length) journal('fantômes retirés', String(r.data.length))
}

async function poser(siteId, suffixe, publie) {
  const slug = `${MARQUE}${suffixe}`
  const r = await sb.from('appels_offres').insert({
    site_id: siteId, reference: `TÉMOIN JETABLE ${suffixe}`, reference_slug: slug,
    etat: 'ouvert', objet: 'témoin jetable — mesure de visibilité', publie,
  }).select('id').maybeSingle()
  if (r.error) throw new Error(`témoin « ${suffixe} » non posé : ${r.error.code} ${r.error.message}`)
  journal('posé', `${slug} (publie=${publie})`)
  return r.data.id
}

async function retirer() {
  const del = await sb.from('appels_offres').delete().or(FILTRE).select('id')
  const reste = await sb.from('appels_offres').select('id,reference,reference_slug').or(FILTRE)
  if (del.error || (reste.data ?? []).length) {
    journal('⚠ RETRAIT RATÉ — LIGNES SURVIVANTES',
      del.error?.message ?? (reste.data ?? []).map((r) => `« ${r.reference} » / « ${r.reference_slug} »`).join(' · '))
  } else {
    journal('retiré', `${(del.data ?? []).length} témoin(s)`)
  }
}

// ── LES TROIS SITES, DÉCOUVERTS ─────────────────────────────────────
const { data: tous, error: eSites } = await sb
  .from('sites').select('id,slug,published,archived_at').limit(2000)
if (eSites) { console.error('lecture des sites impossible :', eSites.message); process.exit(1) }

const publie   = tous.find((s) => s.published === true  && s.archived_at === null)
const brouillon= tous.find((s) => s.published === false && s.archived_at === null)
const archive  = tous.find((s) => s.archived_at !== null)
const autre    = tous.find((s) => s.published === true && s.archived_at === null && s.id !== publie?.id)

console.log('\n═══ LES SITES TÉMOINS, DÉCOUVERTS PARMI LES SITES RÉELS ═══\n')
for (const [role, s] of [['publié', publie], ['non publié', brouillon], ['archivé', archive], ['second publié', autre]]) {
  console.log(`  ${role.padEnd(14)} ${s ? s.slug.slice(0, 52) : '⚠ AUCUN — points correspondants NON MESURABLES'}`)
}
if (!publie) { console.error('\naucun site publié : rien de mesurable'); process.exit(1) }

// ── PRÉALABLE : LA VUE EXISTE-T-ELLE POUR L'API, ET PAS SEULEMENT EN BASE ?
//
// `pg_views` dit la vérité du MOTEUR. PostgREST, lui, sert depuis un CACHE DE
// SCHÉMA : une vue créée et non rechargée existe en base et reste
// INATTEIGNABLE par tout client — PGRST205. Le bloc de vérification SQL de
// `appels_offres.sql` compte `pg_views` et ne peut donc PAS voir ce cas.
//
// Mesuré le 2026-11-06 : avant la création de la vue, les points 13 à 19
// rendaient tous PGRST205. Ils étaient rouges pour la bonne raison — mais le
// même code serait rendu par une vue EXISTANTE et non publiée par l'API, et
// rien ne distinguerait les deux. D'où ce préalable, qui échoue BRUYAMMENT
// plutôt que de laisser sept points rougir en désignant la mauvaise cause.
{
  const { createClient } = await import('@supabase/supabase-js')
  const { readFileSync: lire } = await import('node:fs')
  const ev = {}
  for (const l of lire('.env.local', 'utf8').split('\n')) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(l.trim()); if (m) ev[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  const cli = createClient(ev.NEXT_PUBLIC_SUPABASE_URL, ev.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const sonde = await cli.from('appels_offres_public').select('reference').limit(1)
  if (sonde.error?.code === 'PGRST205') {
    console.log('\n' + '█'.repeat(66))
    console.log('█  LA VUE N’EST PAS VUE PAR L’API — PGRST205.')
    console.log('█  Elle peut exister en base : aucun client ne peut l’atteindre.')
    console.log('█  Recharger le cache de schéma PostgREST, puis relancer.')
    console.log('█'.repeat(66) + '\n')
    process.exit(1)
  }
  if (sonde.error) {
    console.log(`\n⚠ la vue répond ${sonde.error.code} — ${sonde.error.message.slice(0, 60)}\n`)
  } else {
    console.log('\n  préalable : la vue est ATTEIGNABLE PAR L’API (pas seulement présente en base)')
  }
}

await balayer()
console.log('\n═══ 21 POINTS ═══\n')
try {
  // ── A. CE QUE LA BASE REFUSE D'ÉCRIRE (8 points) ────────────────
  console.log('  A. L’IDENTITÉ ET LES BORNES — ce que la base refuse d’écrire\n')
  // SLUG UNIQUE PAR ESSAI — DÉFAUT MESURÉ DE CE FICHIER MÊME le 2026-11-06.
  // Avec un slug partagé, un essai ACCEPTÉ (faute de borne) faisait échouer le
  // suivant en `23505` au lieu de son vrai code : le point 6 rendait « 23505 »
  // alors qu'il mesurait la borne de `reference`. Un point contaminé par le
  // succès d'un autre point ne mesure plus ce qu'il annonce.
  let nEssai = 0
  const essai = (champs) => {
    nEssai += 1
    return sb.from('appels_offres').insert({
      site_id: publie.id,
      reference: `${MARQUE_REF} essai ${nEssai}`,
      reference_slug: `${MARQUE}essai-${nEssai}`,
      etat: 'ouvert', objet: 'témoin jetable', publie: false, ...champs,
    }).select('id').maybeSingle()
  }

  point(1, 'site_id vers un site inexistant → refusé (FK)',
    issue(await essai({ site_id: '00000000-0000-0000-0000-000000000000' })), '23503')
  point(2, 'site_id nul → refusé (NOT NULL)',
    issue(await essai({ site_id: null })), '23502')
  point(3, 'etat hors des trois valeurs → refusé (CHECK)',
    issue(await essai({ etat: 'cloture' })), '23514')
  point(4, 'reference_slug mal formé « Z Z/É! » → refusé — IL PART DANS L’URL',
    issue(await essai({ reference_slug: 'Z Z/É!' })), '23514')
  point(5, 'objet de trois espaces → refusé (btrim)',
    issue(await essai({ objet: '   ' })), '23514')
  point(6, 'reference vide → refusé — NOT NULL n’arrête pas la chaîne vide',
    issue(await essai({ reference: '' })), '23514')

  const idCollision = await poser(publie.id, 'collision', false)
  point(7, 'même reference_slug sur le MÊME site → refusé (unicité)',
    issue(await essai({ reference_slug: `${MARQUE}collision` })), '23505')
  if (autre) {
    point(8, 'même reference_slug sur un AUTRE site → ACCEPTÉ — l’unicité est PAR SITE',
      issue(await sb.from('appels_offres').insert({
        site_id: autre.id, reference: 'TÉMOIN JETABLE collision', reference_slug: `${MARQUE}collision`,
        etat: 'ouvert', objet: 'témoin jetable', publie: false,
      }).select('id').maybeSingle()), 'accordé')
  } else { console.log('  ⚪  8. second site publié absent — NON MESURABLE') }
  void idCollision

  // ── B. CE QUE anon NE PEUT PAS FAIRE (7 points) ─────────────────
  console.log('\n  B. LES PRIVILÈGES — la table ne rend rien, la vue ne rend que SELECT\n')
  const { data: env } = { data: null }
  void env
  const { createClient } = await import('@supabase/supabase-js')
  const { readFileSync } = await import('node:fs')
  const e = {}
  for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(l.trim()); if (m) e[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  const anon = createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })

  point(9,  'anon SELECT sur la TABLE → refusé (GEN-D031 : c’était ACCORDÉ)',
    issue(await anon.from('appels_offres').select('id').limit(1)), '42501')
  point(10, 'anon INSERT sur la table → refusé',
    issue(await anon.from('appels_offres').insert({ site_id: publie.id, reference: 'x', reference_slug: 'x', etat: 'ouvert', objet: 'x' })), '42501')
  point(11, 'anon UPDATE sur la table → refusé',
    issue(await anon.from('appels_offres').update({ objet: 'réécrit' }).like('reference_slug', `${MARQUE}%`)), '42501')
  point(12, 'anon DELETE sur la table → refusé',
    issue(await anon.from('appels_offres').delete().like('reference_slug', `${MARQUE}%`)), '42501')
  // DEUX GARDES, ET LA MESURE DU 2026-11-06 DIT LAQUELLE RÉPOND.
  //
  // J'attendais `42501` (privilège refusé). La base rend `55000`
  // (`object_not_in_prerequisite_state`) : la vue n'est pas AUTO-MODIFIABLE,
  // parce que son `FROM` porte DEUX relations (la jointure sur `sites_public`).
  // PostgreSQL refuse l'écriture par la STRUCTURE, avant toute question de
  // privilège — il faudrait une règle `DO INSTEAD` ou un trigger `INSTEAD OF`.
  //
  // C'est plus fort que ce que j'attendais, et c'est exactement ce qui a
  // manqué à `sites_public` : son `FROM` ne portait QU'UNE relation, donc elle
  // ÉTAIT auto-modifiable, et le `GRANT ALL` par défaut suffisait à la rendre
  // écrivable par un visiteur anonyme (DEBT-073, cinq jours).
  //
  // CE POINT N'ASSERTE DONC PAS LE CODE, MAIS LE REFUS — et il IMPRIME le
  // mécanisme. Exiger `42501` ferait rougir un état MEILLEUR que l'attendu, et
  // un cliquet qui rougit sur une amélioration finit par être désarmé.
  // La garde de privilège, elle, se mesure ailleurs : `information_schema`
  // doit ne donner que SELECT à anon (relevé du 2026-11-06, 16 lignes dont
  // `anon · SELECT` et `authenticated · SELECT`, aucune autre).
  const refus = (r) => (r.error ? `refusé (${r.error.code})` : 'ACCORDÉ')
  point(13, 'anon INSERT sur la VUE → refusé',
    refus(await anon.from('appels_offres_public').insert({ site_id: publie.id, reference: 'x', reference_slug: 'x', etat: 'ouvert', objet: 'x' })), 'refusé (55000)')
  point(14, 'anon UPDATE sur la vue → refusé',
    refus(await anon.from('appels_offres_public').update({ objet: 'réécrit' }).like('reference_slug', `${MARQUE}%`)), 'refusé (55000)')
  point(15, 'anon DELETE sur la vue → refusé',
    refus(await anon.from('appels_offres_public').delete().like('reference_slug', `${MARQUE}%`)), 'refusé (55000)')

  // ── C. L'INVARIANT DE VISIBILITÉ (6 points) ─────────────────────
  console.log('\n  C. L’INVARIANT DE VISIBILITÉ — avis publié ET site publié ET site non archivé\n')
  const vu = async (slug) => {
    const r = await anon.from('appels_offres_public').select('reference_slug').eq('reference_slug', slug)
    return r.error ? `erreur ${r.error.code}` : (r.data.length ? 'visible' : 'invisible')
  }

  await poser(publie.id, 'visible', true)
  point(16, 'avis publié sur site publié → VISIBLE par anon', await vu(`${MARQUE}visible`), 'visible')
  await poser(publie.id, 'brouillon-avis', false)
  point(17, 'avis NON publié sur site publié → invisible', await vu(`${MARQUE}brouillon-avis`), 'invisible')

  if (brouillon) {
    await poser(brouillon.id, 'site-non-publie', true)
    point(18, 'avis PUBLIÉ sur site NON PUBLIÉ → invisible  ← LE TROU DE GEN-D031',
      await vu(`${MARQUE}site-non-publie`), 'invisible')
  } else { console.log('  ⚪ 18. aucun site non publié — NON MESURABLE') ; vus += 1 }

  if (archive) {
    await poser(archive.id, 'site-archive', true)
    point(19, 'avis PUBLIÉ sur site ARCHIVÉ → invisible  ← l’autre moitié de l’invariant',
      await vu(`${MARQUE}site-archive`), 'invisible')
  } else { console.log('  ⚪ 19. aucun site archivé — NON MESURABLE'); vus += 1 }

  // VERT QUI NE MESURE RIEN — DÉFAUT MESURÉ DE CE FICHIER MÊME le 2026-11-06.
  // La première version lisait `colonnes.data && 'publie' in colonnes.data`.
  // Quand la vue n'existait PAS, `data` valait `null`, l'expression était
  // fausse, et le point rendait « absente » — VERT. Il annonçait l'absence
  // d'une colonne dans une vue inexistante. Une absence de ligne et une
  // absence de colonne ne doivent pas se ressembler.
  const colonnes = await anon.from('appels_offres_public').select('*').eq('reference_slug', `${MARQUE}visible`).maybeSingle()
  point(20, 'la vue n’expose PAS `publie` — un lecteur qui refiltre croit qu’il protège',
    colonnes.error ? `erreur ${colonnes.error.code}`
      : colonnes.data === null ? 'AUCUNE LIGNE LUE — rien n’est mesuré'
      : 'publie' in colonnes.data ? 'exposée' : 'absente',
    'absente')

  // ── LE FILTRE PAR SITE, DANS LES DEUX SENS ──────────────────────
  // UN COMPTE DE ZÉRO N'EST PAS UNE ABSENCE S'IL VIENT D'UNE LECTURE RATÉE.
  //
  // DÉFAUT DE CE FICHIER, TROUVÉ LE 2026-11-06 EN CHERCHANT LA FORME QUE LE
  // PROPRIÉTAIRE A NOMMÉE. Première rédaction :
  //   `${(ailleurs.data ?? []).length}`   attendu « 0 »
  // Si cette requête ÉCHOUAIT, `data` valait `null`, le repli `?? []` rendait
  // une longueur de 0, et le point passait au VERT — en annonçant « aucune
  // fuite ailleurs » alors que rien n'avait été lu. Le repli transformait une
  // impossibilité de mesurer en preuve d'absence.
  const dUnSite = await anon.from('appels_offres_public').select('site_slug').eq('site_id', publie.id)
  const ailleurs = await anon.from('appels_offres_public').select('site_slug').neq('site_id', publie.id).eq('reference_slug', `${MARQUE}visible`)
  const panne = dUnSite.error ? `LECTURE RATÉE ${dUnSite.error.code}`
              : ailleurs.error ? `LECTURE RATÉE ${ailleurs.error.code}`
              : null
  point(21, 'le témoin visible apparaît POUR SON SITE et pour AUCUN AUTRE',
    panne ?? `${dUnSite.data.some((r) => r.site_slug === publie.slug) ? 'présent' : 'absent'}/${ailleurs.data.length}`,
    'présent/0')
} finally {
  console.log('')
  await retirer()
}

console.log(`\n═══ ${verts} / ${vus} ═══`)
process.exit(verts === vus ? 0 : 1)
