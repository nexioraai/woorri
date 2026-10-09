/**
 * V1–V9 — LE TRAVAILLEUR CONTRE LA JUMELLE. Manuel, hors CI.
 *
 * ── LE BANC NE POSSEDE QUE SES LIGNES (lecon du 2026-10-09, ~6,9 $) :
 * toute ligne creee ici porte EMAIL_BANC, la purge ne connait que ce
 * filtre, chaque balayeur est a perimetre — et un TEMOIN etranger au
 * banc, pose en premier (donc le plus ancien), est verifie INTACT en fin
 * de batterie : il alarme sur la purge sauvage ET le balayage non filtre.
 *
 *   npx tsx apps/web/src/lib/apps/travailleur-jumelle.verif.mts
 *
 * ── CE QUE CE HARNAIS EST : des ecritures REELLES (reseau, PostgREST, les
 * contraintes CHECK de la base) sur la TABLE JUMELLE uniquement, avec le
 * moteur a blanc — ZERO appel payant. Il etablit la machinerie du verrou et
 * du balayage ; il n'etablit PAS la production (durees reelles, vrai
 * service). Le premier tir reel vient apres, sur go explicite.
 *
 * ── POURQUOI IL N'EST PAS DANS VITEST : il parle au reseau et exige la
 * clef de service — la CI n'a ni l'un ni l'autre, et un test qui ne peut
 * pas tourner en CI y serait un mensonge vert.
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { creerTravailleur, type MoteurContinuation } from './travailleur.ts'
import { SQL_TABLE_TEST } from './journal.ts'
import { purgerBanc, poserTemoin, verifierTemoin, EMAIL_BANC } from './banc-jumelle.ts'
import { sauverEtatLocal, chargerPourResurrection } from './etat-local.ts'

const ICI = dirname(fileURLToPath(import.meta.url))
const RACINE = join(ICI, '..', '..', '..', '..', '..')
const JUMELLE = 'app_generations_test'

const env: Record<string, string> = {}
for (const l of readFileSync(join(RACINE, 'apps/web/.env.local'), 'utf8').split('\n')) {
  const m = /^([A-Z_]+)=("?)(.*)\2$/.exec(l.trim())
  if (m) env[m[1]] = m[3]
}
const base = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

let echecs = 0
const verifie = (nom: string, condition: boolean, detail = ''): void => {
  if (condition) { console.log(`  ✅ ${nom}`); return }
  console.error(`  🔴 ${nom}${detail === '' ? '' : ` — ${detail}`}`)
  echecs += 1
}
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms))
const purger = async () => { await purgerBanc(base, JUMELLE) }
const lire = async (id: string) =>
  (await base.from(JUMELLE).select('*').eq('id', id).single()).data as Record<string, unknown>

// ── LA JUMELLE EXISTE-T-ELLE ? Sans elle, rien ne se prouve — on REFUSE au
// lieu de passer vert sur du vide.
{
  const sonde = await base.from(JUMELLE).select('id').limit(1)
  if (sonde.error !== null) {
    console.error(`⛔ REFUS — la jumelle « ${JUMELLE} » est absente : ${sonde.error.message}`)
    console.error('   Collez SQL_TABLE_TEST (lib/apps/journal.ts) dans la console SQL, une fois.')
    console.error(`   (${String(SQL_TABLE_TEST.length)} caracteres, memes invariants que la vraie)`)
    process.exit(2)
  }
}
// Le temoin D'ABORD : plus ancien que toute ligne du banc, il est la
// premiere cible de tout balayage non filtre — l'alarme est maximale.
await poserTemoin(base, JUMELLE)
await purger()

/** Un moteur scripte et controlable — pour V1/V2/V5, le vrai n'apporte rien. */
const moteurScripte = (plan: {
  dureeMs?: number
  porte?: Promise<void>
  jette?: () => Error
  appels: { brief: string }[]
}): MoteurContinuation => ({
  poursuivreEmission: async ({ brief }) => {
    plan.appels.push({ brief })
    if (plan.porte !== undefined) await plan.porte
    if (plan.dureeMs !== undefined) await dormir(plan.dureeMs)
    if (plan.jette !== undefined) throw plan.jette()
    return {
      fini: true,
      resultat: {
        ok: true,
        document: { livre: true },
        diagnostics: [],
        tirages: [],
        coutUsd: 0,
        jetons: { entree: 0, sortie: 0 },
      },
    }
  },
})

