/**
 * L'APERÇU VIVANT — L'APPLICATION, À L'ÉCRAN, SANS RIEN TÉLÉCHARGER.
 *
 * ── J'AVAIS DIT QUE C'ÉTAIT IMPOSSIBLE SANS DÉPENSE. J'AVAIS TORT.
 *
 * J'ai annoncé au propriétaire que l'aperçu demandait « un chemin de build :
 * soit un bundler dans le navigateur, soit un service qui construit et
 * héberge », et donc une décision de coût. C'était faux, et la raison de mon
 * erreur mérite d'être écrite : j'avais essayé d'importer les paquets du
 * moteur DANS le site, je m'étais heurté à `react-native`, et j'en avais
 * conclu qu'il fallait une machine.
 *
 * Or le moteur rend déjà des fichiers PRÊTS pour le navigateur — c'est son
 * métier. Il ne manquait qu'à les assembler. `rolldown` le fait depuis la
 * MÉMOIRE, sans disque, sans `npm install`, sans Vite : 60 fichiers émis
 * deviennent un paquet de ~940 ko en quelques secondes.
 *
 * Aucun hébergement, aucun service, aucune dépense. Du temps de processeur.
 *
 * ── POURQUOI UN SYSTÈME DE FICHIERS VIRTUEL.
 *
 * Écrire les 60 fichiers sur le disque d'une fonction serveur marcherait en
 * local et poserait les questions habituelles en ligne — droits d'écriture,
 * nettoyage, concurrence entre deux visiteurs. Rien n'est écrit : le greffon
 * résout et charge depuis la carte en mémoire.
 */
import type { ProjectAir } from '@deribfy/air-schema'
import { compileWeb } from '@deribfy/compiler'

/** Résout un chemin relatif entre deux modules de la carte. */
function resoudre(source: string, importateur: string | undefined, fichiers: ReadonlyMap<string, string>): string | null {
  if (source.startsWith('.')) {
    const base = importateur === undefined ? '' : importateur.split('/').slice(0, -1).join('/')
    const pile: string[] = []
    for (const p of (base === '' ? source : `${base}/${source}`).split('/')) {
      if (p === '.' || p === '') continue
      if (p === '..') pile.pop()
      else pile.push(p)
    }
    const chemin = pile.join('/')
    // L'émission écrit des imports sans extension : on essaie les formes
    // qu'elle produit, dans l'ordre où un bundler les chercherait.
    for (const suffixe of ['', '.tsx', '.ts', '/index.tsx', '/index.ts']) {
      if (fichiers.has(chemin + suffixe)) return chemin + suffixe
    }
  }
  return fichiers.has(source) ? source : null
}

export type Apercu = { html: string; octets: number; ms: number }

/**
 * Compile le document, assemble le paquet, et rend UNE page HTML complète.
 *
 * Complète, donc autonome : elle s'affiche dans un cadre isolé sans rien
 * demander au site qui l'héberge.
 */
export async function construireApercu(air: ProjectAir): Promise<Apercu> {
  const debut = Date.now()
  const projet = compileWeb(air)
  const fichiers = projet.files

  const { rolldown } = await import('rolldown')
  const paquet = await rolldown({
    input: 'index.tsx',
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
  const code = output[0]?.code ?? ''

  // Le squelette vient de l'émission, pas d'ici : l'aperçu doit montrer la
  // VRAIE page de l'application, pas une approximation écrite à côté.
  const squelette = fichiers.get('index.html') ?? '<!doctype html><div id="racine"></div>'
  const html = squelette
    .replace(/<script[^>]*src=["'][^"']*["'][^>]*><\/script>/gu, '')
    .replace('</body>', `<script type="module">${code}</script></body>`)

  return { html, octets: code.length, ms: Date.now() - debut }
}
