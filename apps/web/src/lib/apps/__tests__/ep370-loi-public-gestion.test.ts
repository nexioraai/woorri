/**
 * EP-370 · LA LOI PUBLIC/GESTION EST DANS LA CONSIGNE.
 *
 * ── CE QUE LA CONSIGNE DISAIT LE 2026-11-06, MESURÉ CLAUSE PAR CLAUSE.
 *
 * Sur les neuf clauses de la loi : DEUX présentes, SIX absentes, et UNE
 * CONTREDITE MOT POUR MOT —
 *
 *   « écris un écran de connexion (`base.auth.signInWithPassword`),
 *     affiché tant que `base.auth.getSession()` ne rend rien »
 *
 * La consigne ordonnait donc un formulaire de connexion sur le seul chemin
 * qui existe, c'est-à-dire sur la face publique, que la loi interdit. Son
 * bloc « DEUX FACES » parlait de CONTENU, jamais de NAVIGATION.
 *
 * ── LE DÉFAUT QU'ELLE A PRODUIT, SUR UNE ŒUVRE RÉELLE.
 *
 * `asso.deribfy.app`, téléphone, navigation privée, aucun compte :
 * « Impossible de charger les annonces. » L'annonce existait — elle
 * s'affichait une fois connecté. Et l'entrée « Gestion » était dans le
 * menu, visible sans compte, parce que rien n'avait dit de l'y cacher.
 *
 * ── ET LA CONSIGNE SEULE N'AURAIT RIEN RÉPARÉ.
 *
 * `fusionnerEntites` jetait la déclaration de publicité EN SILENCE
 * (EP-368), et la garde de publication n'avait pas de porte (EP-369). Trois
 * causes empilées. Ce fichier garde la troisième ; les deux autres ont les
 * leurs, et aucune ne suffit seule.
 *
 * ── CE QUE CE CLIQUET EST, ET CE QU'IL N'EST PAS.
 *
 * ── ET LA LOI A ÉTÉ SUIVIE À LA LETTRE, PAS DANS L'INTENTION (asosa).
 *
 * Mesuré le 2026-11-06 sur la première œuvre générée AVEC cette loi :
 * l'adresse `#gestion` est employée, l'écran de connexion y vit et nulle
 * part ailleurs, la face publique ne montre AUCUN chemin vers la gestion.
 * Quatre clauses sur neuf obéies.
 *
 * Mais la table n'a pas été déclarée publique, et la clause qui interdisait
 * d'en montrer le vide a été contournée. Elle disait TROIS choses :
 *
 *   « ni bandeau rouge, ni "impossible de charger",
 *     ni zone vide alors qu'il y a du contenu »
 *
 * Le modèle a évité les deux premières EN CAUSANT LA TROISIÈME : l'erreur
 * est avalée (`if (!error && data)`) et l'écran rend son état vide. UNE
 * LISTE DE TROIS INTERDITS SE SATISFAIT EN EN CHOISISSANT UN.
 *
 * ── LES CINQ AUTRES LISTES DE MÊME RISQUE, CONSIGNÉES D'AVANCE.
 *
 * Mesuré : la consigne porte 36 interdits contre 5 obligations, dont 12
 * listes empilées. Celles-ci sont les prochaines à céder, et quand l'une
 * cédera ce ne sera pas une surprise :
 *
 *   · « AUCUN FICHIER : ni téléversement, ni PDF, ni image envoyée »
 *   · « aucune entrée de menu, aucun lien, aucun bouton, aucun onglet »
 *   · « Jamais un nom vide de sens : pas "donnees", pas "table" »
 *   · « aucun bouton qui le propose : il échouerait sans rien dire »
 *   · « Jamais plus de N tables, jamais plus de N champs par table »
 *
 * Une interdiction se contourne, une obligation se vérifie.
 *
 * ── CE QUE CE CLIQUET EST, ET CE QU'IL N'EST PAS.
 *
 * Il garde que la loi est DITE. Il ne garde pas qu'elle est SUIVIE : une
 * consigne est une demande, pas une garantie. Ce sont J1 et J3 — le montage
 * sans session — qui refusent l'œuvre. Confondre les deux serait croire
 * supprimer un défaut qu'on a seulement déménagé.
 */
import { describe, expect, it } from 'vitest'
import { ADRESSE_GESTION, blocBase, type EntiteDeclaree } from '../entites-declarees'
import { REGLE_6_SANS_BASE } from '../boucle-directe'
import { lireSource } from './lire-source'
import { motifTexte } from './motif-texte'
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SRC = join(__dirname, '..', '..', '..')
const ENTITES = [
  { id: 'e1', name: 'membre', fields: [{ id: 'f1', name: 'nom', type: 'text', required: true }] },
  { id: 'e2', name: 'annonce', fields: [{ id: 'f2', name: 'titre', type: 'text', required: true }] },
] as unknown as EntiteDeclaree[]

/** La consigne est faite de littéraux JOINTS : une phrase y enjambe une ligne. */
const consigne = (): string => blocBase(ENTITES)

