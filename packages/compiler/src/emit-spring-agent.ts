/**
 * LA PARITÉ JAVA — IDENTITÉ, CONNECTEUR, AGENT.
 *
 * Mesure du 2026-10-13 : la pile `fastify` savait lire un appelant, appeler
 * une API déclarée et tenir la porte de l'agent. La pile `spring_boot` ne
 * savait RIEN de tout cela — zéro lecture de jeton, zéro connecteur, zéro
 * agent. Conséquence mesurée : côté Java, TOUTE règle de visibilité qui
 * désigne l'appelant rendait 403 pour toujours. Honnête — il refuse au lieu
 * de fuir — mais la fonction était indisponible.
 *
 * Et ce n'est pas théorique : `tontine`, l'application du propriétaire,
 * déclare `spring_boot`. Elle aurait eu un agent déclaré et aucun serveur
 * pour lui.
 *
 * ── AUCUNE DÉPENDANCE NOUVELLE, ET C'EST VÉRIFIABLE.
 *
 * `java.net.http.HttpClient` (JDK 11+), `javax.crypto.Mac`,
 * `MessageDigest.isEqual`, `java.util.Base64` : tout vient du JDK. Jackson
 * arrive déjà avec `spring-boot-starter-web`, que le `pom.xml` émet depuis
 * toujours. Le `pom.xml` n'est pas touché.
 *
 * ── LES MÊMES REFUS, AUX MÊMES ENDROITS, POUR LES MÊMES RAISONS.
 *
 * Ce fichier est le JUMEAU de `emit-connecteur.ts` et `emit-agent.ts`. Chaque
 * refus qu'ils portent est porté ici, et un test compare les deux piles refus
 * par refus : une parité affirmée dans un commentaire n'est pas une parité.
 */
import type { ProjectAir } from "@deribfy/air-schema";

type Api = NonNullable<ProjectAir["apis"]>[number];
type Operation = Api["operations"][number];

/**
 * LE NOM D'UNE CLASSE JAVA POUR UNE API OU UNE OPERATION.
 *
 * EXPORTE, et c'est le point : `emit-spring.ts` a SA fonction `PASCAL`, qui
 * retire les prefixes d'entite (`ent_`, `fld_`...) et PAS ceux des API. Si
 * elle nommait le fichier et celle-ci la classe, le nom du fichier ne
 * correspondrait pas au nom de la classe — et Java refuse de compiler. Une
 * seule fonction nomme les deux.
 */
export const PASCAL_API = (id: string): string =>
  id
    .replace(/^(api|apiop)_/u, "")
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");

const PASCAL = PASCAL_API;

const CAMEL = (id: string): string => {
  const p = PASCAL(id);
  return p.charAt(0).toLowerCase() + p.slice(1);
};

/** Le même délai que la pile Node : dix secondes, et la même raison. */
const DELAI_MS = 10_000;
/** La même fenêtre d'accord : cinq minutes. */
const FENETRE_S = 300;

const J = (v: string): string => JSON.stringify(v);

const segments = (chemin: string): readonly string[] =>
  [...chemin.matchAll(/\{([a-z][a-zA-Z0-9_]*)\}/gu)].map((m) => m[1] ?? "");

const attendues = (op: Operation): readonly string[] => {
  const vues = new Set<string>();
  for (const s of segments(op.path)) vues.add(s);
  for (const s of op.sends ?? []) vues.add(s);
  return [...vues];
};

const porteUnCorps = (op: Operation): boolean =>
  op.method === "POST" || op.method === "PUT" || op.method === "PATCH";

/**
 * L'APPELANT — LE JUMEAU JAVA DE `appelant.ts`.
 *
 * Mêmes quatre refus, et chacun a sa raison :
 *   — `alg` IMPOSÉ : un jeton qui choisit son algorithme peut choisir `none` ;
 *   — `exp` EXIGÉ : un jeton sans échéance ne périme jamais ;
 *   — comparaison à TEMPS CONSTANT : comparer caractère par caractère laisse
 *     mesurer combien sont bons, et la signature se devine ;
 *   — `app_metadata` d'abord, `user_metadata` JAMAIS : le second est
 *     modifiable par la personne elle-même, donc ses droits ne sont pas des
 *     droits.
 */
