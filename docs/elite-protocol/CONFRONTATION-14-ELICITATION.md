# CONFRONTATION #14 — ÉLICITATION : DERIBFY INTERROGE AVANT DE GÉNÉRER

Passe de CONCEPTION (EP-133, 2026-09-12). Aucun code, aucune dépense.
Livrable : cinq réponses argumentées, une architecture, ses invariants,
ses risques.

---

## Constats vérifiés au code (avant toute proposition)

1. **Le moteur sait déjà dire ce qui lui manque.** 19 diagnostics de modèle
   existent : `MODELE_TERME_AMBIGU`, `MODELE_COMMERCE_ABSENT`,
   `MODELE_ACTEUR_MUET`, `MODELE_ETAT_NON_OBSERVABLE`, `MODELE_SANS_PARCOURS`,
   `MODELE_PARCOURS_SANS_PREUVE`, `MODELE_COUVERTURE_VIDE`, … Ils forment
   déjà la liste FERMÉE de ce qui empêche un modèle d'être décidable.
2. **Le refus d'EP-089 est dans le contrat, pas dans une humeur.**
   `RAISONS_NON_RETENUE` porte quatre valeurs — `hors_perimetre_mobile`,
   `expression_visuelle`, `doublon`, `ambigu` — et `ambigu` est BLOQUANT.
   Quand le moteur a refusé « réalité africaine », il a coché une case que le
   contrat lui offrait. **Le diagnostic existait ; seul le canal manquait.**
3. **Une boucle bornée existe déjà** : `P0_TENTATIVES_MAX = 3`, « à
   l'épuisement : arrêt et rapport. JAMAIS de dégradation ni d'assouplissement
   de juge pour faire passer ». L'élicitation n'a pas à inventer sa boucle.
4. **`couverture` mesure la redevabilité LEXICALE** : chaque terme du brief
   est soit `couverts[{terme, noeuds}]`, soit `nonRetenus[{terme, raison}]`.
   Elle répond à « le modèle rend-il compte de ce qui a été DIT », jamais à
   « ce qui a été dit suffit-il ».
5. **`commerce` est déjà la réponse structurelle du GO** : enum fermée
   `digital | physique_ou_hors_app`, REQUIS si un parcours paie, INTERDIT
   sinon. C'est exactement « carte » vs « mobile money et contact direct »,
   sans qu'aucune région n'apparaisse.
6. **`TABLE_GESTES` porte 10 gestes fermés** — `decouvrir chercher consulter
   choisir saisir confirmer consulter_historique s_identifier payer retirer`.
   **Aucun `contacter`.**
7. **Tension mesurée** : la règle 26 du prompt promet pourtant « prise de
   contact quand le commerce fonctionne ainsi ». Le prompt promet donc une
   issue que la table ne sait pas exprimer. C'est une lacune réelle, pas une
   conséquence de l'élicitation (voir § Lacune mesurée).
8. `intention.text` est déjà le nom de l'entrée unique de P0 : la notion
   d'intention distincte du brief existe en germe dans le code.

---

## ① QUI pose les questions — personne de nouveau

Trois candidats, deux se réfutent :

- **Extension de P0** : P0 produit un modèle sous grammaire contrainte. Lui
  demander de produire aussi un dialogue, c'est lui faire produire deux
  artefacts de natures différentes dans une seule passe — et rouvrir la porte
  que le scellé du prompt a fermée (EP-043). Refusé.
- **Passe amont d'élicitation** : elle lirait le brief pour en tirer des
  questions. **Ce serait un second cerveau**, et le principe « P0 est l'unique
  lecteur du brief » tomberait le jour même. Refusé.
- **RETENU — aucune nouvelle instance ne pose de questions.** Le juge, qui est
  DÉTERMINISTE et n'est pas un cerveau, rend interrogatif ce qu'il refuse
  déjà. P0 reste le seul lecteur du brief et le seul producteur de modèle ;
  le juge continue de le refuser en nommant ce qui manque ; **la nouveauté
  est que cette liste, aujourd'hui renvoyée à P0 pour un re-tirage, peut
  désormais être adressée à l'humain.**

**L'élicitation n'est donc pas une étape neuve : c'est une ISSUE neuve d'une
étape existante.** Le refus P1 avait une seule sortie — re-tirer. Il en a
deux : re-tirer quand la faute est de production, demander quand le manque
est d'intention. Conséquences directes : zéro cerveau ajouté, zéro appel
payant pour formuler une question (la formulation est déterministe, 0 $), et
le principe « un seul cerveau » non seulement tient, mais se renforce — le
moteur cesse de re-tirer trois fois contre un brief qui ne dira jamais plus.

