/**
 * LE SOUS-ENSEMBLE DE `node:sqlite` QU'ON EMPLOIE — déclaré, pas deviné.
 *
 * ── POURQUOI CE FICHIER EXISTE.
 *
 * `@types/node` est épinglé en 20.19.41 par le lockfile ; les déclarations
 * de `node:sqlite` n'arrivent qu'en 22. Le moteur, lui, tourne sur Node 24
 * et le module existe bel et bien — c'est le TYPAGE qui manque, pas la
 * fonction.
 *
 * Monter `@types/node` pour un cliquet serait un changement de socle hors
 * périmètre, et il toucherait les dix-sept paquets du dépôt.
 *
 * ── ET LA DÉRIVE EST SANS DANGER ICI.
 *
 * Une déclaration écrite à la main peut mentir. Celle-ci ne peut pas mentir
 * longtemps : le seul code qui l'emploie EXÉCUTE SQLite (EP-318bis). Si
 * l'API changeait, le contrôle tomberait à l'exécution — pas en silence.
 *
 * On ne déclare donc QUE ce que ce cliquet appelle, et rien de plus : une
 * déclaration large inviterait à s'en servir ailleurs, sans exécution.
 */
declare module 'node:sqlite' {
  export class DatabaseSync {
    constructor(chemin: string)
    exec(sql: string): void
    prepare(sql: string): { all: () => unknown[] }
    close(): void
  }
}
