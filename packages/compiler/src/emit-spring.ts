// ════════════════════════════════════════════════════════════════════
//  L'ÉMETTEUR SPRING BOOT — LE SERVEUR QUE LE DOCUMENT DÉCRIT DÉJÀ.
// ════════════════════════════════════════════════════════════════════
//
// ── POURQUOI IL EXISTE.
//
// Question du propriétaire, le 2026-10-06 : « que font les autres générateurs
// d'applis ? » Réponse mesurée : ils fournissent le backend (Bubble, Adalo) ou
// le GÉNÈRENT depuis un schéma (Hasura, PostgREST, PocketBase). Seuls les
// outils internes supposent un système déjà en place.
//
// Deribfy était dans cette dernière famille — et ses utilisateurs n'arrivent
// avec RIEN. On leur livrait une application et une facture de développement
// backend.
//
// Or l'AIR *est* un schéma, et plus riche que ceux dont Hasura part. Il porte
// ce qu'une base seule ne dit pas :
//
//   · `appendOnly`  — ce qui ne se réécrit JAMAIS (un journal comptable) ;
//   · `derived`     — ce qui se CALCULE et ne s'écrit pas ;
//   · `transitions` — les seuls passages d'états permis ;
//   · `access`      — qui a le droit de quoi ;
//   · `sensitive`   — ce qui ne ressort jamais.
//
// Un serveur écrit à la main oublie au moins une de ces cinq choses. Celui-ci
// ne peut pas : il les déduit du document.
//
// ── CE QU'IL N'ÉCRIT PAS, ET POURQUOI.
//
// 🔴 AUCUNE RÈGLE D'ARGENT. Séquestre, tour courant, pénalités, répartition,
//    enchères : le document les déclare INEXPRIMABLES parce qu'elles ont
//    besoin d'une horloge ou divisent une somme entre des personnes. Les
//    deviner ici reviendrait à écrire, à la place du propriétaire, ce qui
//    décide du sort de l'argent de ses membres. Le serveur émis porte leurs
//    emplacements NOMMÉS et vides — on ne peut pas les oublier, et personne ne
//    peut croire qu'elles sont faites.
//
// 🔴 AUCUN SECRET. Pas de mot de passe de base, pas de clé d'opérateur. La
//    configuration vient de l'environnement, et le projet émis le dit.
import type { ProjectAir } from "@deribfy/air-schema";

export interface EnveloppeBackend {
  readonly files: ReadonlyMap<string, string>;
}

const PASCAL = (id: string): string =>
  id
    .replace(/^(ent|fld|act|scr)_/, "")
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");

const CAMEL = (id: string): string => {
  const p = PASCAL(id);
  return p.charAt(0).toLowerCase() + p.slice(1);
};

/**
 * Les types de l'AIR vers Java.
 *
 * `decimal` → `BigDecimal` et JAMAIS `double` : un `double` ne représente pas
 * 0,10 exactement, et une tontine additionne des cotisations. Trois centimes
 * perdus par opération deviennent une dispute à la fin du cycle.
 *
 * `datetime` → `Instant` : un instant absolu, pas une heure locale. Les
 * membres d'une tontine peuvent être dans deux fuseaux.
 */
const JAVA: Readonly<Record<string, string>> = {
  string: "String",
  number: "Long",
  decimal: "java.math.BigDecimal",
  boolean: "Boolean",
  datetime: "java.time.Instant",
  enum: "String",
  reference: "String",
  asset: "String",
};

const typeJava = (t: string): string => JAVA[t] ?? "String";

const entete = (quoi: string): string =>
  `// GÉNÉRÉ PAR DERIBFY — NE PAS ÉDITER À LA MAIN.\n// ${quoi}\n`;

/** Le gabarit Maven. Spring Boot, et le strict nécessaire. */
const pom = (air: ProjectAir, groupe: string): string => `<?xml version="1.0" encoding="UTF-8"?>
<!-- GÉNÉRÉ PAR DERIBFY — NE PAS ÉDITER À LA MAIN. -->
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.3.5</version>
    <relativePath/>
  </parent>
  <groupId>${groupe}</groupId>
  <artifactId>${air.app.slug}-api</artifactId>
  <version>0.0.1</version>
  <name>${air.app.name} — API</name>
  <properties>
    <java.version>21</java.version>
  </properties>
  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <!-- H2 EN MÉMOIRE POUR DÉMARRER, PostgreSQL EN PRODUCTION.
         Les deux sont là : le serveur se lance sans rien installer, et bascule
         sur Postgres par une variable d'environnement. Sans H2, le
         propriétaire ne pourrait pas voir son serveur tourner avant d'avoir
         provisionné une base. -->
    <dependency>
      <groupId>com.h2database</groupId>
      <artifactId>h2</artifactId>
      <scope>runtime</scope>
    </dependency>
    <dependency>
      <groupId>org.postgresql</groupId>
      <artifactId>postgresql</artifactId>
      <scope>runtime</scope>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-test</artifactId>
      <scope>test</scope>
    </dependency>
  </dependencies>
  <build>
    <plugins>
      <plugin>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-maven-plugin</artifactId>
      </plugin>
    </plugins>
  </build>
</project>
`;

/** Le point d'entrée Spring. */
const application = (groupe: string, nom: string): string =>
  `package ${groupe};

${entete("Point d'entrée du serveur.")}
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ${nom}Application {
  public static void main(String[] args) {
    SpringApplication.run(${nom}Application.class, args);
  }
}
`;

/**
 * UNE ENTITÉ JPA PAR ENTITÉ DU DOCUMENT.
 *
 * `id` est une chaîne et non un nombre : le protocole du moteur transporte des
 * identifiants opaques (`ent_membres_row_7`), et un entier obligerait le
 * serveur à inventer une correspondance que personne ne lui a demandée.
 */
