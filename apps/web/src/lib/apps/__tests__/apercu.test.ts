// ============================================================
// CLIQUET — L APERCU MONTE LA VRAIE APPLICATION.
//
// ── J AVAIS DIT QUE C ETAIT IMPOSSIBLE SANS DEPENSE.
//
// J ai annonce au proprietaire qu un apercu demandait « un chemin de build :
// un bundler dans le navigateur, ou un service qui construit et heberge », et
// donc une decision de cout. C etait FAUX.
//
// Mon erreur : j avais essaye d importer les paquets du moteur DANS le site,
// je m etais heurte a `react-native`, et j en avais conclu qu il fallait une
// machine. Or le moteur rend deja des fichiers PRETS pour le navigateur — il
// ne manquait qu a les assembler, ce que `rolldown` fait depuis la memoire.
//
// Ces tests tiennent la propriete : une phrase donne une page autonome, qui
// porte la VRAIE application et aucun fichier externe.
// ============================================================
import { describe, expect, it } from 'vitest'
import { emettreSansIa } from '../emission'
import { construireApercu } from '../apercu'

const page = async (phrase: string) => {
  const r = emettreSansIa(phrase)
  expect(r.ok).toBe(true)
  if (!r.ok) throw new Error(r.raison)
  return construireApercu(r.document)
}

describe('CLIQUET — l apercu', () => {
  it('rend une page autonome, sans AUCUN fichier a aller chercher', async () => {
    const a = await page('une application de tontine pour mon quartier')
    // Un `src=` restant signifierait que la page depend d un serveur de
    // fichiers — elle ne s afficherait pas dans un cadre isole.
    expect(a.html).not.toMatch(/<script[^>]*\ssrc=/u)
    expect(a.html).toContain('<script type="module">')
  }, 60_000)

  it('elle porte le point de montage de l application emise', async () => {
    const a = await page('un catalogue de 10 produits')
    // `racine`, pas `root` : le moteur est en francais, et l apercu doit
    // montrer SA page, pas une page ecrite a cote.
    expect(a.html).toMatch(/id="racine"/u)
  }, 60_000)

  it('le paquet est SUBSTANTIEL — une page vide ne prouverait rien', async () => {
    const a = await page('une appli de suivi de chantier')
    expect(a.octets).toBeGreaterThan(200_000)
  }, 60_000)

  it('deux demandes differentes donnent deux applications differentes', async () => {
    const [x, y] = await Promise.all([page('une tontine'), page('un salon de coiffure')])
    expect(x.html).not.toBe(y.html)
  }, 90_000)
})