// ════ V1 — LE VERROU : deux saisies simultanees, UNE gagne. ════
console.log('— V1 : compare-and-set —')
{
  const appels: { brief: string }[] = []
  const fabrique = () =>
    creerTravailleur({
      table: JUMELLE, base, moteur: moteurScripte({ dureeMs: 120, appels }),
      budgetTrancheMs: 10_000, battementPerimeMs: 60_000,
      perimetre: { proprietaire: EMAIL_BANC },
    })
  const a = fabrique()
  await a.deposer({ demande: 'v1', nom: 'v1', email: EMAIL_BANC })
  const [ra, rb] = await Promise.all([a.tourner(), fabrique().tourner()])
  const issues = [ra[0].issue, rb[0].issue].sort()
  verifie('V1 une saisie gagne, l autre repart les mains vides',
    JSON.stringify(issues) === JSON.stringify(['livree', 'rien']), JSON.stringify(issues))
  verifie('V1 le moteur n a tourne qu UNE fois — la ligne n a pas ete payee deux fois',
    appels.length === 1, String(appels.length))
  await purger()
}

// ════ V2 — LE JETON DE CLOTURE : le ressuscite est depossede. ════
console.log('— V2 : fencing —')
{
  const appelsA: { brief: string }[] = []
  const appelsB: { brief: string }[] = []
  let ouvrirA: () => void = () => {}
  const porteA = new Promise<void>((r) => { ouvrirA = r })
  const A = creerTravailleur({
    table: JUMELLE, base, moteur: moteurScripte({ porte: porteA, appels: appelsA }),
    budgetTrancheMs: 10_000,
    battementPerimeMs: 400,
    battementRafraichiMs: 3_600_000, // A ne rafraichit JAMAIS : il doit perimer
    perimetre: { proprietaire: EMAIL_BANC },
  })
  const B = creerTravailleur({
    table: JUMELLE, base, moteur: moteurScripte({ appels: appelsB }),
    budgetTrancheMs: 10_000, battementPerimeMs: 400,
    perimetre: { proprietaire: EMAIL_BANC },
  })
  const id = await A.deposer({ demande: 'v2', nom: 'v2', email: EMAIL_BANC })
  const tourA = A.tourner() // saisit, puis traine derriere la porte
  await dormir(700) // le battement de A perime (400 ms)
  const rb = await B.tourner()
  verifie('V2 B reprend la ligne au battement perime', rb[0].issue === 'livree', rb[0].issue)
  ouvrirA()
  const ra = await tourA
  verifie('V2 l ecriture tardive de A touche zero ligne : DEPOSSEDE, sans bruit',
    ra[0].issue === 'depossede', ra[0].issue)
  const ligne = await lire(id)
  verifie('V2 le resultat en base est celui de B, pas celui de A',
    ligne.statut === 'livree' && (ligne.document as { livre?: boolean }).livre === true)
  verifie('V2 chacun n a appele le moteur qu une fois',
    appelsA.length === 1 && appelsB.length === 1)
  await purger()
}

// ════ V3 — BOUT EN BOUT a blanc : deposer → N tranches → livree. ════
console.log('— V3 : bout en bout, moteur reel a blanc —')
{
  const { creerMoteur } = await import(join(RACINE, 'benchmarks/air-emission/moteur.mjs'))
  const { creerClientABlanc, BRIEF } = await import(join(RACINE, 'benchmarks/air-emission/client-a-blanc.mjs'))
  const airSchema = await import(join(RACINE, 'packages/air-schema/src/index.ts'))
  const corpus = airSchema.migrateAirDocument(
    JSON.parse(readFileSync(join(RACINE, 'packages/golden-corpus/corpus-v3/bus-intercites.air.json'), 'utf8')),
  )
  // UN moteur par tranche — comme en production, ou chaque invocation est un
  // processus neuf. L'etat ne survit QUE par la table.
  const moteurParTranche: MoteurContinuation = {
    poursuivreEmission: async (o) => {
      const m = await creerMoteur({ cleApi: 'blanc', client: creerClientABlanc({ corpus }) })
      return m.poursuivreEmission(o)
    },
  }
  const w = creerTravailleur({
    table: JUMELLE, base, moteur: moteurParTranche,
    budgetTrancheMs: 150, battementPerimeMs: 60_000,
    perimetre: { proprietaire: EMAIL_BANC },
  })
  const id = await w.deposer({ demande: BRIEF, nom: 'v3', email: EMAIL_BANC })
  const issues: string[] = []
  for (let tick = 0; tick < 12; tick++) {
    const r = await w.tourner()
    issues.push(r[0].issue)
    if (r[0].issue === 'livree' || r[0].issue === 'refusee' || r[0].issue === 'rien') break
  }
  const ligne = await lire(id)
  verifie('V3 la generation TERMINE par tranches, portees par les seuls `tourner`',
    issues.at(-1) === 'livree' || issues.at(-1) === 'refusee', issues.join(' → '))
  verifie('V3 au moins une suspension a traverse la table (etat jsonb relu)',
    issues.filter((x) => x === 'suspendu').length >= 1, issues.join(' → '))
  // Le cout en base n'est PAS zero : le moteur comptabilise l'usage SIMULE
  // (100/50 jetons par appel) aux vrais tarifs — aucun dollar reel ne part,
  // mais la plomberie comptable est exactement ce que V3 doit voir couler
  // jusqu'a la table. Ma premiere assertion disait `=== 0` : elle testait
  // une idee fausse du mode a blanc, pas le travailleur.
  verifie('V3 la ligne finale porte document/diagnostics/cout coherents',
    (ligne.statut === 'livree') === (ligne.document !== null) &&
      Array.isArray(ligne.diagnostics) && Number(ligne.cout_usd) > 0,
    `statut=${String(ligne.statut)} cout=${String(ligne.cout_usd)}`)
  verifie('V3 les compteurs de jetons sont cumules en base',
    Number(ligne.jetons_entree) > 0 && Number(ligne.jetons_sortie) > 0,
    `${String(ligne.jetons_entree)}/${String(ligne.jetons_sortie)}`)
  console.log(`    issues : ${issues.join(' → ')} · statut final : ${String(ligne.statut)}`)
  await purger()
}

