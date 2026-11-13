/**
 * LE TÉMOIN DE LA SONDE — une application minuscule, ÉMISE comme texte.
 *
 * `GET /api/generateur/direct` l'assemble DANS la fonction du tir payant pour
 * photographier le disque réel (voir le commentaire de la route). Aucun
 * modèle n'est appelé.
 *
 * ── IL SE MONTE LUI-MÊME, COMME UNE VRAIE ŒUVRE (règle 1 de la consigne).
 *
 * Avant l'étape 3b il exportait `monter()` et comptait sur le juge pour
 * l'appeler. Depuis que l'assembleur élague les exports de l'entrée (un
 * `export` dans la page servie arrêtait l'application : « Unexpected token
 * 'export' »), un `monter()` jamais appelé ne monterait rien — ni ici, ni
 * dans la page. Le témoin fait donc ce que fait toute œuvre livrée.
 *
 * ── CE MODULE N'APPELLE AUCUNE API DE NAVIGATEUR : `document.getElementById`
 * est dans une CHAÎNE, destinée au navigateur de l'œuvre. Il vit dans son
 * propre fichier pour que la dérogation de portabilité (businessLayer
 * Portability) soit bornée à ces quelques lignes, et pas à la route entière.
 */
export const TEMOIN_FICHIERS: ReadonlyMap<string, string> = new Map([
  [
    'index.tsx',
    "import { createRoot } from 'react-dom/client'\n" +
      "import { App } from './App'\n" +
      "createRoot(document.getElementById('racine')!).render(<App />)\n",
  ],
  [
    'App.tsx',
    "import { useState } from 'react'\n" +
      'export function App() {\n' +
      '  const [n] = useState(12)\n' +
      '  return <p>témoin {n}</p>\n' +
      '}\n',
  ],
])
