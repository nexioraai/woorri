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
