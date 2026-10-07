/**
 * LA SURVEILLANCE DE LA GÉNÉRATION — AVANT, PENDANT, APRÈS.
 *
 * ── CE QU'ELLE EXISTE POUR ATTRAPER.
 *
 * Une génération enchaîne quatre temps : comprendre, émettre, compiler,
 * montrer. Chacun peut échouer, et surtout chacun peut RÉUSSIR MAL — rendre
 * un document vide, un paquet de trois kilo-octets, ou tourner en rond sur la
 * même erreur sans que rien ne le dise.
 *
 * Trois défauts réels, tous rencontrés aujourd'hui, et qu'aucun test local
 * n'aurait vus :
 *   · un module absent de la fonction déployée ;
 *   · sa dépendance absente à son tour ;
 *   · un binaire natif introuvable, derrière un message qui accusait npm.
 *
 * Les trois se sont vus parce qu'une sortie les NOMMAIT. Cette surveillance
 * généralise ce réflexe : chaque temps est mesuré, et ce qui sort d'une borne
 * est dit — au demandeur sur-le-champ, et à l'administrateur par courriel.
 *
 * ── CE QU'ELLE N'EST PAS.
 *
 * Elle n'écrit dans aucune table. Le dépôt n'a pas de mécanisme de migration,
 * et inventer une table sans décision serait exactement le genre de geste
 * qu'on reproche. Elle rapporte en direct et alerte ; la mémoire longue sera
 * un lot séparé, avec sa table décidée.
 */
import { DESTINATAIRE_ALERTES } from '@/lib/admin-emails'

export type NomPhase = 'comprehension' | 'emission' | 'compilation' | 'apercu'

/**
 * Combien de temps chaque temps a le DROIT de prendre, et ce qu'il doit au
 * moins produire. Les bornes viennent de mesures, pas d'intuitions :
 *   · compréhension — P0 a pris 0,21 $ et quelques secondes par tirage ;
 *   · compilation — 60 fichiers émis en moins d'une seconde ;
 *   · aperçu — 943 ko assemblés en 196 ms, mesuré.
 * Une borne large ne sert à rien ; une borne serrée crie pour rien. Celles-ci
 * sont à environ dix fois le temps observé : elles n'attrapent que ce qui est
 * VRAIMENT parti de travers.
 */
const BORNES: Record<NomPhase, { ms: number; minimumOctets?: number }> = {
  comprehension: { ms: 90_000 },
  emission: { ms: 10_000 },
  compilation: { ms: 30_000 },
  apercu: { ms: 60_000, minimumOctets: 50_000 },
}

export type Anomalie = {
  readonly phase: NomPhase
  readonly code: 'echec' | 'trop_lent' | 'sortie_maigre' | 'en_rond'
  readonly message: string
}

export type Trace = {
  readonly phase: NomPhase
  readonly ms: number
  readonly ok: boolean
  readonly detail?: string
}

export type Rapport = {
  readonly demande: string
  readonly traces: Trace[]
  readonly anomalies: Anomalie[]
  readonly msTotal: number
  /** `true` si tout s'est passé comme attendu. C'est ce que lit l'interface. */
  readonly saine: boolean
}

/** Une génération sous surveillance. Un objet par demande, jamais partagé. */
export class Veille {
  private readonly traces: Trace[] = []
  private readonly anomalies: Anomalie[] = []
  private readonly debut = Date.now()
  /** Les échecs déjà vus, pour reconnaître une répétition. */
  private readonly dejaVus = new Map<string, number>()

  constructor(private readonly demande: string) {}