const entite = (groupe: string, e: ProjectAir["entities"][number]): string => {
  const nom = PASCAL(e.id);
  const lignes: string[] = [
    `package ${groupe}.modele;`,
    "",
    entete(
      `Entité « ${e.name} » — ${String(e.fields.length)} champs.` +
        (e.appendOnly === true ? " JOURNAL : ne se modifie ni ne s'efface." : ""),
    ),
    "import jakarta.persistence.*;",
    "",
    "@Entity",
    `@Table(name = "${e.name}")`,
    `public class ${nom} {`,
    "  @Id",
    "  private String id;",
  ];
  for (const f of e.fields) {
    if (f.sensitive === true) {
      // ── UN CHAMP SENSIBLE N'EST PAS STOCKÉ TEL QUEL.
      //
      // Le document le déclare `sensitive` : il est SAISI, jamais conservé.
      // L'émettre comme une colonne ordinaire le ferait écrire en clair dans
      // la base, et ressortir au premier `GET`.
      lignes.push(
        `  // 🔴 CHAMP SENSIBLE « ${f.name} » — NON ÉMIS COMME COLONNE.`,
        "  //    Le document le déclare saisi et jamais conservé. Le stocker ici",
        "  //    le ferait ressortir au premier GET. Si votre métier exige de le",
        "  //    garder, c'est un hachage qu'il faut écrire, pas ce champ.",
      );
      continue;
    }
    if (f.derived !== undefined) {
      lignes.push(
        `  // 🧮 CHAMP CALCULÉ « ${f.name} » — NON STOCKÉ.`,
        f.derived.kind === "versionne"
          ? `  //    Regle VERSIONNEE sur \`${f.derived.dateFieldId}\` — ${String(f.derived.versions.length)} version(s).`
          : f.derived.kind === "calcul"
          ? "  //    Calcul sur les champs de la ligne (expression du contrat)."
          : f.derived.kind === "bareme"
          ? `  //    Bareme sur \`${f.derived.fieldId}\` — ${String(f.derived.paliers.length)} palier(s), mode ${f.derived.mode}.`
          : `  //    ${f.derived.kind === "count" ? "Compte" : "Somme"} sur la relation \`${f.derived.relationId}\`.`,
        "  //    Le stocker le ferait diverger de ce dont il dérive, et personne",
        "  //    ne s'en apercevrait avant le décompte final.",
      );
      continue;
    }
    const t = typeJava(f.type);
    lignes.push(
      `  @Column(name = "${f.name}"${f.required ? ", nullable = false" : ""})`,
      `  private ${t} ${CAMEL(f.id)};`,
    );
  }
  lignes.push("");
  lignes.push("  public String getId() { return id; }");
  lignes.push("  public void setId(String v) { this.id = v; }");
  for (const f of e.fields) {
    if (f.sensitive === true || f.derived !== undefined) continue;
    const t = typeJava(f.type);
    const c = CAMEL(f.id);
    const P = c.charAt(0).toUpperCase() + c.slice(1);
    lignes.push(`  public ${t} get${P}() { return ${c}; }`);
    lignes.push(`  public void set${P}(${t} v) { this.${c} = v; }`);
  }
  lignes.push("}");
  lignes.push("");
  return lignes.join("\n");
};

/** Le dépôt JPA — une interface, Spring écrit le reste. */
/**
 * LES CALCULS QUI INTERROGENT CETTE ENTITÉ EN TANT QU'ENFANT.
 *
 * Une relation déclare `from`/`to`/`kind`, jamais la colonne — mais le champ
 * de l'enfant la déclare par `referencesEntityId`. La clé se résout donc sans
 * convention inventée. Elle ne se résout PAS quand l'enfant porte deux champs
 * vers le même parent : rien ne dit lequel compte, et deviner donnerait un
 * chiffre faux avec l'air d'être juste. Ce cas reste un refus explicite.
 */
/**
 * CE QUE LE SERVEUR A LE DROIT D'EXPOSER — EN JPQL.
 *
 * Même règle, même doctrine que la pile Node : 37 des 39 règles
 * d'autorisation du corpus sont des filtres sur les données, et le serveur
 * rendait TOUT. Les 2 qui désignent l'appelant ferment l'entité au lieu de la
 * servir sans filtre.
 *
 * Les valeurs viennent du DOCUMENT, pas d'un appelant. L'apostrophe est tout
 * de même doublée : un libellé qui en contient aurait cassé la requête, et le
 * défaut ne serait apparu qu'au démarrage.
 */
const visibiliteJpql = (
  air: ProjectAir,
  e: ProjectAir["entities"][number],
): { where: string } | { bloque: string; regle: string } => {
  const regles = air.rules.filter((r) => r.kind !== "validation" && r.entityId === e.id);
  const morceaux: string[] = [];
  const lit = (v: unknown): string =>
    typeof v === "boolean"
      ? v
        ? "true"
        : "false"
      : typeof v === "number"
        ? String(v)
        : `'${String(v).replace(/'/gu, "''")}'`;
  for (const r of regles) {
    for (const a2 of r.assertions) {
      const champ = e.fields.find((x) => x.id === a2.fieldId);
      if (champ === undefined || champ.derived !== undefined) continue;
      if (typeof a2.value === "string" && a2.value.startsWith("@")) {
        return { bloque: `la regle designe l'appelant (${a2.value})`, regle: r.id };
      }
      const c = `t.${CAMEL(champ.id)}`;
      switch (a2.operator) {
        case "eq":
          morceaux.push(`${c} = ${lit(a2.value)}`);
          break;
        case "neq":
          morceaux.push(`${c} <> ${lit(a2.value)}`);
          break;
        case "required":
          morceaux.push(`(${c} is not null and ${c} <> '')`);
          break;
        case "in": {
          const vs = Array.isArray(a2.value) ? (a2.value as unknown[]) : [a2.value];
          morceaux.push(`${c} in (${vs.map(lit).join(", ")})`);
          break;
        }
        default:
          return { bloque: `operateur « ${a2.operator} » non traduit`, regle: r.id };
      }
    }
  }
  return { where: morceaux.join(" and ") };
};

const calculsSur = (
  air: ProjectAir,
  enfant: ProjectAir["entities"][number],
): { parent: ProjectAir["entities"][number]; champ: ProjectAir["entities"][number]["fields"][number]; cle: string; somme: string; kind: "count" | "sum" }[] => {
  const out = [];
  for (const parent of air.entities) {
    for (const champ of parent.fields) {
      const d = champ.derived;
      if (d === undefined || (d.kind !== "count" && d.kind !== "sum")) continue;
      const rel = air.relations.find((r) => r.id === d.relationId);
      if (rel?.toEntityId !== enfant.id) continue;
      const cles = enfant.fields.filter((f) => f.referencesEntityId === rel.fromEntityId);
      const cle = cles[0];
      if (cles.length !== 1 || cle === undefined) continue;
      out.push({
        parent,
        champ,
        cle: CAMEL(cle.id),
        somme: d.kind === "sum" ? CAMEL(d.fieldId) : "",
        kind: d.kind,
      });
    }
  }
  return out;
};

