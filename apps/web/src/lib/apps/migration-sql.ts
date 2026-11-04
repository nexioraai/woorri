/**
 * M2 · LE SQL D'UNE MIGRATION — ET CE QUI EST ÉMETTABLE, PAR LISTE BLANCHE.
 *
 * ── J'AVAIS PROPOSÉ UNE LISTE NOIRE. ELLE NE TIENT PAS.
 *
 * J'avais écrit : « un cliquet qui rend `drop`, `rename` et `alter type`
 * inécrivables ». Trois mots interdits. Le propriétaire a listé ce qui
 * détruit SANS en écrire aucun :
 *
 *     delete from releve               efface des lignes
 *     truncate releve                  vide la table
 *     create or replace view …         change ce que l'application lit
 *     alter table … set not null       échoue ou verrouille sur des
 *                                      données réelles
 *
 *   « Une liste noire sur du SQL engendré par un modèle sera contournée
 *     un jour, et pas par malice — par une tournure à laquelle personne
 *     n'avait pensé. »
 *
 * Donc l'inverse : une instruction que la liste ne NOMME PAS ne s'émet
 * pas. On ne vérifie pas l'absence d'un mot interdit, on vérifie que
 * l'instruction EST l'une des formes permises, en entier, du premier au
 * dernier signe.
 *
 * ── ET ON JUGE LA SORTIE, PAS L'ÉMETTEUR.
 *
 * `verifierMigration` lit du TEXTE. Elle ne sait pas qui l'a produit et
 * n'a pas à le savoir : un émetteur qu'on modifie reste jugé par elle.
 * C'est la règle « un cliquet qui lit CE QUI PART ne peut pas être
 * trompé », appliquée au geste le plus risqué du produit.
 *
 * L'émetteur se juge donc LUI-MÊME avant de rendre quoi que ce soit. Un
 * SQL refusé ne sort pas d'ici.
 *
 * ── CE MODULE EST CÔTÉ SERVEUR, et il importe le compilateur.
 *
 * Il ne doit JAMAIS entrer dans le paquet navigateur (EP-314 : le
 * compilateur tire `node:sqlite`). La comparaison de M1 reste dans
 * `migration-oeuvre.ts`, qui n'importe rien de tel.
 */
import { emettrePolitiquesSql, emettreSchemaSql, typeSqlDe } from '@deribfy/compiler'
import { nomTable, type EntiteDeclaree } from './entites-declarees'
import type { PlanMigration } from './migration-oeuvre'

/**
 * LES FORMES ÉMETTABLES, ET IL N'Y EN A PAS D'AUTRES.
 *
 * Chaque motif est ANCRÉ aux deux bouts : il décrit l'instruction
 * ENTIÈRE. Un motif non ancré laisserait `create table if not exists x
 * (...); delete from y` satisfaire la première forme.
 *
 * ── LES TROIS SEULS `alter table`, ET LA RAISON DE CHACUN.
 *
 * · `add column if not exists` — le cœur de l'expand ;
 * · `enable row level security` / `force row level security` — posés par
 *   les politiques, et sans effet sur une ligne.
 *
 * `alter table … set not null`, `drop column`, `alter column type`,
 * `rename` ne sont nommés NULLE PART : c'est ce qui les refuse. On ne
 * les interdit pas, on ne les permet pas — la différence est toute la
 * garde.
 */
