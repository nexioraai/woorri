/**
 * TIR · LA LECTURE PAR TRANCHES, EN CONDITIONS RÉELLES (G30, 2026-11-13).
 *
 * Ordre du propriétaire : « appelle lire-brief seul, par script, avec le
 * cahier Hayine suivi d'un second cahier collé (> 24 000 signes). Attendu :
 * tranches 2, tentatives ≤ 4, reussie, les 16 écrans Hayine toujours
 * présents, les tables du second cahier ajoutées sans doublon avec celles
 * d'Hayine, nom = Hayine (première tranche), questionsOuvertes ≥ 8. »
 * Plafond : 0,05 $.
 *
 * ── C'EST LA ROUTE QUI EST APPELÉE, pas une copie de sa logique : `POST`
 * de `lire-brief/route.ts`, avec le VRAI modèle (DeepSeek, exigé). Seule
 * l'authentification est simulée — on n'ouvre de session au nom de
 * personne.
 *
 * ── LES DEUX CAHIERS SONT RÉELS ET HACHÉS :
 *   · Hayine : la demande de la ligne `9cc16d10` (brut/g30, 22 866 signes,
 *     sha256 9ee1ca865053…) ;
 *   · le second : le cahier de la CPA (institution, 20 658 signes, sha256
 *     88fc434f0e76…) tiré de l'instantané haché de M5. Le cahier « école »
 *     du propriétaire n'existe en base qu'à 1 000 signes (coupé par
 *     l'ancien maxLength) — 22 866 + 1 000 < 24 000 n'aurait pas fait deux
 *     tranches ; on ne reconstruit pas un cahier manquant, on en prend un
 *     autre, réel, et on le dit.
 *
 * ── LE PLAFOND EST VÉRIFIÉ AVANT LE PREMIER APPEL, au pire cas (deux
 * tranches × deux tentatives × 8 000 jetons de sortie), au tarif de l'heure
 * — pointe si une fenêtre de pointe commence dans les 35 minutes.
 *
 *   GENERATEUR_FOURNISSEUR=deepseek TIR_PAYANT=oui node --env-file=.env.local \
 *     node_modules/vitest/vitest.mjs run -c vitest.tir.config.ts src/tirs/lecture-par-tranches.tir.ts
 */
import { describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync, gzipSync } from 'node:zlib'
import { join } from 'node:path'
import { exigerFeuVert } from '../../vitest.tir.setup'
import { racineDepot } from '@/lib/apps/racine'
import { CONFIGS, estPointe, tarifDe, tarifPlafond } from '@/lib/apps/fournisseur'
import { FOURNISSEUR } from '@/lib/ia/client'
import { CONSIGNE } from '@/lib/apps/consigne-lire-brief'
import { cle, decouperEnTranches, TAILLE_TRANCHE, type LectureBrief } from '@/lib/apps/lecture-brief'

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getUser: () => Promise.resolve({ data: { user: { id: 'tir-g30', email: 'tir@deribfy.invalid' } }, error: null }) } },
}))

const PLAFOND_USD = 0.05
const EVIDENCE = join(racineDepot(), 'docs', 'elite-protocol', 'evidence', 'generateur-2026-11-12')
const sha12 = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 12)

type Reponse = {
  entites: { name: string; fields: { name: string }[] }[]
  nomProduit?: { nom: string; dansLeDocument: boolean }
  deduites: Record<string, string>
  roles: string[]
  ecrans: string[]
  questionsOuvertes: string[]
  lecture: LectureBrief
}