const depot = (groupe: string, air: ProjectAir, e: ProjectAir["entities"][number]): string =>
  `package ${groupe}.depot;

${entete(`Dépôt de « ${e.name} ».`)}
import ${groupe}.modele.${PASCAL(e.id)};
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import org.springframework.data.repository.query.Param;

public interface ${PASCAL(e.id)}Depot extends JpaRepository<${PASCAL(e.id)}, String> {
${(() => {
  const v = visibiliteJpql(air, e);
  if ("bloque" in v || v.where === "") return "";
  return (
    `  // Visibilité imposée par les règles d'autorisation du document.\n` +
    `  @Query("select t from ${PASCAL(e.id)} t where ${v.where}")\n` +
    `  List<${PASCAL(e.id)}> visibles();\n`
  );
})()}
${calculsSur(air, e)
  .map(
    (c) =>
      `  // ${c.parent.name}.${c.champ.name} — ${c.kind === "count" ? "nombre" : "somme"} sur « ${e.name} ».\n` +
      `  @Query("select coalesce(${c.kind === "count" ? "count(t)" : `sum(t.${c.somme})`}, 0) from ${PASCAL(e.id)} t where t.${c.cle} = :id")\n` +
      `  Double ${CAMEL(c.champ.id)}Calcul(@Param("id") String id);`,
  )
  .join("\n")}
}
`;

/**
 * LE CONTRÔLEUR D'UNE ENTITÉ — et les refus que le document exige.
 *
 * Trois méthodes sur UNE ressource, comme le protocole du moteur le dit :
 * `GET` lit la collection, `POST` crée ou remplace, `DELETE` supprime la ligne.
 *
 * Ce qui fait la différence avec un CRUD écrit à la main, ce sont les REFUS —
 * et ils ne sont pas décoratifs :
 *
 *   · entité JOURNAL : `POST` sur une ligne existante et `DELETE` sont refusés
 *     en 409. Une comptabilité qui se réécrit ment dès la première correction ;
 *   · champ CALCULÉ : ignoré en écriture et rendu en lecture. L'accepter le
 *     ferait diverger de ce dont il dérive ;
 *   · TRANSITIONS : un passage d'état non déclaré est refusé en 409. Sans ça,
 *     un paiement en échec pourrait repasser « en attente ».
 */
/**
 * LES ENTITÉS ENFANT QU'UNE ENTITÉ INTERROGE POUR SES CHAMPS CALCULÉS.
 *
 * Dédoublonnées et ordonnées : deux champs calculés sur la même entité ne
 * doivent pas injecter deux fois le même dépôt.
 */
const enfantsCalcules = (air: ProjectAir, e: ProjectAir["entities"][number]): string[] => {
  const vus = new Set<string>();
  for (const f of e.fields) {
    const d = f.derived;
    if (d === undefined || (d.kind !== "count" && d.kind !== "sum")) continue;
    const rel = air.relations.find((r) => r.id === d.relationId);
    const enfant = rel === undefined ? undefined : air.entities.find((x) => x.id === rel.toEntityId);
    if (rel === undefined || enfant === undefined) continue;
    if (enfant.fields.filter((x) => x.referencesEntityId === rel.fromEntityId).length !== 1) continue;
    vus.add(enfant.id);
  }
  return [...vus];
};

const controleur = (groupe: string, air: ProjectAir, e: ProjectAir["entities"][number]): string => {
  const nom = PASCAL(e.id);
  const champsEtats = e.fields.filter((f) => f.transitions !== undefined);
  const calcules = e.fields.filter((f) => f.derived !== undefined);
  const l: string[] = [
    `package ${groupe}.api;`,
    "",
    entete(`Ressource « ${e.name} » — GET / POST / DELETE sur /air/v1/entities/${e.id}/rows.`),
    `import ${groupe}.modele.${nom};`,
    `import ${groupe}.depot.${nom}Depot;`,
    ...enfantsCalcules(air, e).map((c) => `import ${groupe}.depot.${PASCAL(c)}Depot;`),
    "import org.springframework.http.ResponseEntity;",
    "import org.springframework.web.bind.annotation.*;",
    "import java.util.*;",
    "",
    "@RestController",
    `@RequestMapping("/air/v1/entities/${e.id}/rows")`,
    `public class ${nom}Api {`,
    `  private final ${nom}Depot depot;`,
    // LES DÉPÔTS DES ENFANTS, injectés parce que les champs calculés les
    // interrogent. Spring les fournit ; les déclarer ici évite un symbole
    // qui n'existerait nulle part — ce que seul `mvn compile` aurait dit.
    ...enfantsCalcules(air, e).map((c) => `  private final ${PASCAL(c)}Depot ${CAMEL(c)}Depot;`),
    `  public ${nom}Api(${nom}Depot depot${enfantsCalcules(air, e)
      .map((c) => `, ${PASCAL(c)}Depot ${CAMEL(c)}Depot`)
      .join("")}) {`,
    "    this.depot = depot;",
    ...enfantsCalcules(air, e).map((c) => `    this.${CAMEL(c)}Depot = ${CAMEL(c)}Depot;`),
    "  }",
    "",
    "  // La réponse est le tableau des lignes `{id, values}` — la forme que",
    "  // l'application attend, et qu'elle ne négocie pas.",
    // ── LA LECTURE : FILTRÉE, OU REFUSÉE. JAMAIS OUVERTE.
    //
    // 37 des 39 règles d'autorisation du corpus sont des filtres sur les
    // données : elles entrent dans la requête. Les 2 qui désignent l'appelant
    // ne peuvent pas être appliquées — le serveur ne sait pas qui appelle —
    // et l'entité est alors FERMÉE. Une seule méthode est émise dans ce cas :
    // émettre aussi le corps normal, même sous un autre chemin, aurait ouvert
    // une porte dérobée rendant tout sans filtre.
    ...((): string[] => {
      const vj = visibiliteJpql(air, e);
      if ("bloque" in vj) {
        return [
          "  @GetMapping",
          "  public ResponseEntity<List<Map<String, Object>>> lire() {",
          "    return ResponseEntity.status(403).body(List.of(Map.of(",
          `        "error", "AIR_VISIBILITE_INAPPLICABLE",`,
          `        "regle", "${vj.regle}",`,
          `        "message", "${vj.bloque.replace(/"/gu, "'")}")));`,
          "  }",
        ];
      }
      return [
        "  @GetMapping",
        "  public ResponseEntity<List<Map<String, Object>>> lire() {",
        "    List<Map<String, Object>> sortie = new ArrayList<>();",
        "    Set<String> nonCalcules = new LinkedHashSet<>();",
        `    for (${nom} x : ${vj.where === "" ? "depot.findAll()" : "depot.visibles()"}) sortie.add(enLigne(x, nonCalcules));`,
        "    return avecEnTete(ResponseEntity.ok(), nonCalcules).body(sortie);",
        "  }",
      ];
    })(),
    "",
    "  @PostMapping",
    "  public ResponseEntity<?> ecrire(@RequestBody Map<String, Object> corps) {",
    "    Object brutId = corps.get(\"id\");",
    "    String id = brutId == null ? UUID.randomUUID().toString() : String.valueOf(brutId);",
    `    Optional<${nom}> existante = depot.findById(id);`,
  ];
  if (e.appendOnly === true) {
    l.push(
      "    // ── JOURNAL : UNE LIGNE ÉCRITE NE SE RÉÉCRIT PAS.",
      "    //",
      "    // Le document déclare cette entité `appendOnly`. La seule correction",
      "    // admise est une ligne NOUVELLE qui annule la première — ce que la",
      "    // comptabilité appelle une contre-passation. Accepter la réécriture",
      "    // ferait mentir le journal dès la première erreur corrigée.",
      "    if (existante.isPresent()) {",
      "      return ResponseEntity.status(409).body(Map.of(",
      `          "error", "AIR_JOURNAL_REECRITURE",`,
      `          "message", "« ${e.name} » est un journal : une ligne existante ne se réécrit pas"));`,
      "    }",
    );
  }
  for (const f of champsEtats) {
    const paires = (f.transitions ?? []).map((t) => `"${t.from}>${t.to}"`).join(", ");
    const initial = (f.enumValues ?? [])[0] ?? "";
    l.push(
      `    // ── ÉTATS DE « ${f.name} » : les seuls passages déclarés.`,
      "    //",
      "    // Une énumération liste des valeurs et ne dit rien de leur ordre.",
      "    // Sans ce refus, un paiement en échec pourrait repasser en attente.",
      `    Object nouvel${PASCAL(f.id)} = corps.get("${f.name}");`,
      `    if (existante.isPresent() && nouvel${PASCAL(f.id)} != null) {`,
      `      String avant = existante.get().get${PASCAL(f.id)}();`,
      `      String apres = String.valueOf(nouvel${PASCAL(f.id)});`,
      `      if (avant != null && !avant.equals(apres)`,
      `          && !Set.of(${paires}).contains(avant + ">" + apres)) {`,
      "        return ResponseEntity.status(409).body(Map.of(",
      `            "error", "AIR_TRANSITION_INTERDITE",`,
      `            "message", "« " + avant + " » ne mène pas à « " + apres + " »"));`,
      "      }",
      "    }",
      `    // État initial déclaré par le document : « ${initial} ».`,
    );
  }
  l.push(
    `    ${nom} x = existante.orElseGet(${nom}::new);`,
    "    x.setId(id);",
    "    appliquer(x, corps);",
    "    // LES RÈGLES DU DOCUMENT, AVANT D'ÉCRIRE.",
    "    //",
    "    // Sur la ligne QUI SERA enregistrée, pas sur le corps de la requête :",
    "    // une règle peut être tenue par un champ que la requête ne mentionne",
    "    // pas. 422 : la requête est comprise, c'est son contenu qui est",
    "    // refusé. Mêmes clés que la pile Node — une même règle ne doit pas",
    "    // s'appliquer différemment selon le serveur.",
    `    Map<String, String> violation = Validation.verifier${PASCAL(e.id)}(aValider(x));`,
    "    if (violation != null) {",
    "      return ResponseEntity.status(422).body(Map.of(",
    "          \"error\", \"AIR_REGLE_VIOLEE\",",
    "          \"regle\", violation.get(\"regle\"),",
    "          \"message\", violation.get(\"message\")));",
    "    }",
    "    depot.save(x);",
    "    Set<String> nonCalcules = new LinkedHashSet<>();",
    "    Map<String, Object> ligne = enLigne(x, nonCalcules);",
    "    return avecEnTete(ResponseEntity.ok(), nonCalcules).body(ligne);",
    "  }",
    "",
  );
  if (e.appendOnly === true) {
    l.push(
      "  // ── AUCUNE SUPPRESSION DANS UN JOURNAL.",
      "  //",
      "  // L'application ne propose déjà pas ce geste ; un serveur qui",
      "  // l'accepterait le rendrait atteignable par tout autre chemin.",
      "  @DeleteMapping(\"/{id}\")",
      "  public ResponseEntity<?> supprimer(@PathVariable String id) {",
      "    return ResponseEntity.status(409).body(Map.of(",
      `        "error", "AIR_JOURNAL_SUPPRESSION",`,
      `        "message", "« ${e.name} » est un journal : rien ne s'y efface"));`,
      "  }",
      "",
    );
  } else {
    l.push(
      "  @DeleteMapping(\"/{id}\")",
      "  public ResponseEntity<?> supprimer(@PathVariable String id) {",
      "    depot.deleteById(id);",
      "    return ResponseEntity.noContent().build();",
      "  }",
      "",
    );
  }
  // ── LA LECTURE D'UNE LIGNE, CHAMPS CALCULÉS COMPRIS.
  l.push(
    "  // ── UN CALCUL NON ÉCRIT NE DOIT PAS RENDRE LA LIGNE ILLISIBLE.",
    "  //",
    "  // Mesuré en DÉMARRANT le serveur : `Calculs` lève tant que le",
    "  // propriétaire ne l'a pas écrit — c'est voulu, un serveur qui rendrait",
    "  // silencieusement 0 mentirait. Mais la première version laissait",
    "  // l'exception remonter : la ligne était ENREGISTRÉE et toute lecture",
    "  // répondait 500. Il ne pouvait même pas voir ses données en attendant.",
    "  //",
    "  // Le champ est donc ABSENT de la réponse, et l'en-tête",
    "  // `X-Air-Non-Calcule` nomme ce qui reste à écrire. Absent n'est pas",
    "  // faux : c'est exactement ce que le serveur sait dire.",
    `  private Map<String, Object> enLigne(${nom} x, Set<String> nonCalcules) {`,
    "    Map<String, Object> v = new LinkedHashMap<>();",
  );
  for (const f of e.fields) {
    if (f.sensitive === true) {
      l.push(`    // « ${f.name} » est SENSIBLE : il ne ressort jamais.`);
      continue;
    }
    if (f.derived !== undefined) {
      const d = f.derived;
      const rel =
        d.kind === "count" || d.kind === "sum"
          ? air.relations.find((r) => r.id === d.relationId)
          : undefined;
      const enfant =
        rel === undefined ? undefined : air.entities.find((x) => x.id === rel.toEntityId);
      const cles =
        rel === undefined || enfant === undefined
          ? []
          : enfant.fields.filter((x) => x.referencesEntityId === rel.fromEntityId);
      if (enfant !== undefined && cles.length === 1) {
        // LE CALCUL EST FAIT PAR LA BASE, via le dépôt de l'enfant. Il
        // n'était un trou que tant que l'émetteur ignorait les tables ; il
        // les connaît, et la colonne de liaison est déclarée.
        l.push(
          `    // « ${f.name} » est CALCULÉ sur « ${enfant.name} », par la base.`,
          `    v.put("${f.name}", ${CAMEL(enfant.id)}Depot.${CAMEL(f.id)}Calcul(x.getId()));`,
        );
        continue;
      }
      l.push(
        `    // « ${f.name} » est CALCULÉ : voir Calculs.${CAMEL(f.id)}().`,
        // `Calculs` vit dans le MÊME paquet que ce contrôleur : l'appel est
        // simple. La première version préfixait par le dernier segment du
        // groupe (`tontineCalculs.…`) — un symbole qui n'existe nulle part, et
        // que seul un vrai `mvn compile` pouvait dire.
        `    try { v.put("${f.name}", Calculs.${CAMEL(f.id)}(x.getId())); }`,
        `    catch (UnsupportedOperationException e) { nonCalcules.add("${f.name}"); }`,
      );
      continue;
    }
    l.push(`    v.put("${f.name}", x.get${PASCAL(f.id)}());`);
  }
  l.push(
    "    Map<String, Object> ligne = new LinkedHashMap<>();",
    "    ligne.put(\"id\", x.getId());",
    "    ligne.put(\"values\", v);",
    "    return ligne;",
    "  }",
    "",
    "  // L'en-tête n'apparaît QUE s'il reste quelque chose à écrire. Un",
    "  // en-tête vide sur chaque réponse deviendrait du bruit qu'on cesse de",
    "  // lire — et c'est précisément le jour où il compterait.",
    `  /**`,
    `   * LA LIGNE TELLE QU'ELLE SERA ENREGISTRÉE, pour les règles.`,
    `   *`,
    `   * Clés = identifiant du champ sans son préfixe — la MÊME convention`,
    `   * que la pile Node. Les champs calculés n'y sont pas : ils ne`,
    `   * s'écrivent pas. Les champs sensibles non plus : ils ne sont pas`,
    `   * conservés, donc la ligne enregistrée ne les porte pas.`,
    `   */`,
    `  private Map<String, Object> aValider(${nom} x) {`,
    "    Map<String, Object> v = new LinkedHashMap<>();",
    ...e.fields
      .filter((f) => f.derived === undefined && f.sensitive !== true)
      .map((f) => `    v.put("${f.id.replace(/^fld_/u, "")}", x.get${PASCAL(f.id)}());`),
    "    return v;",
    "  }",
    "",
    "  private static <T> ResponseEntity.BodyBuilder avecEnTete(",
    "      ResponseEntity.BodyBuilder b, Set<String> nonCalcules) {",
    "    if (nonCalcules.isEmpty()) return b;",
    "    return b.header(\"X-Air-Non-Calcule\", String.join(\",\", nonCalcules));",
    "  }",
    "",
    `  private void appliquer(${nom} x, Map<String, Object> c) {`,
  );
  for (const f of e.fields) {
    if (f.sensitive === true) {
      l.push(`    // « ${f.name} » SENSIBLE : saisi, jamais conservé.`);
      continue;
    }
    if (f.derived !== undefined) {
      l.push(
        `    // « ${f.name} » est CALCULÉ : toute écriture est IGNORÉE.`,
        "    //    L'accepter le ferait diverger de ce dont il dérive.",
      );
      continue;
    }
    const t = typeJava(f.type);
    const conv =
      t === "String"
        ? `String.valueOf(c.get("${f.name}"))`
        : t === "Long"
          ? `Long.valueOf(String.valueOf(c.get("${f.name}")))`
          : t === "Boolean"
            ? `Boolean.valueOf(String.valueOf(c.get("${f.name}")))`
            : t === "java.math.BigDecimal"
              ? `new java.math.BigDecimal(String.valueOf(c.get("${f.name}")))`
              : `java.time.Instant.parse(String.valueOf(c.get("${f.name}")))`;
    l.push(`    if (c.get("${f.name}") != null) x.set${PASCAL(f.id)}(${conv});`);
  }
  l.push("  }", "}", "");
  void calcules;
  void air;
  return l.join("\n");
};

