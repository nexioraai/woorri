/**
 * V4 · BLOC 1 — UN ÉCRAN EN DEUX PASSES.
 *
 * Deribfy impose l'archétype, la route, le rôle et la table : le modèle ne
 * choisit que des mots et des noms déjà permis.
 *
 *   PASSE A — le modèle reçoit la FICHE de l'écran (archétype imposé, table et
 *     colonnes, rôle, langues et devise fermées, routes voisines, extrait du
 *     cahier) et rédige EN TEXTE LIBRE le contenu de chaque slot. Réflexion
 *     COUPÉE (décision du 2026-11-14) : le brouillon EST le raisonnement ; une
 *     réflexion cachée par-dessus, c'est 84 % de jetons perdus (M16). Coupé ou
 *     vide → UNE relance de A ; toujours vide → repli, sans passe B.
 *   PASSE B — le même texte est CONVERTI en slots stricts (JSON), réflexion
 *     COUPÉE, puis jugé : forme de l'archétype, puis l'écran produit par le
 *     validateur du contrat (couches 1 et 2).
 *   RELANCES — au plus DEUX, de la passe B seule : le modèle reçoit la classe
 *     exacte de chaque refus et le nom valide le plus proche. Elles REMPLACENT
 *     les reprises de l'ancienne boucle (qui réécrivait du code).
 *   REPLI — si la passe B est encore refusée après ses relances, Deribfy écrit
 *     l'écran lui-même depuis la table (colonnes → colonnes ou champs, premier
 *     texte → titre, libellés de Deribfy ailleurs). Le repli est COMPTÉ et
 *     nommé ; il ne laisse jamais un slot requis vide.
 *
 * Une spec valide du premier coup coûte EXACTEMENT deux appels.
 *
 * Ce que ce module NE juge PAS, dit ici : la traduction (TRADUCTION_MANQUANTE
 * est jugée après B3, bloc 2, sur l'application entière) ; le graphe (V2 l'a
 * fixé avant tout appel) ; le sens des textes (la frontière du bloc A).
 */
import { COMPOSANTS } from './catalogue'
import { ARCHETYPES, PAGE_DU_COMPTE, expanser, libellesDuGabarit, validerRemplissage, type DefArchetype, type DefSlot, type Remplissage } from './archetypes'
import { validerFragment, reproche, type Contexte, type Refus, type TableLue } from './validateur'

// ════════════════════════════════════════════════════════════════════════
// LA FICHE — tout ce que le modèle sait de l'écran, écrit par Deribfy.
// ════════════════════════════════════════════════════════════════════════
export type Voisine = { readonly route: string; readonly nom: string; readonly archetype?: string; readonly table?: string }
export type FicheEcran = {
  readonly route: string
  /** Le nom de l'écran dans le cahier. */
  readonly nom: string
  readonly archetype: string
  readonly acces: string
  /** La table lue (ou écrite, pour un formulaire) ; imposée. */
  readonly table?: TableLue
  /** Checkout : la table où le paiement s'écrit ; imposée. */
  readonly tablePaiement?: TableLue
  /** Les routes où l'écran peut mener — les seules qu'un slot `route` ou `liens` peut nommer. */
  readonly voisines: readonly Voisine[]
  /** La langue principale (celle des textes en clair) et les langues lues. */
  readonly langue: string
  readonly langues: readonly { readonly code: string; readonly libelle: string }[]
  readonly devise: string | null
  readonly moyensPaiement: readonly string[]
  /** L'extrait du cahier qui parle de cet écran. */
  readonly extrait: string
  /** La configuration du client (marché, encaissement, logistique) : elle PRIME sur le cahier. */
  readonly configuration?: string
}

export type OptionsAppelModele = { readonly reflexion?: boolean; readonly maxJetons: number }
export type JetonsAppel = { readonly entree: number; readonly sortie: number; readonly reflexion: number }
export type AppelModele = (
  system: string,
  messages: readonly { readonly role: 'user' | 'assistant'; readonly content: string }[],
  options: OptionsAppelModele,
) => Promise<{ readonly texte: string; readonly tronquee: boolean; readonly usage: JetonsAppel }>