describe('tir · la lecture du brief par tranches, sur deux cahiers réels', () => {
  it(
    'deux tranches, fusion sans doublon, nom et écrans de la première tranche',
    async () => {
      exigerFeuVert('la lecture par tranches (DeepSeek, deux appels au moins)')
      if (FOURNISSEUR !== 'deepseek') throw new Error(`ARRÊT : fournisseur ${FOURNISSEUR} ≠ deepseek`)

      // ── LES CAHIERS, HACHÉS.
      const ligne = JSON.parse(gunzipSync(readFileSync(join(EVIDENCE, 'brut', 'g30', '9cc16d10.json.gz'))).toString('utf8')) as {
        demande: string; sections_acquises: { lectureBrief: { ecrans: string[]; tablesLues: number } }
      }
      const hayine = ligne.demande
      const ecransHayine = ligne.sections_acquises.lectureBrief.ecrans
      const instantane = JSON.parse(gunzipSync(readFileSync(join(EVIDENCE, 'brut', 'generations-direct.json.gz'))).toString('utf8')) as { lignes: { demande: string }[] }
      const second = instantane.lignes.map((l) => l.demande).find((d) => sha12(d) === '88fc434f0e76')
      if (second === undefined) throw new Error('cahier CPA (88fc434f0e76) introuvable dans l’instantané')
      expect(sha12(hayine)).toBe('9ee1ca865053')
      const cahier = `${hayine}\n\n${second}`
      const tranches = decouperEnTranches(cahier)
      expect(cahier.length).toBeGreaterThan(TAILLE_TRANCHE)
      expect(tranches).toHaveLength(2)

      // ── LE PLAFOND, AU PIRE CAS, AVANT TOUT APPEL.
      const maintenant = new Date()
      const bientotPointe = estPointe(maintenant) || estPointe(new Date(maintenant.getTime() + 35 * 60_000))
      const t = bientotPointe ? tarifPlafond(CONFIGS.deepseek.prixLeger) : tarifDe(CONFIGS.deepseek.prixLeger, maintenant)
      const pireCas = tranches.reduce((s, tr) => s + 2 * (((CONSIGNE.length + tr.length) / 2.5) * t.entree + 8000 * t.sortie) / 1e6, 0)
      process.stdout.write(`\n  cahier ${String(cahier.length)} signes · tranches ${tranches.map((x) => String(x.length)).join(' + ')} · pire cas ${pireCas.toFixed(4)} $ (${bientotPointe ? 'tarif de pointe' : 'hors pointe'})\n`)
      if (pireCas > PLAFOND_USD) throw new Error(`ARRÊT AVANT APPEL : pire cas ${pireCas.toFixed(4)} $ > plafond ${String(PLAFOND_USD)} $`)

      // ── L'APPEL — LA ROUTE, TELLE QU'ELLE EST.
      process.env.GENERATEUR_FOURNISSEUR = 'deepseek'
      const { POST } = await import('@/app/api/generateur/lire-brief/route')
      const debut = Date.now()
      const res = await POST(
        new Request('https://deribfy.test/api/generateur/lire-brief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tir' },
          body: JSON.stringify({ demande: cahier }),
        }),
      )
      const ms = Date.now() - debut
      const d = (await res.json()) as Reponse

      // ── LE MATÉRIEL BRUT D'ABORD, LE JUGEMENT ENSUITE.
      mkdirSync(join(EVIDENCE, 'brut', 'g30'), { recursive: true })
      writeFileSync(join(EVIDENCE, 'brut', 'g30', 'decoupe-reponse.json.gz'), gzipSync(Buffer.from(JSON.stringify({ status: res.status, ms, reponse: d })), { level: 9 }))
      const noms = d.entites.map((e) => e.name)
      const cles = noms.map(cle)
      const releve = {
        quand: new Date().toISOString(),
        cahiers: { hayine: { signes: hayine.length, sha12: sha12(hayine) }, second: { nom: 'CPA (institution)', signes: second.length, sha12: sha12(second) } },
        signesEnvoyes: cahier.length,
        status: res.status,
        ms,
        lecture: d.lecture,
        nom: d.nomProduit?.nom ?? null,
        deduites: d.deduites,
        tables: noms,
        tablesDoublons: cles.filter((c, i) => cles.indexOf(c) !== i),
        tablesHayineRetrouvees: ligne.sections_acquises.lectureBrief.tablesLues,
        ecransHayine: { attendus: ecransHayine.length, presents: ecransHayine.filter((e) => d.ecrans.map(cle).includes(cle(e))).length, manquants: ecransHayine.filter((e) => !d.ecrans.map(cle).includes(cle(e))) },
        ecrans: d.ecrans,
        roles: d.roles,
        questionsOuvertes: d.questionsOuvertes,
        plafondUsd: PLAFOND_USD,
        pireCasUsd: Number(pireCas.toFixed(4)),
      }
      writeFileSync(join(EVIDENCE, 'sortie', 'g30-decoupe.json'), JSON.stringify(releve, null, 1) + '\n')
      process.stdout.write(JSON.stringify(releve, null, 1) + '\n')

      // ── CE QUI ÉTAIT ATTENDU.
      expect(res.status).toBe(200)
      expect(d.lecture.resultat).toBe('reussie')
      expect(d.lecture.tranches).toBe(2)
      expect(d.lecture.tentatives).toBeLessThanOrEqual(4)
      expect(d.lecture.signesLus).toBe(cahier.length)
      expect(d.lecture.coutUsd).toBeGreaterThan(0)
      expect(d.lecture.coutUsd).toBeLessThanOrEqual(PLAFOND_USD)
      expect(releve.ecransHayine.manquants, 'écrans Hayine perdus à la fusion').toEqual([])
      expect(releve.tablesDoublons, 'tables en doublon après fusion').toEqual([])
      expect(noms.length, 'le second cahier n’a ajouté aucune table').toBeGreaterThan(ligne.sections_acquises.lectureBrief.tablesLues)
      expect(d.nomProduit?.nom).toBe('Hayine')
      expect(d.questionsOuvertes.length).toBeGreaterThanOrEqual(8)
    },
    290_000,
  )
})
