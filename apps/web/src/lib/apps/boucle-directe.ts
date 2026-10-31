/**
 * LA BOUCLE — l'IA écrit, le compilateur répond, l'IA corrige.
 *
 * ── CE QU'ELLE REMPLACE, ET CE QUE ÇA COÛTAIT.
 *
 * Le moteur actuel répare un DOCUMENT avec nos propres juges, qui jugent du
 * SENS : « ce parcours a-t-il une étape sans écran ? ». Mesuré le 2026-10-18 :
 * neuf appels en file, une à cinq minutes chacun, 26 minutes, 8,46 $, et le
 * verdict ne dit jamais si l'application MARCHE.
 *
 * Ici, le juge est le compilateur. Son verdict est précis — « ligne 14,
 * import introuvable » —, gratuit, et instantané. Et quand il se tait,
 * l'application tient debout pour de vrai.
 *
 * ── BORNÉE, ET LA BORNE EST UN CLIQUET, PAS UNE ESPÉRANCE.
 *
 * Trois tours. Au quatrième, on s'arrête et on le DIT. Une boucle sans
 * borne a déjà coûté ici : « 6,87 $ brûlés, seul le garde-fou du harnais a
 * arrêté » — c'est écrit dans le moteur actuel.
 */
import { assembler } from './bac-a-sable'
import { importsInterdits, lireFichiers, PAQUETS_AUTORISES } from './ecriture-directe'
import { jugerVivacite, type DefautVivacite } from './juge-vivacite'
import { FICHIER_PERIMETRE, jugerCouverture, type RapportCouverture } from './juge-couverture'
import { jugerDevise, marqueRecommandee } from './juge-devise'

/**
 * LA CONSIGNE — et chaque phrase y répond à un défaut mesuré.
 *
 * Elle est COURTE. Celle du moteur actuel pèse ~17 500 jetons de règles,
 * renvoyés à chacun des neuf appels. Ici le modèle écrit du code : il sait
 * déjà le faire, on n'a pas à le lui apprendre.
 */
export const CONSIGNE = `Tu écris une application web complète, en React et TypeScript.

RENDS UNIQUEMENT DES FICHIERS, dans ce format exact, sans rien avant ni après :

=== index.tsx ===
<le code>
=== composants/Truc.tsx ===
<le code>

RÈGLES, et chacune vient d'un défaut réel :

1. \`index.tsx\` est le point d'entrée. Il monte l'application dans l'élément
   d'identifiant "racine" avec \`createRoot\`. Sans lui, rien ne s'affiche.

2. TU N'IMPORTES QUE CES PAQUETS : ${PAQUETS_AUTORISES.join(', ')}.
   Aucun autre, jamais, même pour une date ou un graphique. L'environnement
   d'assemblage ne fournit QUE ces paquets : un import hors liste casse la
   construction, ici même, à coup sûr. Écris la fonction toi-même.

3. TU FAIS LE TRAVAIL DEMANDÉ. Si on demande un calcul, tu écris le calcul
   et tu l'exécutes à l'écran. Un bouton qui mène à un formulaire sans jamais
   calculer n'est pas une réponse.

4. Tu écris du français correct dans l'interface. Jamais un nom technique
   sous les yeux de quelqu'un : pas de \`releve_index_precedent\`, mais
   « Index précédent ».

5. Tu restes SOBRE et complet : ce qui est demandé, entièrement, et rien de
   décoratif. Pas d'images d'illustration, pas d'écrans en plus.

6. Tu écris des valeurs d'exemple PLAUSIBLES quand il en faut — des montants
   et des dates qu'une personne du métier reconnaîtrait.

7. LA NAVIGATION SUIT LA LOI DU PRODUIT, la même que son moteur de rendu :
   à partir de 840 px de largeur, une BARRE LATÉRALE GAUCHE fixe — jamais
   une barre horizontale en haut ; EN DESSOUS de 840 px, une BARRE DU BAS
   fixe, pas un menu replié. Règles posées par le propriétaire (2026-10-30 :
   latérale à gauche ; 2026-10-31 : barre du bas sur petit écran, mesurée
   absente sur un tir réel pendant que la légende de l'aperçu l'annonçait).

8. AUCUN CONTRÔLE MORT. Chaque bouton, champ ou formulaire est relié à une
   action réelle : un état qui change, un calcul exécuté, une liste qui
   s'allonge. Ce que tu ne peux pas câbler réellement, tu le marques
   \`data-demonstration\` ET tu écris « Démonstration » à l'écran, visible.
   Un écran qui a l'air de fonctionner et ne fait rien est le pire défaut
   de ce produit : il se découvre après l'achat.

9. LES FORMULAIRES ONT UNE GÉOMÉTRIE : le CHAMP grandit avec la place, le
   BOUTON prend la largeur de son contenu — jamais l'inverse (mesuré : un
   « Envoyer » large de cinq champs). Et TOUT texte rendu appartient à un
   composant et à un niveau de l'échelle typographique — jamais une phrase
   qui flotte hors de toute carte.

10. TU DÉCLARES CE QUE TU NE LIVRES PAS. Un fichier \`PERIMETRE.md\` liste ce
   que le cahier demande et que cette version ne couvre pas, un motif d'une
   ligne par entrée. Le silence est interdit : une exigence absente de
   l'application ET de ce fichier te sera renvoyée.`

