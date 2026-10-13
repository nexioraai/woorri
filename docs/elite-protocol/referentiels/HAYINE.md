# HAYINE face au moteur — verdict mesuré du 2026-10-12

> `Hayine .pdf` — « Plateforme internationale de réservation et de paiement
> avec agent d'intelligence artificielle », Android et iOS.
>
> Texte décodé en Python pur (aucun outil PDF sur la machine) : 22 987
> caractères. Les accents sont perdus par l'encodage du document ; le sens
> ne l'est pas.

## Ce que le moteur sait faire — mesuré

| Exigence du cahier | Preuve |
|---|---|
| **Trois langues au lancement** (français, anglais, arabe) | `appLocales`, `contentLocales`, `defaultAppLocale` au format |
| **Arabe et RTL** — ordre, alignement, champs adaptés | `rtlSupported` au format **et** présent dans le code émis |
| **États explicites** : chargement, aucun résultat, fournisseur indisponible, erreur, prix modifié, paiement en attente | les blocs portent `loading`, `empty`, `error`, `ready` — mesuré dans l'émis |
| **Tarifs versionnés et traçables**, « une modification tarifaire ne doit pas modifier rétroactivement une réservation confirmée » | versions choisies par une **date de la ligne**, jamais par l'horloge — exactement la garantie demandée |
| Commissions, marge, arrondis configurables | expressions et barème par tranche du compilateur |
| **Devise** exprimable | au format |
| Notifications multi-canal, « les messages essentiels ne doivent pas dépendre d'un seul canal » | capacités de notification et de contact au registre |
| Isolation des fournisseurs | `integrations` déclarées par capacité |
| **Journaux sans secret** | aucun secret dans les fichiers émis (test), entités journal non réécrivables (409 prouvé) |
| Droits d'accès et journal d'audit | modèle d'accès + journal append-only, prouvés à l'exécution |

## Ce qui manque — trois choses, mesurées

| Manque | Mesure | Ce que le cahier exige |
|---|---|---|
| **Conversion de devise avec source du taux** | **0 occurrence** (`exchangeRate`, `rateSource`, `tauxChange`) | « afficher le montant dans la devise préférée, avec la source ou l'heure du taux » ; « conserver les montants d'origine et de transaction » ; et ne **jamais** présenter un taux comme garanti si le fournisseur applique le sien |
| **Quotas et plafonds de dépense IA** | **0 occurrence** (`quota`, `spendingCap`, `plafond`) ni au format ni au registre | « quotas, plafonds de dépenses, limites de fréquence, détection des requêtes répétitives et blocage à l'épuisement du crédit » ; et à l'expiration, « l'agent est bloqué et la réservation classique reste disponible » |
| **Statistiques et graphiques** | aucun type de bloc graphique | « volumes, taux de succès, coûts API/IA, recettes, commissions, marge » |

## Le même manque que Conterak, et c'est une information

Les **graphiques** manquent aux deux cahiers. Deux cahiers indépendants, deux
métiers sans rapport — et le même trou. Ce n'est donc pas un besoin de niche :
c'est une classe absente du moteur, et le troisième cahier la redemandera.

Le **PDF** manque à Conterak (trois documents exigés) ; Hayine parle de
« reçus » et de « documents » — à vérifier au mot près avant de l'inscrire, je
ne l'affirme pas ici.

## Ce qui est propre à Hayine

L'**agent d'intelligence artificielle** qui prépare et, « lorsque l'API le
permet et que l'utilisateur a donné l'autorisation nécessaire, exécute les
étapes autorisées ». Le moteur n'a aucune notion d'agent exécutant des
actions sous autorisation — et la mesure du coût de cet agent (par modèle,
fournisseur, compte, opération, période) est le deuxième manque ci-dessus.

C'est le besoin le plus éloigné de ce que le moteur sait exprimer
aujourd'hui, et le plus structurant : il ne s'ajoute pas comme une capacité,
il change ce qu'une application PEUT FAIRE.