export function appelantJava(groupe: string): string {
  return `package ${groupe};

// ÉMIS PAR DERIBFY — ne pas modifier à la main.
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

public final class Appelant {

  private static final ObjectMapper MAPPER = new ObjectMapper();

  public final String id;
  public final String email;
  public final List<String> droits;

  private Appelant(String id, String email, List<String> droits) {
    this.id = id;
    this.email = email;
    this.droits = droits;
  }

  /**
   * LE SECRET VIENT DE L'ENVIRONNEMENT.
   *
   * Aucun secret dans les fichiers émis : un secret versionné ne redevient
   * jamais secret. Et un secret ABSENT ne vaut pas « tout le monde est
   * authentifié » — il vaut « personne ne l'est », parce qu'un refus se
   * récupère et qu'un accès accordé par erreur non.
   */
  public static Appelant de(Map<String, String> entetes) {
    String secret = System.getenv("AIR_JWT_SECRET");
    if (secret == null || secret.isEmpty()) return null;
    String brut = null;
    for (Map.Entry<String, String> e : entetes.entrySet()) {
      if (e.getKey() != null && e.getKey().equalsIgnoreCase("authorization")) brut = e.getValue();
    }
    if (brut == null || !brut.startsWith("Bearer ")) return null;
    return lireJeton(brut.substring(7), secret);
  }

  static Appelant lireJeton(String jeton, String secret) {
    String[] parts = jeton.split("\\\\.");
    if (parts.length != 3) return null;
    try {
      // ── L'ALGORITHME EST IMPOSÉ, PAS LU DANS LE JETON.
      //
      // Un jeton qui choisit son propre algorithme peut choisir « none ».
      JsonNode tete = MAPPER.readTree(decoder(parts[0]));
      if (!"HS256".equals(tete.path("alg").asText())) return null;
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
      byte[] attendue =
          mac.doFinal((parts[0] + "." + parts[1]).getBytes(StandardCharsets.UTF_8));
      byte[] fournie = Base64.getUrlDecoder().decode(parts[2]);
      // isEqual est à TEMPS CONSTANT : une comparaison ordinaire laisse
      // mesurer combien de caractères sont bons, et avec assez d'essais la
      // signature se devine.
      if (!MessageDigest.isEqual(attendue, fournie)) return null;
      JsonNode corps = MAPPER.readTree(decoder(parts[1]));
      // UN JETON SANS ÉCHÉANCE NE PÉRIME JAMAIS : il est refusé.
      if (!corps.hasNonNull("exp")) return null;
      if (corps.path("exp").asLong() < Instant.now().getEpochSecond()) return null;
      String id = corps.path("sub").asText(null);
      if (id == null || id.isEmpty()) return null;
      // ── \`app_metadata\` D'ABORD, \`user_metadata\` JAMAIS.
      //
      // Le second est modifiable par la personne elle-même : des droits qu'on
      // s'accorde soi-même ne sont pas des droits.
      JsonNode source = corps.path("app_metadata").path("rights");
      if (!source.isArray()) source = corps.path("rights");
      List<String> droits = new ArrayList<>();
      if (source.isArray()) {
        for (JsonNode d : source) if (d.isTextual()) droits.add(d.asText());
      }
      return new Appelant(id, corps.path("email").asText(null), List.copyOf(droits));
    } catch (Exception e) {
      // Un jeton mal formé est un jeton refusé, jamais une erreur 500 : une
      // panne du serveur dirait à l'attaquant qu'il a trouvé quelque chose.
      return null;
    }
  }

  private static byte[] decoder(String s) {
    return Base64.getUrlDecoder().decode(s);
  }
}
`;
}

/** Les exceptions du connecteur — les mêmes noms que côté Node. */
export function echecsJava(groupe: string): string {
  return `package ${groupe}.connecteur;

// ÉMIS PAR DERIBFY — les échecs du connecteur, nommés comme côté Node.
//
// Le NOM est ce que les routes traduisent en statut HTTP, dans les deux
// piles. Deux piles qui nomment différemment le même échec donneraient deux
// applications différentes sur le même document.
public final class Echecs {

  public static final class EntreeManquante extends RuntimeException {
    public EntreeManquante(String nom) {
      super("l'entrée " + nom + " est attendue et n'a pas été fournie");
    }
  }

  public static final class EntreeEnTrop extends RuntimeException {
    public EntreeEnTrop(String nom) {
      super("l'entrée " + nom + " n'est pas déclarée pour cette opération");
    }
  }

  public static final class SecretAbsent extends RuntimeException {
    public SecretAbsent(String variable) {
      super("la variable d'environnement " + variable + " n'est pas définie");
    }
  }

  public static final class ApiARefuse extends RuntimeException {
    public final int statut;

    public ApiARefuse(int statut) {
      super("l'API a répondu " + statut);
      this.statut = statut;
    }
  }

  public static final class ApiTropLente extends RuntimeException {
    public ApiTropLente(long delaiMs) {
      super("l'API n'a pas répondu en " + delaiMs + " ms");
    }
  }

  public static final class ReponseInattendue extends RuntimeException {
    public ReponseInattendue(String cle, String attendu) {
      super("la réponse ne porte pas " + cle + " en " + attendu);
    }
  }

  private Echecs() {}
}
`;
}

function verificationJava(cle: string, type: "string" | "number" | "boolean"): string {
  // ON NE CONVERTIT PAS, ON REFUSE — même raison que côté Node : convertir
  // discrètement ferait entrer une valeur fausse sans qu'on sache d'où elle
  // vient. Le document DÉCLARE ce que l'API rend.
  const garde =
    type === "number"
      ? `!noeud.path(${J(cle)}).isNumber()`
      : type === "boolean"
        ? `!noeud.path(${J(cle)}).isBoolean()`
        : `!noeud.path(${J(cle)}).isTextual()`;
  const lecture =
    type === "number"
      ? `noeud.path(${J(cle)}).doubleValue()`
      : type === "boolean"
        ? `noeud.path(${J(cle)}).booleanValue()`
        : `noeud.path(${J(cle)}).asText()`;
  return [
    `    if (${garde}) throw new Echecs.ReponseInattendue(${J(cle)}, ${J(type)});`,
    `    sortie.put(${J(cle)}, ${lecture});`,
  ].join("\n");
}

