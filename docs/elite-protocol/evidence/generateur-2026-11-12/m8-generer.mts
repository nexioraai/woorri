// M8 — BISSECTION : génère le cahier « institution » avec une COPIE du générateur.
//
// Exécuté DANS une copie de travail (git worktree), jamais sur la branche :
//   a) HEAD d'aujourd'hui, apps/web/src/lib/apps/bibliotheque-ui.ts remis à
//      6f870335^ (= 9cb89380), c'est-à-dire avant mes 5 commits du 2026-11-12 ;
//   b) tout le dépôt à 158bac74, dernier commit avant 2026-11-04T00:00Z.
//
// ENTRÉES TENUES CONSTANTES (pour n'isoler QUE le code du générateur) :
//   demande = le cahier institution (instantané, `7be93be8`) ;
//   entites = [] et configuration = { currency: 'XAF' } — exactement ce que le
//   rejeu M5 « institution, tentative 2 » a passé à la boucle (sa lecture du
//   brief avait rendu un JSON mal formé → 0 table). La lecture du brief n'est
//   donc PAS rejouée ici : une source de hasard et un coût en moins.
// DeepSeek seulement (le script s'arrête sinon). Un essai par état.
//
// BUDGET : plafond dur 0,50 $ pour a + b ensemble. Garde au tarif de pointe
// avant CHAQUE appel ; la dépense déjà engagée est lue dans
// sortie/m8-generations.json. Un appel qui pourrait dépasser N'A PAS LIEU.
//
// Les fichiers produits sont écrits, hachés, dans brut/m8/<état>.json.gz ; la
// MESURE se fait ensuite depuis la branche de travail (m8-mesurer.mts), avec
// l'instrument de M5 — jamais avec celui de la copie.
//
//   à sec (aucun appel) : cd <copie>/apps/web && npx tsx --tsconfig tsconfig.json <ce fichier> --etat=a
//   lancement          : … GENERATEUR_FOURNISSEUR=deepseek TIR_PAYANT=oui npx tsx --env-file=/Users/yia/dev/woorri/apps/web/.env.local --tsconfig tsconfig.json <ce fichier> --etat=a --lancer
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
// @ts-expect-error — module JS du même dossier
import { charger, ICI } from './commun.mjs'

// Plafond : 0,50 $ pour a + b (accord initial). Relance de a) accordée le
// 2026-11-12 : `--relance=0.29` → plafond = dépense déjà engagée + 0,29 $.
const relance = Number(process.argv.find((a) => a.startsWith('--relance='))?.slice(10) ?? NaN)
const etat = process.argv.find((a) => a.startsWith('--etat='))?.slice(7)
if (etat !== 'a' && etat !== 'b') throw new Error('--etat=a ou --etat=b')
const copie = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
const commitCopie = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()
const modifie = execFileSync('git', ['status', '--short'], { encoding: 'utf8' }).trim()
if (copie === '/Users/yia/dev/woorri') throw new Error('ARRÊT : ce script ne tourne que dans une copie de travail, jamais sur la branche')

const { lignes, sha } = charger() as { lignes: { id: string; demande: string }[]; sha: string }
const demande = lignes.find((l) => l.id.startsWith('7be93be8'))!.demande.trim()
const entites: unknown[] = []
const configuration = { currency: 'XAF' }

const { boucleEcriture, consignePour } = await import('@/lib/apps/boucle-directe')
const { CONFIGS, fournisseurChoisi, appelerFournisseur, tarifPlafond, tarifDe } = await import('@/lib/apps/fournisseur')
const consigne = consignePour(entites as Parameters<typeof consignePour>[0])
const bib = readFileSync(join(copie, 'apps/web/src/lib/apps/bibliotheque-ui.ts'))
console.log(`copie ${copie} · commit ${commitCopie} · modifié : ${modifie || 'rien'}`)
console.log(`bibliotheque-ui.ts sha256 ${createHash('sha256').update(bib).digest('hex').slice(0, 16)} · CarteVedette details.map(([l, v]) présent : ${bib.includes('details.map(([l, v])')}`)
console.log(`cahier ${demande.length} signes · consigne ${consigne.length} signes`)

