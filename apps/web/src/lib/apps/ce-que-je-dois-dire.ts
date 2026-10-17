/**
 * CE QUE DERIBFY SAIT ET NE DIT À PERSONNE.
 *
 * ── LE CONSTAT QUI A COMMANDÉ CE FICHIER (2026-10-16).
 *
 * En analysant Lovable, trois phrases ont sauté aux yeux :
 *
 *   « J'ai mis 100 FCFA par unité comme prix par défaut. Remplacez-le par
 *     votre tarif réel, en bas de la page. »
 *   « L'appli elle-même ne peut pas envoyer de notification. C'est votre
 *     calendrier qui sonne. »
 *   « Les relevés sont enregistrés seulement sur votre téléphone. »
 *
 * Une hypothèse ASSUMÉE et où la changer. Une limite AVOUÉE et son
 * contournement. L'endroit où vivent les données, sans qu'on l'ait demandé.
 *
 * ── ET DERIBFY POSSÈDE DÉJÀ TOUT ÇA.
 *
 * Mesuré sur `tontine.air.json` le même jour : QUATRE besoins déclarés
 * `unexpressible`, chacun avec son motif exact. Un `backend` déclaré. Des
 * unités monétaires sur chaque champ d'argent. Des jeux de démonstration
 * comptés ligne par ligne.
 *
 * Tout cela vit dans un JSON de 62 ko que personne n'ouvre. Le propriétaire
 * a dépensé ~29 $ sans jamais lire une phrase de ce que le moteur avait
 * compris, supposé, ou renoncé à faire.
 *
 * ── CE QUE CE MODULE EST, ET CE QU'IL N'EST PAS.
 *
 * Il est PUR : un document entre, des phrases sortent. Aucune base, aucun
 * réseau, aucun état. C'est ce qui permet de l'éprouver sans rien monter, et
 * de l'appeler de partout — l'écran, le zip, la note de publication.
 *
 * Il n'INVENTE rien. Chaque phrase est tirée d'un fait du document. Quand le
 * document ne dit rien, ce module se tait : une phrase rassurante non fondée
 * serait pire que le silence d'aujourd'hui, parce qu'on la croirait.
 */
import type { ProjectAir } from '@deribfy/air-schema'

/** Une chose que le moteur a décidée à la place de quelqu'un. */
export interface Hypothese {
  /** Ce qui a été supposé, en une phrase. */
  readonly quoi: string
  /** Où la personne peut le changer. Absent quand ça ne se change pas ici. */
  readonly ou?: string
}

/** Une chose que le moteur ne tient PAS, et pourquoi. */
export interface HorsPortee {
  /** L'exigence, dans les mots du cahier — lisible sans connaître le moteur. */
  readonly quoi: string
  /** Le motif technique, pour qui veut creuser. Jamais affiché en premier. */
  readonly pourquoi: string
}

export interface CeQuIlFautDire {
  readonly hypotheses: readonly Hypothese[]
  readonly horsPortee: readonly HorsPortee[]
  /** Où vivent les données, en une phrase. Toujours présent. */
  readonly donnees: string
}

/** Le pluriel sans « (s) » : on écrit pour des gens, pas pour un gabarit. */
const pluriel = (n: number, un: string, plusieurs: string): string =>
  `${String(n)} ${n > 1 ? plusieurs : un}`

/**
 * LES DEVISES EMPLOYÉES PAR LES MONTANTS DU DOCUMENT.
 *
 * On lit `unit` sur les champs décimaux et numériques — c'est là que le
 * document déclare un code ISO 4217. On ne devine aucun pays : la loi EP-201
 * l'interdit, et v0 vient d'en donner la démonstration en déduisant « France »
 * de la langue française, puis en affichant un tarif EDF à un utilisateur qui
 * n'est pas en France.
 */
const devises = (air: ProjectAir): string[] => {
  const vues = new Set<string>()
  for (const e of air.entities) {
    for (const f of e.fields) {
      if (typeof f.unit === 'string' && /^[A-Z]{3}$/u.test(f.unit)) vues.add(f.unit)
    }
  }
  return [...vues].sort()
}

/** Le nombre de lignes de démonstration compilées dans l'application. */
const lignesDeDemo = (air: ProjectAir): number =>
  (air.datasets ?? []).reduce((n, d) => n + (d.rowCount ?? 0), 0)

