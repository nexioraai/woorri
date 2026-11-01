/**
 * OPTION 1 — L'IA ÉCRIT LE CODE, ET LE COMPILATEUR LUI RÉPOND.
 *
 * ── CE QUE CE FICHIER EST, ET CE QU'IL N'EST PAS.
 *
 * C'est la SECONDE des deux architectures examinées le 2026-08-27 (D-001) :
 * « LLM écrit l'app directement », écartée alors au profit du pipeline AIR.
 * Elle n'est pas écartée pour toujours — elle est MISE À L'ÉPREUVE, et le
 * propriétaire tranchera sur des mesures, pas sur un avis.
 *
 * L'autre chemin reste INTACT et inerte : un seul interrupteur
 * (`GENERATEUR_MOTEUR`) décide lequel est atteignable. Jamais les deux.
 *
 * ── POURQUOI ON EN EST LÀ, MESURÉ LE 2026-10-18.
 *
 * Le moteur actuel ne connaît que ONZE gestes — découvrir, chercher,
 * consulter, choisir, saisir, confirmer, consulter l'historique, s'identifier,
 * payer, retirer, contacter — et TREIZE formes d'écran.
 *
 * Aucun geste ne s'appelle « calculer ». Aucune forme ne prend une photo.
 *
 * Résultat mesuré sur la demande du propriétaire — « calculer ma facture
 * SNE » : le bouton « Calculer ma facture » émis NAVIGUE vers un formulaire.
 * Les sept règles du document sont toutes des VALIDATIONS. 85, 125 et 402 n'y
 * figurent que comme texte à afficher. L'opération demandée n'existe nulle
 * part. Treize tirs, 66 $, zéro application livrée.
 *
 * On ne peut pas apprendre au moteur un geste par métier : la liste n'a pas
 * de fin. Un langage de programmation, lui, sait déjà tout dire.
 *
 * ── LE PRIX, ET IL EST RÉEL.
 *
 * Du code libre peut importer n'importe quoi. Pour le NATIF — qui est la
 * raison d'être du produit, pas un bonus — un paquet imprévu casse le build,
 * change l'empreinte native, et fait refuser une soumission.
 *
 * D'où la règle : CODE LIBRE, DÉPENDANCES FERMÉES. L'IA écrit ce qu'elle
 * veut ; elle n'importe que ce que le train de release a déjà épinglé,
 * construit et prouvé sur appareil.
 */

/**
 * CE QUE L'IA A LE DROIT D'IMPORTER — et rien d'autre.
 *
 * Les quatorze paquets du train de release (`RELEASE_TRAIN_V1`), plus les
 * deux du gabarit web. Chacun est épinglé à une version exacte, déjà
 * construit, et pour le natif déjà passé sur les appareils du banc A1→A11.
 *
 * Un import hors de cette liste est REFUSÉ avant même d'assembler : mieux
 * vaut un refus net et gratuit qu'un build EAS qui casse à 40 minutes.
 */
export const PAQUETS_AUTORISES: readonly string[] = [
  // ── le web
  'react',
  'react-dom',
  // ── le natif, tel que le train l'épingle
  'expo',
  'expo-font',
  'expo-updates',
  'expo-status-bar',
  'expo-build-properties',
  'react-native',
  'react-native-svg',
  'react-native-screens',
  'react-native-safe-area-context',
  '@react-navigation/native',
  '@react-navigation/native-stack',
  '@expo/vector-icons',
  '@supabase/supabase-js',
]

/** Un fichier écrit par le modèle : un chemin, un contenu. */
export type FichierEcrit = { readonly chemin: string; readonly contenu: string }

/**
 * LE FORMAT DE SORTIE — DU TEXTE, PAS UNE GRAMMAIRE.
 *
 * C'est le cœur du pari. Le moteur actuel force chaque jeton à travers une
 * grammaire compilée de 41 Ko — que le service a fini par REFUSER, d'où la
 * découpe en neuf passes et les 26 minutes mesurées.
 *
 * Ici : du texte libre, un séparateur par fichier. Le modèle décode à pleine
 * vitesse, et on analyse après. Si l'analyse rate, on le redit au modèle —
 * c'est une boucle, pas une garantie a priori.
 */
const SEPARATEUR = /^=== (.+?) ===$/gmu

/**
 * RETIRE LA CLÔTURE MARKDOWN QUI ENVELOPPE PARFOIS UN FICHIER.
 *
 * ── LE DÉFAUT, MESURÉ LE 2026-11-01, ET IL A COÛTÉ 0,147 $.
 *
 * Le tir b21cf508 a échoué en trois tours sur « react non embarqué », alors
 * que le moteur assemblait parfaitement — local 485 Ko, production 521 Ko,
 * toutes les formes d'import éprouvées. La cause n'était pas le moteur :
 * le modèle avait enveloppé CHACUN de ses fichiers dans une clôture
 * markdown, et notre lecteur la gardait dans le contenu :
 *
 *     === index.tsx ===
 *     ```tsx
 *     import React from 'react';
 *     …
 *     ```
 *
 * Le code ne commençait donc pas par un import mais par trois accents
 * graves. DIX-HUIT fichiers sur dix-huit étaient concernés ; le tour 1
 * rejoué sans les clôtures assemble en 543 968 octets.
 *
 * LE DÉFAUT EST DANS LE LECTEUR, PAS DANS LE MODÈLE : notre format dit
 * « rends des fichiers », il ne dit pas « sans mise en forme ». Un modèle
 * qui décore sa sortie est un modèle normal.
 *
 * Et il n'était trouvable QUE parce que les sources des tours refusés sont
 * journalisées depuis EP-297 — sans elles, on aurait relancé en aveugle.
 */