export type Tour = {
  readonly rang: number
  readonly fichiers: number
  readonly ok: boolean
  readonly motif?: string
  readonly ms: number
  /** Le fournisseur a-t-il coupé ce tour ? Jamais déduit — toujours lu. */
  readonly tronquee?: boolean
  /**
   * LES FICHIERS DU TOUR REFUSÉ, ENTIERS — ordre du propriétaire après le
   * 2026-10-31 : le tir refusé de 08:18 avait produit 30 fichiers, plus que
   * la version livrée (14), et ils n'étaient pas stockés — la comparaison
   * de couverture était impossible après coup. Borné à 200 000 caractères
   * par tour : assez pour comparer, pas assez pour gonfler la ligne.
   */
  readonly source?: Record<string, string>
}

export type Resultat =
  | {
      readonly ok: true
      readonly code: string
      readonly fichiers: ReadonlyMap<string, string>
      readonly tours: readonly Tour[]
      /** Les contrôles encore morts à l'acceptation — JAMAIS tus (EP-297). */
      readonly vivacite: readonly DefautVivacite[]
      /** Le rapport chiffré qui accompagne toute génération (EP-297). */
      readonly couverture: RapportCouverture
    }
  | {
      readonly ok: false
      readonly motif: string
      readonly tours: readonly Tour[]
      /**
       * CE QUE LE MODÈLE AVAIT ÉCRIT AU DERNIER TOUR, BRUT.
       *
       * DÉFAUT MESURÉ LE 2026-10-18 : le premier tir direct a échoué en
       * 63 secondes pour 4 centimes — « Non convergé en 3 tours » — et je
       * n'avais AUCUN moyen de dire pourquoi. Ni l'erreur du compilateur, ni
       * ce que le modèle avait produit.
       *
       * C'est exactement le défaut que j'avais décrit le matin même sur
       * l'autre moteur, et que je venais de reproduire. Un échec qu'on ne
       * sait pas lire est un échec qu'on repaiera pour comprendre.
       */
      readonly dernierTexte: string
    }

/**
 * Ce que l'appelant fournit : un modèle, et rien d'autre.
 *
 * IL REND DEUX CHOSES, ET LA SECONDE N'EST PAS UN CONFORT. Un texte seul ne
 * dit pas s'il est ENTIER. Sans `tronquee`, une réponse coupée et une réponse
 * fausse arrivent ici sous la même forme — et c'est exactement la confusion
 * qui a coûté deux tirs le 2026-10-19.
 */
export type Appeler = (
  messages: readonly { role: 'user' | 'assistant'; content: string }[],
) => Promise<{ readonly texte: string; readonly tronquee: boolean }>

export const TOURS_MAX = 3

/**
 * Écrit l'application, et la corrige tant que le compilateur refuse.
 *
 * ── POURQUOI L'APPEL EST INJECTÉ.
 *
 * `appeler` est fourni par la route. Toute la boucle se teste donc avec un
 * faux modèle, sans réseau et sans un centime — et c'est ainsi qu'elle a été
 * écrite, avant qu'un seul appel payant ne parte.
 */
/** La configuration éludée, telle que le pré-vol la résout. */
export type ConfigurationClient = { readonly [cle: string]: unknown }

/**
 * LE BLOC DE CONFIGURATION — la source de vérité AVANT le cahier.
 *
 * MESURÉ LE 2026-10-31 (tir eb7b62b5) : le pré-vol validait la devise
 * (EP-293) puis l'écran n'envoyait que la demande — plateforme tchadienne
 * rendue en EUR. Ce bloc précède le cahier dans le message : ce que le
 * client a RÉPONDU prime sur ce que le modèle déduirait du document.
 *
 * Dernier rempart sur la devise : l'élicitation valide en amont, mais une
 * requête forgée peut contourner l'écran — une devise qui n'a pas la forme
 * d'un code (trois lettres) n'est JAMAIS transmise comme un fait.
 */
