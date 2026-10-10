// ════════════════════════════════════════════════════════════════════
//  LE SQL DES POLITIQUES — TRADUIT D'UN PLAN, JAMAIS INVENTÉ.
//
// Le plan vient de `derivePlanAcces` (air-schema) : une seule source, deux
// consommateurs — le juge refuse ce qui n'a pas de propriétaire déclaré,
// cet émetteur écrit ce que le juge a laissé passer.
//
// DÉTERMINISTE ET IDEMPOTENT : même document ⇒ même SQL, octet pour octet ;
// et le script se rejoue sans dégât (`drop policy if exists` avant chaque
// `create policy`). C'est le motif de `sqlPour` — un script qu'on ne peut
// pas coller deux fois est un script qu'on n'ose coller qu'une fois.
//
// AUCUN APPEL IA : la littérature situe les défauts du code généré par IA
// dans « les frontières de sécurité ». Une politique d'accès EST une
// frontière de sécurité, donc elle se calcule.
// ════════════════════════════════════════════════════════════════════
import type { PlanAcces, PolitiqueTable, Politique, Portee } from "@deribfy/air-schema";

/** L'identité de la personne connectée, dans le dialecte Postgres/Supabase. */
const IDENTITE = "auth.uid()";

/** Le prédicat de propriété, en SQL — par distance à l'identité. */
function predicatProprietaire(table: PolitiqueTable, portee: Portee): string {
  if (portee.kind === "identite") {
    // La table EST les personnes : sa ligne est celle de l'identité.
    return `id = ${IDENTITE}`;
  }
  if (portee.kind === "directe") {
    return `${portee.fieldId} = ${IDENTITE}`;
  }
  if (portee.kind === "chaine") {
    // La chaîne se lit de l'extérieur vers l'identité : chaque maillon est
    // un `exists` sur la table suivante. Bornée à trois sauts (le plan le
    // garantit) : au-delà, « cette ligne est à cette personne » cesse
    // d'être une phrase qu'un propriétaire peut vérifier.
    const maillons = [...portee.chemin];
    const dernier = maillons[maillons.length - 1];
    if (dernier === undefined) return "false";
    // Un seul niveau d'imbrication suffit pour les chaînes de longueur 2 ;
    // au-delà on compose. Le SQL reste LISIBLE : c'est une exigence, pas un
    // confort — ces lignes seront relues par un humain le jour d'un incident.
    let sql = `${dernier.fieldId} = ${IDENTITE}`;
    for (let i = maillons.length - 2; i >= 0; i--) {
      const maillon = maillons[i];
      const suivant = maillons[i + 1];
      if (maillon === undefined || suivant === undefined) continue;
      sql = `exists (select 1 from public.${suivant.entityId.replace(/^ent_/u, "")} as m${String(i)} where m${String(i)}.id = ${maillon.fieldId} and ${sql.replace(dernier.fieldId, `m${String(i)}.${dernier.fieldId}`)})`;
    }
    return sql;
  }
  if (portee.kind === "vitrine") return "true";
  // orpheline : le juge l'a déjà refusée si elle était atteignable. Si elle
  // arrive ici, elle est INTERNE : fermée, jamais ouverte par défaut.
  void table;
  return "false";
}

/** Le prédicat d'un droit : « cette personne porte ce droit ». Les droits
 *  vivent côté serveur de session (`/air/v1/session` les rend avec
 *  l'identité) ; côté base, ils se lisent par la table des rôles. */
function predicatDroit(rightId: string, plan: PlanAcces): string {
  const total = plan.roleTotal;
  const parRole = `exists (select 1 from public.air_role_attributions ra where ra.person_id = ${IDENTITE} and ra.right_id = '${rightId}')`;
  if (total === undefined) return parRole;
  // `grantsAllRights` NE DÉGÉNÈRE PAS EN `true` : il désigne un RÔLE, et le
  // prédicat reste « cette personne porte ce rôle ». Un rôle qui traverse
  // n'est pas une table publique — c'est la distinction que le contrat fait
  // (« sa liste de droits pourrait être vide, il resterait propriétaire »).
  return `(${parRole} or exists (select 1 from public.air_role_attributions ra2 where ra2.person_id = ${IDENTITE} and ra2.role_id = '${total}'))`;
}

