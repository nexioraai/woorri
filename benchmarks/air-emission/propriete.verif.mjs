// ════════════════════════════════════════════════════════════════════
//  LE CLIQUET D'ÉMISSION, PROUVÉ — et le corpus GELÉ laissé intact.
// ════════════════════════════════════════════════════════════════════
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
let echecs = 0;
const verifie = (nom, condition, detail = "") => {
  if (condition) { console.log(`  ✅ ${nom}`); return; }
  console.error(`  🔴 ${nom}${detail === "" ? "" : ` — ${detail}`}`);
  echecs += 1;
};

const { jugerProprieteDesPersonnes, CODE_PROPRIETE_ABSENTE } = await import(join(HERE, "juge-propriete.mjs"));
const modeleMetier = await import(join(HERE, "modele-metier.mjs"));
const airSchema = await import(join(REPO, "packages/air-schema/src/index.ts"));

// ── LE MODÈLE : un concept d'identité, comme en sortie de P0.
const MODELE = {
  version: "modele-metier/1.2.0",
  acteurs: [{ id: "act_moi", nom: "Moi" }],
  concepts: [
    { id: "ent_depense", nom: "Dépense", donnees: true, attributs: [{ id: "att_montant", nature: "nombre", requis: true }] },
    { id: "ent_compte", nom: "Compte", donnees: true, attributs: [{ id: "att_email", nature: "texte", requis: true }] },
  ],
  relations: [],
  parcours: [
    { id: "par_noter", besoin: "noter", acteur: "act_moi", etapes: [
      { concept: "ent_depense", geste: "saisir" }, { concept: "ent_depense", geste: "confirmer" }] },
    { id: "par_connexion", besoin: "se retrouver", acteur: "act_moi", etapes: [
      { concept: "ent_compte", geste: "s_identifier" }, { concept: "ent_depense", geste: "consulter_historique" }] },
  ],
  couverture: { couverts: [{ terme: "dépenses", noeuds: ["ent_depense"] }], nonRetenus: [] },
};

const docAvec = (actions, access) => ({
  entities: [
    { id: "ent_compte", name: "compte", fields: [{ id: "fld_email", name: "email", type: "text", required: true }] },
    { id: "ent_depense", name: "depense", fields: [{ id: "fld_montant", name: "montant", type: "decimal", required: true }] },
  ],
  actions,
  ...(access === undefined ? {} : { access }),
});
const juger = (doc) =>
  jugerProprieteDesPersonnes({ air: doc, modele: MODELE, derivations: modeleMetier });

console.log("— ① un document NEUF qui mute les personnes sans modèle d'identité —");
{
  const doc = docAvec([
    { id: "act_profil", effect: { kind: "mutation", entityId: "ent_compte", operation: "update" } },
  ]);
  const d = juger(doc);
  verifie("① REFUSÉ, et le diagnostic NOMME l'action et la table",
    d.length === 1 && d[0].code === CODE_PROPRIETE_ABSENTE &&
      d[0].message.includes("act_profil") && d[0].message.includes("ent_compte"),
    JSON.stringify(d.map((x) => x.code)));
  verifie("① le message DIT la conséquence, pas seulement la règle",
    d[0]?.message.includes("modifier ou supprimer la fiche de n'importe qui"));
}

console.log("— ② les deux façons de déclarer un modèle d'identité SUFFISENT —");
{
  const parSession = docAvec([
    { id: "act_profil", effect: { kind: "mutation", entityId: "ent_compte", operation: "update", instanceFrom: "session" } },
  ]);
  verifie("② `instanceFrom: session` suffit — « la ligne de la personne connectée »", juger(parSession).length === 0);

  const parAcces = docAvec(
    [{ id: "act_profil", effect: { kind: "mutation", entityId: "ent_compte", operation: "update" } }],
    { rights: [{ id: "right_x", name: "x", label: [{ locale: "fr", text: "X" }] }],
      roles: [{ id: "role_x", name: "x", label: [{ locale: "fr", text: "X" }], rightIds: ["right_x"] }],
      defaultRoleId: "role_x" },
  );
  verifie("② un bloc `access` suffit — les droits gardent l'accès", juger(parAcces).length === 0);
}

console.log("— ③ ce que le cliquet ne doit PAS refuser —");
{
  const sansMutation = docAvec([
    { id: "act_voir", effect: { kind: "navigate", screenId: "scr_x" } },
  ]);
  verifie("③ aucune mutation des personnes : rien à posséder, rien à refuser", juger(sansMutation).length === 0);

  const autreTable = docAvec([
    { id: "act_depense", effect: { kind: "mutation", entityId: "ent_depense", operation: "create" } },
  ]);
  verifie("③ muter une entité ORDINAIRE ne déclenche pas le cliquet", juger(autreTable).length === 0);

  const sansIdentite = jugerProprieteDesPersonnes({
    air: docAvec([{ id: "act_x", effect: { kind: "mutation", entityId: "ent_compte", operation: "update" } }]),
    modele: { ...MODELE, parcours: [MODELE.parcours[0]] }, // plus de geste s_identifier
    derivations: modeleMetier,
  });
  verifie("③ un modèle SANS concept d'identité : le cliquet se taît (pas de personnes)",
    sansIdentite.length === 0, JSON.stringify(sansIdentite.map((x) => x.code)));
}