/** Prix par million de jetons (entrée, sortie) — la réflexion est facturée comme la sortie, dans laquelle elle est comptée. */
export type PrixJetons = { readonly entree: number; readonly sortie: number }

export const RELANCES_B = 2
/** Plafond de sortie de la passe A (réflexion coupée). */
export const MAX_JETONS_A = 4_000
/** Plafond de sortie de la passe B (réflexion coupée) : un remplissage tient en moins de 1 000 jetons. */
export const MAX_JETONS_B = 2_000
/** L'extrait du cahier envoyé au modèle est borné. */
export const EXTRAIT_MAX = 1_500

export type ClasseB = Refus['classe'] | ReturnType<typeof validerRemplissage>[number]['classe'] | 'JSON_ILLISIBLE' | 'REPONSE_COUPEE' | 'BROUILLON_VIDE'
export type RefusB = { readonly classe: ClasseB; readonly ou: string; readonly quoi: string; readonly proche: string | null }
export type Tentative = { readonly passe: 'A' | 'B'; readonly rang: number; readonly ms: number; readonly tronquee: boolean; readonly jetons: JetonsAppel; readonly refus: readonly RefusB[] }

export type EcranRempli = {
  readonly route: string
  readonly archetype: string
  readonly remplissage: Remplissage
  /** L'écran du contrat produit par l'archétype. */
  readonly ecran: Record<string, unknown>
  readonly repli: boolean
  /** Les refus de la dernière passe B quand l'écran a basculé en repli. */
  readonly refusAvantRepli: readonly RefusB[]
  /** Le repli lui-même jugé : TOUJOURS vide (cliquet) ; non vide = un défaut de Deribfy, montré. */
  readonly refusDuRepli: readonly RefusB[]
  readonly tentatives: readonly Tentative[]
  readonly appels: number
  readonly jetons: JetonsAppel
  readonly cout: number
  readonly ms: number
}

const defDe = (archetype: string): DefArchetype | undefined =>
  (ARCHETYPES as Readonly<Record<string, DefArchetype>>)[archetype] ?? (archetype === 'pageDuCompte' ? PAGE_DU_COMPTE : undefined)

/** Les slots que Deribfy pose lui-même : la table est imposée, le modèle ne l'écrit pas. */
function slotsImposes(f: FicheEcran, def: DefArchetype): Record<string, string> {
  const r: Record<string, string> = {}
  if ('table' in def.slots && f.table !== undefined) r.table = f.table.nom
  if ('tablePaiement' in def.slots && f.tablePaiement !== undefined) r.tablePaiement = f.tablePaiement.nom
  return r
}

/** Une fiche incomplète est une faute de Deribfy (le bloc 2 les écrit) : elle n'arrive jamais au modèle. */
export function verifierFiche(f: FicheEcran): string[] {
  const def = defDe(f.archetype)
  if (def === undefined) return [`archétype inconnu : ${f.archetype}`]
  const fautes: string[] = []
  if ('table' in def.slots && f.table === undefined) fautes.push(`${f.route} : l'archétype ${f.archetype} lit une table, la fiche n'en donne pas`)
  if ('tablePaiement' in def.slots && f.tablePaiement === undefined) fautes.push(`${f.route} : un checkout écrit son paiement, la fiche ne donne pas la table`)
  if (f.table !== undefined && f.table.colonnes.length === 0) fautes.push(`${f.route} : la table ${f.table.nom} n'a aucune colonne`)
  if (f.table !== undefined && f.table.publique !== true && f.acces === 'visiteur' && def.donnees !== 'aucune') fautes.push(`${f.route} : ouvert au visiteur, il lit ${f.table.nom}, table privée (DONNEE_PRIVEE_EXPOSEE)`)
  return fautes
}

// ════════════════════════════════════════════════════════════════════════
// LES CONSIGNES — générées depuis l'archétype et le catalogue.
// ════════════════════════════════════════════════════════════════════════
const FORMATS = (COMPOSANTS.Valeur!.props.format!.genre as { valeurs: readonly string[] }).valeurs
const NATURES = (COMPOSANTS.Champ!.props.nature!.genre as { valeurs: readonly string[] }).valeurs
const GENRES_BOUTON = (COMPOSANTS.Bouton!.props.genre!.genre as { valeurs: readonly string[] }).valeurs