describe('EP-370 · la loi public/gestion est dite', () => {
  it('① LES CINQ CLAUSES DE LA FACE PUBLIQUE', () => {
    const t = consigne()
    for (const phrase of [
      'QUE du contenu destiné à tout le monde',
      'SANS connexion et SANS AUCUNE ERREUR',
      'NE MONTRER AUCUN CHEMIN VERS LA GESTION',
      'N’AFFICHER AUCUN FORMULAIRE DE CONNEXION',
      'ne laisser filtrer AUCUNE donnée privée',
      // ── ET CELLE-CI EXISTAIT AVANT LA LOI, mesuré le 2026-11-06.
      //
      // Elle manquait à cette liste, et c'est la classe qui compte plus que
      // la clause : UNE VÉRIFICATION QUI COMPTE CE QU'ON A AJOUTÉ NE VOIT
      // JAMAIS CE QU'ON A RETIRÉ. J'avais annoncé « neuf sur neuf » en
      // vérifiant mes neuf présences ; « en LECTURE seule, aucun bouton qui
      // écrit » avait disparu dans la même réécriture, et aucune de mes
      // assertions ne pouvait la voir. Seul un cliquet ANTÉRIEUR l'a vue.
      'en LECTURE',
      'aucun bouton qui écrit',
      // Et la conséquence de ne pas écrire la connexion, trouvée par le
      // diff bidirectionnel : sans elle le modèle n'a pas de raison d'obéir.
      'seront vides sans qu’on sache pourquoi',
    ]) {
      expect(t, `la face publique ne dit pas : « ${phrase} »`).toMatch(motifTexte(phrase))
    }
    // « même vide » compte autant que le reste : un tableau vide à la place
    // d'une liste privée renseigne encore sur son existence.
    expect(t).toMatch(motifTexte('pas même un tableau'))
  })

  it('② LES TROIS CLAUSES DE LA GESTION', () => {
    const t = consigne()
    expect(t, 'l’adresse n’est pas dictée').toMatch(motifTexte(`l’adresse \`${ADRESSE_GESTION}\``))
    expect(t).toMatch(motifTexte('et NULLE PART ailleurs'))
    expect(t, 'les quatre gestes').toMatch(motifTexte('lister, AJOUTER, MODIFIER'))
    expect(t, 'le retour manque — on entre et on ne sort plus').toMatch(
      motifTexte('ET UN RETOUR VERS LA FACE PUBLIQUE'),
    )
  })

  it('③ LA CLAUSE QUI LES RELIE, dans les DEUX branches', () => {
    const t = consigne()
    // La branche des tables déjà déclarées.
    expect(t).toMatch(motifTexte('UNE PAGE PUBLIQUE LIT UNE TABLE DÉCLARÉE PUBLIQUE'))
    expect(t).toMatch(motifTexte('Les deux faits sortent de la MÊME réponse'))
    // Et celle des tables que le modèle AJOUTE : c'est par là qu'asso est
    // passé, et la consigne n'y disait que « OMETS », deux fois.
    expect(t, 'la branche DONNEES.json ne porte pas l’obligation').toMatch(
      motifTexte('LECTURE PUBLIQUE — OBLIGATOIRE dès qu’un écran public la lit'),
    )
    expect(t, 'une table DÉJÀ déclarée doit pouvoir devenir publique').toMatch(
      motifTexte('vaut AUSSI pour une table déjà déclarée'),
    )
  })

  it('④ L’ORDRE CONTREDIT N’Y EST PLUS — la connexion est À l’adresse', () => {
    const t = consigne()
    // L'ancienne forme rattachait l'écran de connexion à l'ABSENCE de
    // session, donc au chemin public. La nouvelle le rattache à l'ADRESSE.
    expect(t).toMatch(motifTexte('C’est LÀ, et seulement là, que tu écris l’écran de connexion'))
    const i = t.indexOf('écran de')
    expect(i, 'la connexion n’est plus mentionnée du tout').toBeGreaterThan(0)
    // Et la phrase qui l'ordonnait sans condition d'adresse a disparu.
    const ordreNu = /écris un écran de\s+connexion[\s\S]{0,60}affiché tant que/u
    expect(ordreNu.test(t), 'l’ordre contredit est encore là').toBe(false)
  })

  it('⑤ UNE SEULE SOURCE POUR L’ADRESSE — N1 doit être un changement', () => {
    // ── LE MOT DU PROPRIÉTAIRE : « écris-le de façon à ce que ce passage
    //    soit un changement et pas une réécriture. »
    //
    // Un littéral recopié ailleurs ferait divergence le jour où `#gestion`
    // devient `/gestion`.
    const fautes: string[] = []
    const marcher = (d: string): void => {
      for (const n of readdirSync(d)) {
        const p = join(d, n)
        if (statSync(p).isDirectory()) {
          if (n !== 'node_modules' && n !== '__tests__' && n !== 'tirs') marcher(p)
          continue
        }
        if (!/\.tsx?$/u.test(n) || /\.test\.tsx?$/u.test(n)) continue
        const src = lireSource(p)
        if (!src.includes(ADRESSE_GESTION)) continue
        // Le seul endroit qui a le droit de porter le littéral est sa
        // définition.
        if (!src.includes('export const ADRESSE_GESTION')) fautes.push(p.replace(SRC, ''))
      }
    }
    marcher(SRC)
    expect(
      fautes,
      `ces fichiers recopient « ${ADRESSE_GESTION} » au lieu d’employer ADRESSE_GESTION`,
    ).toEqual([])
  })

  it('⑥ LE CHEMIN SANS TABLE NE PROMET PAS UNE LOI QU’IL NE PEUT PAS TENIR', () => {
    // ── CE QUE LA LOI NE COUVRE PAS, ET POURQUOI C'EST JUSTE.
    //
    // Sans base il n'y a pas de session, donc pas d'espace de gestion, donc
    // rien à cacher d'un visiteur. Dicter l'adresse à une œuvre qui ne peut
    // pas se connecter lui ferait écrire une porte vers le vide.
    // C'est DÉJÀ une chaîne jointe, pas une liste — vérifié plutôt que supposé.
    const sansBase = REGLE_6_SANS_BASE
    expect(sansBase.includes(ADRESSE_GESTION), 'le chemin sans table dicte une adresse').toBe(
      false,
    )
    expect(sansBase).not.toMatch(motifTexte('écran de connexion'))
  })
})
