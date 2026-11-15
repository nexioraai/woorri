// Types PURS (aucune lecture) — 2026-11-15. Séparés du module de lecture, qui est
// serveur (lecteurDuSite) : un composant navigateur peut les importer sans
// faire entrer un module `server-only` dans son graphe (cliquet DEBT-081).

export type LienLegal = { href: string; titre: string }