function decrireSlot(k: string, d: DefSlot, f: FicheEcran): string {
  const card = d.min !== undefined || d.max !== undefined ? ` — de ${String(d.min ?? 0)} à ${String(d.max ?? 'n')} élément(s)` : ''
  return `- ${k}${d.requis ? ' (requis)' : ' (facultatif)'} : ${d.aide}${card}${d.genre === 'variante' ? ` — une valeur parmi ${(d.admis ?? []).join(', ')}` : ''}${d.genre === 'textes' && k === 'moyens' ? ` — UNIQUEMENT parmi : ${f.moyensPaiement.join(', ') || '(aucun lu : laisse vide)'}` : ''}`
}

function decrireFiche(f: FicheEcran, def: DefArchetype): string {
  const imposes = slotsImposes(f, def)
  const tables = [f.table, f.tablePaiement].filter((t): t is TableLue => t !== undefined)
  return [
    `ÉCRAN : « ${f.nom} » (route ${f.route}), archétype ${f.archetype} — ${def.aide}.`,
    `RÔLE : ${f.acces === 'visiteur' ? 'ouvert à tous' : f.acces}.`,
    ...tables.map((t) => `TABLE ${t.nom} — colonnes : ${t.colonnes.join(', ')}.`),
    ...Object.entries(imposes).map(([k, v]) => `IMPOSÉ PAR DERIBFY : ${k} = ${v} (tu ne l'écris pas).`),
    `ROUTES OÙ L'ÉCRAN PEUT MENER : ${f.voisines.length > 0 ? f.voisines.map((v) => `${v.route} (« ${v.nom} »)`).join(', ') : 'aucune'} ; et toujours accueil, compte.`,
    `LANGUE DES TEXTES : ${f.langue}. Langues lues : ${f.langues.map((l) => l.code).join(', ')} (Deribfy traduit ensuite).`,
    `DEVISE : ${f.devise ?? 'aucune lue'} — aucun montant écrit dans un texte, les montants viennent des données.`,
    ...(f.moyensPaiement.length > 0 ? [`MOYENS DE PAIEMENT LUS : ${f.moyensPaiement.join(', ')}.`] : []),
    ...(f.configuration !== undefined && f.configuration !== '' ? [`CONFIGURATION DU CLIENT — elle PRIME sur le cahier :\n${f.configuration}`] : []),
    `SLOTS À REMPLIR :`,
    ...Object.entries(def.slots).filter(([k]) => !(k in imposes)).map(([k, d]) => decrireSlot(k, d, f)),
    '',
    `EXTRAIT DU CAHIER :`,
    f.extrait.slice(0, EXTRAIT_MAX) || '(aucun)',
  ].join('\n')
}

export function consigneA(f: FicheEcran): { system: string; user: string } {
  const def = defDe(f.archetype)!
  return {
    system: [
      'Tu rédiges le contenu d’UN écran d’une application. Deribfy a déjà choisi sa forme (l’archétype), sa table, son rôle et ses routes : tu ne choisis que les mots.',
      'Pour chaque slot, écris son contenu en texte libre, sous un titre `### <nom du slot>`. Une liste : un élément par ligne, commençant par `- `.',
      'Règles : les textes sont dans la langue demandée, courts, sans HTML ; aucun montant ni prix écrit en clair ; aucune mention de démonstration ; aucune langue, devise, moyen de paiement ou pays que la fiche ne nomme pas ; une colonne, une table ou une route se désigne par son nom exact, tel que la fiche l’écrit.',
    ].join('\n'),
    user: decrireFiche(f, def),
  }
}

