// ÉTAPE 3b (2026-11-13) — « L'APPLI NE DÉMARRE PAS » : AUCUN EXPORT DE NIVEAU MODULE DANS LE PAQUET.
//
// MESURÉ (M12, puis Chromium sur trois œuvres livrées) : rolldown gardait les
// exports du fichier d'entrée en fin de paquet — `export { App as default };`
// (4b8b1d20), `export { base, enBase, useTable };` (9cc16d10, l'arrêt de
// l'application Hayine). La page les enveloppe dans `try{ … }catch` : un
// `export` y est une faute de syntaxe et le navigateur s'arrête AVANT la
// première ligne (« Unexpected token 'export' »). Le juge d'exécution importait
// le paquet nu sous Node, où l'export est légal : « démarre, 6 écrans ».
//
// Ici les DEUX ŒUVRES RÉELLES sont rejouées à travers l'assembleur :
//   ① plus aucune ligne `export` dans le paquet, et le script du module de la
//      page SE COMPILE (la même compilation que le navigateur fait avant
//      d'exécuter : `new Function` refuse un `export` dans un corps exactement
//      comme le navigateur le refuse dans un `try{}`) ;
//   ② une entrée qui exporte quand même (`export default App`, `export const`)
//      est transformée : l'export disparaît, le montage reste ;
//   ③ si l'empaqueteur rendait encore un export, l'assembleur REFUSE (G29
//      statique) — mesuré en lui présentant un paquet qui en porte ;
//   ④ la consigne le dit au modèle, en complément.
// Rouge-puis-vert : `preserveEntrySignatures: false` retiré → ① rouge sur
// « Unexpected token 'export' » (le message exact du navigateur), ② rouge.
// Ce que ce cliquet NE VOIT PAS : le rendu dans un vrai navigateur — c'est le
// tir `src/tirs/demarrage-chromium.tir.ts` (gratuit) qui le voit.
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { assembler, exportsSurvivants } from '../bac-a-sable'
import { CONSIGNE, pageAutonome } from '../boucle-directe'
import { fichiersSysteme } from '../bibliotheque-ui'
import { motifTexte } from './motif-texte'

const oeuvre = (id: string): ReadonlyMap<string, string> =>
  new Map(Object.entries(JSON.parse(gunzipSync(readFileSync(join(__dirname, 'fixtures', `oeuvre-${id}.json.gz`))).toString('utf8')) as Record<string, string>))

/** Le script du module de la page, tel que le navigateur le compile. */
const scriptDuModule = (page: string): string => {
  const m = /<script type="module">([\s\S]*)<\/script><\/body><\/html>$/u.exec(page)
  if (m === null) throw new Error('script du module introuvable dans la page')
  return m[1]!
}
const lignesExport = (code: string) => code.split('\n').filter((l) => /^export\b/u.test(l)).map((l) => l.slice(0, 80))

describe('étape 3b · l’application démarre : aucun export de niveau module dans le paquet', () => {
  for (const id of ['4b8b1d20', '9cc16d10']) {
    it(
      `① ${id} — l'œuvre livrée, rejouée : zéro export, et le script de la page se compile`,
      async () => {
        const v = await assembler(oeuvre(id))
        expect(v.ok, v.ok ? '' : v.erreur).toBe(true)
        if (!v.ok) return
        const script = scriptDuModule(pageAutonome(v.code, 'Votre application', undefined, 'apercu'))
        // La compilation seule — rien n'est exécuté. C'est elle que le navigateur
        // fait en premier, et c'est elle qui échouait (« Unexpected token 'export' »).
        expect(() => new Function(script), 'le navigateur refuserait ce script').not.toThrow()
        expect(lignesExport(v.code), 'un export de niveau module survit dans le paquet').toEqual([])
      },
      90_000,
    )
  }

  it('② une entrée qui exporte quand même est transformée : l’export disparaît, le montage reste', async () => {
    const v = await assembler(
      new Map([
        [
          'index.tsx',
          "import { createRoot } from 'react-dom/client'\n" +
            "export const DEVISE_LOCALE = 'XAF'\n" +
            "function App() { return <main><h1>Bonjour témoin</h1></main> }\n" +
            "createRoot(document.getElementById('racine')!).render(<App />)\n" +
            'export default App\n',
        ],
        ...fichiersSysteme('XAF'),
      ]),
    )
    expect(v.ok, v.ok ? '' : v.erreur).toBe(true)
    if (!v.ok) return
    expect(lignesExport(v.code)).toEqual([])
    expect(v.code, 'le montage a été élagué avec l’export').toMatch(motifTexte('Bonjour témoin'))
    expect(() => new Function(scriptDuModule(pageAutonome(v.code, 'Témoin')))).not.toThrow()
  }, 90_000)

  it('③ un paquet qui exporterait encore est NOMMÉ comme survivant — c’est ce que l’assembleur refuse', () => {
    expect(exportsSurvivants(['default'], 'const a = 1;\nexport { a as default };\n')).toEqual(['default'])
    // Le champ de l'empaqueteur fait foi ; le texte n'est lu qu'en repli.
    expect(exportsSurvivants(undefined, 'const a = 1;\nexport { a as default };\n')).toEqual(['export { a as default };'])
    expect(exportsSurvivants([], 'const a = 1;\n')).toEqual([])
    expect(exportsSurvivants(undefined, 'const prose = `\n  exportez vos données\n`;\n')).toEqual([])
  })

  it('④ la consigne dit au modèle que index.tsx n’exporte rien', () => {
    expect(CONSIGNE).toMatch(motifTexte("ET IL N'EXPORTE RIEN"))
    expect(CONSIGNE).toMatch(motifTexte("Unexpected token 'export'"))
  })
})
