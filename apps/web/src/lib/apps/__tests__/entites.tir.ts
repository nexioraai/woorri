/**
 * TIR RÉEL — CE QUE LE MODÈLE DÉCLARE VRAIMENT (lot D1).
 *
 * ── CE QU'AUCUNE GATE NE PEUT PROUVER.
 *
 * EP-319 prouve que ce qui est déclaré de bonne foi passe, que les formes
 * fausses sont refusées, que les bornes mordent. Il ne peut pas dire si le
 * modèle, devant un vrai cahier, nomme `membre` et `cotisation` ou s'il
 * invente `donnees_1` et `table_principale`.
 *
 * ── DEUX TIRS, PARCE QU'IL Y A DEUX FAÇONS D'ÉCHOUER (ordre du propriétaire).
 *
 * ① TROP DE MATIÈRE — le cahier de la CPA, dix pages, entités évidentes.
 *    La question n'est pas « sait-il lire ? » mais « que fait-il quand la
 *    borne de douze tables mord — choisit-il les bonnes douze, ou les douze
 *    premières ? »
 *
 * ② PRESQUE RIEN — « une application de tontine pour mon quartier ».
 *    Déclare-t-il trois tables sensées, ou dix champs pour faire bonne
 *    figure ? Inventer est ici le vrai danger : une table de trop coûte un
 *    schéma à appliquer et des écrans à câbler pour rien.
 *
 * ── CE TIR DÉPENSE. Il ne tourne pas dans la gate : voir
 *    `vitest.tir.config.ts`, qui explique pourquoi.
 */
import { describe, expect, it } from 'vitest'
import { projectAirSchema } from '@deribfy/air-schema'
import { emettreSchemaSql } from '@deribfy/compiler'
import { clientIA, MODELE_LEGER } from '@/lib/ia/client'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'
import { CONSIGNE_ENTITES, lireEntites, phraseTable, resumeEntites } from '../entites-declarees'
import { CONFIGS, fournisseurChoisi, tarifDe } from '../fournisseur'

const schemaEntite = projectAirSchema.shape.entities.element
const valider = (e: unknown): boolean => schemaEntite.safeParse(e).success

/** La consigne de lecture, telle que la route l'emploie — pas une copie. */
const CONSIGNE = [
  'Tu lis la demande d’une personne qui veut faire construire une application.',
  'Tu ne construis rien. Tu relèves ce que le texte ÉNONCE.',
  '',
  'Rends UN SEUL objet JSON, sans texte autour.',
  CONSIGNE_ENTITES,
].join('\n')