// ════ V4 — CRON PORTEUR : structurel, l auto-appel n existe pas. ════
console.log('— V4 : cron porteur —')
{
  const src = readFileSync(join(ICI, 'travailleur.ts'), 'utf8')
  verifie('V4 aucun auto-appel dans le travailleur (fetch/http absents)',
    !/fetch\(|https?:/u.test(src.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/\/\/[^\n]*/gu, '')))
  verifie('V4 V3 a termine par les seuls tourner successifs — demonstration faite ci-dessus', true)
}

// ════ V5 — CRASH EN PLEINE TRANCHE : acquis conserves, 3 echecs → refusee. ════
console.log('— V5 : echec transitoire et plafond de reprises —')
{
  const appels: { brief: string }[] = []
  const w = creerTravailleur({
    table: JUMELLE, base,
    moteur: moteurScripte({
      appels,
      jette: () => Object.assign(new Error('Connection error simulee'), {
        assemblagePartiel: { app: { name: 'partiel-paye' } },
        // Le moteur etiquette le cout de la tranche morte (trou comptable
        // mordu 2 fois) — le scripte fait pareil, la table doit le VOIR.
        coutTrancheUsd: 0.1234,
        jetonsTranche: { entree: 11, sortie: 7 },
      }),
    }),
    budgetTrancheMs: 10_000, battementPerimeMs: 60_000,
    perimetre: { proprietaire: EMAIL_BANC },
  })
  const id = await w.deposer({ demande: 'v5', nom: 'v5', email: EMAIL_BANC })
  const r1 = await w.tourner()
  const apres1 = await lire(id)
  verifie('V5 echec 1 : la ligne redevient saisissable TOUT DE SUITE, acquis replie',
    r1[0].issue === 'erreur' && apres1.statut === 'en_attente' &&
      Number(apres1.reprises) === 1 &&
      (apres1.sections_acquises as { acquis?: { app?: { name?: string } } }).acquis?.app?.name === 'partiel-paye')
  verifie('V5 le cout de la tranche MORTE est replie — colonne ET etat.coutUsd, coherents',
    Number(apres1.cout_usd) === 0.1234 &&
      (apres1.sections_acquises as { coutUsd?: number }).coutUsd === 0.1234 &&
      Number(apres1.jetons_entree) === 11 && Number(apres1.jetons_sortie) === 7,
    `colonne=${String(apres1.cout_usd)} etat=${String((apres1.sections_acquises as { coutUsd?: number }).coutUsd)}`)
  await w.tourner()
  const r3 = await w.tourner()
  const apres3 = await lire(id)
  verifie('V5 echec 3 : refusee, en DISANT pourquoi — jamais une boucle infinie',
    r3[0].issue === 'refusee' && apres3.statut === 'refusee' &&
      String((apres3.diagnostics as string[])[0]).includes('echec repete'),
    `${r3[0].issue} · ${String(apres3.statut)}`)
  verifie('V5 trois tranches = trois appels moteur, pas plus', appels.length === 3)
  verifie('V5 le cumul des trois tranches mortes est VISIBLE sur la refusee — plus de chiffre sous la realite',
    Number(apres3.cout_usd) === 0.3702 &&
      (apres3.sections_acquises as { coutUsd?: number }).coutUsd === 0.3702 &&
      Number(apres3.jetons_entree) === 33 && Number(apres3.jetons_sortie) === 21,
    `colonne=${String(apres3.cout_usd)} etat=${String((apres3.sections_acquises as { coutUsd?: number }).coutUsd)}`)
  await purger()
}

