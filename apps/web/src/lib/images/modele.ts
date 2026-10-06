/**
 * OÙ TROUVER LE MODÈLE DE DÉTOURAGE, SANS RIEN SUPPOSER.
 *
 * `public/` part au CDN ; il n'est PAS, par défaut, dans le système de
 * fichiers d'une fonction serveur. `next.config.ts` l'y fait entrer via
 * `outputFileTracingIncludes`.
 *
 * ET C'EST VÉRIFIÉ, PAS SUPPOSÉ. Un build complet a été lancé, et la trace
 * `.next/server/app/api/cron/photos-pro/route.js.nft.json` contient bien
 * `u2netp.onnx` ainsi que les quatre binaires WebAssembly d'`onnxruntime-web`
 * (`ort-wasm-simd-threaded.{jsep,asyncify,jspi}.wasm`), sur 261 fichiers
 * tracés. Le réglage ne se lit pas dans la documentation : il se lit dans la
 * trace du paquet réellement produit.
 *
 * LE REPLI RESTE, et ce n'est pas de la ceinture-et-bretelles gratuite : ce
 * traçage dépend d'un chemin de route écrit à la main dans `next.config.ts`.
 * Le jour où la route est renommée ou dupliquée, la clé ne correspond plus et
 * le modèle disparaît du paquet SANS QUE RIEN N'ÉCHOUE au build. Le repli sur
 * le CDN transforme cette panne silencieuse en simple lenteur.
 *
 * Les deux routes qui détourent partagent CETTE fonction : deux résolutions
 * parallèles finiraient par diverger, et l'une marcherait encore quand l'autre
 * aurait cassé.
 */
import { join } from 'node:path'
import { stat } from 'node:fs/promises'
import type { Modele } from './detourage'

/** Mémorisé par instance : un lot de cent photos ne relit pas cent fois. */
let octets: Promise<Modele> | null = null

export function modeleDetourage(origine: string): Promise<Modele> {
  octets ??= (async () => {
    const chemin = join(process.cwd(), 'public', 'modeles', 'u2netp.onnx')
    try {
      await stat(chemin)
      return chemin
    } catch {
      const rep = await fetch(new URL('/modeles/u2netp.onnx', origine))
      if (!rep.ok) throw new Error(`modèle introuvable (CDN ${String(rep.status)})`)
      return new Uint8Array(await rep.arrayBuffer())
    }
  })()
  return octets
}