/**
 * LES CINQ OPÉRATIONS DE SESSION — et les droits reviennent AVEC l'identité.
 *
 * Ce n'est pas un détail d'implémentation. Les demander par un second appel
 * ferait exister un instant où l'identité est établie et les droits inconnus.
 * L'accès étant FERMÉ PAR DÉFAUT, cet instant afficherait un refus à quelqu'un
 * qui a le droit — le défaut fondateur que le contrôle d'accès existe pour
 * empêcher, mesuré dans un système en production.
 *
 * ⚠️ CE SQUELETTE NE VÉRIFIE AUCUN MOT DE PASSE. Il rend la FORME exacte que
 * l'application attend, et laisse la vérification au propriétaire — écrire ici
 * un hachage « par défaut » donnerait l'illusion d'une authentification.
 */
const session = (groupe: string, air: ProjectAir): string => {
  const droits = (air.access?.rights ?? []).map((r) => `"${r.id}"`).join(", ");
  return `package ${groupe}.api;

${entete("Session — 5 opérations sur 2 ressources, protocole du moteur.")}
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/air/v1")
public class SessionApi {

  // Les droits que le document déclare. Le serveur doit rendre CEUX de la
  // personne connectée — la liste complète est ici pour que rien ne soit
  // inventé côté serveur.
  static final List<String> DROITS_DECLARES = List.of(${droits});

  @PostMapping("/session")
  public ResponseEntity<?> ouvrir(@RequestBody Map<String, String> corps) {
    // 🔴 À ÉCRIRE : vérifier le mot de passe.
    //    Rendre 401 si l'identité n'est pas établie. Ne jamais dire SI c'est
    //    l'adresse ou le mot de passe qui est faux — ça énumère les comptes.
    //
    //    La réponse doit porter \`userId\` ET \`rights\` dans le MÊME corps.
    throw new UnsupportedOperationException("AIR_SESSION_OUVRIR_A_ECRIRE");
  }

  @GetMapping("/session")
  public Map<String, Object> etat() {
    // Appelé au démarrage de l'application. Sans lui, elle redemande le mot de
    // passe à chaque ouverture, à quelqu'un dont la session est valide.
    return Map.of();
  }

  @DeleteMapping("/session")
  public ResponseEntity<?> fermer() {
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/accounts")
  public ResponseEntity<?> creerCompte(@RequestBody Map<String, String> corps) {
    // Rendre \`pendingConfirmation: true\` si le compte est créé SANS ouvrir de
    // session — sinon une inscription réussie est indiscernable d'un échec.
    throw new UnsupportedOperationException("AIR_SESSION_COMPTE_A_ECRIRE");
  }

  @PostMapping("/password-resets")
  public ResponseEntity<?> reinitialiser(@RequestBody Map<String, String> corps) {
    // ── 202 EST LA BONNE REPONSE QUAND L'ENVOI A LIEU. ICI, IL N'A PAS LIEU.
    //
    // Le principe reste juste : rendre l'ACCEPTATION de l'envoi et jamais
    // l'existence du compte, car reveler qu'une adresse est inscrite est une
    // fuite. Mais rien n'envoie encore ce courriel. Un 202 disait donc a
    // l'application « c'est parti », et l'ecran affichait « verifiez votre
    // boite » pour un message qui ne partira jamais. Le client lit tout 2xx
    // comme une acceptation : il ne pouvait pas le savoir.
    //
    // 501 et un code : l'ecran affiche un echec, ce qui est la verite. Les
    // deux autres operations de session refusent deja ainsi.
    return ResponseEntity.status(501).body(Map.of(
        "error", "AIR_SESSION_REINITIALISER_A_ECRIRE"));
  }
}
`;
};