---

## ② QUAND s'arrête-t-on — le critère existe, il ne s'invente pas

**`couverture` ne peut PAS être le critère d'arrêt**, et c'est démontrable :
elle mesure la redevabilité au brief ÉCRIT. Un brief d'une ligne — « une
application mobile pour un marketplace » — peut obtenir une couverture
PARFAITE : tous ses termes sont couverts ou justifiés. Elle mesure la
fidélité, jamais la complétude. S'en servir comme critère d'arrêt, c'est
déclarer suffisante toute intention pauvre mais fidèlement traitée.

**Le critère d'arrêt est celui qui existe déjà : la barre d'acceptation P1.**
On s'arrête quand le modèle passe. L'élicitation n'a aucun critère propre,
donc aucun critère à négocier — c'est ce qui la rend insensible à la
tentation d'« assez de questions ».

Trois gardes, toutes empruntées à des mécanismes en place :

- **Borne dure**, sur le modèle de `P0_TENTATIVES_MAX` : un nombre fini de
  tours, puis arrêt et rapport. Une intention qui ne converge pas est un
  RÉSULTAT (« ce besoin n'est pas exprimable en l'état »), pas un échec à
  masquer.
- **Progrès mesurable** : chaque réponse doit faire disparaître au moins le
  diagnostic qui l'a provoquée. Le **périmètre de jugement** d'EP-102 sert
  tel quel — une question dont la réponse ne réduit pas le périmètre est
  stérile, et deux questions stériles d'affilée arrêtent la boucle.
- **Aucun assouplissement** : les juges sont les mêmes à chaque tour, comme
  pour les tirages. Une question ne fait jamais baisser une barre.

---

## ③ QUELLES questions — aucune liste, une DÉRIVATION