function formeJson(k: string, d: DefSlot): string {
  switch (d.genre) {
    case 'texte': return `"${k}": "<texte>"`
    case 'route': return `"${k}": "<route>"`
    case 'table': return `"${k}": "<table>"`
    case 'colonne': return `"${k}": "<colonne>"`
    case 'variante': return `"${k}": ${(d.admis ?? []).map((x) => `"${x}"`).join(' | ')}`
    case 'colonnes': return `"${k}": [{ "colonne": "<colonne>", "libelle": "<texte>", "format"?: ${FORMATS.map((x) => `"${x}"`).join(' | ')} }]`
    case 'liens': return `"${k}": [{ "libelle": "<texte>", "route": "<route>" }]`
    case 'champs': return `"${k}": [{ "colonne": "<colonne>", "libelle": "<texte>", "nature": ${NATURES.map((x) => `"${x}"`).join(' | ')}, "requis"?: true }]`
    case 'textes': return `"${k}": ["<texte>"]`
    case 'noeuds': return (d.admis ?? []).includes('Bouton')
      ? `"${k}": [{ "composant": "Bouton", "libelle": "<texte>", "genre": ${GENRES_BOUTON.map((x) => `"${x}"`).join(' | ')}, "effets": [{ "faire": "navigate", "route": "<route>" }] }]`
      : `"${k}": [{ "composant": "Encart", "enfants": [{ "composant": "Titre", "texte": "<texte>", "niveau": "encart" }, { "composant": "Phrase", "texte": "<texte>" }] }] — composants admis : ${(d.admis ?? []).join(', ')}`
  }
}

export function consigneB(f: FicheEcran, texteA: string): { system: string; user: string } {
  const def = defDe(f.archetype)!
  const imposes = slotsImposes(f, def)
  const slots = Object.entries(def.slots).filter(([k]) => !(k in imposes))
  const routes = [...new Set([...f.voisines.map((v) => v.route), 'accueil', 'compte'])]
  const colonnes = [f.table, f.tablePaiement].filter((t): t is TableLue => t !== undefined).map((t) => `${t.nom} : ${t.colonnes.join(', ')}`)
  return {
    system: [
      'Tu convertis un brouillon en JSON STRICT. Tu ne rédiges rien de neuf : tu reprends les textes du brouillon.',
      'Rends UNIQUEMENT un objet JSON de la forme { "slots": { ... } }, sans texte autour, sans bloc de code.',
      'Un slot facultatif sans contenu dans le brouillon est OMIS. Un slot requis est TOUJOURS présent et jamais vide.',
      'Les noms (route, colonne, variante, nature, format) sont recopiés EXACTEMENT parmi les valeurs permises ci-dessous — aucun autre.',
    ].join('\n'),
    user: [
      `ARCHÉTYPE ${f.archetype} — LES SLOTS, ET LEUR FORME JSON :`,
      ...slots.map(([k, d]) => `${formeJson(k, d)}${d.requis ? '   (requis)' : '   (facultatif)'}${d.min !== undefined || d.max !== undefined ? `   (${String(d.min ?? 0)} à ${String(d.max ?? 'n')})` : ''}`),
      '',
      `ROUTES PERMISES : ${routes.join(', ')}`,
      ...(colonnes.length > 0 ? [`COLONNES PERMISES — ${colonnes.join(' ; ')}`] : []),
      ...(f.moyensPaiement.length > 0 ? [`MOYENS PERMIS : ${f.moyensPaiement.join(', ')}`] : []),
      '',
      'LE BROUILLON :',
      texteA,
    ].join('\n'),
  }
}

// ════════════════════════════════════════════════════════════════════════
// LE JUGEMENT D'UNE PASSE B
// ════════════════════════════════════════════════════════════════════════
export function lireSlotsB(texte: string): { slots: Record<string, unknown> } | { refus: RefusB } {
  const sansBloc = texte.trim().replace(/^```(?:json)?\s*/u, '').replace(/\s*```$/u, '')
  const debut = sansBloc.indexOf('{')
  const fin = sansBloc.lastIndexOf('}')
  let brut: unknown
  try { brut = JSON.parse(debut >= 0 && fin > debut ? sansBloc.slice(debut, fin + 1) : sansBloc) } catch (e) {
    return { refus: { classe: 'JSON_ILLISIBLE', ou: '(racine)', quoi: `la réponse n’est pas un JSON lisible (${(e as Error).message.slice(0, 80)})`, proche: null } }
  }
  const slots = typeof brut === 'object' && brut !== null && !Array.isArray(brut) ? (brut as Record<string, unknown>).slots : undefined
  if (typeof slots !== 'object' || slots === null || Array.isArray(slots)) return { refus: { classe: 'JSON_ILLISIBLE', ou: '(racine)', quoi: 'la réponse doit être { "slots": { ... } }', proche: 'slots' } }
  return { slots: slots as Record<string, unknown> }
}