/**
 * CE QUE LE MOTEUR A DÉCIDÉ À LA PLACE DE QUELQU'UN.
 *
 * Chaque entrée est un FAIT du document, pas une politesse. Si le document
 * ne porte ni devise, ni données de démonstration, ni thème, cette liste est
 * vide — et c'est la vérité.
 */
const hypothesesDe = (air: ProjectAir): Hypothese[] => {
  const out: Hypothese[] = []

  const codes = devises(air)
  if (codes.length > 0) {
    out.push({
      quoi:
        codes.length === 1
          ? `Les montants sont affichés en ${codes[0] ?? ''}.`
          : `Les montants sont affichés en ${codes.join(', ')}.`,
      ou: 'Le code de la devise vient de votre cahier des charges, pas de votre pays.',
    })
  }

  const lignes = lignesDeDemo(air)
  if (lignes > 0) {
    out.push({
      quoi: `L'application contient ${pluriel(lignes, 'ligne', 'lignes')} d'exemple — des noms, des montants et des dates inventés pour que les écrans ne soient pas vides.`,
      ou: 'Ce ne sont pas vos données. Elles disparaîtront quand votre serveur fournira les vraies.',
    })
  }

  // L'IDENTITÉ VISUELLE : le document la NOMME, et personne ne le dit jamais.
  // Base44 l'annonce dès sa première phrase (« bleu nuit et ambre ») ; ici
  // elle était décidée en silence.
  if (air.design.theme.length > 0) {
    out.push({
      quoi: `La couleur de l'application est dérivée du thème « ${air.design.theme} » déclaré dans votre document.`,
      ou: 'Changer ce nom change la teinte, de façon stable et reproductible.',
    })
  }

  const entree = air.navigation.entryScreenId
  const ecran = air.screens.find((s) => s.id === entree)
  if (ecran !== undefined) {
    out.push({
      quoi: `L'application s'ouvre sur « ${ecran.title?.[0]?.text ?? entree} ».`,
    })
  }

  return out
}

/**
 * CE QUE LE MOTEUR NE TIENT PAS, ET IL LE SAIT DEPUIS LE DÉBUT.
 *
 * `intent.needs` porte chaque exigence du cahier avec sa résolution. Les
 * `unexpressible` y sont depuis le premier jour, motif compris. Ils n'ont
 * jamais atteint un humain.
 *
 * L'ORDRE EST VOULU : `statement` d'abord — c'est la phrase du CAHIER, elle
 * se lit sans connaître le moteur. Le motif ensuite, pour qui veut creuser.
 */
const horsPorteeDe = (air: ProjectAir): HorsPortee[] =>
  (air.intent?.needs ?? [])
    .filter((n) => n.resolution.kind !== 'satisfied')
    .map((n) => ({
      quoi: n.statement,
      pourquoi:
        'reason' in n.resolution && typeof n.resolution.reason === 'string'
          ? n.resolution.reason
          : '',
    }))

/**
 * OÙ VIVENT LES DONNÉES — toujours répondu, jamais esquivé.
 *
 * Trois cas, et aucun n'est flatteur par défaut :
 *   • un serveur est DÉCLARÉ mais reste à construire → on le dit ;
 *   • une source distante est résolue → on la nomme ;
 *   • rien → les données ne quittent pas l'appareil.
 */
const donneesDe = (air: ProjectAir): string => {
  const lignes = lignesDeDemo(air)
  const backend = air.backend as { kind?: string; stack?: string } | undefined

  if (backend?.kind === 'genere') {
    return (
      `Aujourd'hui, rien ne sort de l'appareil : les ${pluriel(lignes, 'ligne', 'lignes')} ` +
      `affichées sont compilées DANS l'application. Votre document déclare un serveur ` +
      `${backend.stack === undefined ? '' : `(${backend.stack}) `}qui reste à construire — ` +
      `c'est lui qui portera les vraies données, les calculs d'argent et les droits.`
    )
  }
  if (backend !== undefined && backend.kind !== undefined) {
    return `Les données viennent du serveur déclaré dans votre document (${backend.kind}).`
  }
  return (
    `Les données ne quittent pas l'appareil : les ${pluriel(lignes, 'ligne', 'lignes')} ` +
    `affichées sont compilées dans l'application. Aucun serveur n'est déclaré.`
  )
}