  /**
   * Exécute un temps sous surveillance.
   *
   * L'erreur n'est PAS avalée : elle remonte à l'appelant après avoir été
   * consignée. Une surveillance qui absorbe les pannes transforme un échec
   * franc en résultat douteux — exactement ce qu'on veut éviter.
   */
  async temps<T>(phase: NomPhase, travail: () => Promise<T> | T): Promise<T> {
    const t0 = Date.now()
    try {
      const r = await travail()
      const ms = Date.now() - t0
      this.traces.push({ phase, ms, ok: true })
      if (ms > BORNES[phase].ms) {
        this.noter({
          phase,
          code: 'trop_lent',
          message: `${phase} a pris ${String(Math.round(ms / 1000))} s (borne ${String(BORNES[phase].ms / 1000)} s).`,
        })
      }
      return r
    } catch (e) {
      const ms = Date.now() - t0
      const detail = e instanceof Error ? e.message : String(e)
      this.traces.push({ phase, ms, ok: false, detail })
      this.noter({ phase, code: 'echec', message: `${phase} a échoué : ${detail}` })
      throw e
    }
  }

  /** Ce qu'un temps a produit : trop peu est une anomalie, pas un succès. */
  mesurerSortie(phase: NomPhase, octets: number): void {
    const minimum = BORNES[phase].minimumOctets
    if (minimum !== undefined && octets < minimum) {
      this.noter({
        phase,
        code: 'sortie_maigre',
        message: `${phase} n'a produit que ${String(octets)} octets (au moins ${String(minimum)} attendus) — une sortie trop courte n'est pas un succès.`,
      })
    }
  }

  /**
   * Consigne une anomalie, et reconnaît une RÉPÉTITION.
   *
   * Le même échec vu trois fois n'est pas trois incidents : c'est une boucle,
   * et c'est ce que le propriétaire a demandé de voir — « si un truc tourne
   * en rond ». Trois tirages P0 refusés au même endroit, c'était exactement
   * cela, et il a fallu lire un journal pour s'en apercevoir.
   */
  private noter(a: Anomalie): void {
    this.anomalies.push(a)
    const cle = `${a.phase}:${a.code}:${a.message.slice(0, 80)}`
    const vu = (this.dejaVus.get(cle) ?? 0) + 1
    this.dejaVus.set(cle, vu)
    if (vu === 3) {
      this.anomalies.push({
        phase: a.phase,
        code: 'en_rond',
        message: `Le même échec s'est produit ${String(vu)} fois sur ${a.phase} — ça tourne en rond, ce n'est pas une malchance.`,
      })
    }
  }

  conclure(): Rapport {
    return {
      demande: this.demande,
      traces: this.traces,
      anomalies: this.anomalies,
      msTotal: Date.now() - this.debut,
      saine: this.anomalies.length === 0,
    }
  }
}

/**
 * Prévient l'administrateur — et UNIQUEMENT quand il y a lieu.
 *
 * Une alerte qui part à chaque génération ne se lit plus au bout de trois
 * jours. Celle-ci ne part que sur anomalie, et elle dit QUOI, OÙ, et ce que
 * l'utilisateur a demandé — de quoi reproduire sans rien chercher.
 */
export async function alerter(r: Rapport): Promise<boolean> {
  if (r.saine) return false
  const cle = process.env.RESEND_API_KEY ?? ''
  if (cle === '') return false
  try {
    const { Resend } = await import('resend')
    const lignes = r.anomalies.map((a) => `<li><strong>${a.code}</strong> — ${a.message}</li>`).join('')
    const parcours = r.traces
      .map((t) => `${t.ok ? '✅' : '🔴'} ${t.phase} · ${String(t.ms)} ms${t.detail === undefined ? '' : ` — ${t.detail}`}`)
      .join('<br>')
    await new Resend(cle).emails.send({
      from: 'Deribfy Alerts <no-reply@deribfy.com>',
      to: DESTINATAIRE_ALERTES,
      subject: `⚠️ Génération d'application — ${String(r.anomalies.length)} anomalie(s)`,
      html:
        `<p>Demande : <em>${r.demande.slice(0, 200)}</em></p>` +
        `<ul>${lignes}</ul><p>Parcours :<br>${parcours}</p>` +
        `<p>Total ${String(r.msTotal)} ms.</p>`,
    })
    return true
  } catch {
    // Une alerte qui échoue ne doit pas faire échouer la génération. Mais son
    // échec ne se cache pas non plus : il revient en `false`, et l'appelant
    // le met dans sa réponse.
    return false
  }
}