/** Le module d'une API déclarée — un fichier, une API, rien d'implicite. */
export function connecteurJava(groupe: string, api: Api): string {
  const classe = PASCAL(api.id);
  const secret = api.auth.kind === "header_secret" ? api.auth.secretEnvName : null;
  const entete = api.auth.kind === "header_secret" ? api.auth.headerName : null;
  const operations = api.operations.map((op) => {
    const seg = segments(op.path);
    const att = attendues(op);
    const corps = porteUnCorps(op);
    const transportes = (op.sends ?? []).filter((s) => !seg.includes(s));
    const lignes = [
      "",
      "  /**",
      `   * ${op.name}`,
      "   *",
      `   * ${op.method} ${op.path} — déclarée au document, donc appelable. Aucune`,
      "   * autre adresse de cette API n'est joignable : il n'y a de méthode que",
      "   * pour ce qui est déclaré.",
      "   */",
      `  public static Map<String, Object> ${CAMEL(op.id)}(Map<String, Object> entrees) {`,
      ...(att.length > 0
        ? [
            `    for (String nom : List.of(${att.map((a) => J(a)).join(", ")})) {`,
            "      if (!entrees.containsKey(nom)) throw new Echecs.EntreeManquante(nom);",
            "    }",
            "    for (String nom : entrees.keySet()) {",
            `      if (!List.of(${att.map((a) => J(a)).join(", ")}).contains(nom)) {`,
            "        throw new Echecs.EntreeEnTrop(nom);",
            "      }",
            "    }",
          ]
        : [
            "    // Cette opération n'attend rien : tout champ fourni est en trop.",
            "    for (String nom : entrees.keySet()) throw new Echecs.EntreeEnTrop(nom);",
          ]),
      // ── LE CHEMIN EST ÉCHAPPÉ SEGMENT PAR SEGMENT.
      //
      // Une valeur contenant `../` ou `?` changerait l'adresse appelée.
      `    String chemin = ${J(op.path)};`,
      ...seg.map(
        (s) =>
          `    chemin = chemin.replace(${J(`{${s}}`)}, encoder(String.valueOf(entrees.get(${J(s)}))));`,
      ),
      "    StringBuilder url = new StringBuilder(\"https://\" + DOMAINE + chemin);",
      ...(corps || transportes.length === 0
        ? []
        : [
            `    String separateur = "?";`,
            `    for (String nom : List.of(${transportes.map((t) => J(t)).join(", ")})) {`,
            "      url.append(separateur).append(nom).append(\"=\")",
            "         .append(encoder(String.valueOf(entrees.get(nom))));",
            "      separateur = \"&\";",
            "    }",
          ]),
      ...(corps && transportes.length > 0
        ? [
            "    Map<String, Object> aEnvoyer = new LinkedHashMap<>();",
            `    for (String nom : List.of(${transportes.map((t) => J(t)).join(", ")})) {`,
            "      aEnvoyer.put(nom, entrees.get(nom));",
            "    }",
            `    JsonNode noeud = appeler(url.toString(), ${J(op.method)}, aEnvoyer);`,
          ]
        : [`    JsonNode noeud = appeler(url.toString(), ${J(op.method)}, null);`]),
      // ── LE FILTRE. Seules les clés déclarées traversent.
      "    Map<String, Object> sortie = new LinkedHashMap<>();",
      ...op.returns.map((r) => verificationJava(r.key, r.type)),
      "    return sortie;",
      "  }",
    ];
    return lignes.join("\n");
  });
  return `package ${groupe}.connecteur;

// ÉMIS PAR DERIBFY — connecteur de « ${api.name} ».
//
// CE FICHIER EST UN FICHIER DE SERVEUR. Il n'est jamais embarqué dans
// l'application : il lit l'environnement, et l'environnement d'un téléphone
// est public — un paquet installé se décompresse.
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class ${classe} {

  private static final String DOMAINE = ${J(api.domain)};
  private static final long DELAI_MS = ${DELAI_MS}L;
  private static final ObjectMapper MAPPER = new ObjectMapper();
${
  secret === null
    ? "  // Cette API est déclarée `none` : publique, aucun en-tête d'identité.\n  // Aucun secret n'est lu, donc aucun secret ne peut manquer."
    : `  /**
   * LE SECRET — SON NOM SEULEMENT, JAMAIS SA VALEUR.
   *
   * Le document déclare le NOM d'une variable d'environnement. Ce fichier ne
   * contient donc aucun secret : il contient l'endroit où aller le chercher.
   */
  private static final String NOM_DU_SECRET = ${J(secret)};`
}

  /**
   * L'APPEL, ET SES DEUX GARDES.
   *
   * UN DÉLAI : sans lui, une API muette retient un fil du serveur jusqu'à ce
   * qu'il n'en reste plus. L'application tomberait à cause d'un tiers.
   *
   * AUCUNE REPRISE : un appel échoué n'est pas rejoué. Rejouer un POST qui
   * débite débiterait deux fois. Le document ne dit pas encore quelles
   * opérations sont rejouables sans dommage, donc le moteur ne devine pas.
   *
   * \`NEVER\` pour les redirections : une redirection pourrait emmener
   * l'en-tête du secret vers un autre hôte que celui déclaré.
   */
  private static JsonNode appeler(String url, String methode, Map<String, Object> corps) {
    try {
      HttpRequest.Builder b =
          HttpRequest.newBuilder(URI.create(url))
              .timeout(Duration.ofMillis(DELAI_MS))
              .header("accept", "application/json");
${
  secret === null
    ? ""
    : `      String valeur = System.getenv(NOM_DU_SECRET);
      if (valeur == null || valeur.isEmpty()) throw new Echecs.SecretAbsent(NOM_DU_SECRET);
      b = b.header(${J(entete ?? "")}, valeur);
`
}      if (corps == null) {
        b = b.method(methode, HttpRequest.BodyPublishers.noBody());
      } else {
        b =
            b.header("content-type", "application/json")
                .method(
                    methode,
                    HttpRequest.BodyPublishers.ofString(MAPPER.writeValueAsString(corps)));
      }
      HttpResponse<String> r =
          CLIENT.send(b.build(), HttpResponse.BodyHandlers.ofString());
      if (r.statusCode() >= 400) throw new Echecs.ApiARefuse(r.statusCode());
      JsonNode noeud = MAPPER.readTree(r.body());
      if (noeud == null || !noeud.isObject()) {
        throw new Echecs.ReponseInattendue("(racine)", "object");
      }
      return noeud;
    } catch (java.net.http.HttpTimeoutException e) {
      throw new Echecs.ApiTropLente(DELAI_MS);
    } catch (RuntimeException e) {
      throw e;
    } catch (Exception e) {
      throw new Echecs.ReponseInattendue("(appel)", "réponse");
    }
  }

  private static final HttpClient CLIENT =
      HttpClient.newBuilder()
          .connectTimeout(Duration.ofMillis(DELAI_MS))
          .followRedirects(HttpClient.Redirect.NEVER)
          .build();

  private static String encoder(String v) {
    return URLEncoder.encode(v, StandardCharsets.UTF_8);
  }
${operations.join("\n")}

  private ${classe}() {}
}
`;
}