/** Tout ce que le moteur doit dire d'une application qu'il livre. */
export function ceQuIlFautDire(air: ProjectAir): CeQuIlFautDire {
  return {
    hypotheses: hypothesesDe(air),
    horsPortee: horsPorteeDe(air),
    donnees: donneesDe(air),
  }
}

/**
 * LA MÊME CHOSE, EN MARKDOWN, POUR VOYAGER AVEC L'APPLICATION.
 *
 * C'est la propriété que Lovable a et que Deribfy n'avait pas : le dire au
 * MOMENT où ça compte. Un fichier dans le zip survit à la conversation, au
 * rechargement de la page, et au changement de personne.
 *
 * `diagnostics` est optionnel : quand la ligne en porte (une application
 * livrée AVEC RÉSERVES, depuis le LOT 1), ils ouvrent la note. Une
 * application dont on sait ce qui cloche vaut mieux qu'une application dont
 * on ne sait rien.
 */
export function noteDeLivraison(
  air: ProjectAir,
  diagnostics: readonly string[] = [],
  options: { readonly partielle?: boolean } = {},
): string {
  const d = ceQuIlFautDire(air)
  const l: string[] = [`# ${air.app.name}`, '']

  // ── UNE LIVRAISON PARTIELLE LE DIT EN PREMIER (LOT 7).
  //
  // Depuis le LOT 7, on peut télécharger ce qui existe AVANT la fin : un
  // acquis schéma-valide qui compile est une application réelle, et
  // l'attendre pendant 53 minutes — mesuré sur un vrai tir — pour n'avoir
  // peut-être rien est le défaut que ce lot ferme.
  //
  // Mais la taire serait pire que l'attente : quelqu'un publierait une
  // application à moitié écrite en croyant la tenir entière. Elle ouvre donc
  // la note, AVANT les réserves, parce que c'est la première chose à savoir.
  if (options.partielle === true) {
    l.push(
      '## ⏳ Ceci est une livraison PARTIELLE',
      '',
      "La génération n'était pas terminée quand vous avez téléchargé. Ce que",
      'vous tenez est ce que le moteur avait déjà produit : cela compile et',
      "s'affiche, et ce n'est pas tout ce qui a été demandé.",
      '',
      `À cet instant : ${pluriel(air.screens.length, 'écran', 'écrans')}, ` +
        `${pluriel(air.entities.length, 'donnée', 'types de données')}.`,
      '',
      '**Ne publiez pas cette version.** Attendez la fin, puis téléchargez à',
      'nouveau : le lien ne change pas, et la version complète remplacera',
      'celle-ci.',
      '',
    )
  }

  if (diagnostics.length > 0) {
    l.push(
      `## ⚠️ ${pluriel(diagnostics.length, 'réserve', 'réserves')} sur cette application`,
      '',
      "Elle vous est livrée, et elle n'est pas conforme sur les points suivants.",
      'Les voir ne coûte rien ; les ignorer coûte une publication refusée.',
      '',
      ...diagnostics.slice(0, 40).map((x) => `- ${x}`),
      '',
    )
  }

  if (d.hypotheses.length > 0) {
    l.push('## Ce que j’ai supposé', '')
    for (const h of d.hypotheses) {
      l.push(`- **${h.quoi}**${h.ou === undefined ? '' : `  \n  ${h.ou}`}`)
    }
    l.push('')
  }

  if (d.horsPortee.length > 0) {
    l.push(
      '## Ce que je ne sais pas faire, et pourquoi',
      '',
      'Ces points de votre cahier des charges sont RECONNUS et NON TENUS.',
      "Ils ne sont pas oubliés : ils sont au-delà de ce que le format sait dire aujourd'hui.",
      '',
    )
    for (const h of d.horsPortee) {
      l.push(`- **${h.quoi}**`)
      if (h.pourquoi !== '') l.push(`  <details><summary>Pourquoi</summary>`, '', `  ${h.pourquoi}`, '', `  </details>`)
    }
    l.push('')
  }

  l.push('## Où vivent vos données', '', d.donnees, '')
  return l.join('\n')
}