async function tirer(nom: string, brief: string): Promise<void> {
  const config = CONFIGS[fournisseurChoisi(process.env.GENERATEUR_FOURNISSEUR)]
  const t0 = Date.now()
  const r = await clientIA().messages.create({
    model: MODELE_LEGER,
    max_tokens: 8000,
    system: CONSIGNE,
    messages: [{ role: 'user', content: brief }],
  })
  const ms = Date.now() - t0
  const brut = r.content.map((b) => (b.type === 'text' ? b.text : '')).join('')
  const tarif = tarifDe(config.prixLeger, new Date())
  const usd = (r.usage.input_tokens * tarif.entree + r.usage.output_tokens * tarif.sortie) / 1e6

  console.log(`\n${'═'.repeat(72)}\n══ TIR : ${nom}`)
  console.log(
    `   ${String(r.usage.input_tokens)} jetons d'entrée · ${String(r.usage.output_tokens)} de sortie · ` +
      `${(ms / 1000).toFixed(1)} s · ${usd.toFixed(5)} $ · arrêt ${String(r.stop_reason)}`,
  )
  // LE CACHE : cinquante fois moins cher à l'entrée. On IMPRIME ce que le
  // fournisseur dit, on ne le suppose pas.
  const u = r.usage as unknown as Record<string, unknown>
  for (const c of ['cache_read_input_tokens', 'prompt_cache_hit_tokens', 'cache_creation_input_tokens']) {
    if (u[c] !== undefined) console.log(`   ${c} = ${String(u[c])}`)
  }

  const d = brut.indexOf('{')
  const f = brut.lastIndexOf('}')
  if (d < 0 || f <= d) {
    console.log('   RÉPONSE ILLISIBLE :', brut.slice(0, 400))
    expect.fail('le modèle n’a rendu aucun objet JSON')
  }
  const lu = JSON.parse(brut.slice(d, f + 1)) as Record<string, unknown>
  const brutes = Array.isArray(lu.ENTITES) ? lu.ENTITES : []
  console.log(`   ENTITES rendues par le modèle : ${String(brutes.length)}`)

  const { entites, refus } = lireEntites(lu.ENTITES, valider)
  console.log(`   RETENUES : ${resumeEntites(entites)}`)
  for (const e of entites) console.log(`     · ${phraseTable(e)}`)
  if (refus.length > 0) {
    console.log(`   ÉCARTÉES : ${String(refus.length)}`)
    for (const x of refus) console.log(`     × ${x.quoi} — ${x.motif}`)
  }

  // ── ET LE SCHÉMA, IMPRIMÉ EN ENTIER. C'est la preuve de contenu que D2
  // attendait : jusqu'ici aucune œuvre n'avait d'entité à y mettre.
  const sql = emettreSchemaSql(entites)
  console.log(`\n   ── schema.sql (${String(sql.length)} signes) ──`)
  console.log(sql.split('\n').map((l) => `   ${l}`).join('\n'))

  // On n'impose RIEN sur le contenu : ce tir MESURE, il ne valide pas une
  // opinion. Le seul échec possible est l'absence de réponse lisible.
  expect(brut.length).toBeGreaterThan(0)
}

describe('TIR · ce que le modèle déclare', () => {
  it('① TROP DE MATIÈRE — le cahier de la CPA (œuvre fa0ede2c)', async () => {
    // Le cahier est DÉJÀ EN BASE : on le lit, on ne le réinvente pas. Un
    // brief recopié à la main ne serait pas le document qui a produit
    // l'œuvre, et la mesure ne vaudrait que pour ma recopie.
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const cle = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    // Le filtre `like` sur un uuid n'a rien rendu : on LISTE et on filtre
    // ici. Deviner la syntaxe d'un filtre coûte un tir pour rien.
    const rep = await fetch(
      // LE NOM DE LA TABLE VIENT DE LA CONSTANTE, jamais en clair : le cliquet
      // d'isolation l'exige, et il a raison -- un nom nu recopie ici pointerait
      // un jour la table de production depuis un essai.
      `${url}/rest/v1/${TABLE_GENERATIONS}?select=id,nom,demande&order=created_at.desc&limit=40`,
      { headers: { apikey: cle, Authorization: `Bearer ${cle}` } },
    )
    const toutes = (await rep.json()) as { id: string; nom: string | null; demande: string }[]
    expect(Array.isArray(toutes), 'la base n’a rien rendu').toBe(true)
    const ligne = toutes.find((l) => l.id.startsWith('fa0ede2c'))
    if (ligne === undefined) {
      console.log('   œuvres lues :', toutes.map((l) => `${l.id.slice(0, 8)} ${String(l.nom)}`).join(' · '))
      expect.fail('l’œuvre fa0ede2c est introuvable parmi les 40 dernières')
    }
    const cahier = ligne.demande
    const lignes = [ligne]
    console.log(
      `\n   (cahier lu en base : ${String(cahier.length)} signes, œuvre « ${String(lignes[0].nom)} »)`,
    )
    await tirer('CPA — cahier riche', cahier)
  })

  it('② PRESQUE RIEN — trois phrases', async () => {
    await tirer(
      'tontine — brief court',
      'Je veux une application de tontine pour mon quartier. ' +
        'Chacun cotise chaque semaine et on tire au sort qui reçoit le pot. ' +
        'Je dois pouvoir savoir qui a payé et qui n’a pas payé.',
    )
  })
})