/**
 * LES ROUTES DU CONNECTEUR — LE JUMEAU JAVA DE `routesConnecteur`.
 *
 * TOUJOURS EN POST, quelle que soit la méthode de l'API extérieure : les
 * entrées voyagent dans le corps, pas dans l'adresse. Une adresse se retrouve
 * dans les journaux du serveur, dans ceux de l'hébergeur et dans l'historique
 * des mandataires — un numéro de téléphone passé en query y resterait écrit.
 *
 * UN APPELANT EST EXIGÉ : un appel d'API déclarée est FACTURÉ au propriétaire.
 * Ouvrir ces adresses à l'anonyme laisserait n'importe qui vider son quota.
 */
export function connecteurApiJava(groupe: string, apis: readonly Api[]): string {
  const routes = apis.flatMap((api) =>
    api.operations.map((op) =>
      [
        "",
        `  @PostMapping("/apis/${api.id}/${op.id}")`,
        `  public ResponseEntity<?> ${CAMEL(api.id)}${PASCAL(op.id)}(`,
        "      @RequestHeader Map<String, String> entetes,",
        "      @RequestBody(required = false) Map<String, Object> corps) {",
        "    Appelant appelant = Appelant.de(entetes);",
        "    if (appelant == null) return refusAppelant();",
        "    try {",
        `      return ResponseEntity.ok(${PASCAL(api.id)}.${CAMEL(op.id)}(`,
        "          corps == null ? Map.of() : corps));",
        "    } catch (RuntimeException e) {",
        "      return traduire(e);",
        "    }",
        "  }",
      ].join("\n"),
    ),
  );
  return `package ${groupe}.api;

// ÉMIS PAR DERIBFY — les adresses du connecteur.
//
// Il n'y a d'adresse QUE pour une opération déclarée. Une opération absente
// du document n'a pas de route : elle n'est pas « interdite », elle n'existe
// pas. C'est la forme de refus la plus solide.
import ${groupe}.Appelant;
${apis.map((a) => `import ${groupe}.connecteur.${PASCAL(a.id)};`).join("\n")}
import ${groupe}.connecteur.Echecs;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/air/v1")
public class ConnecteurApi {
${routes.join("\n")}

  static ResponseEntity<?> refusAppelant() {
    return ResponseEntity.status(403)
        .body(
            Map.of(
                "error",
                "AIR_APPELANT_REQUIS",
                "message",
                "un appel d'API déclarée exige une identité vérifiable"));
  }

  /**
   * CE QUE L'APPLICATION APPREND D'UN ÉCHEC, ET CE QU'ELLE N'APPREND PAS.
   *
   * Le CORPS de la réponse de l'API extérieure ne traverse JAMAIS : il peut
   * contenir l'en-tête du secret réfléchi, un message interne, ou les données
   * d'une autre personne. L'application reçoit le GENRE de l'échec.
   */
  static ResponseEntity<?> traduire(RuntimeException e) {
    int statut = 500;
    String code = "AIR_API_ECHEC";
    if (e instanceof Echecs.EntreeManquante) {
      statut = 400;
      code = "AIR_API_ENTREE_MANQUANTE";
    } else if (e instanceof Echecs.EntreeEnTrop) {
      statut = 400;
      code = "AIR_API_ENTREE_EN_TROP";
    } else if (e instanceof Echecs.SecretAbsent) {
      statut = 503;
      code = "AIR_API_SECRET_ABSENT";
    } else if (e instanceof Echecs.ApiTropLente) {
      statut = 504;
      code = "AIR_API_TROP_LENTE";
    } else if (e instanceof Echecs.ApiARefuse) {
      statut = 502;
      code = "AIR_API_A_REFUSE";
    } else if (e instanceof Echecs.ReponseInattendue) {
      statut = 502;
      code = "AIR_API_REPONSE_INATTENDUE";
    }
    return ResponseEntity.status(statut).body(Map.of("error", code, "message", e.getMessage()));
  }
}
`;
}