/** Le remplissage jugé : forme de l'archétype, puis l'écran produit, couches 1 et 2 (la traduction attend B3). */
export function jugerRemplissage(r: Remplissage, f: FicheEcran, ctx: Contexte): { ecran: Record<string, unknown> | null; refus: RefusB[] } {
  const forme = validerRemplissage(r)
  if (forme.length > 0) return { ecran: null, refus: forme.map((x) => ({ classe: x.classe, ou: x.slot || '(racine)', quoi: x.quoi, proche: x.proche })) }
  let ecran: Record<string, unknown>
  try { ecran = expanser(r, { langue: f.langue, langues: f.langues }) } catch (e) {
    return { ecran: null, refus: [{ classe: 'TYPE_INVALIDE', ou: '(racine)', quoi: (e as Error).message, proche: null }] }
  }
  const v = validerFragment({ ecran }, ctx, { complet: true })
  const refus = v.refus.filter((x) => x.classe !== 'TRADUCTION_MANQUANTE').map((x) => ({ classe: x.classe, ou: x.chemin, quoi: x.quoi, proche: x.proche }))
  return { ecran, refus }
}

/** Un brouillon vide : aucun `### <slot>` suivi d'un contenu. */
export const brouillonVide = (t: string): boolean => !/^###[ \t]*\S[^\n]*\n[ \t]*[^\s#]/mu.test(t)

/** La relance de la passe A : coupée ou vide, dit tel quel. */
export const relanceA = (r: RefusB): string =>
  `TON BROUILLON PRÉCÉDENT ${r.classe === 'BROUILLON_VIDE' ? 'ÉTAIT VIDE' : 'A ÉTÉ COUPÉ AVANT LA FIN'} (${r.classe}) : rends chaque slot sous \`### <slot>\`, en quelques mots, et rien d’autre.`

/** Le texte de relance : chaque refus, sa classe exacte et le nom valide le plus proche. */
export function relance(refus: readonly RefusB[]): string {
  return [
    'TA CONVERSION EST REFUSÉE :',
    reproche(refus.map((x) => ({ classe: x.classe as Refus['classe'], couche: 1, chemin: x.ou, quoi: x.quoi, proche: x.proche }))),
    'Rends le JSON { "slots": { ... } } EN ENTIER, corrigé — et rien d’autre.',
  ].join('\n')
}

// ════════════════════════════════════════════════════════════════════════
// LE REPLI — Deribfy écrit l'écran depuis la table.
// ════════════════════════════════════════════════════════════════════════
const REPLI: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  fr: { vide: 'Rien pour le moment.', enregistrer: 'Enregistrer', payer: 'Payer', commencer: 'Commencer', courriel: 'Courriel', secret: 'Mot de passe', rechercher: 'Rechercher', fait: 'C’est enregistré.', aide: 'Une question ? Passez par la page Contact.', contact: 'Écrivez-nous, nous vous répondrons.', legal: 'Cette application est éditée par son exploitant.', continuer: 'Continuer', compte: 'Compte' },
  en: { vide: 'Nothing yet.', enregistrer: 'Save', payer: 'Pay', commencer: 'Start', courriel: 'Email', secret: 'Password', rechercher: 'Search', fait: 'Saved.', aide: 'A question? Use the Contact page.', contact: 'Write to us, we will answer.', legal: 'This application is published by its operator.', continuer: 'Continue', compte: 'Account' },
  ar: { vide: 'لا شيء حاليًا.', enregistrer: 'حفظ', payer: 'ادفع', commencer: 'ابدأ', courriel: 'البريد الإلكتروني', secret: 'كلمة المرور', rechercher: 'بحث', fait: 'تم الحفظ.', aide: 'لديك سؤال؟ استخدم صفحة الاتصال.', contact: 'راسلنا وسنرد عليك.', legal: 'هذا التطبيق من نشر مشغّله.', continuer: 'متابعة', compte: 'الحساب' },
}
export const textesDuRepli = (langue: string): Readonly<Record<string, string>> => REPLI[langue] ?? REPLI.en!