const IDENT = String.raw`[a-z_][a-z0-9_]*`
const FORMES_PERMISES: readonly { readonly nom: string; readonly motif: RegExp }[] = [
  {
    // ── LE CORPS EST BORNÉ EN CARACTÈRES, et mon premier motif ne l'était
    //    pas. `\([\s\S]*\)$` est GOURMAND : il avalait
    //    `( id text ) with (autovacuum_enabled=false)` jusqu'à la dernière
    //    parenthèse, et l'ancre `$` était satisfaite. Une ancre ne suffit
    //    pas quand le milieu accepte tout.
    //
    //    Le corps réel ne contient que des identifiants, des types, des
    //    virgules et `gen_random_uuid()::text`. Aucun `=`, aucun `$`.
    nom: 'create table if not exists',
    motif: new RegExp(
      String.raw`^create table if not exists ${IDENT} \([a-z0-9_,\s:()']+\)$`,
      'u',
    ),
  },
  {
    nom: 'alter table … add column if not exists',
    motif: new RegExp(
      String.raw`^alter table ${IDENT} add column if not exists ${IDENT} [a-z0-9_ ]+$`,
      'u',
    ),
  },
  {
    // ── `unique` EST EXCLU, et c'est l'arrêt de M1 qui le dit : un index
    //    unique posé sur une table qui a déjà des doublons échoue — donc
    //    précisément sur des données réelles, donc au pire moment.
    //    (Aucun émetteur ne produit encore cette forme ; elle est permise
    //    parce qu'elle le sera, et son exclusion doit être écrite AVANT.)
    nom: 'create index if not exists',
    motif: new RegExp(
      String.raw`^create index if not exists ${IDENT} on ${IDENT} \([a-z0-9_, ]+\)$`,
      'u',
    ),
  },
  {
    nom: 'drop policy if exists',
    motif: new RegExp(String.raw`^drop policy if exists ${IDENT} on ${IDENT}$`, 'u'),
  },
  {
    // ── LA QUEUE EST BORNÉE, ELLE AUSSI.
    //
    // `[\s\S]*$` après le rôle acceptait n'importe quoi. Postgres
    // n'autorise pas de DML dans un `using`, mais une garde qui s'appuie
    // sur ce que le moteur refuse par ailleurs n'est pas une garde : elle
    // délègue. On nomme donc les deux seules queues possibles.
    nom: 'create policy',
    motif: new RegExp(
      String.raw`^create policy ${IDENT} on ${IDENT} for (?:all|select|insert|update|delete) to ${IDENT}` +
        String.raw`(?: using \([\s\S]*?\))?(?: with check \([\s\S]*?\))?$`,
      'u',
    ),
  },
  {
    nom: 'alter table … row level security',
    motif: new RegExp(
      String.raw`^alter table ${IDENT} (?:enable|force) row level security$`,
      'u',
    ),
  },
  {
    // ── LE RÔLE EST NOMMÉ, ET C'EST UN TROU QUE MON CLIQUET A TROUVÉ.
    //
    // `to ${IDENT}` acceptait `grant all on t to anon` — ce qui OUVRIRAIT
    // la table aux visiteurs non connectés. La forme était « permise » et
    // elle détruisait la porte de l'œuvre.
    //
    // Ce produit n'accorde qu'à `authenticated`, et ne retire qu'à
    // `anon, public`. Les nommer rend l'escalade inécrivable.
    nom: 'grant à authenticated',
    motif: new RegExp(String.raw`^grant [a-z, ]+ on ${IDENT} to authenticated$`, 'u'),
  },
  {
    nom: 'revoke à anon et public',
    motif: new RegExp(String.raw`^revoke all on ${IDENT} from anon, public$`, 'u'),
  },
]

/**
 * DÉCOUPE LE SQL EN INSTRUCTIONS, en respectant chaînes et commentaires.
 *
 * ── POURQUOI PAS `split(';')`.
 *
 * Un `;` dans une chaîne ou dans un commentaire couperait au mauvais
 * endroit, et la moitié d'instruction obtenue ne ressemblerait à aucune
 * forme permise : la garde refuserait du SQL juste. Pire, l'inverse est
 * possible — recoller deux moitiés peut produire une forme qui passe.
 *
 * Les commentaires sont RETIRÉS ici, pas ignorés plus tard : un
 * commentaire est du texte libre, et le laisser dans l'instruction
 * jugée rendrait les motifs ancrés inutiles.
 */
export function instructionsDe(sql: string): readonly string[] {
  const out: string[] = []
  let courante = ''
  let i = 0
  while (i < sql.length) {
    const c = sql[i] ?? ''
    if (c === "'") {
      // Une chaîne SQL : `''` y échappe une apostrophe.
      let j = i + 1
      while (j < sql.length) {
        if (sql[j] === "'") {
          if (sql[j + 1] === "'") j += 2
          else break
        } else j += 1
      }
      courante += sql.slice(i, Math.min(j + 1, sql.length))
      i = j + 1
      continue
    }
    if (c === '-' && sql[i + 1] === '-') {
      const fin = sql.indexOf('\n', i)
      i = fin < 0 ? sql.length : fin + 1
      courante += ' '
      continue
    }
    if (c === ';') {
      out.push(courante)
      courante = ''
      i += 1
      continue
    }
    courante += c
    i += 1
  }
  out.push(courante)
  return out.map((x) => x.replace(/\s+/gu, ' ').trim()).filter((x) => x !== '')
}

export type RefusInstruction = { readonly instruction: string; readonly raison: string }

