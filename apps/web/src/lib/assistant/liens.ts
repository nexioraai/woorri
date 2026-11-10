// LOT 16ter — les liens donnés au visiteur, seulement vers des adresses
// CONNUES. Partagé par la route de l'assistant (réponses du modèle) et par
// le gabarit du site (réponses écrites dans l'éditeur) : une seule règle.

export const ECRANS_DU_COMPTE: Record<string, string> = {
  '/inscription': 'Créer un compte',
  '/connexion': 'Se connecter',
  '/espace-client': 'Mon espace',
}
export function liensCites(texte: string, connus: Map<string, string>): { chemin: string; titre: string }[] {
  const vus = new Set<string>()
  const out: { chemin: string; titre: string }[] = []
  for (const m of texte.match(/\/[a-z0-9#][a-z0-9\-/#]*/gi) ?? []) {
    const chemin = m.replace(/[.)]+$/, '')
    const titre = connus.get(chemin)
    if (!titre || vus.has(chemin)) continue
    vus.add(chemin); out.push({ chemin, titre })
    if (out.length >= 3) break
  }
  return out
}