export function sansClotureMarkdown(contenu: string): string {
  const ouvrante = /^\s*```[a-zA-Z0-9]*[^\S\n]*\n/u
  if (!ouvrante.test(contenu)) return contenu
  const sansOuvrante = contenu.replace(ouvrante, '')
  // La fermante n'est retirée que si elle clôt VRAIMENT le fichier : un
  // bloc de code dans un commentaire ne doit pas faire perdre la fin.
  return sansOuvrante.replace(/\n[^\S\n]*```[^\S\n]*$/u, '').trimEnd()
}

export function lireFichiers(texte: string): readonly FichierEcrit[] {
  const out: FichierEcrit[] = []
  const bornes: { chemin: string; debut: number }[] = []
  SEPARATEUR.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = SEPARATEUR.exec(texte)) !== null) {
    const chemin = (m[1] ?? '').trim()
    if (chemin !== '') bornes.push({ chemin, debut: m.index + m[0].length })
  }
  for (let i = 0; i < bornes.length; i += 1) {
    const b = bornes[i]
    if (b === undefined) continue
    const suivant = bornes[i + 1]
    // La fin d'un fichier est le début du séparateur suivant. On recule
    // jusqu'au dernier saut de ligne pour ne pas emporter la ligne « === ».
    const fin = suivant === undefined ? texte.length : texte.lastIndexOf('\n', suivant.debut - 1)
    const contenu = sansClotureMarkdown(
      texte.slice(b.debut, fin < b.debut ? texte.length : fin).trim(),
    )
    if (contenu !== '') out.push({ chemin: b.chemin, contenu })
  }
  return out
}

/**
 * Les imports d'un fichier, tels qu'ils voyageront jusqu'au build.
 *
 * ── QUATRE FORMES, ET LES DEUX DERNIÈRES ONT ÉTÉ UN TROU RÉEL.
 *
 * Ma première version ne lisait que `import x from 'y'` et `from 'y'`.
 * Mesuré le 2026-10-18, en cherchant mes propres défauts :
 *
 *     const m = await import('lodash')
 *     const r = require('moment')
 *        →  imports vus : []   ·   refusés : []
 *
 * N'importe quel paquet pouvait donc atteindre un build EAS par cette porte,
 * casser à quarante minutes, et changer l'empreinte native déclarée au
 * magasin. Le garde-fou le plus strict ne vaut rien s'il regarde à côté.
 */
export function importsDe(contenu: string): readonly string[] {
  const out = new Set<string>()
  const formes = [
    // `import x from 'y'` · `export { a } from 'y'` · `import 'y'`
    /(?:from|import)\s+['"]([^'"]+)['"]/gu,
    // `import('y')` — le chargement différé, et il est payant à l'oubli
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/gu,
    // `require('y')` — vit encore dans bien du code que les modèles écrivent
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/gu,
  ]
  for (const forme of formes) {
    for (const m of contenu.matchAll(forme)) {
      const s = m[1]
      if (s !== undefined) out.add(s)
    }
  }
  return [...out]
}

/**
 * Un import est-il un paquet, ou un fichier voisin ?
 *
 * `./calcul`, `../lib/x` et `/a` désignent des fichiers du projet : ils ne
 * concernent pas la liste des paquets. Tout le reste en vient.
 */
const estRelatif = (s: string): boolean => s.startsWith('.') || s.startsWith('/')

/** Le nom du paquet, sous-chemins retirés : `expo-font/x` → `expo-font`. */
export function paquetDe(specificateur: string): string {
  const p = specificateur.split('/')
  return specificateur.startsWith('@') ? `${p[0] ?? ''}/${p[1] ?? ''}` : (p[0] ?? '')
}

/**
 * LE REFUS AVANT L'ASSEMBLAGE — gratuit, net, et il NOMME le coupable.
 *
 * Un import hors liste ne doit jamais atteindre un build : sur le natif il
 * casserait à quarante minutes, et sur un magasin il changerait l'empreinte
 * déclarée. Ici il coûte une phrase, que le modèle sait corriger.
 */
export function importsInterdits(fichiers: readonly FichierEcrit[]): readonly string[] {
  const out = new Set<string>()
  for (const f of fichiers) {
    for (const i of importsDe(f.contenu)) {
      if (estRelatif(i)) continue
      const p = paquetDe(i)
      if (!PAQUETS_AUTORISES.includes(p)) out.add(p)
    }
  }
  return [...out].sort()
}
