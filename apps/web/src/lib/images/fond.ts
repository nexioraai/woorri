// ============================================================
// SUPPRESSION DE FOND — L'INTERFACE EST POSÉE, LE MOTEUR EST AILLEURS.
//
// CE QUI EST VRAI, ET QUI COMMANDE TOUT CE FICHIER : la suppression de fond
// exige un modèle de segmentation. Le plus courant en logiciel libre est
// **U²-Net** (licence Apache-2.0), tel que l'emploie `rembg` — environ
// **176 Mo** de poids. Il s'exécute très bien sur un processeur, via
// `onnxruntime`, sans le moindre service tiers et sans GPU.
//
// MAIS IL NE TOURNERA PAS SUR VERCEL, et ce n'est pas une opinion :
//   · le paquet d'une fonction serverless est plafonné à 250 Mo décompressés —
//     le modèle seul en fait 176, `onnxruntime-node` ~120 de plus ;
//   · chaque invocation repart à froid : charger 176 Mo à chaque photo coûte
//     plus cher que l'inférence elle-même ;
//   · rien ne persiste entre deux appels, donc aucun cache de modèle.
//
// CONSÉQUENCE ASSUMÉE : cette capacité EXIGE un processus séparé, qui garde le
// modèle en mémoire. Le code de ce worker est livré
// (`workers/suppression-fond/`), il est autonome et s'exécute avec `node`.
// **Le déployer est une décision d'hébergement, donc une décision du
// propriétaire** — coût estimé et recommandation dans `PROGRESS.md`.
//
// CE FICHIER NE MENT PAS SUR CE QU'IL SAIT FAIRE. Tant qu'aucun worker n'est
// déclaré, `fondDisponible()` rend `false` et l'interface du marchand
// n'affiche PAS l'option. Une fonctionnalité annoncée et indisponible est pire
// qu'une fonctionnalité absente : elle fait douter de tout le reste.
// ============================================================

/** Adresse du worker. Absente = capacité non déployée, et c'est un état
 *  NORMAL, pas une panne. */
const WORKER = process.env.IMAGE_WORKER_URL ?? ''

/** Jeton partagé : le worker doit refuser tout ce qui ne vient pas d'ici. */
const JETON = process.env.IMAGE_WORKER_TOKEN ?? ''

export type ResultatFond =
  | { ok: true; donnees: Buffer; ms: number }
  | { ok: false; raison: 'non_deploye' | 'injoignable' | 'refuse' | 'echec'; detail?: string }

/**
 * La capacité est-elle réellement disponible ?
 *
 * Interrogée par l'interface AVANT de proposer l'option. C'est la différence
 * entre « le bouton n'existe pas » et « le bouton ne marche pas ».
 */
export function fondDisponible(): boolean {
  return WORKER !== '' && JETON !== ''
}

/**
 * Détoure l'image, et pose le fond demandé.
 *
 * `fond` est une couleur hexadécimale — le blanc des places de marché, ou la
 * couleur de marque du marchand. Jamais de transparence servie telle quelle :
 * un PNG transparent affiché sur un thème sombre donne un article qui flotte
 * dans le noir.
 *
 * FAIL-SAFE INTÉGRAL : toute erreur rend un résultat NÉGATIF, jamais une
 * exception. L'appelant garde l'original et l'améliorée ; le marchand perd une
 * option, pas sa photo.
 */
export async function supprimerFond(
  entree: Buffer,
  fond = '#FFFFFF',
  timeoutMs = 25_000,
): Promise<ResultatFond> {
  if (!fondDisponible()) return { ok: false, raison: 'non_deploye' }

  const debut = Date.now()
  const ctrl = new AbortController()
  const minuteur = setTimeout(() => { ctrl.abort() }, timeoutMs)
  try {
    const res = await fetch(`${WORKER.replace(/\/$/, '')}/detourer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        Authorization: `Bearer ${JETON}`,
        'X-Fond': fond,
      },
      body: new Uint8Array(entree),
      signal: ctrl.signal,
    })
    if (res.status === 401 || res.status === 403) return { ok: false, raison: 'refuse' }
    if (!res.ok) {
      return { ok: false, raison: 'echec', detail: `HTTP ${String(res.status)}` }
    }
    const donnees = Buffer.from(await res.arrayBuffer())
    // Un worker qui rend un corps vide sur un 200 est en panne silencieuse :
    // c'est la faute la plus difficile à voir, donc celle qu'on nomme.
    if (donnees.length < 100) return { ok: false, raison: 'echec', detail: 'réponse vide' }
    return { ok: true, donnees, ms: Date.now() - debut }
  } catch (e) {
    return {
      ok: false,
      raison: 'injoignable',
      detail: e instanceof Error ? e.message : undefined,
    }
  } finally {
    clearTimeout(minuteur)
  }
}