Un questionnaire fixe serait un template déguisé (interdit depuis la
confrontation #1) et vieillirait dès la prochaine évolution du contrat. La
règle est donc la même que pour les gestes, qui ne sont jamais listés à la
main mais dérivés de `TABLE_GESTES` (cliquet EP-068) :

**Une question est la forme interrogative d'un diagnostic. Rien d'autre n'a
le droit d'en produire.**

Les 19 diagnostics se partitionnent en DEUX classes, exhaustives et sous
cliquet (motif EP-108 — une partition qui laisse un reste est une porte) :

- **FAUTE DE PRODUCTION** — le brief disait assez, le générateur a mal
  travaillé : `MODELE_SCHEMA`, `MODELE_REFERENCE_INCONNUE`,
  `MODELE_TRANSITION_INCONNUE`, `MODELE_IDENTIFIANT_INCONNU`… Ceux-là se
  re-tirent. **Les poser à l'humain serait lui faire porter une erreur de
  machine.**
- **INTENTION MANQUANTE** — le générateur ne pouvait pas savoir :
  `MODELE_TERME_AMBIGU`, `MODELE_COMMERCE_ABSENT`, `MODELE_ACTEUR_MUET`,
  `MODELE_COUVERTURE_VIDE`, `MODELE_SANS_PARCOURS`… Ceux-là se demandent.

L'exemple du GO tombe exactement dessus : « paiement par carte, ou mobile
money et contact direct ? » est la forme interrogative de
`MODELE_COMMERCE_ABSENT`, dont le contrat dit déjà que le fait est REQUIS
si un parcours paie. Et « quel marché visez-vous ? » naît de
`MODELE_TERME_AMBIGU` — le terme que le moteur a lui-même coché `ambigu`.

Propriété qui en découle, et qui est le vrai garde-fou : **le moteur ne peut
poser que des questions dont il sait consommer la réponse**, puisque chaque
question naît d'un diagnostic qui nomme un champ du contrat. Une question
sans destination structurelle est impossible à écrire.

---

## ④ OÙ vivent les réponses — le brief ne se réécrit jamais

**Le brief scellé reste le brief D'ORIGINE**, immuable. Trois raisons, dont
deux sont des obligations déjà contractées :

1. Le hold-out (charte #6 §8) exige un brief jamais modifié : un brief
   réécrit n'est plus un hold-out.
2. La reproductibilité des estampilles : une empreinte qui couvrirait un
   texte évolutif ne prouverait plus rien.
3. La mesure de l'élicitation elle-même : si les réponses se fondent dans le
   brief, **plus rien ne distingue ce que l'humain a dit spontanément de ce
   qu'il a répondu sous question** — or c'est précisément le chiffre qui dira
   si l'élicitation sert à quelque chose.

Forme proposée : `intention = { brief (scellé, immuable), addendum: [ {
diagnostic, question, reponse, rang } ] }`. P0 lit l'intention COMPLÈTE ;
`couverture` devient redevable du brief ET de l'addendum — chaque terme
apporté par une réponse est un terme dont le modèle doit rendre compte,
sans quoi l'élicitation deviendrait un moyen d'entrer du texte non jugé.
Deux empreintes distinctes : celle du brief (comparable à l'historique) et
celle de l'intention complète (celle qui a réellement produit le modèle).

---

## ⑤ L'ADAPTATION AU MARCHÉ — la région vit dans la QUESTION, jamais dans la RÈGLE

C'est la frontière d'EP-044, et une table `région → fonctionnalités` serait
un routeur sectoriel — interdit, et détectable : il faudrait la maintenir à
chaque pays.

**Formulation structurelle retenue : le moteur ne connaît JAMAIS le marché.
Il ne connaît que la réponse structurelle.**

- Le nom du marché appartient à la **question**, où il sert à l'humain pour
  comprendre ce qu'on lui demande — « comment les vendeurs vendent-ils ? »
  se comprend mieux situé.
- Ce que le moteur retient est le FAIT qu'il sait déjà porter :
  `commerce: "physique_ou_hors_app"` contre `commerce: "digital"`. Le Tchad
  n'entre pas dans le modèle ; sa conséquence structurelle, oui.

**Test décisif, à exécuter quand la passe d'implémentation viendra** : deux
briefs de régions différentes qui donnent la MÊME réponse structurelle
doivent produire le MÊME modèle. Toute divergence prouve qu'une table
régionale s'est glissée quelque part. C'est un cliquet, pas une revue.

---

## Lacune mesurée, à ne PAS traiter ici

`TABLE_GESTES` ne porte aucun geste de **prise de contact** — pendant que la
règle 26 du prompt promet « prise de contact quand le commerce fonctionne
ainsi ». Le moteur promet donc une issue qu'il ne sait pas exprimer : un
modèle `physique_ou_hors_app` n'a aujourd'hui aucun geste pour dire « joindre
le vendeur ». **Cette lacune est ANTÉRIEURE à l'élicitation et indépendante
d'elle** — mais l'élicitation la rendrait visible en série, puisqu'elle
conduirait beaucoup de briefs vers cette branche. Elle doit être fermée AVANT
toute implémentation d'élicitation, sans quoi le moteur poserait une question
dont il ne sait pas consommer la réponse — exactement ce que ③ interdit.

---

## Invariants proposés

- **I-1** Aucun nouveau lecteur du brief. P0 reste l'unique cerveau.
- **I-2** Toute question est la projection interrogative d'un diagnostic
  existant. Aucune question écrite à la main.
- **I-3** La partition des diagnostics (faute de production / intention
  manquante) est EXHAUSTIVE, sous cliquet.
- **I-4** Le critère d'arrêt est la barre d'acceptation, jamais un compte de
  questions ; aucune question n'abaisse un juge.
- **I-5** Le brief scellé est immuable ; les réponses vivent dans un addendum
  ordonné, lui aussi redevable à `couverture`.
- **I-6** Aucun nom de marché, de pays ni de région n'entre dans le moteur.
- **I-7** Le moteur ne pose que des questions dont il sait consommer la
  réponse — garanti par I-2.

## Risques

- **R-1 — La question qui suggère sa réponse.** « Carte, ou mobile money ? »
  oriente. Mitigation : la question énonce les valeurs de l'enum fermée, dans
  l'ordre du contrat, sans exemple régional dans la formulation retenue.
- **R-2 — L'addendum comme cheval de Troie.** Du texte non jugé entrerait par
  les réponses. Mitigation : I-5, l'addendum est redevable à `couverture`.
- **R-3 — L'humain qui ne sait pas répondre.** Une question structurelle peut
  être inintelligible. Non résolu ici ; c'est le vrai risque d'usage, et il
  se mesure, pas se raisonne.
- **R-4 — La boucle sociale.** Trois questions découragent plus qu'un refus.
  Mitigation : borne dure, et le fait que chaque question naît d'un blocage
  réel, jamais d'une complétude théorique.
- **R-5 — Élicitation en mode non interactif** (campagnes, cron). Une
  question sans interlocuteur doit dégrader en refus explicite, jamais en
  supposition. À trancher avant implémentation.

## Autorisé après cette confrontation

Rien n'est implémenté. La séquence proposée, dans cet ordre strict :
① fermer la lacune « prise de contact » au niveau de la table des gestes ;
② poser la partition des 19 diagnostics sous cliquet, sans dialogue ;
③ seulement alors, la projection interrogative et l'addendum.
Chacune est une passe, chacune attend un GO.