const MONTANT_COL = /prix|montant|total|tarif|cout|co[uû]t|somme|frais|price|amount/iu
const MOYEN_COL = /moyen|methode|m[ée]thode|mode_?paiement|operateur|op[ée]rateur|method/iu
const lisible = (c: string) => c.replace(/_/gu, ' ').replace(/^./u, (x) => x.toUpperCase())
const sur = (t: string) => t.replace(/[<>]/gu, '').replace(/\s+/gu, ' ').trim().slice(0, 120)

/** Le premier texte rédigé par la passe A pour le titre, s'il y en a un. */
export function premierTexte(texteA: string): string | null {
  const m = /^###\s*titre\s*$\s*([^\n]+)/imu.exec(texteA)
  const t = m === null ? '' : sur(m[1]!.replace(/^[-*]\s*/u, '').replace(/^["«]\s*|\s*["»]$/gu, ''))
  return t === '' ? null : t
}

function remplissageDeRepli(f: FicheEcran, titre: string): Remplissage {
  const g = textesDuRepli(f.langue)
  const gab = libellesDuGabarit(f.langue)
  const t = f.table
  const cols = (max: number) => (t?.colonnes ?? []).slice(0, max).map((c) => ({ colonne: c, libelle: lisible(c), ...(MONTANT_COL.test(c) ? { format: 'montant' } : {}) }))
  const voisine = (archetype: string, table?: string) => f.voisines.find((v) => v.archetype === archetype && (table === undefined || v.table === table))?.route
  const ailleurs = f.voisines.find((v) => v.route !== f.route)?.route ?? 'accueil'
  const montant = (x: TableLue | undefined) => x?.colonnes.find((c) => MONTANT_COL.test(c)) ?? x?.colonnes[0] ?? ''
  const base = { archetype: f.archetype, route: f.route, acces: f.acces }
  const sauf = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined))
  switch (f.archetype) {
    case 'auth': return { ...base, slots: { titre, natureIdentifiant: 'courriel', libelleIdentifiant: g.courriel!, libelleSecret: g.secret!, apres: ailleurs } }
    case 'onboarding': return { ...base, slots: { titre, etapes: [{ composant: 'Phrase', texte: titre }], fin: ailleurs, libelleFin: g.commencer! } }
    case 'accueil': {
      const liens = f.voisines.filter((v) => v.route !== 'accueil').slice(0, 12).map((v) => ({ libelle: sur(v.nom) || v.route, route: v.route }))
      return { ...base, slots: { titre, raccourcis: liens.length > 0 ? liens : [{ libelle: gab.aide!, route: 'aide' }] } }
    }
    case 'liste': return { ...base, slots: sauf({ titre, table: t!.nom, colonnes: cols(6), detail: voisine('detail', t!.nom), vide: g.vide! }) }
    case 'dashboard': return { ...base, slots: sauf({ titre, table: t!.nom, colonnes: cols(6), detail: voisine('detail', t!.nom), vide: g.vide! }) }
    case 'tableAdmin': return { ...base, slots: sauf({ titre, table: t!.nom, colonnes: cols(6), creation: voisine('formulaire', t!.nom), vide: g.vide! }) }
    case 'recherche': return { ...base, slots: sauf({ titre, table: t!.nom, colonneRecherche: t!.colonnes[0]!, libelleRecherche: g.rechercher!, colonnes: cols(6), detail: voisine('detail', t!.nom), vide: g.vide! }) }
    case 'detail': return { ...base, slots: { titre, table: t!.nom, colonnes: cols(6), retour: voisine('liste', t!.nom) ?? ailleurs, vide: g.vide! } }
    case 'profil': return { ...base, slots: { titre, table: t!.nom, colonnes: cols(6), vide: g.vide! } }
    case 'formulaire': return { ...base, slots: { titre, table: t!.nom, champs: t!.colonnes.slice(0, 12).map((c) => ({ colonne: c, libelle: lisible(c), nature: MONTANT_COL.test(c) ? 'nombre' : 'texte' })), apres: voisine('liste', t!.nom) ?? ailleurs, libelleEnvoi: g.enregistrer! } }
    case 'checkout': {
      const p = f.tablePaiement!
      const champMoyen = p.colonnes.find((c) => MOYEN_COL.test(c))
      return { ...base, slots: sauf({
        titre, table: t!.nom, colonnes: cols(6), colonneMontant: montant(t), tablePaiement: p.nom, champMontant: montant(p),
        ...(champMoyen !== undefined && f.moyensPaiement.length > 0 ? { champMoyen, moyens: f.moyensPaiement.slice(0, 8) } : {}),
        confirmation: voisine('confirmation') ?? 'accueil', libellePayer: g.payer!, vide: g.vide!,
      }) }
    }
    case 'confirmation': return { ...base, slots: { titre, message: g.fait!, table: t!.nom, colonnes: cols(6), suites: [{ libelle: gab.accueil!, route: 'accueil' }], vide: g.vide! } }
    case 'compte': return { ...base, slots: { titre } }
    case 'pageDuCompte': return { ...base, slots: { titre, texte: g[f.route] ?? g.aide!, retour: 'compte' } }
    default: throw new Error(`repli : archétype inconnu ${f.archetype}`)
  }
}

