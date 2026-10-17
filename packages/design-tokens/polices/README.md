# Polices embarquées dans les applications générées

## Pourquoi un fichier de police, et pas un nom

Mesuré le 2026-10-17 : le jeton `font.famille` porte un RÔLE
(`systeme` | `serif` | `mono`), et la cible WEB le servait — une pile CSS se
dégrade, le navigateur prend la première police présente. **La cible NATIVE ne
le servait pas**, et pour une raison mesurée : `fontFamily` du natif prend UN
nom, pas une pile, et **aucun nom de police n'existe sur iOS ET Android à la
fois** (iOS porte Georgia et Menlo, Android les alias génériques `serif` et
`monospace`). Un nom absent ne lève pas — il retombe **en silence** sur la
police système.

Deux issues existaient. Brancher par plateforme a été **refusé par un
cliquet** : le contrôle 4 de `keyboard-a11y-locks` interdit tout `Platform.OS`
dans le code émis, et le dépôt n'en contenait aucun. Ce qu'il protège est réel —
un branchement d'exécution ferait rendre les deux plateformes différemment, et
toute observation de ce dépôt monte avec un stub `ios`.

Reste la bonne : **embarquer le fichier**. Un `.ttf` embarqué porte le même nom
sur les deux plateformes. Aucun branchement, et l'identité est **garantie** au
lieu d'être espérée.

Jugement du propriétaire, 2026-10-17 : « il faut surtout pas oublier native, on
fait les 2 pour ne pas en oublier une ».

## Ce que ces fichiers sont

`DeribfySerif-Regular.ttf`, `-SemiBold.ttf`, `-Bold.ttf`.

**Version MODIFIÉE de Libre Baskerville** (Copyright 2012 The Libre Baskerville
Project Authors, SIL Open Font License 1.1). Deux modifications :

1. **instance statique** depuis la police variable, aux graisses 400 / 600 / 700.
   React Native ne sert pas fiablement les polices variables, et surtout il ne
   SYNTHÉTISE pas les graisses sur Android : demander `fontWeight: "700"` sur
   une famille qui n'a qu'une face Regular rend du Regular. Chaque graisse est
   donc une FACE, portant son propre nom de famille, et le style la désigne
   nommément — aucune synthèse, aucun espoir.

2. **sous-ensemble** latin + accents français + ponctuation + devises.
   Mesuré : 171 900 octets la variable, **42 800 par face** après
   sous-ensemble, soit 128 Ko pour les trois au lieu de 515. La bande passante
   compte pour les utilisateurs de ces applications.

   Le signe `₣` (U+20A3) est ABSENT — il n'existe pas dans la police source. Ce
   n'est pas une perte : le code de devise vient du document en ISO 4217
   (« XAF »), jamais un symbole inventé par le moteur (EP-201).

## Le renommage est une OBLIGATION, pas un choix

La licence déclare « **Reserved Font Name Libre Baskerville** ». L'OFL §3
interdit à une version modifiée de porter un nom réservé. Les trois faces
s'appellent donc `DeribfySerif-*`, et **aucune table de noms ne contient plus
« Libre Baskerville »** hors la notice de copyright, que l'OFL exige au
contraire de conserver — elle est dans le champ `copyright` de chaque fichier,
et la licence complète est dans `LICENCE-OFL.txt`, ici.

## Pourquoi `serif` seulement

Le vocabulaire des rôles en compte trois. **Aucun thème du catalogue ne demande
`mono`** : embarquer un fichier que personne n'emploie serait le token « au cas
où » que DET-023 a écarté. Le cliquet EP-263 exige qu'un rôle EMPLOYÉ par le
catalogue ait sa face embarquée — le jour où un thème prendra `mono`, il
rougira.
