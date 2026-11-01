/**
 * EP-307 — L'APERÇU DIT POURQUOI, OU IL NE DIT RIEN.
 *
 * ── LE DÉFAUT, VU PAR LE PROPRIÉTAIRE LE 2026-11-01.
 *
 * L'aperçu affichait « Script error. » — rien d'autre. Ce n'est pas un
 * message vide, c'est une SIGNATURE : un navigateur masque l'erreur d'un
 * script qu'il juge d'une AUTRE ORIGINE, et ne laisse ni fichier, ni ligne.
 *
 * MESURE : l'aperçu sert la page dans un `iframe sandbox="allow-scripts"`
 * avec `srcDoc` — donc une ORIGINE OPAQUE. Notre écouteur `window.error`
 * ne recevait donc qu'une coquille. L'aperçu ne POUVAIT PAS dire pourquoi
 * l'application plante : ni au propriétaire, ni à nous.
 *
 * ── LA CORRECTION : CAPTURER DANS LE MODULE, PAS AUTOUR.
 *
 * Un `try/catch` à l'intérieur du module s'exécute dans le MÊME ROYAUME :
 * il reçoit l'objet Error entier, message et pile compris, quelle que soit
 * l'opacité de l'origine. Mesuré sur un témoin qui plante volontairement :
 * « Cannot read properties of undefined (reading 'montant') » s'affiche au
 * lieu de « Script error. ».
 *
 * CE QUI REND L'ENVELOPPE SÛRE, et ce cliquet le garde : le bundle ne
 * porte AUCUN export de premier niveau et se monte lui-même. Le jour où il
 * en porterait un, `try { export … }` serait une erreur de syntaxe — et
 * c'est ce contrôle qui le dirait.
 */
import { describe, expect, it } from 'vitest'
import { assembler } from '../bac-a-sable'
import { pageAutonome } from '../boucle-directe'

describe('EP-307 · l’aperçu démasque la vraie erreur', () => {
  it(
    '① LE MODULE EST ENVELOPPÉ, et le rapporteur existe',
    async () => {
      const v = await assembler(
        new Map([['index.tsx', 'const a = 1\nconsole.log(a)\n']]),
      )
      expect(v.ok).toBe(true)
      if (!v.ok) return
      const html = pageAutonome(v.code, 'Témoin')
      expect(html, 'le module n’est plus enveloppé').toMatch(/<script type="module">try\{/u)
      expect(html, 'le rapporteur a disparu du prélude').toContain('__deribfyErreur')
    },
    30_000,
  )

  it(
    '② LE BUNDLE N’EXPORTE RIEN AU PREMIER NIVEAU — sinon l’enveloppe casse',
    async () => {
      // `try { export … }` est une erreur de syntaxe. Tant que l'entrée se
      // monte elle-même, le bundle n'exporte rien — et ce contrôle le tient.
      const v = await assembler(
        new Map([
          [
            'index.tsx',
            "import { createRoot } from 'react-dom/client'\n" +
              "const n = document.getElementById('racine')\nif (n) createRoot(n).render(<p>ok</p>)\n",
          ],
        ]),
      )
      expect(v.ok).toBe(true)
      if (!v.ok) return
      expect(
        /^export[\s{]/mu.test(v.code),
        'le bundle exporte au premier niveau : l’enveloppe try/catch deviendrait invalide',
      ).toBe(false)
    },
    30_000,
  )
})