/** Le repli : le premier texte de la passe A comme titre s'il passe le contrat, sinon le nom lu. */
export function repli(f: FicheEcran, ctx: Contexte, texteA: string): { remplissage: Remplissage; ecran: Record<string, unknown> | null; refus: RefusB[] } {
  const candidats = [premierTexte(texteA), sur(f.nom), lisible(f.route.replace(/-/gu, ' '))].filter((x): x is string => x !== null && x !== '')
  let dernier: { remplissage: Remplissage; ecran: Record<string, unknown> | null; refus: RefusB[] } | null = null
  for (const titre of [...new Set(candidats)]) {
    const remplissage = remplissageDeRepli(f, titre)
    const j = jugerRemplissage(remplissage, f, ctx)
    dernier = { remplissage, ...j }
    if (j.refus.length === 0) return dernier
  }
  return dernier!
}

// ════════════════════════════════════════════════════════════════════════
// L'ÉCRAN EN DEUX PASSES
// ════════════════════════════════════════════════════════════════════════
const coutDe = (j: JetonsAppel, prix: PrixJetons) => (j.entree * prix.entree + j.sortie * prix.sortie) / 1_000_000

export async function remplirEcran(o: {
  readonly fiche: FicheEcran
  readonly ctx: Contexte
  readonly appeler: AppelModele
  readonly prix: PrixJetons
  readonly relances?: number
}): Promise<EcranRempli> {
  const debutTotal = Date.now()
  const { fiche: f, ctx } = o
  const fautes = verifierFiche(f)
  if (fautes.length > 0) throw new Error(`fiche invalide : ${fautes.join(' ; ')}`)
  const def = defDe(f.archetype)!
  const imposes = slotsImposes(f, def)
  const relancesMax = o.relances ?? RELANCES_B
  const tentatives: Tentative[] = []
  const total = { entree: 0, sortie: 0, reflexion: 0 }
  const compter = (u: JetonsAppel) => { total.entree += u.entree; total.sortie += u.sortie; total.reflexion += u.reflexion }

  // ── PASSE A : le texte libre, réflexion COUPÉE (le brouillon EST le raisonnement) ;
  //    coupée ou vide → UNE relance de A, enregistrée ; jamais une passe B sur un brouillon vide.
  const a = consigneA(f)
  let debut = Date.now()
  let ra = await o.appeler(a.system, [{ role: 'user', content: a.user }], { reflexion: false, maxJetons: MAX_JETONS_A })
  compter(ra.usage)
  const defautA = (r: typeof ra): RefusB | null =>
    brouillonVide(r.texte) ? { classe: 'BROUILLON_VIDE', ou: '(racine)', quoi: 'le brouillon ne porte aucun slot rédigé (### <slot> suivi de son contenu)', proche: null }
      : r.tronquee ? { classe: 'REPONSE_COUPEE', ou: '(racine)', quoi: 'le brouillon a été coupé avant la fin', proche: null } : null
  let refusA = defautA(ra)
  tentatives.push({ passe: 'A', rang: 1, ms: Date.now() - debut, tronquee: ra.tronquee, jetons: ra.usage, refus: refusA === null ? [] : [refusA] })
  if (refusA !== null) {
    debut = Date.now()
    ra = await o.appeler(a.system, [{ role: 'user', content: `${a.user}\n\n${relanceA(refusA)}` }], { reflexion: false, maxJetons: MAX_JETONS_A })
    compter(ra.usage)
    refusA = defautA(ra)
    tentatives.push({ passe: 'A', rang: 2, ms: Date.now() - debut, tronquee: ra.tronquee, jetons: ra.usage, refus: refusA === null ? [] : [refusA] })
  }
  if (brouillonVide(ra.texte)) {
    const r = repli(f, ctx, '')
    return {
      route: f.route, archetype: f.archetype, remplissage: r.remplissage, ecran: r.ecran ?? {}, repli: true,
      refusAvantRepli: refusA === null ? [] : [refusA], refusDuRepli: r.refus, tentatives, appels: tentatives.length, jetons: { ...total }, cout: coutDe(total, o.prix), ms: Date.now() - debutTotal,
    }
  }

  // ── PASSE B : la conversion, réflexion coupée ; au plus `relancesMax` relances.
  const b = consigneB(f, ra.texte)
  const messages: { role: 'user' | 'assistant'; content: string }[] = [{ role: 'user', content: b.user }]
  let derniers: RefusB[] = []
  for (let rang = 1; rang <= 1 + relancesMax; rang += 1) {
    debut = Date.now()
    const rb = await o.appeler(b.system, messages, { reflexion: false, maxJetons: MAX_JETONS_B })
    compter(rb.usage)
    const lu = lireSlotsB(rb.texte)
    let refus: RefusB[]
    let accepte: { remplissage: Remplissage; ecran: Record<string, unknown> } | null = null
    if ('refus' in lu) refus = [lu.refus]
    else {
      const remplissage: Remplissage = { archetype: f.archetype, route: f.route, acces: f.acces, slots: { ...lu.slots, ...imposes } }
      const j = jugerRemplissage(remplissage, f, ctx)
      refus = j.refus
      if (refus.length === 0 && j.ecran !== null) accepte = { remplissage, ecran: j.ecran }
    }
    if (rb.tronquee) refus = [{ classe: 'REPONSE_COUPEE', ou: '(racine)', quoi: 'ta réponse a été coupée avant la fin : rends un JSON plus court', proche: null }, ...refus]
    tentatives.push({ passe: 'B', rang, ms: Date.now() - debut, tronquee: rb.tronquee, jetons: rb.usage, refus })
    if (accepte !== null && !rb.tronquee) {
      return { route: f.route, archetype: f.archetype, ...accepte, repli: false, refusAvantRepli: [], refusDuRepli: [], tentatives, appels: tentatives.length, jetons: { ...total }, cout: coutDe(total, o.prix), ms: Date.now() - debutTotal }
    }
    derniers = refus
    if (rang <= relancesMax) {
      messages.push({ role: 'assistant', content: rb.texte }, { role: 'user', content: relance(refus) })
    }
  }

  // ── REPLI : Deribfy écrit l'écran depuis la table ; compté, nommé.
  const r = repli(f, ctx, ra.texte)
  return {
    route: f.route, archetype: f.archetype, remplissage: r.remplissage, ecran: r.ecran ?? {}, repli: true,
    refusAvantRepli: derniers, refusDuRepli: r.refus, tentatives, appels: tentatives.length, jetons: { ...total }, cout: coutDe(total, o.prix), ms: Date.now() - debutTotal,
  }
}