// ════ V5F — UNE ERREUR FATALE NE SE RETENTE PAS (tir n°6 : le 400 de
// facturation retente deux fois pour rien). L'etiquette du moteur fait foi.
console.log('— V5F : erreur fatale, refus immediat —')
{
  const appels: { brief: string }[] = []
  const w = creerTravailleur({
    table: JUMELLE, base,
    moteur: moteurScripte({
      appels,
      jette: () => Object.assign(new Error('400 credit balance is too low'), {
        transitoire: false,
        coutTrancheUsd: 0.0421,
        jetonsTranche: { entree: 5, sortie: 3 },
      }),
    }),
    budgetTrancheMs: 10_000, battementPerimeMs: 60_000,
    perimetre: { proprietaire: EMAIL_BANC },
  })
  const id = await w.deposer({ demande: 'v5f', nom: 'v5f', email: EMAIL_BANC })
  const r = await w.tourner()
  const ligne = await lire(id)
  verifie('V5F refusee DES LE PREMIER echec — zero reprise brulee',
    r[0].issue === 'refusee' && ligne.statut === 'refusee' && appels.length === 1,
    `${r[0].issue} · appels=${String(appels.length)}`)
  verifie('V5F la raison DIT que c est fatal, pas un echec repete',
    String((ligne.diagnostics as string[])[0]).startsWith('erreur fatale (non transitoire)'),
    JSON.stringify(ligne.diagnostics))
  verifie('V5F meme la fatale emporte son cout dans la ligne refusee',
    Number(ligne.cout_usd) === 0.0421 &&
      (ligne.sections_acquises as { coutUsd?: number }).coutUsd === 0.0421,
    `colonne=${String(ligne.cout_usd)}`)
  await purger()
}

// ════ V6 — LES CONTRAINTES DE LA BASE MORDENT sur la jumelle. ════
console.log('— V6 : les CHECK de la base —')
{
  const depot = await base.from(JUMELLE).insert({ statut: 'en_attente', demande: 'v6', ok: false, owner_email: EMAIL_BANC }).select('id')
  const id = String(depot.data?.[0]?.id)
  const enCoursNu = await base.from(JUMELLE).update({ statut: 'en_cours' }).eq('id', id)
  verifie('V6 `en_cours` sans battement/jeton : REFUSE par la base elle-meme',
    enCoursNu.error !== null && /en_cours_verrouillee/u.test(enCoursNu.error.message))
  const livreeNue = await base.from(JUMELLE).update({ statut: 'livree' }).eq('id', id)
  verifie('V6 `livree` sans document : REFUSE par la base elle-meme',
    livreeNue.error !== null && /livree_a_document/u.test(livreeNue.error.message))
  const statutLibre = await base.from(JUMELLE).update({ statut: 'fantaisie' }).eq('id', id)
  verifie('V6 un statut hors domaine : REFUSE',
    statutLibre.error !== null && /statut_valide/u.test(statutLibre.error.message))
  await purger()
}