/** L'expression du contrat, traduite en Java. `null` se propage : une
 *  valeur manquante ne doit pas produire un chiffre qui a l'air juste. */
function javaExpr(e: unknown): string {
  const n = e as {
    kind?: string; fieldId?: string; valeur?: number; de?: string; a?: string;
    op?: string; gauche?: unknown; droite?: unknown;
  };
  if (n.kind === "constante") return `Double.valueOf(${String(n.valeur)}d)`;
  if (n.kind === "champ") return `nb(ligne.get(${JSON.stringify(n.fieldId)}))`;
  if (n.kind === "jours") {
    return `jours(ligne.get(${JSON.stringify(n.de)}), ligne.get(${JSON.stringify(n.a)}))`;
  }
  const g = javaExpr(n.gauche);
  const d = javaExpr(n.droite);
  return n.op === "/" ? `div(${g}, ${d})` : `op(${g}, ${d}, '${String(n.op)}')`;
}

/** Les champs que le document déclare CALCULÉS — à calculer, pas à stocker. */
const calculs = (groupe: string, air: ProjectAir): string => {
  const l: string[] = [
    `package ${groupe}.api;`,
    "",
    entete("Champs CALCULÉS — dérivés d'autres lignes, jamais stockés."),
    "import org.springframework.stereotype.Component;",
    "",
    "@Component",
    "public final class Calculs {",
  ];
  // LE TYPE DU PALIER, emis UNIQUEMENT si un bareme l'utilise : une classe
  // inutilisee dans un projet livre est du bruit que le client doit lire.
  // LES AIDES DU CALCUL, emises UNIQUEMENT si une expression les utilise.
  // `null` se propage : une valeur manquante ne doit pas produire un
  // chiffre qui a l'air juste, et une division par zero n'a pas de
  // resultat — surtout pas l'infini, qui s'affiche et contamine.
  if (air.entities.some((x) => x.fields.some((y) => y.derived?.kind === "calcul"))) {
    l.push(
      "",
      "  static Double nb(Object v) {",
      "    return (v instanceof Number num && Double.isFinite(num.doubleValue()))",
      "      ? Double.valueOf(num.doubleValue()) : null;",
      "  }",
      "  static Double op(Double a, Double b, char o) {",
      "    if (a == null || b == null) return null;",
      "    return o == '+' ? a + b : o == '-' ? a - b : a * b;",
      "  }",
      "  static Double div(Double a, Double b) {",
      "    return (a == null || b == null || b == 0d) ? null : a / b;",
      "  }",
      "  static Double jours(Object de, Object a) {",
      "    java.time.LocalDate d = jour(de), f = jour(a);",
      "    return (d == null || f == null) ? null",
      "      : Double.valueOf(java.time.temporal.ChronoUnit.DAYS.between(d, f));",
      "  }",
      "  private static java.time.LocalDate jour(Object v) {",
      "    if (!(v instanceof CharSequence cs) || cs.length() < 10) return null;",
      "    try { return java.time.LocalDate.parse(cs.subSequence(0, 10)); }",
      "    catch (java.time.format.DateTimeParseException e) { return null; }",
      "  }",
    );
  }
  if (air.entities.some((x) => x.fields.some((y) => y.derived?.kind === "bareme"))) {
    l.push(
      "",
      "  /** Un palier du bareme — borne INCLUSIVE, `null` pour le dernier. */",
      "  private record Palier(Double jusqua, double prixUnitaire) {}",
    );
  }
  let n = 0;
  for (const e of air.entities) {
    for (const f of e.fields) {
      const d = f.derived;
      if (d === undefined) continue;
      n += 1;
      // ── UNE REGLE VERSIONNEE RESTE A ECRIRE COTE SERVEUR (1.37.0).
      //
      // Le choix de version et ses regles sont ECRITS dans le projet
      // TypeScript (`lib/calculs`), ou l'application s'en sert vraiment.
      // Cote Java, le contrat les DIT — periodes et sources comprises —
      // sans les reimplementer : deux transcriptions de la meme regle
      // finiraient par diverger, et c'est l'argent du client qui en
      // paierait l'ecart.
      if (d.kind === "versionne") {
        l.push(
          "",
          `  /** ${e.name}.${f.name} — regle versionnee sur \`${d.dateFieldId}\`. */`,
          ...d.versions.map(
            (v) =>
              `  //  ${v.depuis ?? "depuis toujours"} → ${v.jusqua ?? "en cours"}` +
              `  [${v.regle.kind}]${v.source === undefined ? "" : `  source : ${v.source}`}`,
          ),
          "  //  Le calcul fait foi dans `lib/calculs` du projet emis.",
        );
        continue;
      }

      // ── LE CALCUL AUSSI S'ECRIT ENTIEREMENT (1.36.0). Il ne lit que la
      // ligne qu'il calcule : aucune requete, donc aucun trou a combler.
      if (d.kind === "calcul") {
        l.push(
          "",
          `  /** ${e.name}.${f.name} — expression sur les champs de la ligne. */`,
          `  public static Double ${CAMEL(f.id)}(java.util.Map<String, Object> ligne) {`,
          `    return ${javaExpr(d.expression)};`,
          "  }",
        );
        continue;
      }

      // ── LE BAREME S'ECRIT ENTIEREMENT, LUI. Il ne regarde aucune autre
      // ligne : c'est une fonction du champ qui porte la quantite. La ou
      // `sum` et `count` dependent de la base et laissent un trou, celui-ci
      // sort compilable et juste — les nombres du document apparaissent
      // dans la source, relisibles sans ouvrir le contrat.
      if (d.kind === "bareme") {
        const paliers = d.paliers
          .map(
            (p) =>
              `      new Palier(${p.jusqua === undefined ? "null" : `${String(p.jusqua)}d`}, ${String(p.prixUnitaire)}d),`,
          )
          .join("\n");
        const corps =
          d.mode === "global"
            ? [
                "    Palier choisi = null;",
                "    for (Palier p : paliers) { if (p.jusqua != null && q <= p.jusqua) { choisi = p; break; } }",
                "    if (choisi == null) choisi = paliers[paliers.length - 1];",
                "    return q * choisi.prixUnitaire + FRAIS;",
              ]
            : [
                "    double reste = q, bas = 0d, total = 0d;",
                "    for (Palier p : paliers) {",
                "      if (reste <= 0) break;",
                "      double haut = p.jusqua == null ? Double.MAX_VALUE : p.jusqua;",
                "      double dans = Math.min(reste, haut - bas);",
                "      total += dans * p.prixUnitaire; reste -= dans; bas = haut;",
                "    }",
                "    return total + FRAIS;",
              ];
        l.push(
          "",
          `  /** ${e.name}.${f.name} — bareme sur ${d.fieldId}, mode ${d.mode}. */`,
          `  public static double ${CAMEL(f.id)}(double quantite) {`,
          `    final double FRAIS = ${String(d.fraisFixes)}d;`,
          "    final Palier[] paliers = {",
          paliers,
          "    };",
          "    double q = (Double.isFinite(quantite) && quantite > 0) ? quantite : 0d;",
          "    if (q == 0d) return FRAIS;",
          ...corps,
          "  }",
        );
        continue;
      }
      const rel = air.relations.find((r) => r.id === d.relationId);
      const quoi =
        d.kind === "count"
          ? `le NOMBRE de lignes de \`${rel?.toEntityId ?? "?"}\``
          // `fieldId` est REQUIS sur la branche `sum` de l'union discriminée :
          // le repli `?? "?"` était du code qu'aucune entrée ne peut atteindre,
          // et le lint a raison de refuser une garde qui ne garde rien.
          : `la SOMME de \`${d.fieldId}\` sur les lignes de \`${rel?.toEntityId ?? "?"}\``;
      l.push(
        "",
        `  /**`,
        `   * ${e.name}.${f.name} = ${quoi}`,
        `   * liées par \`${d.relationId}\`.`,
        "   *",
        "   * 🔴 À ÉCRIRE. Le document dit QUOI calculer ; la requête dépend de",
        "   *    votre base. Rendre 0 par défaut serait pire que lever : une",
        "   *    cagnotte à zéro ressemble à une cagnotte vide.",
        "   */",
        `  public static Object ${CAMEL(f.id)}(String idParent) {`,
        `    throw new UnsupportedOperationException("AIR_CALCUL_A_ECRIRE:${f.id}");`,
        "  }",
      );
    }
  }
  if (n === 0) l.push("  // Aucun champ calculé dans ce document.");
  l.push("}", "");
  return l.join("\n");
};