function sqlPredicat(politique: Politique, table: PolitiqueTable, plan: PlanAcces): string {
  const p = politique.predicat;
  if (p.kind === "ouvert") return "true";
  if (p.kind === "droit") return predicatDroit(p.rightId, plan);
  const possession = predicatProprietaire(table, p.portee);
  if (politique.rightId === undefined) return possession;
  // Droit ET possession : le droit ouvre la porte, la possession choisit la
  // ligne. Les deux, jamais l'un à la place de l'autre.
  return `(${possession}) and ${predicatDroit(politique.rightId, plan)}`;
}

/**
 * LE SCRIPT COMPLET — à poser une fois, rejouable.
 * Rend `undefined` quand le document ne déclare rien à protéger : un
 * document sans accès ni entité atteignable n'a pas de politique à écrire,
 * et un script vide serait un mensonge rassurant.
 */
export function emettreSqlAcces(plan: PlanAcces): string | undefined {
  const tables = plan.tables.filter((t) => t.politiques.length > 0);
  if (tables.length === 0) return undefined;

  const lignes: string[] = [
    "-- ════════════════════════════════════════════════════════════════",
    "-- POLITIQUES D'ACCÈS — DÉRIVÉES DU DOCUMENT, PAS ÉCRITES À LA MAIN.",
    "--",
    "-- Chaque politique dit À QUI appartient une ligne, en remontant les",
    "-- références déclarées jusqu'à l'entité des personnes. Une table que le",
    "-- client peut atteindre sans propriétaire déclaré ne compile pas : le",
    "-- validateur la refuse avant d'arriver ici.",
    "--",
    "-- Rejouable : chaque politique est retirée puis reposée.",
    "-- ════════════════════════════════════════════════════════════════",
    "",
  ];
  if (plan.entiteIdentite !== undefined) {
    lignes.push(
      `-- Entité des personnes : ${plan.entiteIdentite} (désignée par ${plan.origineIdentite ?? "?"})`,
      "",
    );
  }
  if (plan.roleTotal !== undefined || plan.roleDefaut !== undefined) {
    lignes.push(
      "-- Les rôles et les droits accordés, lus par les politiques ci-dessous.",
      "-- La session (`/air/v1/session`) les rend AVEC l'identité ; cette table",
      "-- est leur source côté données.",
      "create table if not exists public.air_role_attributions (",
      "  person_id uuid not null,",
      "  role_id   text not null,",
      "  right_id  text,",
      "  primary key (person_id, role_id, right_id)",
      ");",
      "alter table public.air_role_attributions enable row level security;",
      "drop policy if exists air_role_attributions_lecture on public.air_role_attributions;",
      `create policy air_role_attributions_lecture on public.air_role_attributions for select using (person_id = ${IDENTITE});`,
      "",
    );
    if (plan.roleDefaut !== undefined) {
      lignes.push(
        `-- Rôle par défaut déclaré : ${plan.roleDefaut} — ce qu'obtient un compte`,
        "-- créé HORS de l'application. Sans lui, « un compte sans profil »",
        "-- traverse sans statut, et chaque écran décide seul de le laisser entrer.",
        "",
      );
    }
  }

  for (const table of tables) {
    lignes.push(
      `-- ── ${table.table} — ${table.portee.kind}${table.appendOnly ? " · append_only" : ""}${table.atteignable ? "" : " · interne"}`,
      `alter table public.${table.table} enable row level security;`,
      // FORCE : le propriétaire de la table lui-même est soumis aux
      // politiques. Sans cela, un rôle de service contourne tout en silence.
      `alter table public.${table.table} force row level security;`,
    );
    for (const politique of table.politiques) {
      const predicat = sqlPredicat(politique, table, plan);
      const clause =
        politique.operation === "insert"
          ? `with check (${predicat})`
          : politique.operation === "update"
            ? `using (${predicat}) with check (${predicat})`
            : `using (${predicat})`;
      lignes.push(
        `drop policy if exists ${politique.nom} on public.${table.table};`,
        `create policy ${politique.nom} on public.${table.table} for ${politique.operation} ${clause};`,
      );
    }
    if (table.appendOnly) {
      lignes.push(
        `-- append_only déclaré : ni mise à jour ni suppression, par ABSENCE de`,
        `-- politique (la sécurité par ligne refuse ce qu'aucune politique n'autorise).`,
      );
    }
    lignes.push("");
  }
  return lignes.join("\n");
}
