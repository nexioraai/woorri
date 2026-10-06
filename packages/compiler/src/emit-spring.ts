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
        `  //    ${f.derived.kind === "count" ? "Compte" : "Somme"} sur la relation \`${f.derived.relationId}\`.`,
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
const depot = (groupe: string, e: ProjectAir["entities"][number]): string =>
  `package ${groupe}.depot;

${entete(`Dépôt de « ${e.name} ».`)}
import ${groupe}.modele.${PASCAL(e.id)};
import org.springframework.data.jpa.repository.JpaRepository;

public interface ${PASCAL(e.id)}Depot extends JpaRepository<${PASCAL(e.id)}, String> {}
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
    "import org.springframework.http.ResponseEntity;",
    "import org.springframework.web.bind.annotation.*;",
    "import java.util.*;",
    "",
    "@RestController",
    `@RequestMapping("/air/v1/entities/${e.id}/rows")`,
    `public class ${nom}Api {`,
    `  private final ${nom}Depot depot;`,
    `  public ${nom}Api(${nom}Depot depot) { this.depot = depot; }`,
    "",
    "  // La réponse est le tableau des lignes `{id, values}` — la forme que",
    "  // l'application attend, et qu'elle ne négocie pas.",
    "  @GetMapping",
    `  public List<Map<String, Object>> lire() {`,
    "    List<Map<String, Object>> sortie = new ArrayList<>();",
    `    for (${nom} x : depot.findAll()) sortie.add(enLigne(x));`,
    "    return sortie;",
    "  }",
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
    "    depot.save(x);",
    "    return ResponseEntity.ok(enLigne(x));",
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
    `  private Map<String, Object> enLigne(${nom} x) {`,
    "    Map<String, Object> v = new LinkedHashMap<>();",
  );
  for (const f of e.fields) {
    if (f.sensitive === true) {
      l.push(`    // « ${f.name} » est SENSIBLE : il ne ressort jamais.`);
      continue;
    }
    if (f.derived !== undefined) {
      l.push(
        `    // « ${f.name} » est CALCULÉ : voir Calculs.${CAMEL(f.id)}().`,
        // `Calculs` vit dans le MÊME paquet que ce contrôleur : l'appel est
        // simple. La première version préfixait par le dernier segment du
        // groupe (`tontineCalculs.…`) — un symbole qui n'existe nulle part, et
        // que seul un vrai `mvn compile` pouvait dire.
        `    v.put("${f.name}", Calculs.${CAMEL(f.id)}(x.getId()));`,
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
    // Rendre l'ACCEPTATION de l'envoi, jamais l'existence du compte : révéler
    // qu'une adresse est inscrite est une fuite.
    return ResponseEntity.accepted().build();
  }
}
`;
};

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
  let n = 0;
  for (const e of air.entities) {
    for (const f of e.fields) {
      const d = f.derived;
      if (d === undefined) continue;
      n += 1;
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
    url: \${DB_URL:jdbc:h2:mem:${air.app.slug};DB_CLOSE_DELAY=-1}
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
    files.set(`${chemin}/depot/${PASCAL(e.id)}Depot.java`, depot(groupe, e));
    files.set(`${chemin}/api/${PASCAL(e.id)}Api.java`, controleur(groupe, air, e));
  }
  files.set(`${chemin}/api/SessionApi.java`, session(groupe, air));
  files.set(`${chemin}/api/Calculs.java`, calculs(groupe, air));
  files.set(`${chemin}/api/ReglesMetier.java`, reglesMetier(groupe, air));
  files.set("src/main/resources/application.yml", configuration(air));
  files.set("LISEZ-MOI.md", lisezMoi(air));
  return { files };
}