/**
 * LA PORTE DE L'AGENT — LE JUMEAU JAVA DE `routesAgent`.
 *
 * Elle ne connaît QUE les opérations autorisées : il n'y a pas de branche
 * pour les autres.
 *
 * LA CONFIRMATION EST TENUE ICI, PAS À L'ÉCRAN. Le serveur est joignable
 * directement : une confirmation tenue par l'écran seul serait une promesse
 * sans serrure. L'intention est liée à l'appelant, aux entrées et à une
 * échéance — confirmer un montant puis en agir un autre ne passe pas, et
 * rejouer la confirmation de quelqu'un d'autre ne passe pas non plus.
 *
 * LE CERVEAU PROPOSE, IL N'AGIT PAS : un interprète qui agirait en même temps
 * qu'il comprend ne laisserait aucun endroit où refuser.
 */
export function agentApiJava(groupe: string, air: ProjectAir): string {
  const agent = air.agent;
  if (agent === undefined) throw new Error("agentApiJava appelé sans agent déclaré");
  const resoudre = (id: string): { api: Api; op: Operation } => {
    const p = (air.apis ?? []).flatMap((api) =>
      api.operations.filter((op) => op.id === id).map((op) => ({ api, op })),
    );
    if (p.length !== 1) {
      throw new Error(
        `AIR_AGENT_OPERATION_AMBIGUOUS à l'émission Java : « ${id} » est portée par ` +
          `${String(p.length)} API. Le validateur doit l'avoir refusé.`,
      );
    }
    return p[0] as { api: Api; op: Operation };
  };
  const pouvoirs = agent.allowedOperations.map(resoudre);
  const cerveau = agent.brain === undefined ? null : resoudre(agent.brain.operationId);
  const brain = agent.brain;
  const confirme = agent.confirmBeforeAct;
  const droit = agent.requiredRightId;
  const modules = [
    ...new Set([...pouvoirs.map((p) => p.api.id), ...(cerveau === null ? [] : [cerveau.api.id])]),
  ];
  const catalogue = pouvoirs.map(
    ({ op }) =>
      `      Map.of("id", ${J(op.id)}, "nom", ${J(op.name)}, "attend", List.of(${attendues(op)
        .map((a) => J(a))
        .join(", ")}))`,
  );
  const gardeDroit =
    droit === undefined
      ? [
          "    // Aucun droit n'est exigé par le document : tout appelant",
          "    // authentifié peut réveiller l'agent.",
        ]
      : [
          `    if (!appelant.droits.contains(${J(droit)})) return refusDroit();`,
        ];
  const lignes = [
    `package ${groupe}.api;`,
    "",
    "// ÉMIS PAR DERIBFY — la porte de l'agent.",
    "//",
    "// Elle ne connaît QUE les opérations autorisées au document : une",
    "// opération non autorisée n'est pas « interdite », elle n'existe pas de ce",
    "// côté-ci.",
    `import ${groupe}.Appelant;`,
    ...modules.map((id) => `import ${groupe}.connecteur.${PASCAL(id)};`),
    "import com.fasterxml.jackson.databind.JsonNode;",
    "import com.fasterxml.jackson.databind.ObjectMapper;",
    "import java.nio.charset.StandardCharsets;",
    "import java.security.MessageDigest;",
    "import java.time.Instant;",
    "import java.util.ArrayList;",
    "import java.util.Base64;",
    "import java.util.LinkedHashMap;",
    "import java.util.List;",
    "import java.util.Map;",
    "import javax.crypto.Mac;",
    "import javax.crypto.spec.SecretKeySpec;",
    "import org.springframework.http.ResponseEntity;",
    "import org.springframework.web.bind.annotation.GetMapping;",
    "import org.springframework.web.bind.annotation.PostMapping;",
    "import org.springframework.web.bind.annotation.RequestBody;",
    "import org.springframework.web.bind.annotation.RequestHeader;",
    "import org.springframework.web.bind.annotation.RequestMapping;",
    "import org.springframework.web.bind.annotation.RestController;",
    "",
    "@RestController",
    '@RequestMapping("/air/v1/agent")',
    "public class AgentApi {",
    "",
    "  private static final ObjectMapper MAPPER = new ObjectMapper();",
    `  private static final long FENETRE_S = ${FENETRE_S}L;`,
    `  private static final boolean CONFIRMATION_REQUISE = ${String(confirme)};`,
    `  private static final boolean VOIX = ${String(agent.voiceInput === true)};`,
    "",
    "  // Des NOMS, et rien du fournisseur : ni domaine, ni nom de variable de",
    "  // secret, ni méthode HTTP. La personne qui parle à l'agent n'a pas à",
    "  // savoir par quel service il passe.",
    "  static final List<Map<String, Object>> CATALOGUE =",
    "      List.of(",
    catalogue.join(",\n"),
    "      );",
    "",
    "  @GetMapping",
    "  public ResponseEntity<?> catalogue(@RequestHeader Map<String, String> entetes) {",
    "    Appelant appelant = Appelant.de(entetes);",
    "    if (appelant == null) return refusAppelant();",
    ...gardeDroit,
    "    return ResponseEntity.ok(",
    "        Map.of(",
    '            "operations", CATALOGUE,',
    '            "confirmationRequise", CONFIRMATION_REQUISE,',
    '            "voix", VOIX));',
    "  }",
  ];

  if (confirme) {
    lignes.push(
      "",
      "  /**",
      "   * L'INTENTION : ce qui va se passer, et un jeton pour le faire.",
      "   *",
      "   * Le résumé est le NOM que le document donne à l'opération. Le moteur",
      "   * n'invente pas de phrase : il n'a pas la langue de la personne.",
      "   */",
      '  @PostMapping("/intention")',
      "  public ResponseEntity<?> intention(",
      "      @RequestHeader Map<String, String> entetes,",
      "      @RequestBody(required = false) Map<String, Object> corps) {",
      "    Appelant appelant = Appelant.de(entetes);",
      "    if (appelant == null) return refusAppelant();",
      ...gardeDroit,
      "    Map<String, Object> c = corps == null ? Map.of() : corps;",
      "    Map<String, Object> permise = permise(String.valueOf(c.get(\"operation\")));",
      "    if (permise == null) return refusOperation();",
      "    Map<String, Object> entrees = entrees(c.get(\"entrees\"));",
      "    long echeance = Instant.now().getEpochSecond() + FENETRE_S;",
      "    return ResponseEntity.ok(",
      "        Map.of(",
      '            "resume", permise.get("nom"),',
      '            "operation", permise.get("id"),',
      '            "expireDans", FENETRE_S,',
      '            "intention",',
      "            echeance",
      '                + "."',
      "                + signer(",
      "                    charge(",
      '                        String.valueOf(permise.get("id")), entrees, appelant, echeance))));',
      "  }",
    );
  }

  lignes.push(
    "",
    "  /** L'acte. */",
    '  @PostMapping("/act")',
    "  public ResponseEntity<?> agir(",
    "      @RequestHeader Map<String, String> entetes,",
    "      @RequestBody(required = false) Map<String, Object> corps) {",
    "    Appelant appelant = Appelant.de(entetes);",
    "    if (appelant == null) return refusAppelant();",
    ...gardeDroit,
    "    Map<String, Object> c = corps == null ? Map.of() : corps;",
    "    String operation = String.valueOf(c.get(\"operation\"));",
    "    Map<String, Object> entrees = entrees(c.get(\"entrees\"));",
  );

  if (confirme) {
    lignes.push(
      "    // ── LA CONFIRMATION EST EXIGÉE ICI, PAS À L'ÉCRAN.",
      "    Object brute = c.get(\"intention\");",
      "    if (!(brute instanceof String)) return refus(\"AIR_AGENT_CONFIRMATION_REQUISE\",",
      "        \"cet agent demande avant d'agir : aucune intention n'est fournie\");",
      "    String[] parts = ((String) brute).split(\"\\\\.\", 2);",
      "    if (parts.length != 2) return refus(\"AIR_AGENT_CONFIRMATION_INVALIDE\",",
      "        \"l'intention n'a pas la forme attendue\");",
      "    long echeance;",
      "    try {",
      "      echeance = Long.parseLong(parts[0]);",
      "    } catch (NumberFormatException e) {",
      "      return refus(\"AIR_AGENT_CONFIRMATION_INVALIDE\", \"l'intention n'a pas la forme attendue\");",
      "    }",
      "    if (echeance < Instant.now().getEpochSecond()) {",
      "      return refus(\"AIR_AGENT_CONFIRMATION_EXPIREE\",",
      "          \"une confirmation passée n'est pas une confirmation\");",
      "    }",
      "    // La signature lie l'opération, les entrées ET l'appelant.",
      "    String attendue = signer(charge(operation, entrees, appelant, echeance));",
      "    if (!MessageDigest.isEqual(",
      "        attendue.getBytes(StandardCharsets.UTF_8), parts[1].getBytes(StandardCharsets.UTF_8))) {",
      "      return refus(\"AIR_AGENT_CONFIRMATION_INVALIDE\", \"l'intention ne correspond pas à cet acte\");",
      "    }",
    );
  } else {
    lignes.push(
      "    // Le document ne demande pas de confirmation pour cet agent : il n'y",
      "    // a donc aucune intention à exiger, et aucune route pour en produire.",
    );
  }

  lignes.push("    try {", "      switch (operation) {");
  for (const { api, op } of pouvoirs) {
    lignes.push(
      `        case ${J(op.id)}:`,
      `          return ResponseEntity.ok(${PASCAL(api.id)}.${CAMEL(op.id)}(entrees));`,
    );
  }
  lignes.push(
    "        default:",
    "          // Il n'existe pas de branche pour une opération non autorisée.",
    "          return refusOperation();",
    "      }",
    "    } catch (RuntimeException e) {",
    "      return ConnecteurApi.traduire(e);",
    "    }",
    "  }",
  );

  if (cerveau !== null && brain !== undefined) {
    lignes.push(
      "",
      "  /**",
      "   * PARLER : des mots, et une PROPOSITION. Jamais un acte.",
      "   *",
      "   * Le cerveau PROPOSE ; l'acte reste une demande distincte. Un interprète",
      "   * qui agirait en même temps qu'il comprend ne laisserait aucun endroit",
      "   * où refuser.",
      "   */",
      '  @PostMapping("/parler")',
      "  public ResponseEntity<?> parler(",
      "      @RequestHeader Map<String, String> entetes,",
      "      @RequestBody(required = false) Map<String, Object> corps) {",
      "    Appelant appelant = Appelant.de(entetes);",
      "    if (appelant == null) return refusAppelant();",
      ...gardeDroit,
      "    Map<String, Object> c = corps == null ? Map.of() : corps;",
      "    Object brutMots = c.get(\"mots\");",
      "    if (!(brutMots instanceof String) || ((String) brutMots).trim().isEmpty()) {",
      "      // Un appel au cerveau pour une phrase vide serait facturé pour rien.",
      "      return ResponseEntity.status(400)",
      "          .body(Map.of(\"error\", \"AIR_AGENT_MOTS_MANQUANTS\",",
      "              \"message\", \"aucune parole n'a été transmise\"));",
      "    }",
      "    Map<String, Object> demande = new LinkedHashMap<>();",
      `    demande.put(${J(brain.wordsInput)}, brutMots);`,
      ...(brain.catalogueInput === undefined
        ? [
            "    // Le document ne déclare pas de clé de catalogue : ce service",
            "    // connaît déjà ce qu'il peut proposer.",
          ]
        : [
            "    try {",
            `      demande.put(${J(brain.catalogueInput)}, MAPPER.writeValueAsString(CATALOGUE));`,
            "    } catch (Exception e) {",
            "      return refus(\"AIR_AGENT_REPONSE_ILLISIBLE\", \"catalogue illisible\");",
            "    }",
          ]),
      "    Map<String, Object> brut;",
      "    try {",
      `      brut = ${PASCAL(cerveau.api.id)}.${CAMEL(cerveau.op.id)}(demande);`,
      "    } catch (RuntimeException e) {",
      "      return ConnecteurApi.traduire(e);",
      "    }",
      "    // ── LE CERVEAU NE PEUT PAS S'INVENTER UN POUVOIR.",
      "    //",
      "    // Un modèle de langue se trompe, et un modèle manipulé par la phrase",
      "    // qu'on lui donne se trompe exprès. L'opération qu'il désigne doit",
      "    // être dans le catalogue — qui ne contient QUE les pouvoirs déclarés.",
      `    Map<String, Object> permise = permise(String.valueOf(brut.get(${J(brain.choiceOutput)})));`,
      "    if (permise == null) {",
      "      return refus(\"AIR_AGENT_CHOIX_HORS_POUVOIRS\",",
      "          \"l'interprète a désigné une opération qui n'est pas un pouvoir de l'agent\");",
      "    }",
      "    // Les valeurs arrivent en TEXTE JSON : `returns` n'autorise que",
      "    // string, number et boolean, donc une API ne peut pas déclarer rendre",
      "    // un objet. Les CHAMPS sont policés ensuite par le connecteur.",
      "    Map<String, Object> valeurs;",
      "    try {",
      `      JsonNode n = MAPPER.readTree(String.valueOf(brut.get(${J(brain.inputsOutput)})));`,
      "      if (n == null || !n.isObject()) throw new IllegalStateException();",
      "      valeurs = MAPPER.convertValue(n, Map.class);",
      "    } catch (Exception e) {",
      "      return ResponseEntity.status(502)",
      "          .body(Map.of(\"error\", \"AIR_AGENT_VALEURS_ILLISIBLES\",",
      "              \"message\", \"l'interprète n'a pas rendu des valeurs lisibles\"));",
      "    }",
      "    Map<String, Object> proposition = new LinkedHashMap<>();",
      "    proposition.put(\"operation\", permise.get(\"id\"));",
      "    proposition.put(\"nom\", permise.get(\"nom\"));",
      "    proposition.put(\"entrees\", valeurs);",
      ...(confirme
        ? [
            "    long echeance = Instant.now().getEpochSecond() + FENETRE_S;",
            "    proposition.put(\"expireDans\", FENETRE_S);",
            "    proposition.put(",
            "        \"intention\",",
            "        echeance",
            "            + \".\"",
            "            + signer(",
            "                charge(String.valueOf(permise.get(\"id\")), valeurs, appelant, echeance)));",
          ]
        : [
            "    // Ce document ne demande pas de confirmation : la proposition",
            "    // suffit, et l'acte se demande ensuite sans intention.",
          ]),
      "    return ResponseEntity.ok(proposition);",
      "  }",
    );
  }

  lignes.push(
    "",
    "  static Map<String, Object> permise(String id) {",
    "    for (Map<String, Object> c : CATALOGUE) {",
    "      if (c.get(\"id\").equals(id)) return c;",
    "    }",
    "    return null;",
    "  }",
    "",
    "  @SuppressWarnings(\"unchecked\")",
    "  static Map<String, Object> entrees(Object brut) {",
    "    return brut instanceof Map ? (Map<String, Object>) brut : Map.of();",
    "  }",
    "",
    "  /**",
    "   * LA CHARGE EST CANONIQUE — sinon deux écritures du même acte",
    "   * différeraient. Les clés sont triées : `{a,b}` et `{b,a}` désignent le",
    "   * même acte et doivent donner la même signature. Et le SÉPARATEUR est",
    "   * le même que côté Node : les deux piles doivent signer à l'identique.",
    "   */",
    "  static String charge(",
    "      String operation, Map<String, Object> entrees, Appelant appelant, long echeance) {",
    "    List<String> cles = new ArrayList<>(entrees.keySet());",
    "    java.util.Collections.sort(cles);",
    "    Map<String, Object> triees = new LinkedHashMap<>();",
    "    for (String k : cles) triees.put(k, entrees.get(k));",
    "    String json;",
    "    try {",
    "      json = MAPPER.writeValueAsString(triees);",
    "    } catch (Exception e) {",
    "      json = \"{}\";",
    "    }",
    "    return operation + \"\\u0000\" + json + \"\\u0000\" + appelant.id + \"\\u0000\" + echeance;",
    "  }",
    "",
    "  /**",
    "   * LE MÊME SECRET QUE L'IDENTITÉ : s'il manque, `Appelant.de` rend déjà",
    "   * `null` et personne n'entre. Deux secrets pour deux usages donneraient",
    "   * un serveur à moitié configuré qui refuse l'un et accepte l'autre.",
    "   */",
    "  static String signer(String charge) {",
    "    try {",
    "      String secret = System.getenv(\"AIR_JWT_SECRET\");",
    "      Mac mac = Mac.getInstance(\"HmacSHA256\");",
    "      mac.init(",
    "          new SecretKeySpec(",
    "              (secret == null ? \"\" : secret).getBytes(StandardCharsets.UTF_8), \"HmacSHA256\"));",
    "      return Base64.getUrlEncoder()",
    "          .withoutPadding()",
    "          .encodeToString(mac.doFinal(charge.getBytes(StandardCharsets.UTF_8)));",
    "    } catch (Exception e) {",
    "      // Une signature impossible ne doit pas rendre une chaîne vide, qui",
    "      // pourrait être comparée avec succès à une autre chaîne vide.",
    "      throw new IllegalStateException(\"AIR_AGENT_SIGNATURE_IMPOSSIBLE\");",
    "    }",
    "  }",
    "",
    "  static ResponseEntity<?> refusAppelant() {",
    "    return refus(\"AIR_APPELANT_REQUIS\", \"l'agent n'agit que pour une identité vérifiable\");",
    "  }",
    "",
    // ── PAS DE METHODE MORTE : le refus de droit n'existe que si un droit
    //    est exige. Emettre un refus que rien n'appelle ferait croire a une
    //    garde qui n'existe pas — et un test de parite le compterait comme
    //    presente alors qu'elle ne garde rien.
    ...(droit === undefined
      ? []
      : [
          "  static ResponseEntity<?> refusDroit() {",
          `    return refus("AIR_AGENT_DROIT_REQUIS", ${J(
            `ce droit est exigé pour réveiller l'agent : ${droit}`,
          )});`,
          "  }",
          "",
        ]),
    "  static ResponseEntity<?> refusOperation() {",
    "    return refus(",
    "        \"AIR_AGENT_OPERATION_NON_AUTORISEE\",",
    "        \"cette opération n'est pas dans les pouvoirs de l'agent\");",
    "  }",
    "",
    "  static ResponseEntity<?> refus(String code, String message) {",
    "    return ResponseEntity.status(403).body(Map.of(\"error\", code, \"message\", message));",
    "  }",
    "}",
  );
  return lignes.join("\n") + "\n";
}