/**
 * CHAQUE INSTRUCTION EST-ELLE L'UNE DES FORMES PERMISES ?
 *
 * Rien d'autre n'est regardé. Pas de mot interdit, pas d'heuristique :
 * une instruction qui ne correspond à aucune forme est refusée, et la
 * raison le dit — c'est la forme qui manque, pas un mot qui gêne.
 */
export function verifierMigration(sql: string): {
  readonly ok: boolean
  readonly refus: readonly RefusInstruction[]
} {
  const refus: RefusInstruction[] = []
  for (const brute of instructionsDe(sql)) {
    const instruction = brute.toLowerCase()
    if (!FORMES_PERMISES.some((f) => f.motif.test(instruction))) {
      refus.push({
        instruction: brute.slice(0, 160),
        raison:
          'cette instruction ne correspond à AUCUNE forme émettable — ' +
          'seules les formes strictement additives sont permises',
      })
    }
  }
  return { ok: refus.length === 0, refus }
}

export type Migration = {
  readonly sql: string
  /** Ce que la migration fera, en clair — pour l'écran, pas pour la base. */
  readonly gestes: readonly string[]
  readonly refus: readonly RefusInstruction[]
}

/**
 * ÉMET LA MIGRATION D'UN PLAN — et se refuse elle-même si elle dérape.
 *
 * ── LES TABLES NEUVES PASSENT PAR L'ÉMETTEUR DU SCHÉMA, pas par un second.
 *
 * `emettreSchemaSql([entite])` produit EXACTEMENT ce qu'une création
 * fraîche produirait. Un second émetteur divergerait, et la divergence
 * donnerait deux tables de forme différente selon qu'elles sont nées à la
 * création ou à une modification.
 *
 * ── LES POLITIQUES SE RÉAPPLIQUENT EN ENTIER, et c'est voulu.
 *
 * Elles font `drop policy if exists` avant `create policy` : les rejouer
 * coûte une transaction et garantit qu'une table neuve a SA porte. Les
 * poser partiellement laisserait une table ouverte ou fermée selon
 * l'ordre des modifications.
 */
export function emettreMigrationSql(
  plan: PlanMigration,
  nouvelles: readonly EntiteDeclaree[],
  idOeuvre: string,
): Migration {
  if (!plan.peutAvancer) {
    return {
      sql: '',
      gestes: [],
      refus: [
        {
          instruction: '',
          raison: 'le plan s’arrête : aucune migration n’est émise',
        },
      ],
    }
  }
  const parTable = new Map(nouvelles.map((e) => [nomTable(e), e]))
  const morceaux: string[] = []
  const gestes: string[] = []

  for (const e of plan.ajouts) {
    if (e.genre === 'table-ajoutee') {
      const entite = parTable.get(e.table)
      if (entite === undefined) continue
      morceaux.push(emettreSchemaSql([entite]))
      gestes.push(`ajouter la table « ${e.table} »`)
    }
  }
  for (const e of plan.ajouts) {
    if (e.genre !== 'champ-ajoute') continue
    const entite = parTable.get(e.table)
    const champ = entite?.fields.find((f) => f.id.replace(/^fld_/u, '') === e.champ)
    if (champ === undefined) continue
    // ── JAMAIS `not null`, QUOI QUE LA DÉCLARATION DISE.
    //
    // Une colonne obligatoire posée sur des lignes qui existent déjà
    // échoue, ou se remplit d'un défaut que personne n'a choisi.
    // L'obligation vit dans l'écran — c'est déjà la règle du schéma.
    morceaux.push(
      `alter table ${e.table} add column if not exists ${e.champ} ${typeSqlDe({ id: champ.id, type: champ.type })};`,
    )
    gestes.push(`ajouter « ${e.champ} » à « ${e.table} »`)
  }

  if (morceaux.length === 0) return { sql: '', gestes: [], refus: [] }

  // LA PORTE DE CHAQUE TABLE, réappliquée en entier.
  morceaux.push(emettrePolitiquesSql([...nouvelles], idOeuvre))
  const sql = morceaux.join('\n')

  // ── ELLE SE JUGE AVANT DE RENDRE. Fail-closed : un SQL refusé ne sort
  //    pas d'ici, même si c'est l'émetteur lui-même qui a dérapé.
  const verdict = verifierMigration(sql)
  return verdict.ok ? { sql, gestes, refus: [] } : { sql: '', gestes: [], refus: verdict.refus }
}
