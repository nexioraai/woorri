// ════════════════════════════════════════════════════════════════════
//  TROUVER JAVA — ET VÉRIFIER QUE C'EST LE BON.
// ════════════════════════════════════════════════════════════════════
//
// ── LE DÉFAUT, MESURÉ SUR LA VRAIE CI LE 2026-10-06.
//
// Les deux gates backend cherchaient l'outillage avec cette liste :
//
//   /opt/homebrew/opt/openjdk/bin/java  ·  /opt/homebrew/bin/java
//   /usr/bin/java                       ·  java
//
// Sur le runner, `actions/setup-java` avait posé un JDK 21 et configuré le
// PATH. Mais `/usr/bin/java` — le JDK SYSTÈME, en 17 — venait AVANT dans ma
// liste. Mes chemins absolus, écrits pour être robustes sur une machine de
// développement, ont MASQUÉ l'environnement que l'action venait de régler.
//
//     error: release version 21 not supported
//
// ── LA FAUTE DE FOND, ET ELLE EST PLUS NETTE QUE L'ORDRE.
//
// Ma sonde demandait « est-ce que `java` existe ? », jamais « est-ce le
// BON ? ». Elle trouvait un exécutable, se déclarait satisfaite, et laissait
// Maven découvrir trois minutes plus tard que ce java-là ne sait pas compiler
// pour 21. Un contrôle qui vérifie la PRÉSENCE au lieu de l'APTITUDE donne la
// confiance sans la garantie.
//
// ── CE QUE CE MODULE FAIT.
//
// ① L'ENVIRONNEMENT D'ABORD. `JAVA_HOME` puis le PATH : ce sont eux que le
//    runner configure, et c'est à eux d'avoir le dernier mot. Les chemins
//    absolus ne sont qu'un REPLI pour une machine sans PATH réglé.
//
// ② LA VERSION EST VÉRIFIÉE. Un JDK trop ancien est REFUSÉ avec son numéro,
//    pas découvert par une erreur de compilation qui accuse le projet émis.
//
// ── POURQUOI CE MODULE EST PARTAGÉ.
//
// Les deux gates en portaient chacune une copie. Ce dépôt a payé cette
// divergence deux fois le même jour (les tables d'embarquement, puis les
// listes de documents des gates) : corriger ici devait corriger les deux.
import { execFileSync } from "node:child_process";

/** Le numéro MAJEUR d'un JDK, ou `undefined` si l'exécutable ne répond pas. */
function versionMajeure(chemin) {
  try {
    const sortie = String(
      execFileSync(chemin, ["-version"], { stdio: "pipe", encoding: "utf8" }) ?? "",
    );
    // `java -version` écrit sur stderr ; `execFileSync` ne le rend pas avec
    // stdio "pipe". On passe donc par `--version`, qui écrit sur stdout.
    void sortie;
  } catch {
    /* on retente autrement */
  }
  try {
    const v = String(execFileSync(chemin, ["--version"], { stdio: "pipe", encoding: "utf8" }));
    const m = /\b(\d+)(?:\.\d+)*\b/.exec(v);
    return m === null ? undefined : Number(m[1]);
  } catch {
    return undefined;
  }
}

/**
 * Cherche un exécutable de l'outillage Java.
 *
 * `minimum` n'est vérifié que pour `java`/`javac` : Maven a son propre
 * versionnement, et exiger un numéro pour lui n'aurait aucun sens ici.
 */
export function trouverOutil(bin, minimum) {
  const candidats = [
    // ① CE QUE L'ENVIRONNEMENT DIT — le runner le règle, il a le dernier mot.
    ...(process.env.JAVA_HOME === undefined ? [] : [`${process.env.JAVA_HOME}/bin/${bin}`]),
    bin,
    // ② REPLI pour une machine de développement sans PATH réglé.
    `/opt/homebrew/opt/openjdk/bin/${bin}`,
    `/opt/homebrew/bin/${bin}`,
    `/usr/bin/${bin}`,
  ];
  const trouves = [];
  for (const p of candidats) {
    const v = versionMajeure(p);
    if (v === undefined) continue;
    if (minimum === undefined || v >= minimum) return { chemin: p, version: v };
    trouves.push({ chemin: p, version: v });
  }
  // Rien d'assez récent : on rend le MEILLEUR trouvé, pour que l'appelant
  // puisse dire ce qu'il a vu au lieu de dire « absent ».
  return trouves.sort((a, b) => b.version - a.version)[0];
}

/**
 * L'outillage complet, ou un refus qui DIT ce qui manque.
 *
 * Refuser plutôt que se taire : une gate silencieuse laisse croire qu'elle a
 * mesuré. Celle-ci nomme la version trouvée et la version exigée.
 */
export function outillageJava(minimum = 21) {
  const java = trouverOutil("java", minimum);
  const mvn = trouverOutil("mvn");
  const lignes = [
    `  java    : ${java === undefined ? "🔴 ABSENT" : `${java.chemin} (${String(java.version)})`}`,
    `  maven   : ${mvn === undefined ? "🔴 ABSENT" : mvn.chemin}`,
  ];
  if (java === undefined || mvn === undefined) {
    return { ok: false, lignes, motif: "outillage Java absent" };
  }
  if (java.version < minimum) {
    return {
      ok: false,
      lignes,
      motif:
        `JDK ${String(java.version)} trouvé, ${String(minimum)} exigé par le \`pom.xml\` émis. ` +
        `Sans ce contrôle, Maven l'aurait découvert trois minutes plus tard, ` +
        `avec un message qui accuse le projet émis au lieu de l'outillage.`,
    };
  }
  return { ok: true, lignes, java: java.chemin, mvn: mvn.chemin, version: java.version };
}