if (!(process.argv.includes('--lancer') && process.env.TIR_PAYANT === 'oui')) {
  console.log('À SEC — aucun fournisseur appelé.')
} else {
  if (fournisseurChoisi(process.env.GENERATEUR_FOURNISSEUR) !== 'deepseek') throw new Error('ARRÊT : fournisseur ≠ deepseek')
  const cle = process.env.DEEPSEEK_API_KEY ?? ''
  if (cle === '') throw new Error('aucune clef deepseek')
  const fichierSortie = join(ICI, 'sortie', 'm8-generations.json')
  const precedent = existsSync(fichierSortie) ? JSON.parse(readFileSync(fichierSortie, 'utf8')) as { depense: number; generations: unknown[] } : { depense: 0, generations: [] }
  let depense = precedent.depense
  // `--plafond-total=X` fixe le plafond CUMULÉ (la relance de a) est accordée
  // pour 0,29 $ au-delà des 0,2285 $ dépensés avant elle : 0,5185 $ au total).
  const plafondTotal = Number(process.argv.find((a) => a.startsWith('--plafond-total='))?.slice(16) ?? NaN)
  const PLAFOND = Number.isFinite(plafondTotal) ? plafondTotal : Number.isFinite(relance) ? +(precedent.depense + relance).toFixed(4) : 0.5
  const { projectAirSchema } = await import('@deribfy/air-schema')
  const schemaEntite = projectAirSchema.shape.entities.element
  // TARIF DE LA GARDE (amendé pour la relance) : le tarif EN VIGUEUR si
  // aucune heure de pointe ne commence dans les 30 minutes (un appel dure
  // au plus ~3 min) ; sinon la pointe. Le plafond reste dur.
  const { estPointe } = await import('@/lib/apps/fournisseur')
  const tarifGarde = () => { const m = new Date(); return estPointe(m) || estPointe(new Date(m.getTime() + 30 * 60_000)) ? tarifPlafond(CONFIGS.deepseek.prix) : tarifDe(CONFIGS.deepseek.prix, m) }
  const ligne: Record<string, unknown> = { etat, tentative: precedent.generations.filter((g) => (g as { etat: string }).etat === etat).length + 1, plafond: PLAFOND, copie: commitCopie, modifie, debut: new Date().toISOString() }
  const t0 = Date.now()
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options: any = {
      demande, configuration, entites,
      // LE VALIDATEUR DE LA PRODUCTION (direct/route.ts : schemaEntite.safeParse).
      // Les deux premières exécutions de a) passaient `() => true` : une table
      // sans nom déclarée par le modèle y passait, et jugerPersistance
      // s'arrêtait (reading 'replace'). Prouvé gratuitement : m8-validateur-a.mts.
      validerEntite: (e: unknown) => schemaEntite.safeParse(e).success,
      appeler: async (messages: readonly { role: 'user' | 'assistant'; content: string }[]) => {
        const P = tarifGarde()
        const pire = (((consigne.length + messages.reduce((a, m) => a + m.content.length, 0)) / 2.5) * P.entree + CONFIGS.deepseek.maxJetons * P.sortie) / 1e6
        if (depense + pire > PLAFOND) throw Object.assign(new Error(`INTERROMPU — budget : ${depense.toFixed(3)} $ + ${pire.toFixed(3)} $ au pire > ${PLAFOND} $`), { budget: true })
        const x = await appelerFournisseur('deepseek', cle, consigne, messages)
        // INSTRUMENT (ajouté après la 1re exécution de a) : la réponse brute
        // de CHAQUE tour est gardée, pour qu'un arrêt se diagnostique sans
        // repayer. Lacune constatée : a) s'est arrêté et rien n'était gardé.
        // Le nom porte la TENTATIVE : sans elle, la 3e exécution a ÉCRASÉ la
        // réponse de la 2e (celle qui prouvait la cause du validateur).
        mkdirSync(join(ICI, 'brut', 'm8'), { recursive: true })
        writeFileSync(join(ICI, 'brut', 'm8', `${etat}-t${String(precedent.generations.filter((g) => (g as { etat: string }).etat === etat).length + 1)}-tour${String(messages.filter((m) => m.role === 'assistant').length + 1)}.txt.gz`), gzipSync(Buffer.from(x.texte), { level: 9 }))
        const t = tarifDe(CONFIGS.deepseek.prix, new Date())
        depense += (x.usage.entree * t.entree + x.usage.sortie * t.sortie) / 1e6
        return { texte: x.texte, tronquee: x.tronquee }
      },
    }
    const r = await boucleEcriture(options)
    ligne.livree = r.ok
    ligne.tours = r.tours.map((t: { rang: number; ok: boolean; motif?: string }) => ({ rang: t.rang, ok: t.ok, motif: String(t.motif ?? '').split('\n')[0]!.slice(0, 160) }))
    if (r.ok) {
      const json = Buffer.from(JSON.stringify(Object.fromEntries(r.fichiers as Map<string, string>)))
      mkdirSync(join(ICI, 'brut', 'm8'), { recursive: true })
      writeFileSync(join(ICI, 'brut', 'm8', `${etat}.json.gz`), gzipSync(json, { level: 9 }))
      ligne.fichiersSha256 = createHash('sha256').update(json).digest('hex')
    }
  } catch (e) {
    ligne.livree = false
    ligne.interrompu = (e as { budget?: boolean }).budget === true
    ligne.erreur = String((e as Error).message).slice(0, 400)
    ligne.pile = String((e as Error).stack ?? '').split('\n').slice(0, 12).join('\n')
  }
  ligne.ms = Date.now() - t0
  writeFileSync(fichierSortie, JSON.stringify({ instantane_sha256: sha, depense: +depense.toFixed(4), plafondDerniereExecution: PLAFOND, generations: [...precedent.generations, ligne] }, null, 1) + '\n')
  console.log(`état ${etat} · livrée=${ligne.livree}${ligne.interrompu ? ' · INTERROMPUE' : ''} · ${Math.round((ligne.ms as number) / 1000)} s · dépense cumulée ${depense.toFixed(3)} $\n${JSON.stringify(ligne.tours ?? ligne.erreur)}`)
}
