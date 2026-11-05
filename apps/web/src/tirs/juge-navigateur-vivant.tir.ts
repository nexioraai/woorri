/**
 * TIR · LE JUGE NAVIGATEUR, EXERCÉ POUR DE VRAI — sur les œuvres livrées.
 *
 * ── POURQUOI ICI, ET PAS DANS LA ROUTE. MESURÉ AVANT D'ÉCRIRE.
 *
 *   playwright         : devDependency, ^1.64.1 — élaguée au runtime
 *   les navigateurs    : ~/Library/Caches/ms-playwright — 1,0 Go
 *   et HORS node_modules, donc jamais tracés dans le paquet de la lambda
 *
 * Branché dans `direct/route.ts`, ce juge rendrait donc, à CHAQUE
 * génération réelle, « playwright est absent » — un diagnostic de plus sur
 * toutes les œuvres, et un juge câblé là où il ne peut structurellement
 * pas tourner. C'est la famille de défauts qu'on ferme depuis une semaine,
 * retournée : non plus un module sans appelant, mais un appelant branché
 * sur un juge impossible.
 *
 * ── CE TIR NE DÉPENSE RIEN, et c'est ce qui le rend rejouable.
 *
 * Aucun appel de modèle : une lecture en base, un assemblage, un
 * navigateur. Pas de `exigerFeuVert()` — il n'y a pas d'argent en jeu.
 *
 * ── ET IL SÉPARE DEUX ROUGES QUI NE DISENT PAS LA MÊME CHOSE.
 *
 * ① L'INSTRUMENT n'a pas tourné → le tir ne prouve RIEN, et son silence
 *    se lirait comme « aucun défaut ». C'est la faute qu'on ferme.
 * ② UNE ŒUVRE jette dans le navigateur → c'est une TROUVAILLE, le défaut
 *    même qu'on chasse depuis l'aperçu de `snenak`.
 *
 * Les confondre ferait chercher une panne d'outil devant un défaut de
 * produit, ou l'inverse.
 */
import { describe, expect, it } from 'vitest'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'
import { assembler } from '@/lib/apps/bac-a-sable'
import { jugerNavigateur } from '@/lib/apps/juge-navigateur'

const COMBIEN = Number(process.env.NAV_OEUVRES ?? '3')
const MOTEUR = (process.env.JUGE_MOTEUR ?? 'webkit') as 'webkit' | 'chromium'

type Mesure = {
  readonly quoi: string
  readonly octets: number
  readonly aTourne: boolean
  readonly motif: string | null
  readonly erreurs: readonly { readonly message: string; readonly pile: string }[]
  readonly requetes: readonly string[]
  readonly ms: number
}

describe('tir · le juge navigateur sur les œuvres livrées', () => {
  it(
    'monte chaque œuvre dans un VRAI navigateur, aux conditions de l’aperçu',
    async () => {
      // ── LA BASE DU PRODUIT, PAS CELLE DES ŒUVRES.
      //
      // `app_generations` vit dans le projet Deribfy ; `configBaseOeuvres`
      // désigne la base SÉPARÉE où les applications rangent leurs données.
      // Mon premier jet a visé la seconde : « Could not find the table
      // 'public.app_generations' ». Le même client que la route, donc.
      const lues = await supabaseAdmin
        .from(TABLE_GENERATIONS)
        .select('id, nom, document')
        .eq('statut', 'livree')
        .order('created_at', { ascending: false })
        .limit(COMBIEN)
      expect(lues.error, `lecture refusée : ${lues.error?.message ?? ''}`).toBeNull()
      const oeuvres = (lues.data ?? [])
        .map((l: { id: string; nom: string | null; document: unknown }) => ({
          quoi: `${l.nom ?? 'sans nom'} (${String(l.id).slice(0, 8)})`,
          fichiers: new Map(
            Object.entries(
              (l.document as { fichiers?: Record<string, string> } | null)?.fichiers ?? {},
            ),
          ) as ReadonlyMap<string, string>,
        }))
        .filter((o) => o.fichiers.size > 0)
      // ── ZÉRO ŒUVRE EST UN ROUGE, PAS UN VERT.
      //
      // Un tir qui ne trouve rien à monter n'a rien mesuré, et son vert
      // dirait le contraire.
      expect(oeuvres.length, 'aucune œuvre livrée à monter').toBeGreaterThan(0)

      const mesures: Mesure[] = []
      for (const o of oeuvres) {
        const a = await assembler(o.fichiers)
        if (!a.ok) {
          mesures.push({
            quoi: o.quoi,
            octets: 0,
            aTourne: false,
            motif: `inassemblable : ${a.erreur.slice(0, 160)}`,
            erreurs: [],
            requetes: [],
            ms: 0,
          })
          continue
        }
        const debut = Date.now()
        const v = await jugerNavigateur(a.code, { moteur: MOTEUR })
        mesures.push({
          quoi: o.quoi,
          octets: a.code.length,
          aTourne: v.aTourne,
          motif: v.motif,
          erreurs: v.erreurs,
          requetes: v.requetes,
          ms: Date.now() - debut,
        })
      }

      for (const m of mesures) {
        const r =
          m.requetes.length === 0
            ? 'AUCUNE requête — seul le DÉMARRAGE est éprouvé'
            : `${String(m.requetes.length)} requête(s) : ${m.requetes.slice(0, 3).join(' · ')}`
        process.stdout.write(
          `\n  ${m.quoi}\n` +
            `    ${String(m.octets)} o · ${String(m.ms)} ms · ${MOTEUR}\n` +
            `    instrument : ${m.aTourne ? 'a tourné' : `N’A PAS TOURNÉ — ${m.motif ?? 'sans motif'}`}\n` +
            `    ${r}\n` +
            m.erreurs
              .slice(0, 6)
              .map((e) => `    ✗ ${e.message}\n      ${e.pile}\n`)
              .join(''),
        )
      }

      // ① L'INSTRUMENT. Son échec rend le tir muet, pas vert.
      const muets = mesures.filter((m) => !m.aTourne)
      expect(
        muets.map((m) => `${m.quoi} → ${m.motif ?? 'sans motif'}`),
        'le juge n’a pas tourné : ce tir ne prouve RIEN',
      ).toEqual([])

      // ② LES ŒUVRES. Leur échec est une trouvaille, et elle se nomme.
      const cassees = mesures.filter((m) => m.erreurs.length > 0)
      expect(
        cassees.map((m) => `${m.quoi} → ${m.erreurs[0]?.message ?? ''}`),
        'une œuvre livrée jette dans un vrai navigateur',
      ).toEqual([])
    },
    15 * 60_000,
  )
})