export function texteDeConfiguration(configuration: ConfigurationClient): string {
  const lignes: string[] = []
  const libelles: Record<string, string> = {
    currency: 'DEVISE (tous les montants affichés l’emploient, aucune autre)',
    market: 'MARCHÉ VISÉ',
    collector_msisdn: 'NUMÉRO D’ENCAISSEMENT',
    logistics: 'LOGISTIQUE',
  }
  for (const [cle, valeur] of Object.entries(configuration)) {
    if (typeof valeur !== 'string' || valeur.trim() === '') continue
    if (cle === 'currency' && !/^[A-Z]{3}$/u.test(valeur.trim().toUpperCase())) continue
    lignes.push(`- ${libelles[cle] ?? cle.toUpperCase()} : ${valeur.trim()}`)
  }
  if (lignes.length === 0) return ''
  return (
    'CONFIGURATION DU CLIENT — source de vérité, elle PRIME sur toute ' +
    'déduction du cahier :' + '\n' +
    lignes.join('\n') +
    '\n\n'
  )
}

export async function boucleEcriture(o: {
  readonly demande: string
  readonly configuration?: ConfigurationClient
  readonly appeler: Appeler
  readonly toursMax?: number
}): Promise<Resultat> {
  const toursMax = o.toursMax ?? TOURS_MAX
  const tours: Tour[] = []
  let dernierTexte = ''
  const messages: { role: 'user' | 'assistant'; content: string }[] = [
    { role: 'user', content: texteDeConfiguration(o.configuration ?? {}) + o.demande },
  ]

  for (let rang = 1; rang <= toursMax; rang += 1) {
    const debut = Date.now()
    const { texte, tronquee } = await o.appeler(messages)
    dernierTexte = texte
    const lus = lireFichiers(texte)

    // ── QUATRE REFUS, DANS CET ORDRE, DU MOINS CHER AU PLUS CHER.
    //
    // Lire coûte zéro. Vérifier les imports coûte zéro. Assembler coûte du
    // processeur. On ne paie le dernier que si les précédents passent.
    //
    // ET LA TRONCATURE PASSE AVANT TOUT, parce qu'elle est la CAUSE et que
    // les autres n'en seraient que les symptômes. Une réponse coupée échoue
    // aussi à l'assemblage — « Expected } but found EOF » — et ce message-là
    // est vrai mais trompeur : il décrit le texte, pas ce qui lui est arrivé.
    // Le 2026-10-19 j'ai relayé ce symptôme au modèle comme un diagnostic. Il
    // a « corrigé » du code qui n'était pas faux, et s'est fait couper encore.
    let motif: string | null = null
    if (tronquee) {
      motif =
        'Ta réponse a été coupée : tu as atteint le plafond de jetons avant ' +
        "d'avoir fini. Le code n'est pas faux, il est incomplet."
    } else if (lus.length === 0) {
      motif = 'Aucun fichier reçu. Rends UNIQUEMENT des fichiers au format « === chemin === ».'
    } else {
      const interdits = importsInterdits(lus)
      if (interdits.length > 0) {
        motif =
          `Paquets interdits : ${interdits.join(', ')}. ` +
          `Tu ne peux importer que : ${PAQUETS_AUTORISES.join(', ')}. Écris la fonction toi-même.`
      }
    }

    const carte = new Map(lus.map((f) => [f.chemin, f.contenu]))
    if (motif === null) {
      const v = await assembler(carte)
      if (v.ok) {
        // ── LES DEUX JUGES (EP-297) : « ça s'assemble » ne suffit plus.
        //
        // Mesuré le 2026-10-31 (tir eb7b62b5) : un « Agent IA premium » sans
        // un seul gestionnaire — la PHOTO de la fonction centrale — et une
        // couverture paiement 2/34, livrés sans un mot. Le compilateur juge
        // la syntaxe ; ces deux-là jugent la vie et la parole tenue.
        const vivacite = jugerVivacite(carte)
        const couverture = jugerCouverture(o.demande, carte)
        // EP-298 : l'argent parle la devise configurée. EP-296 transmet,
        // celui-ci VÉRIFIE — une instruction sans contrôle est un vœu
        // (mesuré : 10× EUR sur une base tchadienne, devise validée).
        const deviseConfiguree =
          typeof o.configuration?.currency === 'string' ? o.configuration.currency : undefined
        const devises = jugerDevise(carte, deviseConfiguree)
        const reproches: string[] = []
        if (devises.length > 0 && deviseConfiguree !== undefined) {
          reproches.push(
            `LA DEVISE DU CLIENT EST ${deviseConfiguree} (affichée « ${marqueRecommandee(deviseConfiguree)} ») — le code montre d'autres monnaies :\n` +
              devises
                .map((d) => `- ${d.fichier} : « ${d.marque} » ×${String(d.occurrences)}`)
                .join('\n') +
              '\nRemplace chacune : tous les montants visibles emploient la devise du client, aucune autre.',
          )
        }
        if (vivacite.length > 0) {
          reproches.push(
            'DES CONTRÔLES MORTS — un écran qui a l’air de fonctionner et ne fait rien :\n' +
              vivacite
                .slice(0, 12)
                .map((d) => `- ${d.fichier} : ${d.manque} → ${d.extrait}`)
                .join('\n') +
              '\nLie chacun à une action réelle (état qui change, calcul exécuté), ou marque-le data-demonstration ET dis « Démonstration » à l’écran.',
          )
        }
        if (couverture.absentes.length > 0) {
          reproches.push(
            'DES EXIGENCES DU CAHIER SONT MUETTES — ni dans l’application, ni déclarées :\n' +
              couverture.absentes
                .map((e) => `- ${e.exigence} (le cahier y insiste ${e.cahier} fois, le code n’en dit rien)`)
                .join('\n') +
              `\nCouvre-les, ou déclare-les dans ${FICHIER_PERIMETRE} avec un motif d’une ligne. Le silence est interdit.`,
          )
        }
        if (reproches.length > 0 && rang < toursMax) {
          motif = reproches.join('\n\n')
        } else {
          // Au dernier tour, les défauts restants ne REFUSENT pas l'œuvre —
          // ils l'ACCOMPAGNENT, dits : refuser re-brûlerait l'argent du
          // propriétaire, taire referait le défaut fondateur.
          tours.push({ rang, fichiers: lus.length, ok: true, ms: Date.now() - debut })
          return { ok: true, code: v.code, fichiers: carte, tours, vivacite, couverture }
        }
      } else {
        motif = `La construction a échoué :\n${v.erreur}`
      }
    }

    // ── LE TOUR REFUSÉ GARDE SES SOURCES — bornées, jamais tues (EP-297).
    const source: Record<string, string> = {}
    let budget = 200_000
    for (const f of lus) {
      const part = f.contenu.slice(0, Math.max(0, budget))
      source[f.chemin] = part.length < f.contenu.length ? part + '\n— tronqué par le journal —' : part
      budget -= part.length
    }
    tours.push({ rang, fichiers: lus.length, ok: false, motif, tronquee, ms: Date.now() - debut, source })

    // ── ON RENVOIE L'ERREUR TELLE QUELLE, ET ON REDEMANDE TOUT.
    //
    // Pas de correctif partiel : le modèle réécrit les fichiers concernés
    // avec le reste. Un patch partiel exigerait un format de patch, donc une
    // grammaire — exactement ce qu'on vient de quitter.
    //
    // MAIS ON NE DEMANDE PAS LA MÊME CHOSE DANS LES DEUX CAS, et c'est le
    // cœur de la correction. « Corrige » n'a aucun sens pour un texte coupé :
    // il n'y a rien à corriger, il y a trop à écrire. Redemander la même
    // application au même modèle la ferait couper au même endroit.
    const suite = tronquee
      ? 'Récris la MÊME application, en entier, mais plus COMPACTE : moins de ' +
        'lignes, pas de commentaires, pas de variantes décoratives. Toutes les ' +
        'fonctions demandées restent, aucune ne disparaît.'
      : 'Corrige et rends TOUS les fichiers.'
    messages.push({ role: 'assistant', content: texte })
    messages.push({ role: 'user', content: `${motif}\n\n${suite}` })
  }

  return {
    ok: false,
    motif: `Non convergé en ${String(toursMax)} tours.`,
    tours,
    dernierTexte,
  }
}

