/**
 * LE JUGE DE VIVACITÉ — un écran qui a l'air de fonctionner et ne fait rien
 * est le PIRE défaut de ce produit.
 *
 * ── LE DÉFAUT FONDATEUR, MESURÉ LE 2026-10-31 (tir eb7b62b5).
 *
 * L'écran « Agent IA premium » du livrable : une bulle d'accueil écrite en
 * dur, un champ, un bouton — AUCUN gestionnaire, aucun état, aucun service.
 * Le cahier demandait la fonction centrale du produit ; le générateur en a
 * livré une PHOTO. Invisible par construction : l'écran existe, figure dans
 * la navigation, et l'acheteur découvre après avoir payé.
 *
 * ── LA RÈGLE (du propriétaire, verbatim transposé) :
 *
 *   · tout contrôle interactif est LIÉ à une action ;
 *   · une action = mutation d'état, appel à un service, ou marqueur
 *     `data-demonstration` ASSUMÉ — et alors visiblement dit à l'écran ;
 *   · un contrôle non lié est un DÉFAUT, pas un détail de style.
 *
 * ── CE QUE CE JUGE ATTESTE, ET CE QU'IL NE PEUT PAS.
 *
 * Il atteste la LIAISON : un gestionnaire présent et non vide. Il n'exécute
 * rien — un gestionnaire qui ment (code mort, action sans effet) ne peut
 * être attrapé que par exécution, et c'est dit ici plutôt que prétendu.
 * Le gestionnaire VIDE (`onClick={() => {}}`), lui, est refusé : c'est la
 * photo d'un bouton, pas un bouton.
 */

export type DefautVivacite = {
  readonly fichier: string
  readonly extrait: string
  readonly manque: string
}

/**
 * Lit une balise JSX ouvrante entière à partir de `debut` (position du `<`).
 *
 * Un `[^>]*` naïf s'arrête au `>` d'une flèche (`onClick={() => …}`) — le
 * lecteur suit donc les accolades et les chaînes : la balise se termine au
 * premier `>` hors accolades et hors chaîne.
 */
function litBalise(source: string, debut: number): string {
  let accolades = 0
  let chaine: string | null = null
  for (let i = debut; i < source.length; i += 1) {
    const c = source[i]!
    if (chaine !== null) {
      if (c === chaine && source[i - 1] !== '\\') chaine = null
      continue
    }
    if (c === '"' || c === "'" || c === '`') chaine = c
    else if (c === '{') accolades += 1
    else if (c === '}') accolades -= 1
    else if (c === '>' && accolades === 0) return source.slice(debut, i + 1)
  }
  return source.slice(debut)
}

const GESTIONNAIRE = /\son[A-Z]\w*\s*=\s*\{/u
const GESTIONNAIRE_VIDE = /\son[A-Z]\w*\s*=\s*\{\s*\(\s*\)\s*=>\s*\{\s*\}\s*\}/u
const DEMONSTRATION = /\sdata-demonstration\b/u

/** Toutes les balises ouvrantes d'un nom donné, lues en entier. */
function balises(source: string, nom: string): string[] {
  const out: string[] = []
  const motif = new RegExp(`<${nom}[\\s/>]`, 'gu')
  let m: RegExpExecArray | null
  while ((m = motif.exec(source)) !== null) out.push(litBalise(source, m.index))
  return out
}

const resume = (balise: string): string => balise.replace(/\s+/gu, ' ').slice(0, 90)

/**
 * Juge la vivacité des fichiers produits. Rend la liste des contrôles morts —
 * vide quand tout contrôle est lié ou assumé comme démonstration.
 */
export function jugerVivacite(fichiers: ReadonlyMap<string, string>): DefautVivacite[] {
  const defauts: DefautVivacite[] = []
  for (const [fichier, brut] of fichiers) {
    if (!/\.(tsx|jsx)$/u.test(fichier)) continue
    const source = brut.replace(/\/\*[\s\S]*?\*\//gu, ' ').replace(/^\s*\/\/.*$/gmu, ' ')
    // La démonstration assumée doit se VOIR : le marqueur technique sans le
    // mot à l'écran est une démonstration cachée — refusée aussi.
    // Le marqueur lui-même est retiré avant de chercher le mot : sinon il se
    // compterait comme sa propre annonce (mesuré au premier passage du test).
    const demonstrationVisible = /d[ée]mo(nstration)?/iu.test(
      source.replace(/data-demonstration/gu, ''),
    )

    const juge = (balise: string, role: string, liee: boolean) => {
      if (GESTIONNAIRE_VIDE.test(balise)) {
        defauts.push({
          fichier,
          extrait: resume(balise),
          manque: `${role} au gestionnaire VIDE — la photo d'un contrôle, pas un contrôle`,
        })
        return
      }
      if (liee) return
      if (DEMONSTRATION.test(balise)) {
        if (!demonstrationVisible) {
          defauts.push({
            fichier,
            extrait: resume(balise),
            manque: `${role} marqué data-demonstration sans que l'écran le DISE — démonstration cachée`,
          })
        }
        return
      }
      defauts.push({ fichier, extrait: resume(balise), manque: `${role} sans action liée` })
    }

    for (const b of balises(source, 'button')) {
      juge(b, 'bouton', GESTIONNAIRE.test(b) || /type\s*=\s*["']submit/u.test(b))
    }
    for (const nom of ['input', 'textarea', 'select']) {
      for (const b of balises(source, nom)) {
        juge(
          b,
          `champ <${nom}>`,
          GESTIONNAIRE.test(b) || /\s(?:readOnly|disabled)\b/u.test(b) || /type\s*=\s*["']hidden/u.test(b),
        )
      }
    }
    for (const b of balises(source, 'form')) {
      juge(b, 'formulaire', /\sonSubmit\s*=\s*\{/u.test(b))
    }
  }
  return defauts
}