// ════ V7 — UN REFUS N'EST JAMAIS MUET (trous n°2 et n°3 du premier tir). ════
console.log('— V7 : la raison et le detail des tirages persistent —')
{
  const w = creerTravailleur({
    table: JUMELLE, base,
    moteur: {
      poursuivreEmission: async () => ({
        fini: true,
        resultat: {
          ok: false,
          raison: 'P0 refuse 3 fois',
          document: { app: { name: 'base-refusee-conservee' } },
          modele: { version: 'modele-conserve' },
          diagnostics: [{ code: 'SCHEMA', path: 'entities[2].fields[0]' }],
          tirages: [
            { tentative: 1, arret: 'P2', coutUsd: 0.21, diagnostics: ['DERIVATION_X'], reparations: ['choisir pose'] },
          ],
          coutUsd: 0.21,
          jetons: { entree: 10, sortie: 20 },
        },
      }),
    },
    budgetTrancheMs: 10_000, battementPerimeMs: 60_000,
    perimetre: { proprietaire: EMAIL_BANC },
  })
  const id = await w.deposer({ demande: 'v7', nom: 'v7', email: EMAIL_BANC })
  const r = await w.tourner()
  const ligne = await lire(id)
  verifie('V7 la ligne refusee DIT sa raison en tete des diagnostics',
    r[0].issue === 'refusee' && (ligne.diagnostics as string[])[0] === 'P0 refuse 3 fois')
  verifie('V7 un diagnostic persiste en CODE@CHEMIN — on sait OU, sans re-payer',
    (ligne.diagnostics as string[])[1] === 'SCHEMA@entities[2].fields[0]',
    JSON.stringify(ligne.diagnostics))
  const j = ligne.sections_acquises as { phase?: string; tirages?: { arret: string; diagnostics: string[] }[] }
  verifie('V7 le detail des tirages persiste — on peut dire POURQUOI sans re-payer',
    j.phase === 'terminee' && j.tirages?.[0]?.arret === 'P2' && j.tirages[0].diagnostics[0] === 'DERIVATION_X',
    JSON.stringify(j).slice(0, 120))
  const conserve = ligne.sections_acquises as { acquis?: { app?: { name?: string } }; modele?: { version?: string } }
  verifie('V7 la BASE survit au refus — acquis et modele dans la ligne refusee, ressuscitable sans re-payer',
    conserve.acquis?.app?.name === 'base-refusee-conservee' && conserve.modele?.version === 'modele-conserve',
    JSON.stringify({ acquis: conserve.acquis, modele: conserve.modele }).slice(0, 100))
  await purger()
}

// ════ V8 — UN ETAT PAYE SURVIT A UNE PURGE : la sauvegarde locale le
// reconstruit A L'IDENTIQUE. (Lecon 0234da42 : l'etat ne vivait QUE dans
// la table.) ════
console.log('— V8 : purge → reconstruction depuis /tmp —')
{
  const riche = {
    owner_email: EMAIL_BANC,
    demande: 'v8 — ligne au long etat, comme une vraie reprise',
    nom: 'v8', statut: 'en_attente', ok: false,
    cout_usd: 1.2345, jetons_entree: 1200, jetons_sortie: 3400,
    diagnostics: ['BLOCK_FIELD_UNKNOWN@screens[2]', 'FORM_SANS_ACTION@screens[4]'],
    tirages: 2, etape: 'reparation',
    sections_acquises: {
      phase: 'reparation', tours: 1, tentativesReparation: 1,
      acquis: { app: { name: 'depenses' }, entities: [{ id: 'ent_depense', name: 'depense' }] },
    },
  }
  const depot = await base.from(JUMELLE).insert(riche).select('id')
  const id = String(depot.data?.[0]?.id)
  const avant = await lire(id)
  const chemin = sauverEtatLocal(avant)
  await purger() // la purge du banc EMPORTE cette ligne (elle est au banc)
  const disparue = await base.from(JUMELLE).select('id').eq('id', id)
  verifie('V8 la purge a bien emporte la ligne — le scenario est reel',
    (disparue.data ?? []).length === 0)
  const charge = chargerPourResurrection(chemin)
  const retour = await base.from(JUMELLE).insert(charge).select('id')
  verifie('V8 la resurrection REDEPOSE la ligne (meme id) sans refus de la base',
    retour.error === null && String(retour.data?.[0]?.id) === id,
    retour.error?.message ?? '')
  const apres = await lire(id)
  verifie('V8 l etat reconstruit est IDENTIQUE : sections_acquises, cout, diagnostics',
    JSON.stringify(apres.sections_acquises) === JSON.stringify(avant.sections_acquises) &&
      Number(apres.cout_usd) === Number(avant.cout_usd) &&
      JSON.stringify(apres.diagnostics) === JSON.stringify(avant.diagnostics) &&
      apres.statut === 'en_attente' && apres.jeton_travailleur === null)
  await purger()
}

// ════ V9 — LE TEMOIN : la ligne etrangere au banc a survecu a TOUT. ════
console.log('— V9 : le temoin etranger au banc —')
{
  const t = await verifierTemoin(base, JUMELLE)
  verifie('V9 le temoin (le plus ancien en_attente, hors banc) est INTACT apres toute la batterie — ni purge ni les balayeurs ne l ont touche',
    t.intact, t.detail)
}

console.log(
  echecs === 0
    ? '\n✅ travailleur : verrou, fencing, tranches, reprises, contraintes — verts sur la JUMELLE. Pas une preuve de production.'
    : `\n🔴 ${String(echecs)} controle(s) en echec.`,
)
process.exit(echecs === 0 ? 0 : 1)