/**
 * CE QUE LE DOCUMENT DÉCLARE INEXPRIMABLE — nommé, vide, et impossible à
 * oublier.
 *
 * ── POURQUOI CES MÉTHODES EXISTENT SANS CORPS.
 *
 * Chacune de ces exigences a besoin d'une HORLOGE ou divise une somme entre
 * des personnes. Les écrire à la place du propriétaire reviendrait à décider,
 * dans un générateur, du sort de l'argent de ses membres.
 *
 * Les OMETTRE serait pire : il découvrirait le manque le jour de la première
 * séance. Elles sont donc là, nommées d'après son propre cahier des charges,
 * et elles LÈVENT — un serveur qui rend silencieusement 0 est un serveur qui
 * ment.
 */
/**
 * LES RÈGLES DU DOCUMENT, FAITES RESPECTER PAR LE SERVEUR JAVA.
 *
 * `ReglesMetier` traite un AUTRE sujet — les exigences que le document
 * déclare hors de sa portée. Les `rules` du document, elles, n'étaient
 * appliquées nulle part côté Java. Mesuré au corpus : 160 règles de
 * validation sur 31 documents, zéro appliquée.
 *
 * Les clés de la ligne examinée sont les mêmes que côté Node — l'identifiant
 * du champ sans son préfixe. Deux conventions auraient voulu dire que la même
 * règle s'applique différemment selon le serveur.
 *
 * LES RÈGLES D'AUTORISATION NE SONT PAS ICI : elles disent QUI a le droit, et
 * ce contrat ne transporte pas l'identité de l'appelant jusqu'ici. Les
 * appliquer en devinant l'appelant donnerait l'illusion d'un contrôle
 * d'accès, ce qui est pire que de ne pas en avoir.
 */
