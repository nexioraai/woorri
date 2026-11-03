/**
 * LE PRÉPARATIF DES TIRS — il N'INSTALLE PAS le garde-fou réseau.
 *
 * ── CE QUE `vitest.setup.ts` FAIT, ET POURQUOI ON NE PEUT PAS L'EMPLOYER ICI.
 *
 * Il remplace `fetch` par un refus : « aucun test ne doit sortir sur le
 * réseau — il deviendrait intermittent ». C'est une bonne règle, et elle a
 * fonctionné : elle a bloqué mes deux premiers tirs AVANT qu'ils dépensent.
 *
 * Mais un TIR est exactement l'exception que cette règle ne prévoit pas. Il
 * n'est pas un test : il ne vérifie aucune propriété, il MESURE ce que le
 * vrai modèle rend sur un vrai document. Son intermittence n'est pas un
 * défaut — c'est son objet. Et il ne tourne jamais dans la gate (voir
 * `vitest.tir.config.ts`), donc il ne peut pas la rendre instable.
 *
 * ── CE QU'ON GARDE QUAND MÊME.
 *
 * Les clefs ne sont PAS remplacées par des valeurs de test : un tir sans
 * clef réelle n'a aucun sens. En revanche on exige qu'elles soient là, et
 * on le dit clairement — un tir qui échoue sur « Connection error » ferait
 * chercher une panne réseau là où il n'y a qu'une variable absente.
 */
/**
 * ── UN TIR PAYANT REFUSE DE PARTIR SANS ÊTRE NOMMÉ.
 *
 * Défaut commis le 2026-11-02 : j'ai lancé cette configuration SANS cibler
 * de fichier pour mesurer le câblage de la publication. Elle a rejoué le tir
 * des entités — un appel au modèle que personne n'avait demandé.
 *
 * `passWithNoTests: false` empêche un filtre vide de passer pour vert. ÇA NE
 * PROTÈGE PAS LA DÉPENSE : la commande large, elle, facture.
 *
 * Ce qui la protège : `TIR_PAYANT=oui`. Un tir qui appelle le modèle le
 * déclare (`exigerFeuVert()`), et sans la variable il ÉCHOUE au lieu de
 * facturer. Les tirs gratuits — ceux qui n'appellent que nos bases — n'en
 * ont pas besoin, et une commande large ne coûte alors rien.
 *
 * Le feu vert est donc EXPLICITE À CHAQUE FOIS, et il ne se donne pas par
 * habitude : on le tape dans la commande.
 */
export function exigerFeuVert(quoi: string): void {
  if ((process.env.TIR_PAYANT ?? '') !== 'oui') {
    throw new Error(
      `TIR_PAYANT_NON_AUTORISE: « ${quoi} » appelle le modèle et coûte de ` +
        'l’argent. Relancez avec TIR_PAYANT=oui si le propriétaire l’a ' +
        'autorisé — et ciblez le fichier, une commande large les lance tous.',
    )
  }
}

const MANQUANTES = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter(
  (v) => (process.env[v] ?? '') === '',
)

// Au moins UNE clef de fournisseur : laquelle dépend de `GENERATEUR_FOURNISSEUR`.
if ((process.env.DEEPSEEK_API_KEY ?? '') === '' && (process.env.ANTHROPIC_API_KEY ?? '') === '') {
  MANQUANTES.push('DEEPSEEK_API_KEY ou ANTHROPIC_API_KEY')
}

if (MANQUANTES.length > 0) {
  throw new Error(
    `TIR IMPOSSIBLE — variables absentes : ${MANQUANTES.join(', ')}.\n` +
      'Un tir appelle le vrai modèle et lit la vraie base : sans ces valeurs\n' +
      'il échouerait sur une erreur de réseau qui ne dirait pas la vraie cause.',
  )
}