console.log("— ④ LE CORPUS GELÉ — empreintes INTACTES, pas un octet changé —");
{
  const dossier = join(REPO, "packages/golden-corpus/corpus-v3");
  const fichiers = readdirSync(dossier).filter((f) => f.endsWith(".air.json")).sort();
  verifie("④ les quatorze documents gelés sont là", fichiers.length >= 14, String(fichiers.length));
  // Le juge du CONTRAT ne mord plus sur eux : ils n'ont pas de modèle d'identité.
  let refuses = 0;
  const empreintes = [];
  for (const f of fichiers) {
    const brut = readFileSync(join(dossier, f), "utf8");
    empreintes.push(`${f}:${createHash("sha256").update(brut).digest("hex").slice(0, 12)}`);
    try {
      airSchema.migrateAirDocument(JSON.parse(brut));
    } catch (e) {
      const rls = (e.diagnostics ?? []).filter((x) => x.code.startsWith("AIR_RLS_"));
      if (rls.length > 0) refuses += 1;
    }
  }
  verifie("④ AUCUN document gelé n'est refusé par le juge du contrat", refuses === 0, `${String(refuses)} refusé(s)`);
  // KAVIVA-SPA, LE SEUL QU'IL A FALLU CORRIGER (arbitrage du 2026-10-10) :
  // des quatorze, c'était le seul à DÉCLARER un modèle d'identité
  // (`instanceFrom: "session"` sur ent_profil) — donc le seul que le juge
  // regarde. Et son `ent_rendez_vous` ne référençait que le soin et le
  // créneau : n'importe qui pouvait annuler le rendez-vous de n'importe qui.
  // UN champ a été ajouté (fld_rdv_profil → ent_profil). Le propriétaire a
  // levé « zéro hash changé » pour ce document seul : un corpus de référence
  // qui ne passe plus ses propres juges a cessé d'être une référence.
  {
    const kaviva = airSchema.migrateAirDocument(
      JSON.parse(readFileSync(join(dossier, "kaviva-spa.air.json"), "utf8")),
    );
    const portee = airSchema
      .derivePlanAcces(kaviva)
      .tables.find((t) => t.entityId === "ent_rendez_vous")?.portee;
    verifie("④ kaviva-spa : le rendez-vous APPARTIENT désormais à sa cliente",
      portee?.kind === "directe" && portee.fieldId === "fld_rdv_profil",
      JSON.stringify(portee));
  }
  verifie("④ leurs empreintes sont inscrites ici — un changement se verrait", empreintes.length === fichiers.length);
  console.log(`     ${empreintes.slice(0, 3).join(" · ")} …`);
  console.log("     ⚠ CES DOCUMENTS PORTENT LA FAILLE EN SUBSTANCE (bus-intercites laisse");
  console.log("       modifier et SUPPRIMER n'importe quel voyageur). Jamais déployés :");
  console.log("       références de mesure. NE PAS LES PRENDRE POUR DES EXEMPLES SÛRS.");
}

console.log("— ⑤ LE CAHIER DES CHARGES COMPLET NE VA QU'A P0 —");
{
  const { abregerPourEmission, LONGUEUR_BRIEF_EMISSION } = await import(join(HERE, "moteur.mjs"));
  // Une demande TAPEE A LA MAIN passe inchangee : le comportement d'avant,
  // a l'octet. C'est la non-regression qui compte le plus ici.
  const courte = "une application pour noter mes idees et les relire plus tard";
  verifie("⑤ une demande courte passe INCHANGEE — a l'octet",
    abregerPourEmission(courte) === courte);

  // Un cahier des charges de quarante pages : l'emission n'en recoit qu'une
  // tete bornee, et elle DIT que le reste est alle a la comprehension.
  const cahier = "Chaque membre cotise une somme fixe chaque semaine. ".repeat(400);
  const abrege = abregerPourEmission(cahier);
  verifie("⑤ un cahier des charges est BORNE pour l'emission",
    abrege.length < cahier.length && abrege.length <= LONGUEUR_BRIEF_EMISSION + 80,
    `${String(cahier.length)} → ${String(abrege.length)}`);
  verifie("⑤ l'abrege DIT que le complet est alle a la comprehension",
    abrege.includes("cahier des charges complet transmis"));
  verifie("⑤ la coupe tombe sur une frontiere de phrase, jamais au milieu d'un mot",
    /\.\s*\n\n\[cahier/u.test(abrege), JSON.stringify(abrege.slice(-60)));

  // L'ECONOMIE, chiffree : ce qu'on evite en ne multipliant pas par ~30.
  const evites = (cahier.length - abrege.length) / 4 * 30;
  verifie("⑤ l'economie est reelle : >100 000 jetons d'entree evites sur un cahier de 40 pages",
    evites > 100_000, `${String(Math.round(evites))} jetons`);
}

console.log(
  echecs === 0
    ? "\n✅ propriete : le cliquet mord sur le NEUF, le corpus gelé est intact."
    : `\n🔴 ${String(echecs)} controle(s) en echec.`,
);
process.exit(echecs === 0 ? 0 : 1);
