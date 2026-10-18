/**
 * LE BAC À SABLE — où le code s'assemble, et où les erreurs se voient.
 *
 * ── CE QU'IL EST : LE MÊME ASSEMBLEUR QUE L'APERÇU, DÉJÀ EN PRODUCTION.
 *
 * `construireApercu` compile une application EN MÉMOIRE avec `rolldown`,
 * depuis 2026-10. Pas de disque, pas de `npm install`, pas de conteneur.
 * On ne construit donc rien de neuf ici : on retourne l'outil. Au lieu de
 * s'en servir pour MONTRER, on s'en sert pour JUGER.
 *
 * ── CE QU'IL ATTRAPE, ET CE QU'IL LAISSE PASSER. MESURÉ LE 2026-10-18.
 *
 *     syntaxe cassée ................ ATTRAPÉ
 *     import vers un fichier absent .. ATTRAPÉ
 *     JSX non fermé .................. ATTRAPÉ
 *     variable inconnue .............. PASSE
 *     type faux ...................... PASSE
 *
 * Un assembleur assemble ; il ne vérifie pas les types. C'est mesuré, pas
 * supposé — et c'est pourquoi `tsc` reste nécessaire après lui. Dire le
 * contraire livrerait une application qui se construit et plante à l'ouverture.
 */

export type Verdict =
  | { readonly ok: true; readonly code: string; readonly ms: number }
  | { readonly ok: false; readonly erreur: string; readonly ms: number }

/**
 * Résout un import vers un fichier du projet, comme le ferait un bundler.
 *
 * Les quatre suffixes sont ceux que l'émission produit déjà (`resoudre` dans
 * `apercu.ts`) : on ne réinvente pas une convention à côté.
 */
function resoudre(
  source: string,
  importateur: string | undefined,
  fichiers: ReadonlyMap<string, string>,
): string | null {
  if (source.startsWith('.')) {
    const pile = (importateur ?? '').split('/').slice(0, -1)
    for (const p of source.split('/')) {
      if (p === '.') continue
      else if (p === '..') pile.pop()
      else pile.push(p)
    }
    const chemin = pile.join('/')
    for (const suffixe of ['', '.tsx', '.ts', '/index.tsx', '/index.ts']) {
      if (fichiers.has(chemin + suffixe)) return chemin + suffixe
    }
    // ── UN IMPORT QUI NE POINTE SUR RIEN EST UNE ERREUR, PAS UN PAQUET.
    //
    // Sans ce `null` explicite, rolldown traiterait `./calcul` absent comme
    // une dépendance externe et assemblerait SANS BRONCHER. L'application
    // serait livrée et planterait à l'ouverture : exactement le genre de
    // vert aveugle que ce chantier passe son temps à fermer.
    return null
  }
  return fichiers.has(source) ? source : null
}

/**
 * Assemble, et rend soit le code, soit l'erreur TELLE QUE LE MODÈLE PEUT LA LIRE.
 *
 * L'erreur n'est pas avalée ni reformulée : c'est elle qu'on renverra au
 * modèle. Une erreur reformulée par nous serait une erreur inventée par nous.
 */
export async function assembler(
  fichiers: ReadonlyMap<string, string>,
  entree = 'index.tsx',
): Promise<Verdict> {
  const debut = Date.now()
  if (!fichiers.has(entree)) {
    return { ok: false, erreur: `le fichier d'entrée « ${entree} » est absent`, ms: 0 }
  }
  try {
    const { rolldown } = await import('rolldown')
    const paquet = await rolldown({
      input: entree,
      platform: 'browser',
      plugins: [
        {
          name: 'memoire',
          resolveId: (source: string, importateur: string | undefined) =>
            resoudre(source, importateur, fichiers),
          load: (id: string) => fichiers.get(id) ?? null,
        },
      ],
    })
    const { output } = await paquet.generate({ format: 'esm' })
    return { ok: true, code: output[0]?.code ?? '', ms: Date.now() - debut }
  } catch (e: unknown) {
    const brut = e instanceof Error ? e.message : String(e)
    // On borne la trace : le modèle a besoin de la CAUSE, pas de la pile
    // d'appels de notre serveur — et chaque caractère renvoyé est payé.
    return { ok: false, erreur: brut.split('\n').slice(0, 8).join('\n').slice(0, 1200), ms: Date.now() - debut }
  }
}
