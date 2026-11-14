/**
 * V4 · L'ENTRÉE DE L'ŒUVRE — `index.tsx`, émis comme TEXTE dans chaque
 * application générée. Il choisit la source du moteur : la base de l'œuvre
 * quand la page est publiée et reliée (`window.DERIBFY_BASE`, origine réelle),
 * la mémoire dans l'aperçu (origine opaque) ou sans base.
 *
 * Ce module ne fait que porter ce texte : Deribfy ne l'exécute jamais (la
 * dérogation de businessLayerPortability est bornée à ce fichier).
 */
export const ENTREE_OEUVRE = [
  "import { createClient } from '@supabase/supabase-js'",
  "import { monter } from './rendu/moteur'",
  "import { Magasin } from './rendu/donnees'",
  "import { MagasinBase } from './rendu/base'",
  "import { APP, TABLES } from './app'",
  'type Config = { url: string; clePubliable: string; options?: Record<string, unknown> }',
  "const b: Config = (window as unknown as { DERIBFY_BASE?: Config }).DERIBFY_BASE ?? { url: '', clePubliable: '' }",
  '// Publiée et reliée à sa base : la base. Aperçu (origine opaque) ou sans base : la mémoire.',
  "const enBase = b.url !== '' && window.origin !== 'null'",
  'monter(APP as never, enBase ? new MagasinBase(createClient(b.url, b.clePubliable, b.options) as never, TABLES) : new Magasin({ tables: Object.fromEntries(TABLES.map((t) => [t, []])) }))',
  '',
].join('\n')