const validation = (groupe: string, air: ProjectAir): string => {
  const col = (id: string): string => id.replace(/^fld_/u, "");
  const l: string[] = [
    `package ${groupe}.api;`,
    "",
    entete(
      `Règles de validation — ${String(air.rules.filter((r) => r.kind === "validation").length)} du document, vérifiées AVANT écriture.`,
    ),
    "import java.util.*;",
    "import java.util.regex.Pattern;",
    "",
    "public final class Validation {",
    "  private Validation() {}",
    "",
    "  // Une comparaison de grandeur n'a de sens que sur un nombre. Rendre",
    "  // `null` fait REFUSER la règle au lieu de la laisser passer : une",
    "  // comparaison avec NaN serait fausse en silence.",
    "  private static Double nombre(Object v) {",
    "    if (v == null) return null;",
    "    if (v instanceof Number n) return n.doubleValue();",
    "    try { return Double.valueOf(String.valueOf(v).trim()); }",
    "    catch (NumberFormatException e) { return null; }",
    "  }",
    "",
    "  private static boolean rempli(Object v) {",
    "    return v != null && !String.valueOf(v).isEmpty();",
    "  }",
    "",
    "  private static Map<String, String> echec(String regle, String message) {",
    "    return Map.of(\"regle\", regle, \"message\", message);",
    "  }",
    "",
  ];
  for (const e of air.entities) {
    const miennes = air.rules.filter((r) => r.kind === "validation" && r.entityId === e.id);
    l.push(
      `  /** Les règles de « ${e.name} ». Rend null si la ligne les tient toutes. */`,
      `  public static Map<String, String> verifier${PASCAL(e.id)}(Map<String, Object> ligne) {`,
    );
    for (const r of miennes) {
      for (const a2 of r.assertions) {
        const champ = e.fields.find((x) => x.id === a2.fieldId);
        if (champ === undefined) {
          l.push(`    // « ${a2.fieldId} » n'est pas un champ de cette entité : ignorée.`);
          continue;
        }
        if (champ.sensitive === true) {
          l.push(
            `    // « ${champ.name} » est SENSIBLE : jamais conservé, donc absent de`,
            `    // la ligne enregistrée. L'écran le vérifie à la saisie.`,
          );
          continue;
        }
        const c = JSON.stringify(col(champ.id));
        const v = JSON.stringify(String(a2.value ?? ""));
        const liste =
          Array.isArray(a2.value)
            ? (a2.value as unknown[]).map((x) => JSON.stringify(String(x))).join(", ")
            : v;
        const ech = `return echec(${JSON.stringify(r.id)}, ${JSON.stringify(r.description)});`;
        const cond = (() => {
          switch (a2.operator) {
            case "required":
              return `!rempli(ligne.get(${c}))`;
            case "eq":
              return `rempli(ligne.get(${c})) && !String.valueOf(ligne.get(${c})).equals(${v})`;
            case "neq":
              return `rempli(ligne.get(${c})) && String.valueOf(ligne.get(${c})).equals(${v})`;
            case "gt":
              return `rempli(ligne.get(${c})) && (nombre(ligne.get(${c})) == null || nombre(ligne.get(${c})) <= Double.parseDouble(${v}))`;
            case "gte":
              return `rempli(ligne.get(${c})) && (nombre(ligne.get(${c})) == null || nombre(ligne.get(${c})) < Double.parseDouble(${v}))`;
            case "lte":
              return `rempli(ligne.get(${c})) && (nombre(ligne.get(${c})) == null || nombre(ligne.get(${c})) > Double.parseDouble(${v}))`;
            case "matches":
              return `rempli(ligne.get(${c})) && !Pattern.matches(${v}, String.valueOf(ligne.get(${c})))`;
            case "in":
              return `rempli(ligne.get(${c})) && !List.of(${liste}).contains(String.valueOf(ligne.get(${c})))`;
            default:
              return "";
          }
        })();
        if (cond === "") {
          l.push(
            `    // Opérateur « ${a2.operator} » non couvert : on REFUSE la règle`,
            `    // plutôt que de l'ignorer — une règle ignorée ne protège plus.`,
            `    throw new UnsupportedOperationException("AIR_REGLE_A_ECRIRE:${r.id}");`,
          );
          continue;
        }
        l.push(
          `    // ${r.description}`,
          `    if (${cond}) ${ech}`,
        );
      }
    }
    l.push("    return null;", "  }", "");
  }
  l.push("}", "");
  return l.join("\n");
};

