/**
 * LA SONDE — « TU DOIS SAVOIR AUSSI ».
 *
 * ── POURQUOI ELLE EXISTE.
 *
 * La surveillance prévient le demandeur à l'écran et l'administrateur par
 * courriel. Les deux supposent que quelqu'un REGARDE. Le propriétaire l'a
 * dit : « pas seulement moi, tu dois savoir aussi ».
 *
 * Or je ne vois rien de la production : ni les journaux, ni une session
 * d'utilisateur. Cette route est le seul oeil que je puisse avoir — une
 * adresse que j'interroge, et qui exerce la chaîne POUR DE VRAI.
 *
 * ── CE QU'ELLE EXERCE, ET CE QU'ELLE NE TOUCHE PAS.
 *
 * Lecture simple → document → compilation → assemblage. Les quatre maillons
 * qui ont cassé aujourd'hui, chacun pour une raison différente : un module
 * absent du paquet, sa dépendance absente, un binaire natif introuvable, une
 * grammaire refusée.
 *
 * Elle N'APPELLE AUCUN MODÈLE : zéro centime, à n'importe quelle fréquence.
 * Elle ne lit AUCUNE donnée d'utilisateur : la phrase est écrite ici.
 *
 * ── POURQUOI ELLE EST GARDÉE.
 *
 * Elle compile et assemble — du temps de processeur. Ouverte, elle serait une
 * invitation à épuiser la fonction. Même secret que les crons : un geste qui
 * coûte ne s'offre pas à l'anonyme.
 */
import { NextResponse } from 'next/server'
import { compileWeb } from '@deribfy/compiler'
import { projectAirSchema } from '@deribfy/air-schema'
import { emettreSansIa, lireLaPhrase } from '@/lib/apps/emission'
import { construireApercu } from '@/lib/apps/apercu'
import { zipper } from '@/lib/apps/zip'
import { depenseAutorisee } from '@/lib/apps/comprendre'

export const runtime = 'nodejs'
export const maxDuration = 120

/** La phrase témoin. FIGÉE : deux sondes doivent se comparer. */
const TEMOIN = 'une application de suivi de chantier avec 12 ouvriers et leurs taches'

type Maillon = { nom: string; ok: boolean; ms: number; mesure?: string; detail?: string }

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== 'Bearer ' + secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const maillons: Maillon[] = []
  const essayer = async <T>(nom: string, f: () => Promise<T> | T): Promise<T | null> => {
    const t0 = Date.now()
    try {
      const r = await f()
      maillons.push({ nom, ok: true, ms: Date.now() - t0 })
      return r
    } catch (e) {
      maillons.push({
        nom,
        ok: false,
        ms: Date.now() - t0,
        detail: e instanceof Error ? e.message : String(e),
      })
      return null
    }
  }

  const lu = await essayer('lecture', () => lireLaPhrase(TEMOIN))
  // LA LECTURE DOIT ENTENDRE LE NOMBRE. « 12 ouvriers » qui donnerait 8 serait
  // le défaut d'origine, revenu sans bruit.
  if (lu !== null) {
    const juste = lu.elements === 12
    maillons[maillons.length - 1] = {
      ...maillons[maillons.length - 1]!,
      ok: juste,
      mesure: `${String(lu.elements)} éléments`,
      ...(juste ? {} : { detail: 'la lecture n’entend plus le nombre de la phrase' }),
    }
  }

  const emission = await essayer('document', () => {
    const e = emettreSansIa(TEMOIN)
    if (!e.ok) throw new Error(e.raison)
    const juge = projectAirSchema.safeParse(e.document)
    if (!juge.success) throw new Error('le document ne passe pas le schéma strict')
    return e.document
  })

  const projet =
    emission === null ? null : await essayer('compilation', () => compileWeb(emission))
  if (projet !== null) {
    maillons[maillons.length - 1] = {
      ...maillons[maillons.length - 1]!,
      ok: projet.files.size > 40,
      mesure: `${String(projet.files.size)} fichiers`,
    }
  }

  if (projet !== null) {
    const archive = await essayer('archive', () => zipper(new Map(projet.files)))
    if (archive !== null) {
      maillons[maillons.length - 1] = {
        ...maillons[maillons.length - 1]!,
        ok: archive.length > 10_000,
        mesure: `${String(Math.round(archive.length / 1024))} ko`,
      }
    }
  }

  if (emission !== null) {
    const a = await essayer('apercu', () => construireApercu(emission))
    if (a !== null) {
      // 943 ko mesurés. Un aperçu qui tomberait sous 50 ko « réussirait »
      // et ne montrerait rien — c'est le binaire natif qui aurait disparu.
      maillons[maillons.length - 1] = {
        ...maillons[maillons.length - 1]!,
        ok: a.octets > 50_000,
        mesure: `${String(Math.round(a.octets / 1024))} ko`,
      }
    }
  }

  // ── L'ANGLE MORT, ET COMMENT ON LE FERME QUAND ON LE DÉCIDE.
  //
  // Tout ce qui précède est gratuit, donc interrogeable à volonté — et c'est
  // justement pourquoi la LECTURE PAR IA n'y est pas : elle coûte un appel.
  // Conséquence assumée : si P0 tombe en production, seule une vraie demande
  // le révélerait.
  //
  // `?ia=1` ferme cet angle mort, et l'ouvre explicitement : un appel payant
  // ne part jamais parce qu'un moniteur passait par là. Le coût est RENDU
  // dans la réponse, pour qu'on le voie au lieu de le découvrir sur une
  // facture.
  if (new URL(req.url).searchParams.get('ia') === '1') {
    const t0 = Date.now()
    const { comprendre } = await import('@/lib/apps/comprendre')
    const lu = await comprendre(TEMOIN)
    maillons.push({
      nom: 'lecture_ia',
      ok: lu.ok,
      ms: Date.now() - t0,
      ...(lu.ok
        ? { mesure: `${String(lu.modele.concepts?.length ?? 0)} concepts · $${lu.coutUsd.toFixed(4)}` }
        : { detail: lu.raison.slice(0, 200) }),
    })
  }

  const casses = maillons.filter((m) => !m.ok)
  return NextResponse.json(
    {
      // LE VERDICT EN PREMIER MOT : lisible sans dérouler.
      verdict: casses.length === 0 ? 'TOUT ROULE' : `${String(casses.length)} MAILLON(S) CASSE(S)`,
      lectureParIA: depenseAutorisee()
        ? 'activée — non exercée ici, elle coûte un appel'
        : 'désactivée',
      maillons,
      msTotal: maillons.reduce((s, m) => s + m.ms, 0),
    },
    { status: casses.length === 0 ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  )
}