/**
 * LE PRÉLUDE — ce que la page doit à l'application avant qu'elle démarre.
 *
 * ── CE QU'IL RÉPARE, MESURÉ LE 2026-10-19.
 *
 * Première application livrée du projet. Elle compile, elle pèse 63 695
 * caractères, et l'écran est resté BLANC.
 *
 *     SecurityError: Failed to read the 'localStorage' property from
 *     'Window': The document is sandboxed and lacks the 'allow-same-origin'
 *     flag.
 *         at commitHookEffectListMount
 *
 * Le cadre qui montre l'application porte `sandbox="allow-scripts"` SANS
 * `allow-same-origin`, et c'est délibéré : sans cette restriction,
 * l'application générée pourrait lire le site qui l'héberge. On ne touche
 * donc pas au cadre.
 *
 * Mais dans une origine opaque, `localStorage` LÈVE à la simple lecture.
 * L'application en faisait un usage parfaitement normal — un `useEffect` qui
 * oublie un identifiant à la déconnexion. React a propagé, démonté, et laissé
 * du blanc.
 *
 * ── ET CE N'EST PAS UN DÉFAUT DE CETTE APPLICATION-LÀ.
 *
 * TOUTE application qui garde des données ferait exactement ça. Demander au
 * modèle d'entourer chaque accès d'un `try` serait traiter le symptôme :
 * c'est la PAGE qui doit offrir une plateforme qui fonctionne, pas
 * l'application qui doit deviner dans quel cadre on l'a mise.
 *
 * Deux gestes, donc, et ils ne coûtent qu'un millier de caractères :
 *
 *   ① UN STOCKAGE DE SECOURS, en mémoire, installé seulement si le vrai est
 *      inaccessible. L'application fonctionne ; ses données vivent le temps
 *      de la session. Dans un aperçu, c'est exactement ce qu'on veut.
 *   ② UN FILET QUI AFFICHE. Une page blanche ne dit rien à personne — ni au
 *      propriétaire, ni à moi. Il m'a fallu poser ce filet à la main pour
 *      trouver ce défaut en deux minutes ; il reste désormais posé.
 */
