# Le logo de Deribfy (la plateforme)

Déposez ici le logo de Deribfy, sous **l'un** de ces noms exacts :

    logo-deribfy.svg      (préféré — net à toutes les tailles)
    logo-deribfy.png      (bon choix — fond transparent de préférence)
    logo-deribfy.jpg
    logo-deribfy.webp

Puis relancer :

    node scripts/generer-icones.mjs

Le script fabrique `src/app/favicon.ico`, `icon.png` et `apple-icon.png` à
partir de ce fichier. **Tant qu'aucun fichier n'est déposé ici**, il dessine
un monogramme — la lettre « D » sur le fond de la marque. Ce n'est pas une
panne : c'est le repli, et il vaut mieux qu'une icône générique.

Ce dossier ne concerne QUE la plateforme. Les boutiques des marchands ont
leur propre logo, déposé depuis leur page Edit (`sites.logo_url`).