const reglesMetier = (groupe: string, air: ProjectAir): string => {
  const absents = (air.intent?.needs ?? []).filter(
    (b) => b.resolution.kind === "unexpressible",
  );
  const l: string[] = [
    `package ${groupe}.api;`,
    "",
    entete(
      `Règles métier — ${String(absents.length)} exigences que le document déclare hors de sa portée.`,
    ),
    "import org.springframework.stereotype.Component;",
    "",
    "@Component",
    "public final class ReglesMetier {",
  ];
  absents.forEach((b, i) => {
    const methode = "regle" + String(i + 1);
    l.push(
      "",
      "  /**",
      `   * ${b.statement}`,
      "   *",
      `   * Pourquoi le serveur et pas l'application :`,
      `   * ${(b.resolution as { reason?: string }).reason ?? ""}`,
      "   */",
      `  public static Object ${methode}(Object... entrees) {`,
      `    throw new UnsupportedOperationException("AIR_REGLE_A_ECRIRE:${b.id}");`,
      "  }",
    );
  });
  if (absents.length === 0) l.push("  // Le document ne déclare aucune exigence hors de portée.");
  l.push("}", "");
  return l.join("\n");
};

/**
 * UN SLUG N'EST PAS UN NOM DE BASE DE DONNÉES.
 *
 * Le nom de base était le slug, recopié tel quel. Un slug accepte le tiret, et
 * le propriétaire a demandé « Tontine.SY » — avec un point. Les deux cassent :
 * en PostgreSQL, `tontine-sy` et `Tontine.SY` ne sont pas des identifiants
 * valides sans guillemets, et un identifiant cité doit l'être PARTOUT, à la
 * virgule près, dans chaque requête et chaque script de migration. Le point
 * est pire encore : il sépare le schéma du nom.
 *
 * On ne refuse pas le nom choisi — il reste celui du PRODUIT. On refuse de le
 * recopier là où il ne peut pas vivre, et on en dérive un identifiant sûr :
 * minuscules, lettres, chiffres et tiret bas, jamais un chiffre en tête.
 *
 * Fait ici plutôt que dans ce seul document : toute application générée porte
 * le même risque, et une correction par application n'en est pas une.
 */
export const identifiantSql = (slug: string): string => {
  const propre = slug
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return propre === "" || /^[0-9]/.test(propre) ? "app_" + propre : propre;
};

/** La configuration — H2 pour démarrer, Postgres par l'environnement. */
const configuration = (air: ProjectAir): string => `# GÉNÉRÉ PAR DERIBFY — NE PAS ÉDITER À LA MAIN.
#
# AUCUN SECRET ICI. L'adresse de la base, l'utilisateur et le mot de passe
# viennent de l'ENVIRONNEMENT. Les écrire dans ce fichier les ferait entrer
# dans votre dépôt git, et un secret versionné ne redevient jamais secret.
#
# Par défaut, une base H2 EN MÉMOIRE : le serveur démarre sans rien installer,
# et vous voyez votre API répondre tout de suite. Les données disparaissent à
# l'arrêt — c'est voulu, ce n'est pas une base de production.
spring:
  application:
    name: ${air.app.slug}-api
  datasource:
    url: \${DB_URL:jdbc:h2:mem:${identifiantSql(air.app.slug)};DB_CLOSE_DELAY=-1}
    username: \${DB_USER:sa}
    password: \${DB_PASSWORD:}
  jpa:
    hibernate:
      ddl-auto: \${DB_DDL:update}
    open-in-view: false
server:
  port: \${PORT:8080}
`;

const lisezMoi = (air: ProjectAir): string => {
  const absents = (air.intent?.needs ?? []).filter((b) => b.resolution.kind === "unexpressible");
  const journaux = air.entities.filter((e) => e.appendOnly === true).map((e) => e.name);
  return `# Serveur de « ${air.app.name} »

Généré par Deribfy depuis le document AIR. Spring Boot 3, Java 21.

## Démarrer

\`\`\`sh
mvn spring-boot:run
\`\`\`

Le serveur écoute sur \`:8080\` avec une base H2 **en mémoire** — rien à
installer pour le voir répondre. Les données disparaissent à l'arrêt.

Pour PostgreSQL, trois variables d'environnement suffisent :

\`\`\`sh
DB_URL=jdbc:postgresql://… DB_USER=… DB_PASSWORD=… mvn spring-boot:run
\`\`\`

## Ce qui est DÉJÀ écrit

- les ${String(air.entities.length)} ressources de données, avec \`GET\` / \`POST\` / \`DELETE\` ;
${journaux.length === 0 ? "" : `- les refus des entités JOURNAL (${journaux.join(", ")}) : une ligne écrite ne se réécrit ni ne s'efface ;
`}- les refus de TRANSITIONS d'états non déclarées ;
- les champs SENSIBLES, qui ne sont ni stockés ni rendus ;
- les champs CALCULÉS, qui ne s'acceptent pas en écriture.

## Ce qui vous attend, et qui LÈVE si on l'oublie

Ces méthodes existent, portent votre énoncé, et jettent une exception tant
qu'elles ne sont pas écrites. Un serveur qui rendrait silencieusement \`0\`
serait un serveur qui ment.

- \`SessionApi\` — vérifier le mot de passe, rendre \`userId\` **et** \`rights\`
  dans la MÊME réponse ;
- \`Calculs\` — les champs dérivés ;
- \`ReglesMetier\` — ${String(absents.length)} exigences de votre cahier des charges :
${absents.map((b) => `  - ${b.statement}`).join("\n")}

## Ce que ce serveur ne décide pas

Aucune forme de jeton n'est imposée : mettez ce que vous voulez dans la
réponse de \`POST /air/v1/session\`, l'application le renvoie tel quel.
`;
};

export function enveloppeSpring(air: ProjectAir): EnveloppeBackend {
  const groupe = "app." + air.app.slug.replace(/-/g, "");
  const chemin = "src/main/java/" + groupe.replace(/\./g, "/");
  const nom = PASCAL(air.app.slug.replace(/-/g, "_"));
  const files = new Map<string, string>();
  files.set("pom.xml", pom(air, groupe));
  files.set(`${chemin}/${nom}Application.java`, application(groupe, nom));
  for (const e of air.entities) {
    files.set(`${chemin}/modele/${PASCAL(e.id)}.java`, entite(groupe, e));
    files.set(`${chemin}/depot/${PASCAL(e.id)}Depot.java`, depot(groupe, air, e));
    files.set(`${chemin}/api/${PASCAL(e.id)}Api.java`, controleur(groupe, air, e));
  }
  files.set(`${chemin}/api/SessionApi.java`, session(groupe, air));
  files.set(`${chemin}/api/Calculs.java`, calculs(groupe, air));
  files.set(`${chemin}/api/ReglesMetier.java`, reglesMetier(groupe, air));
  files.set(`${chemin}/api/Validation.java`, validation(groupe, air));
  files.set("src/main/resources/application.yml", configuration(air));
  files.set("LISEZ-MOI.md", lisezMoi(air));
  return { files };
}