const PRELUDE = `(function(){
try{window.localStorage.getItem("_")}catch(e){
var M={},S={};
function faux(m){return{getItem:function(k){return k in m?m[k]:null},
setItem:function(k,v){m[k]=String(v)},removeItem:function(k){delete m[k]},
clear:function(){for(var k in m)delete m[k]},
key:function(i){return Object.keys(m)[i]||null},
get length(){return Object.keys(m).length}}}
try{Object.defineProperty(window,"localStorage",{value:faux(M),configurable:true});
Object.defineProperty(window,"sessionStorage",{value:faux(S),configurable:true})}catch(e2){}}
function montrer(titre,detail){
var p=document.createElement("div");
p.setAttribute("data-deribfy-erreur","1");
p.style.cssText="padding:18px;font:14px/1.5 system-ui,-apple-system,sans-serif;color:#7f1d1d;background:#fef2f2;border-bottom:2px solid #dc2626";
var h=document.createElement("strong");h.textContent=titre;
var d=document.createElement("details");d.style.marginTop="8px";
var r=document.createElement("summary");r.textContent="Detail technique";r.style.cursor="pointer";
var c=document.createElement("pre");
c.style.cssText="white-space:pre-wrap;font:12px ui-monospace,monospace;margin:8px 0 0";
c.textContent=detail;d.appendChild(r);d.appendChild(c);
p.appendChild(h);p.appendChild(d);
(document.body||document.documentElement).insertBefore(p,(document.body||document.documentElement).firstChild)}
window.addEventListener("error",function(e){
montrer("Cette application s'est arretee en cours d'execution.",
String(e.message||"")+"\\n\\n"+String((e.error&&e.error.stack)||""))});
window.addEventListener("unhandledrejection",function(e){
montrer("Cette application s'est arretee en cours d'execution.",
String((e.reason&&e.reason.stack)||e.reason))});
})()`

/**
 * LA PAGE — autonome, comme celle de l'aperçu.
 *
 * Elle ne demande rien à personne : ni police distante, ni script externe.
 * C'est ce qui lui permet d'être servie dans un cadre isolé, et d'être
 * publiée par le lien de partage sans toucher l'origine de Deribfy.
 */
export function pageAutonome(code: string, titre: string): string {
  const sur = titre.replace(/[<>&"]/gu, '')
  return [
    '<!doctype html><html lang="fr"><head><meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<title>${sur}</title>`,
    '<style>*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,sans-serif}</style>',
    // LE PRÉLUDE PART EN PREMIER, et en script ORDINAIRE : un module serait
    // différé, donc installé APRÈS que l'application a déjà échoué.
    `<script>${PRELUDE}</script>`,
    '</head><body><div id="racine"></div>',
    `<script type="module">${code}</script>`,
    '</body></html>',
  ].join('')
}
