import type { ProjectAir } from "./air.ts";
import { derivePlanAcces, entiteDIdentite } from "./derive-rls.ts";
import { PROFONDEUR_EXPRESSION, projectAirSchema } from "./air.ts";

// Validateur sémantique DÉTERMINISTE (ARCHITECTURE §1) : un AIR émis par LLM
// est syntaxiquement valide par construction (structured outputs) ; la
// cohérence référentielle, elle, se vérifie ici — jamais par un LLM.
export interface AirDiagnostic {
  code: string;
  path: string;
  message: string;
}

// Aucun secret dans l'AIR (non-négociable #13) : détection fail-closed sur
// les noms de clés de configuration.
const SECRET_LIKE_KEY = /(secret|token|password|api_?key|private_?key|credential)/i;

// ══════════════════════════════════════════════════════════════════════════
// D-088 · D4 — L'INTENTION EST DUE À PARTIR DU CONTRAT QUI L'A CRÉÉE.
//
// `intent` est OPTIONNEL dans le schéma, et doit le rester : un document
// 1.0.0 ou 1.1.0 n'en portait aucune, et la migration 1.1.0 → 1.2.0 est une
// IDENTITÉ délibérée — inventer une demande fabriquerait précisément la seule
// chose que ce champ existe pour ne plus perdre. Un document historique reste
// donc VALIDE sous son propre contrat.
//
// Mais l'absence d'intention est aussi l'échappatoire la plus large qui soit :
// un document sans `intent` n'a AUCUN besoin à perdre, donc aucune couverture
// à démontrer. Mesuré : 12 documents sur 24 n'en portent aucune.
//
// La règle porte donc sur la version DÉCLARÉE, lue sur le document BRUT —
// avant migration, puisque la migration porte tout à la version courante et
// effacerait la seule information qui distingue un artefact gelé d'un document
// neuf. À partir de 1.2.0, le contrat prévoyait l'intention : elle est due.
const VERSION_INTENTION_DUE = [1, 2, 0] as const;

const compareVersions = (a: readonly number[], b: readonly number[]): number => {
  for (let i = 0; i < 3; i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
};

/**
 * Refuse un document qui, sous un contrat prévoyant `intent`, n'en porte pas.
 * Prend le document BRUT (non migré, non parsé) : la version déclarée est la
 * seule preuve de provenance disponible.
 */
export function validateAirIntentRequirement(raw: unknown): AirDiagnostic[] {
  if (typeof raw !== "object" || raw === null) return [];
  const doc = raw as { airSchemaVersion?: unknown; intent?: unknown };
  const version = typeof doc.airSchemaVersion === "string" ? doc.airSchemaVersion : undefined;
  if (version === undefined) return [];
  const parts = version.split(".").map((n) => Number.parseInt(n, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return [];
  if (compareVersions(parts, VERSION_INTENTION_DUE) < 0) return [];
  if (doc.intent !== undefined) return [];
  return [
    {
      code: "AIR_INTENT_REQUISE",
      path: "intent",
      message:
        `le document déclare la version ${version}, qui prévoit \`intent\` : la demande du ` +
        "client et les besoins qu'elle exprime sont DUS. Un document sans intention n'a aucun " +
        "besoin à perdre, donc aucune fidélité à démontrer",
    },
  ];
}

export function validateAir(air: ProjectAir): AirDiagnostic[] {
  const diagnostics: AirDiagnostic[] = [];
  const push = (code: string, path: string, message: string): void => {
    diagnostics.push({ code, path, message });
  };

  const screenIds = new Set(air.screens.map((s) => s.id));

  // ══════════════════════════════════════════════════════════════
  //  CONTRÔLE D'ACCÈS (1.28.0)
  //
  // Le défaut fondateur, mesuré dans un système en production : un employé
  // sans le droit du premier écran ne pouvait PAS ENTRER — ni par la page de
  // connexion, ni par l'application installée sur son téléphone, qui ouvrait
  // sur ce même écran. Ses droits existaient ; aucun écran ne les lui servait.
  //
  // Le propriétaire ne pouvait pas le rencontrer : il voit tout. Il a fallu
  // qu'un employé installe l'application. C'est exactement le genre de défaut
  // qu'un format doit refuser AVANT la compilation.
  // ══════════════════════════════════════════════════════════════
  const acces = air.access;
  const droitsConnus = new Set(acces?.rights.map((d) => d.id) ?? []);

  if (acces !== undefined) {
    const roleParId = new Map(acces.roles.map((r) => [r.id, r]));

    acces.roles.forEach((role, i) => {
      role.rightIds.forEach((droitId, j) => {
        if (!droitsConnus.has(droitId)) {
          push(
            "AIR_ACCESS_RIGHT_UNKNOWN",
            `access.roles[${i}].rightIds[${j}]`,
            `le rôle "${role.id}" accorde le droit "${droitId}", qui n'est pas déclaré`,
          );
        }
      });
    });

    const parDefaut = roleParId.get(acces.defaultRoleId);
    if (parDefaut === undefined) {
      push(
        "AIR_ACCESS_DEFAULT_ROLE_UNKNOWN",
        "access.defaultRoleId",
        `le rôle par défaut "${acces.defaultRoleId}" n'est pas déclaré : un compte nouvellement créé n'aurait aucun statut`,
      );
    }

    // Un droit nommé par un écran ou une action doit exister : sans cela, la
    // sécurité dépendrait d'une orthographe, et un droit mal tapé ouvrirait
    // l'écran à tout le monde au lieu de le fermer.
    air.screens.forEach((ecran, i) => {
      if (ecran.requiredRightId !== undefined && !droitsConnus.has(ecran.requiredRightId)) {
        push(
          "AIR_ACCESS_RIGHT_UNKNOWN",
          `screens[${i}].requiredRightId`,
          `l'écran "${ecran.id}" exige le droit "${ecran.requiredRightId}", qui n'est pas déclaré`,
        );
      }
    });
    air.actions.forEach((action, i) => {
      if (action.requiredRightId !== undefined && !droitsConnus.has(action.requiredRightId)) {
        push(
          "AIR_ACCESS_RIGHT_UNKNOWN",
          `actions[${i}].requiredRightId`,
          `l'action "${action.id}" exige le droit "${action.requiredRightId}", qui n'est pas déclaré`,
        );
      }
    });

    // ── UN DROIT EXIGÉ QUE PERSONNE NE PEUT TENIR FERME L'ÉCRAN À TOUS.
    //
    // ── POURQUOI CE CONTRÔLE MANQUAIT, ET COMMENT IL S'EST VU.
    //
    // Trois contrôles d'accès existaient : droit non DÉCLARÉ, écran D'ENTRÉE
    // fermé au rôle par défaut, droit DÉLÉGABLE sans porteur. Le cas général
    // — un droit exigé par n'importe quel écran ou geste, qu'aucun rôle
    // n'accorde — n'était couvert par aucun des trois.
    //
    // Le raisonnement du contrôle de délégation s'applique ici et plus fort :
    // là-bas « le mandataire exercerait un pouvoir que son mandant n'a pas » ;
    // ici PERSONNE ne peut ouvrir l'écran, jamais, et toutes les portes du
    // dépôt restent vertes — le document est valide, l'application compile,
    // se monte, et l'écran est inaccessible à vie.
    //
    // Repéré le 2026-10-05 en dérivant le contrat d'API d'une tontine : la
    // table des rôles donnée au développeur du serveur affichait « aucun
    // droit » pour le Président. C'était un défaut du dérivateur
    // (`grantsAllRights` non lu) et non du document — mais la question posée
    // était bonne, et la réponse était que rien ne la posait.
    //
    // Mesuré sur les 31 documents du dépôt avant d'ajouter le refus : AUCUN
    // n'est concerné. Le contrôle est donc strictement additif — il refuse
    // une configuration que personne n'a écrite, et qui se paierait entière.
    const porteurs = (droit: string): boolean =>
      acces.roles.some((r) => r.grantsAllRights === true || r.rightIds.includes(droit));
    air.screens.forEach((ecran, i) => {
      const requis = ecran.requiredRightId;
      if (requis === undefined || !droitsConnus.has(requis) || porteurs(requis)) return;
      push(
        "AIR_DROIT_EXIGE_SANS_PORTEUR",
        `screens[${i}].requiredRightId`,
        `l'écran "${ecran.id}" exige le droit "${requis}", qu'AUCUN rôle n'accorde : ` +
          `cet écran est inaccessible à tout le monde, et rien d'autre ne le signale`,
      );
    });
    air.actions.forEach((action, i) => {
      const requis = action.requiredRightId;
      if (requis === undefined || !droitsConnus.has(requis) || porteurs(requis)) return;
      push(
        "AIR_DROIT_EXIGE_SANS_PORTEUR",
        `actions[${i}].requiredRightId`,
        `l'action "${action.id}" exige le droit "${requis}", qu'AUCUN rôle n'accorde : ` +
          `ce geste est impossible pour tout le monde — y compris celui qui en répond`,
      );
    });

    // ── LA PORTE D'ENTRÉE DOIT S'OUVRIR AU RÔLE PAR DÉFAUT.
    //
    // C'est LE défaut de SGD, et il se voit ici en une ligne : si l'écran
    // d'entrée exige un droit que le rôle par défaut n'a pas, tout nouvel
    // employé est mis dehors dès l'ouverture.
    const entree = air.screens.find((s) => s.id === air.navigation.entryScreenId);
    const requis = entree?.requiredRightId;
    if (parDefaut !== undefined && requis !== undefined) {
      const ouvert = parDefaut.grantsAllRights === true || parDefaut.rightIds.includes(requis);
      if (!ouvert) {
        push(
          "AIR_ACCESS_ENTRY_UNREACHABLE",
          "navigation.entryScreenId",
          `l'écran d'entrée "${air.navigation.entryScreenId}" exige le droit "${requis}", que le rôle par défaut "${parDefaut.id}" n'a pas : tout nouveau compte serait mis dehors dès l'ouverture`,
        );
      }
    }
  } else {
    // Un droit nommé sans bloc `access` ne protège RIEN : il se lit comme une
    // précaution et n'en est pas une. On refuse plutôt que de laisser croire.
    air.screens.forEach((ecran, i) => {
      if (ecran.requiredRightId !== undefined) {
        push(
          "AIR_ACCESS_SANS_DECLARATION",
          `screens[${i}].requiredRightId`,
          `l'écran "${ecran.id}" exige un droit alors qu'aucun bloc "access" n'est déclaré : ce droit ne protège rien`,
        );
      }
    });
    air.actions.forEach((action, i) => {
      if (action.requiredRightId !== undefined) {
        push(
          "AIR_ACCESS_SANS_DECLARATION",
          `actions[${i}].requiredRightId`,
          `l'action "${action.id}" exige un droit alors qu'aucun bloc "access" n'est déclaré : ce droit ne protège rien`,
        );
      }
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  AGIR AU NOM D'UN AUTRE (1.29.0) — CE QU'UNE DÉLÉGATION DOIT TENIR.
  // ══════════════════════════════════════════════════════════════
  //
  // Une délégation mal déclarée est pire qu'absente : elle se lit comme une
  // procuration encadrée, et n'encadre rien. Quatre refus, chacun mesurable.
  const modeleDacces = air.access;
  if (modeleDacces?.delegation !== undefined) {
    const d = modeleDacces.delegation;
    const sujet = air.entities.find((e) => e.id === d.subjectEntityId);
    if (sujet === undefined) {
      push(
        "AIR_DELEGATION_SUJET_INCONNU",
        "access.delegation.subjectEntityId",
        `la délégation porte sur l'entité "${d.subjectEntityId}", qui n'existe pas : ` +
          `on ne peut pas agir au nom de personnes que le document ne décrit pas`,
      );
    } else {
      // ── LE MANDATAIRE D'UNE PERSONNE EST UNE PERSONNE.
      //
      // Le champ doit vivre SUR l'entité des personnes et POINTER VERS ELLE.
      // Un champ qui désignerait autre chose — une tontine, un lieu — ferait
      // d'un objet le mandataire d'un humain, et la garde ne garderait rien.
      const champ = sujet.fields.find((x) => x.id === d.holderFieldId);
      if (champ === undefined) {
        push(
          "AIR_DELEGATION_PORTEUR_INVALIDE",
          "access.delegation.holderFieldId",
          `le champ "${d.holderFieldId}" n'existe pas sur l'entité "${sujet.id}" : ` +
            `rien ne dit alors QUI est le mandataire de qui`,
        );
      } else if (champ.type !== "reference" || champ.referencesEntityId !== sujet.id) {
        push(
          "AIR_DELEGATION_PORTEUR_INVALIDE",
          "access.delegation.holderFieldId",
          `le champ "${d.holderFieldId}" doit être une référence vers "${sujet.id}" ` +
            `lui-même — le mandataire d'une personne est une personne — et il est ` +
            `de type "${champ.type}"${champ.referencesEntityId === undefined ? "" : ` vers "${champ.referencesEntityId}"`}`,
        );
      }
    }
    const droitsConnus = new Set(modeleDacces.rights.map((r) => r.id));
    d.delegatableRightIds.forEach((id, i) => {
      if (droitsConnus.has(id)) return;
      push(
        "AIR_DELEGATION_DROIT_INCONNU",
        `access.delegation.delegatableRightIds[${i}]`,
        `le droit "${id}" est déclaré délégable alors qu'il n'est déclaré nulle part : ` +
          `une procuration sur un droit qui n'existe pas n'autorise rien`,
      );
    });
    // ── UN DROIT QUE PERSONNE NE POSSÈDE NE SE DÉLÈGUE PAS.
    //
    // Déléguer un droit qu'aucun rôle n'accorde produit une procuration VIDE :
    // le mandataire exercerait au nom d'autrui un pouvoir que son mandant n'a
    // pas. C'est le cas qui se lit le mieux comme une protection, et qui n'en
    // est pas une.
    const possedes = new Set(
      modeleDacces.roles.flatMap((r) =>
        r.grantsAllRights === true ? modeleDacces.rights.map((x) => x.id) : r.rightIds,
      ),
    );
    d.delegatableRightIds.forEach((id, i) => {
      if (!droitsConnus.has(id) || possedes.has(id)) return;
      push(
        "AIR_DELEGATION_DROIT_SANS_PORTEUR",
        `access.delegation.delegatableRightIds[${i}]`,
        `le droit "${id}" est délégable alors qu'AUCUN rôle ne l'accorde : ` +
          `le mandataire exercerait au nom d'autrui un pouvoir que son mandant n'a pas`,
      );
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  CE QUI NE SE RÉÉCRIT PAS, ET CE QUI SUCCÈDE À QUOI (1.30.0).
  // ══════════════════════════════════════════════════════════════
  air.entities.forEach((e, ei) => {
    // ── UNE ENTITÉ FIGÉE NE SE MODIFIE NI NE S'EFFACE.
    //
    // La déclarer puis poser une action qui la réécrit serait la pire des
    // configurations : le document promet un journal immuable, et l'application
    // le réécrit. Mieux vaut refuser le document.
    if (e.appendOnly === true) {
      air.actions.forEach((a, ai) => {
        if (a.effect.kind !== "mutation" || a.effect.entityId !== e.id) return;
        if (a.effect.operation === "create") return;
        push(
          "AIR_APPEND_ONLY_REECRITE",
          `actions[${ai}].effect`,
          `l'action "${a.id}" veut ${a.effect.operation === "update" ? "modifier" : "effacer"} ` +
            `une ligne de "${e.id}", qui est déclarée non réécrivable : la seule correction ` +
            `possible est d'écrire une ligne NOUVELLE qui annule la première`,
        );
      });
    }
    // ── UN CHAMP DÉRIVÉ EST LE RÉSULTAT D'AUTRES LIGNES (1.31.0).
    e.fields.forEach((f, fi) => {
      if (f.derived === undefined) return;
      const chemin = `entities[${ei}].fields[${fi}].derived`;
      const d = f.derived;

      // ── LA VALIDITÉ DANS LE TEMPS (1.37.0) — SES PROPRES GARDES.
      //
      // Trois fautes rendraient le calcul indéfini ou faux, et les trois se
      // voient sans jamais exécuter quoi que ce soit.
      if (d.kind === "versionne") {
        const dateChamp = e.fields.find((x) => x.id === d.dateFieldId);
        // ① LA DATE DE RÉFÉRENCE EXISTE, ET C'EST UNE DATE. Sans elle,
        // aucune version ne peut être choisie.
        if (dateChamp === undefined) {
          push(
            "AIR_VERSIONS_DATE_INCONNUE",
            `${chemin}.dateFieldId`,
            `le champ "${d.dateFieldId}" n'existe pas sur "${e.id}" : rien ne ` +
              "dirait alors QUELLE version appliquer",
          );
        } else if (dateChamp.type !== "date" && dateChamp.type !== "datetime") {
          push(
            "AIR_VERSIONS_DATE_MAUVAIS_TYPE",
            `${chemin}.dateFieldId`,
            `"${d.dateFieldId}" est de type "${dateChamp.type}" : une version ` +
              "se choisit sur une DATE",
          );
        }
        // ② LES VERSIONS NE SE CHEVAUCHENT PAS. Deux versions valables le
        // même jour donneraient deux montants pour la même facture.
        let borne: string | null = null;
        d.versions.forEach((v, vi) => {
          if (v.depuis !== undefined && v.jusqua !== undefined && v.jusqua <= v.depuis) {
            push(
              "AIR_VERSIONS_PERIODE_VIDE",
              `${chemin}.versions[${vi}]`,
              `la période se ferme avant de s'ouvrir (${v.depuis} → ${v.jusqua}) : ` +
                "elle ne couvre aucun jour",
            );
          }
          if (borne !== null && (v.depuis === undefined || v.depuis < borne)) {
            push(
              "AIR_VERSIONS_CHEVAUCHANTES",
              `${chemin}.versions[${vi}]`,
              "deux versions valent le même jour : la même ligne aurait deux " +
                "résultats, et personne ne saurait lequel est le bon",
            );
          }
          if (v.jusqua !== undefined) borne = v.jusqua;
        });
        // ③ UNE SEULE VERSION OUVERTE A LA FIN. Deux versions sans borne
        // de fin se recouvrent pour toujours.
        const ouvertes = d.versions.filter((v) => v.jusqua === undefined).length;
        if (ouvertes > 1) {
          push(
            "AIR_VERSIONS_PLUSIEURS_OUVERTES",
            `${chemin}.versions`,
            `${String(ouvertes)} versions n'ont pas de fin : elles se recouvrent ` +
              "pour toujours",
          );
        }
        return;
      }

      // ── LE CALCUL NE PASSE PAS PAR UNE RELATION NON PLUS (1.36.0).
      //
      // Une expression ne voit QUE la ligne qu'elle calcule. Trois gardes,
      // et chacune ferme une façon de rendre le document incalculable.
      if (d.kind === "calcul") {
        const champs = new Set(e.fields.map((x) => x.id));
        let profondeur = 0;
        const visiter = (x: unknown, niveau: number): void => {
          profondeur = Math.max(profondeur, niveau);
          const n = x as {
            kind?: string; fieldId?: string; op?: string; de?: string; a?: string;
            gauche?: unknown; droite?: unknown; valeur?: number;
          };
          if (n.kind === "champ") {
            // ① LE CHAMP EXISTE. Sinon le calcul lit du vide.
            if (!champs.has(String(n.fieldId))) {
              push(
                "AIR_CALCUL_CHAMP_INCONNU",
                `${chemin}.expression`,
                `le champ "${String(n.fieldId)}" n'existe pas sur "${e.id}" : ` +
                  `le calcul lirait du vide`,
              );
            }
            // ② PAS DE RENVOI A SOI-MEME. Un champ qui se calcule depuis
            // lui-meme n'a pas une valeur : il en a une infinite.
            if (n.fieldId === f.id) {
              push(
                "AIR_CALCUL_CIRCULAIRE",
                `${chemin}.expression`,
                `"${f.id}" se calcule depuis lui-meme : aucune valeur definie`,
              );
            }
            return;
          }
          if (n.kind === "jours") {
            // LES DEUX BORNES EXISTENT, ET CE SONT DES DATES. Compter des
            // jours entre un montant et un nom ne veut rien dire.
            for (const [role, id] of [["de", n.de], ["a", n.a]] as const) {
              const c = e.fields.find((x) => x.id === String(id));
              if (c === undefined) {
                push(
                  "AIR_JOURS_CHAMP_INCONNU",
                  `${chemin}.expression`,
                  `le champ "${String(id)}" (${role}) n'existe pas sur "${e.id}"`,
                );
              } else if (c.type !== "date" && c.type !== "datetime") {
                push(
                  "AIR_JOURS_MAUVAIS_TYPE",
                  `${chemin}.expression`,
                  `"${String(id)}" est de type "${c.type}" : on ne compte des ` +
                    "jours qu'entre deux DATES",
                );
              }
            }
            return;
          }
          if (n.kind === "operation") {
            // ③ PAS DE DIVISION PAR UNE CONSTANTE NULLE. Elle se voit SANS
            // executer quoi que ce soit — la refuser ne coute rien.
            const droite = n.droite as { kind?: string; valeur?: number };
            if (n.op === "/" && droite.kind === "constante" && droite.valeur === 0) {
              push(
                "AIR_CALCUL_DIVISION_PAR_ZERO",
                `${chemin}.expression`,
                "division par zero : le resultat n'existe pas",
              );
            }
            visiter(n.gauche, niveau + 1);
            visiter(n.droite, niveau + 1);
          }
        };
        visiter(d.expression, 1);
        if (profondeur > PROFONDEUR_EXPRESSION) {
          push(
            "AIR_CALCUL_TROP_PROFOND",
            `${chemin}.expression`,
            `profondeur ${String(profondeur)} : au-dela de ` +
              `${String(PROFONDEUR_EXPRESSION)}, une expression cesse d'etre ` +
              "relisible par un humain",
          );
        }
        return;
      }

      // ── LE BARÈME NE PASSE PAS PAR UNE RELATION (1.35.0).
      //
      // Il ne regarde AUCUNE autre ligne : c'est une fonction du champ qui
      // porte la quantité, sur la ligne elle-même. Les gardes ci-dessous
      // sont donc les siennes, et le contrôle de relation ne le concerne
      // pas — d'où cette sortie anticipée.
      if (d.kind === "bareme") {
        if (!e.fields.some((x) => x.id === d.fieldId)) {
          push(
            "AIR_BAREME_CHAMP_INCONNU",
            `${chemin}.fieldId`,
            `le champ "${d.fieldId}" n'existe pas sur "${e.id}" : rien ne dit ` +
              `alors SUR QUOI le barème s'applique`,
          );
        }
        // LES PALIERS MONTENT, ET LE DERNIER EST OUVERT. Un palier non
        // croissant rend le barème ambigu — deux prix possibles pour la
        // meme quantite — et un dernier palier borne laisse une quantite
        // sans prix du tout.
        let precedent = 0;
        d.paliers.forEach((p, pi) => {
          const dernier = pi === d.paliers.length - 1;
          if (dernier && p.jusqua !== undefined) {
            push(
              "AIR_BAREME_DERNIER_PALIER_BORNE",
              `${chemin}.paliers[${pi}].jusqua`,
              `le dernier palier porte une borne : au-dela, aucune quantite ` +
                `n'aurait de prix. Le dernier palier ne se borne pas`,
            );
          }
          if (!dernier && p.jusqua === undefined) {
            push(
              "AIR_BAREME_PALIER_SANS_BORNE",
              `${chemin}.paliers[${pi}]`,
              `seul le DERNIER palier peut etre ouvert : celui-ci avalerait ` +
                `tous les suivants`,
            );
            return;
          }
          if (p.jusqua !== undefined && p.jusqua <= precedent) {
            push(
              "AIR_BAREME_PALIERS_DESORDONNES",
              `${chemin}.paliers[${pi}].jusqua`,
              `les paliers doivent monter : ${String(p.jusqua)} ne depasse pas ` +
                `${String(precedent)}, donc deux prix repondraient a la meme quantite`,
            );
          }
          if (p.jusqua !== undefined) precedent = p.jusqua;
        });
        return;
      }

      const rel = air.relations.find((r) => r.id === d.relationId);
      if (rel === undefined) {
        push(
          "AIR_DERIVE_RELATION_INCONNUE",
          `${chemin}.relationId`,
          `la relation "${d.relationId}" n'existe pas : rien ne dit alors QUELLES ` +
            `lignes "${f.id}" agrège`,
        );
        return;
      }
      // ── LA RELATION DOIT PARTIR DE CETTE ENTITÉ.
      //
      // Agréger par une relation qui ne la touche pas sommerait des lignes
      // sans rapport avec celle qu'on regarde — et le chiffre serait le même
      // pour toutes les lignes, ce qui se repère tard et se croit longtemps.
      if (rel.fromEntityId !== e.id) {
        push(
          "AIR_DERIVE_RELATION_ETRANGERE",
          `${chemin}.relationId`,
          `la relation "${rel.id}" part de "${rel.fromEntityId}" et non de "${e.id}" : ` +
            `elle ne mène pas aux lignes de CETTE entité`,
        );
        return;
      }
      // ── `max`, `min`, `porteur` (1.41.0) : QUATRE REFUS.
      //
      // Classer suppose un ordre. Classer ce qui ne s'ordonne pas laisse
      // chaque base SQL trancher autrement — et le gagnant d'une enchere
      // dependrait du moteur.
      if (d.kind === "max" || d.kind === "min" || d.kind === "porteur") {
        const cible = air.entities.find((x) => x.id === rel.toEntityId);
        const champ = cible?.fields.find((x) => x.id === d.fieldId);
        const ordonnable = (t: string | undefined): boolean =>
          t === "number" || t === "decimal" || t === "date" || t === "datetime";
        // ① LE CHAMP CLASSE EXISTE.
        if (champ === undefined) {
          push(
            "AIR_EXTREMUM_CHAMP_INCONNU",
            `${chemin}.fieldId`,
            `"${d.fieldId}" n'est pas un champ de "${rel.toEntityId}" : ` +
              `on ne peut pas classer ce qui n'y est pas`,
          );
        } else if (!ordonnable(champ.type)) {
          // ② ET IL S'ORDONNE.
          push(
            "AIR_EXTREMUM_CHAMP_NON_ORDONNABLE",
            `${chemin}.fieldId`,
            `"${champ.id}" est de type "${champ.type}" : classer ce qui ne ` +
              `s'ordonne pas laisse chaque base SQL trancher autrement`,
          );
        }
        if (d.kind === "porteur") {
          const dep = cible?.fields.find((x) => x.id === d.departage.fieldId);
          // ③ LE DEPARTAGE EXISTE ET S'ORDONNE. Sans lui, une egalite rendrait
          //    « la premiere ligne que la base donne » — et le gagnant d'une
          //    enchere ne peut pas dependre de l'index.
          if (dep === undefined) {
            push(
              "AIR_PORTEUR_DEPARTAGE_INCONNU",
              `${chemin}.departage.fieldId`,
              `"${d.departage.fieldId}" n'est pas un champ de "${rel.toEntityId}" : ` +
                `rien ne departagerait une egalite`,
            );
          } else if (!ordonnable(dep.type)) {
            push(
              "AIR_PORTEUR_DEPARTAGE_NON_ORDONNABLE",
              `${chemin}.departage.fieldId`,
              `"${dep.id}" est de type "${dep.type}" : un departage doit s'ordonner`,
            );
          }
          // ④ LE DEPARTAGE N'EST PAS LE CHAMP CLASSE. Departager par le champ
          //    sur lequel il y a egalite ne departage RIEN — et son auteur
          //    croirait le contraire.
          if (d.departage.fieldId === d.fieldId) {
            push(
              "AIR_PORTEUR_DEPARTAGE_INUTILE",
              `${chemin}.departage.fieldId`,
              `le departage porte sur "${d.fieldId}", le champ meme sur lequel ` +
                `l'egalite a lieu : il ne departage rien`,
            );
          }
        }
        return;
      }
      if (d.kind === "sum") {
        const cible = air.entities.find((x) => x.id === rel.toEntityId);
        const champ = cible?.fields.find((x) => x.id === d.fieldId);
        if (champ === undefined) {
          push(
            "AIR_DERIVE_CHAMP_INCONNU",
            `${chemin}.fieldId`,
            `"${d.fieldId}" n'est pas un champ de "${rel.toEntityId}" : ` +
              `on ne peut pas sommer ce qui n'y est pas`,
          );
        } else if (champ.type !== "number" && champ.type !== "decimal") {
          push(
            "AIR_DERIVE_CHAMP_NON_NUMERIQUE",
            `${chemin}.fieldId`,
            `"${champ.id}" est de type "${champ.type}" : une somme ne se fait que sur des ` +
              `nombres, et sommer autre chose produirait un chiffre qui ne veut rien dire`,
          );
        }
      }
      // ── LA CONDITION D'AGREGAT (1.39.0) : QUATRE REFUS.
      //
      // Un filtre faux ne leve AUCUNE erreur a l'execution : il rend
      // silencieusement zero, ou un total partiel. C'est la pire espece de
      // defaut — un chiffre qui a l'air juste. Les quatre fautes possibles se
      // voient toutes SANS executer quoi que ce soit.
      // A ce point, les autres sortes ont deja rendu : le type est count|sum,
      // et le lint refuse une condition toujours vraie. On lit directement.
      {
        const cond = d.condition;
        if (cond !== undefined) {
          const cible = air.entities.find((x) => x.id === rel.toEntityId);
          const champ = cible?.fields.find((x) => x.id === cond.fieldId);
          // ① LE CHAMP FILTRE EXISTE SUR L'ENTITE AU BOUT DE LA RELATION.
          //    Filtrer sur un champ de la ligne PARENTE donnerait le meme
          //    resultat pour toutes les lignes — faux, et long a voir.
          if (champ === undefined) {
            push(
              "AIR_AGREGAT_CONDITION_CHAMP_INCONNU",
              `${chemin}.condition.fieldId`,
              `"${cond.fieldId}" n'est pas un champ de "${rel.toEntityId}" : ` +
                `la condition porte sur les lignes AGREGEES, pas sur celle qui agrege`,
            );
          } else {
            const liste = Array.isArray(cond.valeur);
            // ② `in` EXIGE UNE LISTE, LES AUTRES UNE VALEUR SEULE. Comparer
            //    un champ a une liste avec `eq` est indefini en SQL.
            if (cond.operateur === "in" && !liste) {
              push(
                "AIR_AGREGAT_CONDITION_LISTE_ATTENDUE",
                `${chemin}.condition.valeur`,
                "`in` compare a plusieurs valeurs : il en faut une LISTE",
              );
            }
            if (cond.operateur !== "in" && liste) {
              push(
                "AIR_AGREGAT_CONDITION_LISTE_INATTENDUE",
                `${chemin}.condition.valeur`,
                `"${cond.operateur}" compare a UNE valeur : une liste ne se compare pas ainsi`,
              );
            }
            // ③ UN FILTRE QUI NE PEUT JAMAIS ETRE VRAI EST REFUSE.
            //
            //    C'est le refus qui compte. Filtrer un champ `enum` sur une
            //    valeur qu'il ne peut pas porter rend TOUJOURS zero, et
            //    personne ne saurait pourquoi le total est vide : ni erreur,
            //    ni avertissement, juste un chiffre faux qui a l'air juste.
            if (champ.type === "enum" && champ.enumValues !== undefined) {
              const permises = new Set(champ.enumValues);
              const essayees = (liste ? cond.valeur : [cond.valeur]) as readonly unknown[];
              const hors = essayees.filter((v) => typeof v !== "string" || !permises.has(v));
              if (hors.length > 0) {
                push(
                  "AIR_AGREGAT_CONDITION_VALEUR_IMPOSSIBLE",
                  `${chemin}.condition.valeur`,
                  `"${champ.id}" ne peut pas valoir ${hors.map((v) => JSON.stringify(v)).join(", ")} ` +
                    `— ses valeurs sont ${champ.enumValues.join(", ")}. Le filtre rendrait ` +
                    `TOUJOURS zero, sans erreur et sans que personne le sache`,
                );
              }
            }
            // ④ LES COMPARAISONS D'ORDRE N'ONT DE SENS QUE SUR CE QUI S'ORDONNE.
            //    `gt` sur un booleen ou un enum ne veut rien dire, et chaque
            //    base SQL en decide autrement.
            const ordonnable =
              champ.type === "number" ||
              champ.type === "decimal" ||
              champ.type === "date" ||
              champ.type === "datetime";
            if (["gt", "gte", "lt", "lte"].includes(cond.operateur) && !ordonnable) {
              push(
                "AIR_AGREGAT_CONDITION_ORDRE_IMPOSSIBLE",
                `${chemin}.condition.operateur`,
                `"${cond.operateur}" ordonne, et "${champ.id}" est de type "${champ.type}" : ` +
                  `chaque base SQL trancherait autrement, donc le total dependrait de la base`,
              );
            }
          }
        }
      }

      // ── ET IL NE SE SAISIT JAMAIS.
      //
      // Un champ dérivé qu'on peut taper finira par contredire ce dont il
      // dérive. C'est le défaut exact que SGD a payé : « un stock écrit diverge
      // de son historique sans que rien ne le signale ».
      //
      // LA GARDE SE POSE SUR LE FORMULAIRE, et non sur l'action — une mutation
      // ne déclare PAS quels champs elle écrit : elle écrit ce que le
      // formulaire de son écran porte. C'est donc là qu'un champ calculé
      // devient saisissable, et donc là qu'il faut le refuser.
      air.screens.forEach((sc, si) => {
        sc.blocks.forEach((b, bi) => {
          if (b.blockType !== "form" || b.entityId !== e.id) return;
          const champs = b.props?.find((p) => p.key === "fieldIds")?.value;
          if (!Array.isArray(champs) || !champs.includes(f.id)) return;
          push(
            "AIR_DERIVE_SAISI",
            `screens[${si}].blocks[${bi}].props.fieldIds`,
            `le formulaire propose de saisir "${f.id}", qui est CALCULÉ à partir d'autres ` +
              `lignes : une valeur tapée finira par contredire ce dont elle dérive`,
          );
        });
      });
    });

    // ── LES TRANSITIONS VIVENT SUR UN CHAMP ÉNUMÉRÉ, ET SUR LUI SEUL.
    e.fields.forEach((f, fi) => {
      if (f.transitions === undefined) return;
      const chemin = `entities[${ei}].fields[${fi}].transitions`;
      if (f.type !== "enum" || f.enumValues === undefined) {
        push(
          "AIR_TRANSITIONS_HORS_ENUM",
          chemin,
          `le champ "${f.id}" déclare des passages d'état alors qu'il est de type "${f.type}" : ` +
            `un automate suppose une liste FERMÉE d'états, que seule une énumération donne`,
        );
        return;
      }
      const valeurs = new Set(f.enumValues);
      f.transitions.forEach((tr, ti) => {
        for (const [cote, v] of [["from", tr.from], ["to", tr.to]] as const) {
          if (valeurs.has(v)) continue;
          push(
            "AIR_TRANSITION_VALEUR_INCONNUE",
            `${chemin}[${ti}].${cote}`,
            `"${v}" n'est pas une valeur de "${f.id}" : une transition vers un état qui ` +
              `n'existe pas ne se produira jamais`,
          );
        }
      });
      // ── UN ÉTAT QU'AUCUNE TRANSITION N'ATTEINT EST UN ÉTAT MORT.
      //
      // Le premier état de l'énumération est l'état INITIAL — c'est ainsi qu'on
      // lit une énumération, et le cahier de la tontine l'écrit dans cet ordre.
      // Tous les autres doivent être atteignables, sinon le document promet un
      // état que rien ne produira.
      const atteints = new Set([f.enumValues[0], ...f.transitions.map((t) => t.to)]);
      f.enumValues.forEach((v) => {
        if (atteints.has(v)) return;
        push(
          "AIR_TRANSITION_ETAT_MORT",
          chemin,
          `l'état "${v}" de "${f.id}" n'est atteint par AUCUNE transition et n'est pas ` +
            `l'état initial : le document le promet et rien ne l'y mènera`,
        );
      });
    });
  });

  // ── UNE CONFIRMATION NE PROTÈGE QUE CE QUI EST IRRÉVERSIBLE (1.32.0).
  //
  // Demander un code à six chiffres pour CHANGER D'ÉCRAN n'ajoute aucune
  // sécurité : cela apprend seulement à taper des codes sans les lire, et
  // dévalue la confirmation là où elle compte vraiment.
  air.actions.forEach((a, i) => {
    if (a.confirmation === undefined) return;
    if (a.effect.kind === "navigate") {
      push(
        "AIR_CONFIRMATION_SANS_CONSEQUENCE",
        `actions[${i}].confirmation`,
        `l'action "${a.id}" exige un code de confirmation pour une simple navigation : ` +
          `une confirmation qui protège un geste sans conséquence apprend à les expédier`,
      );
    }
  });

  const blockIds = new Set(air.screens.flatMap((s) => s.blocks.map((b) => b.id)));
  const entityById = new Map(air.entities.map((e) => [e.id, e]));
  const slotIds = new Set(air.slots.map((s) => s.id));
  const declaredCapabilities = new Set(air.capabilities.map((c) => c.capability));
  const defaultLocale = air.app.locales.defaultAppLocale;

  // 1. Unicité GLOBALE des identités stables — un id désigne un seul nœud.
  const seen = new Map<string, string>();
  const identities: [string, string][] = [[air.projectId, "projectId"]];
  air.screens.forEach((s, i) => {
    identities.push([s.id, `screens[${i}]`]);
    s.blocks.forEach((b, j) => {
      identities.push([b.id, `screens[${i}].blocks[${j}]`]);
    });
  });
  air.navigation.routes.forEach((r, i) => {
    identities.push([r.id, `navigation.routes[${i}]`]);
  });
  air.entities.forEach((e, i) => {
    identities.push([e.id, `entities[${i}]`]);
    e.fields.forEach((f, j) => {
      identities.push([f.id, `entities[${i}].fields[${j}]`]);
    });
  });
  air.relations.forEach((r, i) => {
    identities.push([r.id, `relations[${i}]`]);
  });
  air.datasets.forEach((d, i) => {
    identities.push([d.id, `datasets[${i}]`]);
  });
  air.actions.forEach((a, i) => {
    identities.push([a.id, `actions[${i}]`]);
  });
  air.rules.forEach((r, i) => {
    identities.push([r.id, `rules[${i}]`]);
  });
  air.slots.forEach((s, i) => {
    identities.push([s.id, `slots[${i}]`]);
  });
  air.integrations.forEach((x, i) => {
    identities.push([x.id, `integrations[${i}]`]);
  });
  air.expectedTests.forEach((t, i) => {
    identities.push([t.id, `expectedTests[${i}]`]);
  });
  air.intent?.needs.forEach((n, i) => {
    identities.push([n.id, `intent.needs[${i}]`]);
  });
  // DROITS ET RÔLES (1.28.0) — OUBLIÉS à l'écriture du contrôle d'accès, et
  // c'est une omission, pas un choix : sans eux ici, un droit pouvait porter
  // l'identifiant d'un écran sans que rien ne le signale, et `requiredRightId`
  // aurait désigné deux nœuds à la fois.
  air.access?.rights.forEach((r, i) => {
    identities.push([r.id, `access.rights[${i}]`]);
  });
  air.access?.roles.forEach((r, i) => {
    identities.push([r.id, `access.roles[${i}]`]);
  });

  // NAVIGATION PRINCIPALE (1.6.0, D-086) — quatre refus, chacun mesurable.
  //
  // Le quatrième est le plus important : une destination qui mène à un écran
  // NON FONCTIONNEL produirait une barre magnifique menant à du vide. **Une
  // navigation qui mène à du vide est pire que quatre boutons empilés : elle est
  // belle.** Un écran est tenu pour fonctionnel s'il porte au moins un bloc lié
  // à une entité, ou au moins une action. Un écran qui n'a ni l'un ni l'autre
  // n'a rien à montrer et rien à faire.
  if (air.navigation.primary !== undefined) {
    const routeById = new Map(air.navigation.routes.map((r) => [r.id, r]));
    const blocsDeLEcran = new Map(air.screens.map((s) => [s.id, s]));
    const actionsParEcran = new Set<string>();
    for (const a of air.actions) {
      const t = a.trigger;
      if (t.kind === "ui") {
        const e = air.screens.find((s) => s.blocks.some((b) => b.id === t.blockId));
        if (e !== undefined) actionsParEcran.add(e.id);
      } else if (t.kind === "lifecycle" && t.screenId !== undefined) {
        actionsParEcran.add(t.screenId);
      }
    }
    const ordres = new Set<number>();
    air.navigation.primary.destinations.forEach((d, i) => {
      const path = `navigation.primary.destinations[${i}]`;
      const route = routeById.get(d.routeId);
      if (route === undefined) {
        push("AIR_NAV_ROUTE_MISSING", path, `route "${d.routeId}" non déclarée`);
        return;
      }
      if (ordres.has(d.order)) {
        push("AIR_NAV_ORDER_DUPLICATE", path, `ordre ${String(d.order)} déjà utilisé`);
      }
      ordres.add(d.order);
      const ecran = blocsDeLEcran.get(route.screenId);
      if (ecran === undefined) {
        push("AIR_NAV_SCREEN_MISSING", path, `écran "${route.screenId}" non déclaré`);
        return;
      }
      const aDesDonnees = ecran.blocks.some((b) => b.entityId !== undefined);
      const aUneAction = actionsParEcran.has(ecran.id);
      if (!aDesDonnees && !aUneAction) {
        push(
          "AIR_NAV_DESTINATION_DEAD",
          path,
          `l'écran "${ecran.id}" n'a ni bloc lié à une entité ni action : une destination principale ne peut pas mener à un écran vide`,
        );
      }
    });
    // DOUBLON D'ONGLET (D-086) — un bouton placé SUR un onglet et menant à un
    // AUTRE onglet est une redondance pure : la barre est déjà là, sous le
    // doigt. C'est le défaut fondateur — quatre boutons sous la liste des plats,
    // vers panier / commandes / compte, tous présents dans la barre.
    //
    // 🔴 CRITÈRE PRÉCIS, et voici pourquoi il l'est : un bouton depuis un écran
    // de FLUX (un détail, une étape) vers un onglet n'est PAS un doublon, c'est
    // un appel à l'action qui fait avancer l'utilisateur — « Débloquer avec
    // l'abonnement » depuis la fiche d'un programme verrouillé. Le confondre
    // avec le défaut reviendrait à interdire toute conversion.
    const ecranDest = new Set<string>();
    for (const d of air.navigation.primary.destinations) {
      const r = routeById.get(d.routeId);
      if (r !== undefined) ecranDest.add(r.screenId);
    }
    air.actions.forEach((action, i) => {
      if (action.effect.kind !== "navigate" || action.trigger.kind !== "ui") return;
      const bloc = action.trigger.blockId;
      const source = air.screens.find((s) => s.blocks.some((b) => b.id === bloc));
      if (source === undefined) return;
      const type = source.blocks.find((b) => b.id === bloc)?.blockType;
      if (type !== "button") return;
      if (!ecranDest.has(source.id)) return;
      if (!ecranDest.has(action.effect.screenId)) return;
      push(
        "AIR_NAV_TAB_DUPLICATE",
        `actions[${i}]`,
        `bouton sur l'onglet "${source.id}" menant à l'onglet "${action.effect.screenId}" : la navigation principale l'offre déjà`,
      );
    });

    // IMAGE ORPHELINE (D-087) — une image déclarée sur une entité AFFICHÉE et
    // jamais montrée est un défaut. Mesuré : 23 champs sur 12 documents rendus
    // nulle part, puis 3 encore orphelins APRÈS une première version de la
    // règle de prompt : le mot « pertinent » y servait de porte de sortie.
    //
    // 🔴 POURQUOI ICI ET PAS SEULEMENT DANS LE PROMPT : un prompt est une
    // DEMANDE, un validateur est une GARANTIE. `emit-v3` valide localement et
    // renvoie ses diagnostics au modèle pour réparation (`attempts=2`, observé
    // sur les deux générations). Porté ici, le respect cesse de dépendre du
    // bon vouloir d'un modèle.
    //
    // PORTÉE ASSUMÉE : ce refus ne s'applique qu'aux documents déclarant
    // `navigation.primary`. Le corpus GELÉ n'en déclare aucun (0/12, vérifié)
    // et reste donc valide — le geler puis le rendre invalide détruirait la
    // base de comparaison de toutes les mesures historiques.
    const entiteAffichee = new Map<string, boolean>();
    for (const s of air.screens) {
      for (const b of s.blocks) {
        if (b.entityId !== undefined) entiteAffichee.set(b.entityId, true);
      }
    }
    const imagesMontrees = new Set<string>();
    for (const s of air.screens) {
      for (const b of s.blocks) {
        for (const pr of b.props ?? []) {
          if (pr.key === "imageFieldId") imagesMontrees.add(String(pr.value));
        }
      }
    }
    // ── D-098 · LE CHEMIN DIT OÙ EST LA RÉPARATION LÉGITIME.
    //
    // Ce diagnostic offrait DEUX issues : afficher, ou ne pas déclarer. Le
    // garde de réparation déduit son périmètre du CHEMIN (D-093) ; en pointant
    // le champ, il autorisait donc la SUPPRESSION — même quand un bloc capable
    // de l'afficher existait. Mesuré sur `coach-fitness` : `fld_prog_couverture`
    // a deux porteurs possibles, et le supprimer restait indolore.
    //
    // Quand un PORTEUR existe — un `list` ou un `detail_header` lié à cette
    // entité — la réparation légitime est l'AFFICHAGE, et le chemin désigne ce
    // bloc : supprimer le champ sort alors du périmètre. Sans porteur, le champ
    // reste désigné et sa suppression demeure permise. La distinction est une
    // propriété DÉCIDABLE du document, jamais un cas particulier.
    const PORTEURS_IMAGE = new Set(["list", "detail_header"]);
    const porteurDe = new Map<string, string>();
    air.screens.forEach((s, si) => {
      s.blocks.forEach((b, bi) => {
        if (b.entityId === undefined || !PORTEURS_IMAGE.has(b.blockType)) return;
        if (!porteurDe.has(b.entityId)) porteurDe.set(b.entityId, `screens[${si}].blocks[${bi}]`);
      });
    });
    air.entities.forEach((e, i) => {
      if (entiteAffichee.get(e.id) !== true) return;
      e.fields.forEach((f, j) => {
        if (f.type !== "asset" || imagesMontrees.has(f.id)) return;
        // ── UN CHAMP SENSIBLE N'EST PAS UN ORPHELIN (2026-10-13).
        //
        // MESURE QUI A IMPOSE CETTE EXEMPTION, et c'etait une CONTRADICTION
        // entre deux regles du meme validateur. `AIR_FIELD_SENSITIVE_DISPLAYED`
        // INTERDIT d'afficher un champ sensible ; `AIR_IMAGE_ORPHELINE`
        // EXIGEAIT qu'une image declaree sur une entite affichee soit montree.
        // Les deux ensemble rendaient une image sensible IMPOSSIBLE a
        // declarer : quoi qu'on fasse, un refus tombait.
        //
        // Trouvee en appliquant une demande reelle, du proprietaire du cahier
        // de la tontine : « les membres de gestion doivent avoir leur piece
        // d'identite stockee directement dans le systeme mais PAS VISIBLE aux
        // autres membres ». Une piece d'identite est exactement cela — gardee,
        // jamais montree.
        //
        // L'exemption ne relache rien : le champ reste refuse a l'AFFICHAGE
        // par l'autre regle. Elle dit seulement qu'un champ qu'on a INTERDIT
        // de montrer ne peut pas, en meme temps, etre reproche de ne pas
        // l'etre.
        if (f.sensitive === true) return;
        const porteur = porteurDe.get(e.id);
        if (porteur !== undefined) {
          push(
            "AIR_IMAGE_ORPHELINE",
            porteur,
            `"${f.id}" est déclaré sur l'entité affichée "${e.id}" et n'est montré par aucun bloc : ce bloc peut le porter, déclare-le sur son \`imageFieldId\``,
          );
          return;
        }
        push(
          "AIR_IMAGE_ORPHELINE",
          `entities[${i}].fields[${j}]`,
          `"${f.id}" est déclaré sur l'entité affichée "${e.id}" et aucun bloc \`list\` ou \`detail_header\` ne peut l'afficher : déclare un tel bloc, ou ne déclare pas ce champ`,
        );
      });
    });

    // Ordres CONTIGUS depuis 0 : un trou signifierait une position vide dans la
    // barre, que le runtime devrait combler en inventant.
    const attendus = [...air.navigation.primary.destinations.keys()];
    if ([...ordres].sort((a, b) => a - b).join(",") !== attendus.join(",")) {
      push(
        "AIR_NAV_ORDER_NOT_CONTIGUOUS",
        "navigation.primary",
        `les ordres doivent être contigus depuis 0 (reçu : ${[...ordres].sort((a, b) => a - b).join(", ")})`,
      );
    }
  }

  // AFFICHAGE DES RÉFÉRENCES (1.4.0) — le champ désigné doit exister SUR
  // L'ENTITÉ CIBLE, sinon la traversée afficherait du vide en croyant résoudre.
  air.entities.forEach((entity, i) => {
    entity.fields.forEach((field, j) => {
      if (field.referenceDisplayFieldId === undefined) return;
      const path = `entities[${i}].fields[${j}].referenceDisplayFieldId`;
      if (field.type !== "reference" || field.referencesEntityId === undefined) {
        push("AIR_FIELD_DISPLAY_NOT_REFERENCE", path, `champ "${field.id}" n'est pas une référence`);
        return;
      }
      const cible = entityById.get(field.referencesEntityId);
      if (cible === undefined) return;
      if (!cible.fields.some((f) => f.id === field.referenceDisplayFieldId)) {
        push(
          "AIR_FIELD_DISPLAY_MISSING",
          path,
          `"${field.referenceDisplayFieldId}" absent de l'entité "${cible.id}"`,
        );
      }
    });
  });

  // LIAISON DES SLOTS (1.3.0) — une liaison partielle est REFUSÉE. Un port
  // d'entrée non lié produirait un `undefined` silencieux dans du code
  // d'auteur ; un port inconnu ferait croire à un câblage qui n'existe pas.
  const slotById = new Map(air.slots.map((s) => [s.id, s]));
  air.actions.forEach((action, i) => {
    if (action.effect.kind !== "slot" || action.effect.binding === undefined) return;
    const path = `actions[${i}].effect.binding`;
    const slot = slotById.get(action.effect.slotId);
    if (slot === undefined) {
      push("AIR_SLOT_UNKNOWN", path, `slot "${action.effect.slotId}" non déclaré`);
      return;
    }
    const { inputs, outputs } = action.effect.binding;
    const liees = new Set(inputs.map((b) => b.port));
    for (const port of slot.inputs) {
      if (!liees.has(port.name)) {
        push("AIR_SLOT_INPUT_UNBOUND", path, `entrée "${port.name}" du slot "${slot.id}" non liée`);
      }
    }
    const attendus = new Set(slot.inputs.map((p) => p.name));
    inputs.forEach((b, j) => {
      if (!attendus.has(b.port)) {
        push("AIR_SLOT_INPUT_UNKNOWN", `${path}.inputs[${j}]`, `le slot "${slot.id}" ne déclare aucune entrée "${b.port}"`);
      }
      if (b.source.kind === "entity_rows" && !entityById.has(b.source.entityId)) {
        push("AIR_REF_ENTITY_MISSING", `${path}.inputs[${j}]`, `entité "${b.source.entityId}" inconnue`);
      }
    });
    const sorties = new Set(slot.outputs.map((p) => p.name));
    outputs.forEach((b, j) => {
      if (!sorties.has(b.port)) {
        push("AIR_SLOT_OUTPUT_UNKNOWN", `${path}.outputs[${j}]`, `le slot "${slot.id}" ne déclare aucune sortie "${b.port}"`);
      }
      if (!blockIds.has(b.blockId)) {
        push("AIR_REF_BLOCK_MISSING", `${path}.outputs[${j}]`, `bloc "${b.blockId}" inconnu`);
      }
    });
  });
  for (const [id, path] of identities) {
    const first = seen.get(id);
    if (first === undefined) {
      seen.set(id, path);
    } else {
      push("AIR_DUP_ID", path, `identifiant "${id}" déjà utilisé à ${first}`);
    }
  }

  // ── 1bis. UN BESOIN DÉCLARÉ PORTÉ DOIT NOMMER DES NŒUDS QUI EXISTENT.
  //
  // `intent.needs` est la réponse à la question « ce format sait-il dire ce que
  // le domaine demande ? ». Chaque besoin sort `satisfied` — avec les nœuds qui
  // le portent — ou `unexpressible` avec motif. C'est la MESURE du format, et
  // elle était ENTIÈREMENT sur parole : rien ne vérifiait que les nœuds nommés
  // existaient.
  //
  // CE QUE CELA A COÛTÉ, et c'est de moi. En portant SGD, j'ai classé le besoin
  // des écrans calculés `unexpressible` avec ce motif : « il n'existe aucun
  // nœud pour décrire une agrégation ». Mesure du 2026-10-04 : faux sur les
  // quatre étages — un slot, une action `lifecycle/screen_open` et une liaison
  // le font, le compilateur l'émet, le runtime l'honore. Trois écrans
  // affichaient donc une EXCUSE à l'utilisateur pour un manque inexistant.
  //
  // Un motif faux ne se rattrape pas par de la relecture — rien ne pouvait le
  // contredire. Dans l'autre sens, un `satisfied` qui nomme n'importe quoi
  // gonflerait le score sans qu'aucun test ne proteste. Ce cliquet ferme le
  // second sens, qui est le seul mécanisable : on ne peut pas prouver qu'un
  // manque est réel, on peut exiger qu'une satisfaction soit ADOSSÉE.
  //
  // COÛT MESURÉ AVANT DE POSER : sur 111 documents réels — corpus de référence
  // compris — 9878 nœuds nommés, 23 introuvables (0,23 %), concentrés sur 3
  // résultats de campagne archivés dont une réparation partielle. Le corpus de
  // référence passe INTACT. Le cliquet ne coûte rien à ce qui est juste.
  air.intent?.needs.forEach((n, i) => {
    if (n.resolution.kind !== "satisfied") return;
    for (const [j, nodeId] of n.resolution.nodeIds.entries()) {
      if (seen.has(nodeId)) continue;
      push(
        "AIR_NEED_NODE_UNKNOWN",
        `intent.needs[${i}].resolution.nodeIds[${j}]`,
        `le besoin "${n.id}" se déclare PORTÉ par le nœud "${nodeId}", qui n'existe ` +
          `dans aucune collection du document : la satisfaction n'est adossée à rien`,
      );
    }
  });

  // 2. Locales : la locale par défaut appartient aux locales de l'app, et
  // tout texte localisé obligatoire la couvre.
  if (!air.app.locales.appLocales.includes(defaultLocale)) {
    push(
      "AIR_LOCALE_DEFAULT_NOT_DECLARED",
      "app.locales.defaultAppLocale",
      `locale par défaut "${defaultLocale}" absente de appLocales`,
    );
  }
  const checkLocalized = (
    text: { locale: string; text: string }[] | undefined,
    path: string,
  ): void => {
    if (text === undefined) {
      return;
    }
    if (!text.some((t) => t.locale === defaultLocale)) {
      push(
        "AIR_L10N_MISSING_DEFAULT",
        path,
        `texte localisé sans la locale par défaut "${defaultLocale}"`,
      );
    }
    const locales = new Set<string>();
    for (const t of text) {
      if (locales.has(t.locale)) {
        push("AIR_L10N_DUP_LOCALE", path, `locale "${t.locale}" présente deux fois`);
      }
      locales.add(t.locale);
    }
  };

  // Configurations plates : unicité des clés.
  const checkConfig = (
    config: { key: string; value: unknown }[] | undefined,
    path: string,
  ): void => {
    if (config === undefined) {
      return;
    }
    const keys = new Set<string>();
    config.forEach((pair, i) => {
      if (keys.has(pair.key)) {
        push("AIR_CONFIG_DUP_KEY", `${path}[${i}]`, `clé "${pair.key}" présente deux fois`);
      }
      keys.add(pair.key);
    });
  };
  air.screens.forEach((s, i) => {
    s.blocks.forEach((b, j) => {
      checkConfig(b.props, `screens[${i}].blocks[${j}].props`);
    });
  });
  air.actions.forEach((a, i) => {
    if (a.effect.kind === "capability") {
      checkConfig(a.effect.params, `actions[${i}].effect.params`);
    }
  });
  air.capabilities.forEach((c, i) => {
    checkConfig(c.config, `capabilities[${i}].config`);
  });
  checkConfig(air.design.overrides, "design.overrides");
  air.integrations.forEach((x, i) => {
    checkConfig(x.config, `integrations[${i}].config`);
  });
  air.screens.forEach((s, i) => {
    checkLocalized(s.title, `screens[${i}].title`);
  });
  air.navigation.routes.forEach((r, i) => {
    checkLocalized(r.title, `navigation.routes[${i}].title`);
  });
  air.permissions.forEach((p, i) => {
    checkLocalized(p.reason, `permissions[${i}].reason`);
  });

  // 3. Navigation : entrée et routes pointent vers des écrans existants.
  if (!screenIds.has(air.navigation.entryScreenId)) {
    push(
      "AIR_NAV_ENTRY_UNKNOWN",
      "navigation.entryScreenId",
      `écran "${air.navigation.entryScreenId}" introuvable`,
    );
  }
  air.navigation.routes.forEach((r, i) => {
    if (!screenIds.has(r.screenId)) {
      push(
        "AIR_NAV_SCREEN_UNKNOWN",
        `navigation.routes[${i}].screenId`,
        `écran "${r.screenId}" introuvable`,
      );
    }
  });

  // 4. Blocs : la liaison de données référence une entité existante.
  air.screens.forEach((s, i) => {
    s.blocks.forEach((b, j) => {
      if (b.entityId !== undefined && !entityById.has(b.entityId)) {
        push(
          "AIR_BLOCK_ENTITY_UNKNOWN",
          `screens[${i}].blocks[${j}].entityId`,
          `entité "${b.entityId}" introuvable`,
        );
      }
    });
  });

  // 5. Champs : cohérence type ↔ attributs conditionnels.
  air.entities.forEach((e, i) => {
    e.fields.forEach((f, j) => {
      const path = `entities[${i}].fields[${j}]`;
      if (f.type === "enum" && f.enumValues === undefined) {
        push("AIR_FIELD_ENUM_VALUES_MISSING", path, `champ enum "${f.id}" sans enumValues`);
      }
      if (f.type !== "enum" && f.enumValues !== undefined) {
        push("AIR_FIELD_ENUM_VALUES_UNEXPECTED", path, `enumValues sur un champ non-enum "${f.id}"`);
      }
      // 1.10.0 (DET-032) — libellés d'affichage : mêmes exigences de locale
      // que tout texte localisé, et cohérence stricte avec enumValues.
      checkLocalized(f.label, `${path}.label`);
      if (f.enumLabels !== undefined) {
        // 1.21.0 — les BOOLÉENS aussi : « true »/« false » à l'écran est le
        // même défaut que « a_l_heure » (badge « false » mesuré sur capture).
        if (f.type !== "enum" && f.type !== "boolean") {
          push("AIR_FIELD_ENUM_LABELS_UNEXPECTED", path, `enumLabels sur un champ non-enum "${f.id}"`);
        }
        // 1.19.0 — liste de paires : mêmes vérifications, plus l'UNICITÉ des
        // valeurs, qu'un dictionnaire garantissait par construction.
        const valeursVues = new Set<string>();
        for (const { value: valeur, label: texte } of f.enumLabels) {
          if (valeursVues.has(valeur)) {
            push(
              "AIR_FIELD_ENUM_LABEL_DUPLICATE",
              `${path}.enumLabels`,
              `libellé déclaré deux fois pour "${valeur}" sur "${f.id}"`,
            );
          }
          valeursVues.add(valeur);
          if (f.enumValues !== undefined && !f.enumValues.includes(valeur)) {
            push(
              "AIR_FIELD_ENUM_LABEL_UNKNOWN_VALUE",
              `${path}.enumLabels`,
              `libellé pour "${valeur}", absente de enumValues de "${f.id}"`,
            );
          }
          checkLocalized(texte, `${path}.enumLabels.${valeur}`);
        }
      }
      // 1.20 — les demoValues d'un champ IMAGE sont des URLs https dont
      // l'hôte est DÉCLARÉ : la politique deny_by_default vaut pour tout ce
      // que l'app affichera, données de démo comprises.
      if (f.type === "asset" && f.demoValues !== undefined) {
        f.demoValues.forEach((u, di) => {
          const hote = /^https:\/\/([^/]+)\//.exec(u)?.[1];
          if (hote === undefined || !air.network.allowedDomains.includes(hote)) {
            push(
              "AIR_FIELD_DEMO_IMAGE_DOMAIN",
              `${path}.demoValues[${String(di)}]`,
              `image de démo hors politique réseau : "${u.slice(0, 60)}"`,
            );
          }
        });
      }
      if (f.type === "reference") {
        if (f.referencesEntityId === undefined) {
          push("AIR_FIELD_REFERENCE_TARGET_MISSING", path, `champ reference "${f.id}" sans cible`);
        } else if (!entityById.has(f.referencesEntityId)) {
          push("AIR_FIELD_REFERENCE_TARGET_UNKNOWN", path, `entité "${f.referencesEntityId}" introuvable`);
        }
      }
      if (f.type !== "reference" && f.referencesEntityId !== undefined) {
        push("AIR_FIELD_REFERENCE_UNEXPECTED", path, `referencesEntityId sur un champ non-reference "${f.id}"`);
      }
    });
  });

  // 6. Relations et datasets : entités existantes.
  air.relations.forEach((r, i) => {
    if (!entityById.has(r.fromEntityId)) {
      push("AIR_REL_ENTITY_UNKNOWN", `relations[${i}].fromEntityId`, `entité "${r.fromEntityId}" introuvable`);
    }
    if (!entityById.has(r.toEntityId)) {
      push("AIR_REL_ENTITY_UNKNOWN", `relations[${i}].toEntityId`, `entité "${r.toEntityId}" introuvable`);
    }
  });
  air.datasets.forEach((d, i) => {
    if (!entityById.has(d.entityId)) {
      push("AIR_DATASET_ENTITY_UNKNOWN", `datasets[${i}].entityId`, `entité "${d.entityId}" introuvable`);
    }
    // SOURCE DISTANTE (1.7.1, E3.3/D-131 — sémantique E3.2/D-130 inchangée ;
    // forme APLANIE : l'union 1.7.0 dépassait la limite réelle de grammaire
    // de l'API, classe D-078) — FAIL-CLOSED : déclarer une provenance sans
    // son intégration ni son domaine autorisé serait une vivacité de façade.
    // Additif : seul un document déclarant `remote` est concerné — le corpus
    // gelé n'en porte aucun. La cohérence de FORME (remote exige
    // integrationId + domaine ; seed n'admet rien ; rien sans sourceKind)
    // est déjà refusée au SCHÉMA (superRefine).
    if (d.sourceKind === "remote") {
      const sid = d.sourceIntegrationId;
      if (sid !== undefined && !air.integrations.some((g) => g.id === sid)) {
        push(
          "AIR_DATASET_SOURCE_INTEGRATION_UNKNOWN",
          `datasets[${i}].sourceIntegrationId`,
          `intégration "${sid}" introuvable : une source distante ` +
            `se déclare par une intégration EXISTANTE, jamais par un nom inventé`,
        );
      }
      const dom = d.sourceDomain;
      if (dom !== undefined && !air.network.allowedDomains.includes(dom)) {
        push(
          "AIR_DATASET_SOURCE_DOMAIN",
          `datasets[${i}].sourceDomain`,
          `domaine "${dom}" absent de network.allowedDomains ` +
            `(deny_by_default) : une provenance hors de la politique réseau déclarée ` +
            `est refusée`,
        );
      }
    }
  });

  // 7. Actions : déclencheurs et effets référencent des nœuds existants ; un
  // effet capability exige une capability DÉCLARÉE (allowlist positive, §2).
  air.actions.forEach((a, i) => {
    const t = a.trigger;
    if (t.kind === "ui" && !blockIds.has(t.blockId)) {
      push("AIR_ACTION_TRIGGER_BLOCK_UNKNOWN", `actions[${i}].trigger.blockId`, `bloc "${t.blockId}" introuvable`);
    }
    if (t.kind === "lifecycle" && t.screenId !== undefined && !screenIds.has(t.screenId)) {
      push("AIR_ACTION_TRIGGER_SCREEN_UNKNOWN", `actions[${i}].trigger.screenId`, `écran "${t.screenId}" introuvable`);
    }
    if (t.kind === "data" && !entityById.has(t.entityId)) {
      push("AIR_ACTION_TRIGGER_ENTITY_UNKNOWN", `actions[${i}].trigger.entityId`, `entité "${t.entityId}" introuvable`);
    }
    const e = a.effect;
    if (e.kind === "capability" && !declaredCapabilities.has(e.capability)) {
      push(
        "AIR_ACTION_CAPABILITY_UNDECLARED",
        `actions[${i}].effect.capability`,
        `capability "${e.capability}" non déclarée dans capabilities`,
      );
    }
    if (e.kind === "slot" && !slotIds.has(e.slotId)) {
      push("AIR_ACTION_SLOT_UNKNOWN", `actions[${i}].effect.slotId`, `slot "${e.slotId}" introuvable`);
    }
    if (e.kind === "navigate" && !screenIds.has(e.screenId)) {
      push("AIR_ACTION_SCREEN_UNKNOWN", `actions[${i}].effect.screenId`, `écran "${e.screenId}" introuvable`);
    }
    if (e.kind === "mutation" && !entityById.has(e.entityId)) {
      push("AIR_ACTION_ENTITY_UNKNOWN", `actions[${i}].effect.entityId`, `entité "${e.entityId}" introuvable`);
    }
  });

  // 7bis. Condition de visibilité (1.1.0) : l'entité visée DOIT exister.
  //       Sans ce contrôle, un bloc pourrait être conditionné sur une entité
  //       fantôme et disparaître silencieusement de l'app.
  air.screens.forEach((screen, si) => {
    screen.blocks.forEach((block, bi) => {
      const condition = block.visibleWhen;
      if (condition === undefined) return;
      // 1.11.0 — seuls les prédicats de DONNÉES désignent une entité ; ceux de
      // SESSION n'en portent aucune, il n'y a rien à résoudre. Discrimination
      // POSITIVE : elle restreint le type au membre qui porte `entityId`.
      if (condition.kind === "entity_empty" || condition.kind === "entity_not_empty") {
        if (!entityById.has(condition.entityId)) {
          push(
            "AIR_BLOCK_VISIBILITY_ENTITY_UNKNOWN",
            `screens[${si}].blocks[${bi}].visibleWhen.entityId`,
            `entité "${condition.entityId}" introuvable`,
          );
        }
      }
    });
  });

  // 7ter. UN CHAMP SENSIBLE NE S'AFFICHE JAMAIS (1.12.0). Il se saisit, il ne
  // se montre pas : le pointer depuis un titre, un sous-titre, un badge, une
  // recherche ou un tri le ferait apparaître à l'écran ou dans un journal.
  // Fail-closed : la liste des props d'affichage est ENUMÉRÉE, pas devinée.
  const PROPS_AFFICHAGE = [
    "titleFieldId",
    "subtitleFieldId",
    "trailingFieldId",
    "badgeFieldId",
    "badgeFieldIds",
    "imageFieldId",
    "searchFieldId",
    "sortFieldId",
    "filterFieldId",
    "scopeFieldId",
    "userFilterFieldIds",
  ];
  const champsSensibles = new Set(
    air.entities.flatMap((e) => e.fields.filter((f) => f.sensitive === true).map((f) => f.id)),
  );
  if (champsSensibles.size > 0) {
    air.screens.forEach((screen, si) => {
      screen.blocks.forEach((b, bi) => {
        for (const prop of b.props ?? []) {
          if (!PROPS_AFFICHAGE.includes(prop.key)) continue;
          const vises = Array.isArray(prop.value) ? prop.value : [prop.value];
          for (const v of vises) {
            if (typeof v === "string" && champsSensibles.has(v)) {
              push(
                "AIR_FIELD_SENSITIVE_DISPLAYED",
                `screens[${si}].blocks[${bi}].props.${prop.key}`,
                `champ sensible "${v}" utilisé pour l'affichage`,
              );
            }
          }
        }
      });
    });
  }

  // 7quater. UNE DESTINATION PRINCIPALE NE PEUT PAS MASQUER LA BARRE (1.15.0).
  // Elle deviendrait inatteignable depuis elle-même : l'onglet actif serait
  // le seul chemin, et il n'existerait plus.
  const ecransDestinations = new Set(
    (air.navigation.primary?.destinations ?? []).flatMap((d) => {
      const route = air.navigation.routes.find((r) => r.id === d.routeId);
      return route === undefined ? [] : [route.screenId];
    }),
  );
  air.screens.forEach((screen, i) => {
    if (screen.showsPrimaryNav === false && ecransDestinations.has(screen.id)) {
      push(
        "AIR_NAV_DESTINATION_SANS_BARRE",
        `screens[${i}].showsPrimaryNav`,
        `l'écran "${screen.id}" est une destination principale : masquer la barre le rendrait inatteignable`,
      );
    }
  });

  // 7sexies. UN LIBELLÉ DE FERMETURE SUPPOSE UNE FEUILLE (1.18.0). Déclaré sur
  // une carte poussée, il ne serait rendu nulle part : le document promettrait
  // un contrôle que l'écran n'a pas. On REFUSE plutôt que d'ignorer — c'est la
  // même règle que partout ailleurs, une déclaration morte est un défaut.
  air.screens.forEach((screen, i) => {
    if (screen.dismissLabel !== undefined && screen.presentation !== "sheet") {
      push(
        "AIR_SHEET_DISMISS_SANS_FEUILLE",
        `screens[${i}].dismissLabel`,
        `l'écran "${screen.id}" n'est pas une feuille : son libellé de fermeture ne serait rendu nulle part`,
      );
    }
  });

  // 7quinquies. LA MARQUE RESPECTE LA POLITIQUE RÉSEAU (1.9.0). Charger un
  // logo depuis un domaine non déclaré contredirait `deny_by_default` : la
  // politique vaut pour TOUT ce que l'app va chercher, pas seulement pour ses
  // données. Fail-closed, comme le reste.
  air.screens.forEach((screen, si) => {
    screen.blocks.forEach((b, bi) => {
      const logo = (b.props ?? []).find((pr) => pr.key === "logoUri");
      if (logo === undefined || typeof logo.value !== "string") return;
      const hote = /^https:\/\/([^/]+)\//.exec(logo.value)?.[1];
      if (hote === undefined || !air.network.allowedDomains.includes(hote)) {
        push(
          "AIR_BRAND_DOMAIN_NOT_ALLOWED",
          `screens[${si}].blocks[${bi}].props.logoUri`,
          `hôte "${String(hote)}" absent de network.allowedDomains`,
        );
      }
    });
  });

  // 8. Règles : entité existante, champs des assertions appartenant à
  // l'entité ciblée.
  air.rules.forEach((r, i) => {
    const entity = entityById.get(r.entityId);
    if (entity === undefined) {
      push("AIR_RULE_ENTITY_UNKNOWN", `rules[${i}].entityId`, `entité "${r.entityId}" introuvable`);
      return;
    }
    const fieldIds = new Set(entity.fields.map((f) => f.id));
    r.assertions.forEach((assertion, j) => {
      if (!fieldIds.has(assertion.fieldId)) {
        push(
          "AIR_RULE_FIELD_UNKNOWN",
          `rules[${i}].assertions[${j}].fieldId`,
          `champ "${assertion.fieldId}" absent de l'entité "${r.entityId}"`,
        );
      }
      // ── COMPARER DEUX CHAMPS (1.35.0) : TROIS REFUS.
      //
      // ① Le champ désigné doit exister SUR LA MÊME entité. Traverser une
      //    relation demanderait de lire une autre ligne, donc la base : ce ne
      //    serait plus une règle de saisie, et le serveur la vérifie AVANT
      //    d'écrire.
      // ② `value` et `otherFieldId` ensemble ne diraient pas à quoi comparer.
      // ③ Un champ comparé à LUI-MÊME est toujours vrai ou toujours faux —
      //    dans les deux cas la règle ne protège rien, et son auteur croit le
      //    contraire.
      const autre = assertion.otherFieldId;
      if (autre !== undefined) {
        if (!fieldIds.has(autre)) {
          push(
            "AIR_RULE_OTHER_FIELD_UNKNOWN",
            `rules[${i}].assertions[${j}].otherFieldId`,
            `champ "${autre}" absent de l'entité "${r.entityId}" : une règle ne ` +
              `compare que deux champs de la MÊME ligne`,
          );
        }
        if (assertion.value !== undefined) {
          push(
            "AIR_RULE_VALUE_AND_FIELD",
            `rules[${i}].assertions[${j}]`,
            `\`value\` et \`otherFieldId\` ensemble : à quoi comparer ?`,
          );
        }
        if (autre === assertion.fieldId) {
          push(
            "AIR_RULE_SELF_COMPARISON",
            `rules[${i}].assertions[${j}].otherFieldId`,
            `un champ comparé à lui-même ne protège rien`,
          );
        }
      }
      // ── `designe` (1.40.0) : CINQ REFUS.
      //
      // Cet opérateur LIT LA BASE — il cherche parmi des lignes au lieu de
      // comparer dans la ligne. Chacune des cinq fautes rendrait la règle
      // muette ou ambiguë, et toutes se voient sans exécuter quoi que ce soit.
      const cible = assertion.designe;
      const estDesigne = assertion.operator === "designe";
      // ① LA CHARGE ET L'OPÉRATEUR VONT ENSEMBLE. Une cible sans `designe`
      //    ne serait jamais lue ; `designe` sans cible ne dirait pas où
      //    chercher.
      if (estDesigne && cible === undefined) {
        push(
          "AIR_RULE_DESIGNE_SANS_CIBLE",
          `rules[${i}].assertions[${j}]`,
          "`designe` ne dit pas QUELLE ligne : il faut `designe.entityId` et " +
            "`designe.fieldId`",
        );
      }
      if (!estDesigne && cible !== undefined) {
        push(
          "AIR_RULE_CIBLE_SANS_DESIGNE",
          `rules[${i}].assertions[${j}].designe`,
          `l'opérateur est "${assertion.operator}" : la cible ne serait jamais lue`,
        );
      }
      if (estDesigne && cible !== undefined) {
        const ent = air.entities.find((x) => x.id === cible.entityId);
        // ② L'ENTITÉ DÉSIGNÉE EXISTE.
        if (ent === undefined) {
          push(
            "AIR_RULE_DESIGNE_ENTITE_INCONNUE",
            `rules[${i}].assertions[${j}].designe.entityId`,
            `l'entité "${cible.entityId}" n'existe pas : il n'y a aucune ligne à désigner`,
          );
        } else {
          const champCible = ent.fields.find((x) => x.id === cible.fieldId);
          // ③ LE CHAMP DÉSIGNÉ EXISTE SUR ELLE.
          if (champCible === undefined) {
            push(
              "AIR_RULE_DESIGNE_CHAMP_INCONNU",
              `rules[${i}].assertions[${j}].designe.fieldId`,
              `"${cible.fieldId}" n'est pas un champ de "${cible.entityId}" : ` +
                `on ne peut pas chercher ce qui n'y est pas`,
            );
          } else {
            // ④ LA CIBLE DOIT ÊTRE UNIQUE — LE REFUS QUI COMPTE.
            //
            //    Si deux lignes portent le même code, « désigne une ligne
            //    existante » ne désigne PERSONNE : le serveur en trouverait
            //    deux et devrait choisir, et choisir pour l'auteur est
            //    exactement ce que ce format refuse.
            if (champCible.unique !== true) {
              push(
                "AIR_RULE_DESIGNE_CIBLE_NON_UNIQUE",
                `rules[${i}].assertions[${j}].designe.fieldId`,
                `"${champCible.id}" n'est pas déclaré \`unique\` : deux lignes ` +
                  `pourraient porter la même valeur, et « désigne UNE ligne » ne ` +
                  `désignerait personne. Déclarez-le unique.`,
              );
            }
            // ⑤ LES DEUX CHAMPS SE COMPARENT. Chercher un texte dans une
            //    colonne de nombres ne trouverait jamais rien, sans erreur.
            const source = entity.fields.find((x) => x.id === assertion.fieldId);
            if (source !== undefined && source.type !== champCible.type) {
              push(
                "AIR_RULE_DESIGNE_TYPES_INCOMPATIBLES",
                `rules[${i}].assertions[${j}].designe`,
                `"${assertion.fieldId}" est de type "${source.type}" et ` +
                  `"${champCible.id}" de type "${champCible.type}" : la recherche ` +
                  `ne trouverait jamais rien, et sans erreur`,
              );
            }
          }
        }
      }
    });
  });

  // ── 8bis. LES API EXTERNES (1.36.0) : TROIS REFUS.
  //
  // ① L'hôte doit figurer dans `network.allowedDomains`. Une application ne
  //    doit pas joindre un hôte que le document ne déclare pas — c'est la
  //    règle déjà tenue pour les références de fichier.
  // ② Les segments `{nom}` du chemin doivent être annoncés dans `sends` :
  //    sinon l'appel se construirait avec un trou, découvert à l'exécution.
  // ③ Deux opérations ne peuvent pas porter le même identifiant, sinon
  //    l'appelant ne sait plus laquelle il désigne.
  const domainesAutorises = new Set(air.network.allowedDomains);
  (air.apis ?? []).forEach((api, i) => {
    if (!domainesAutorises.has(api.domain)) {
      push(
        "AIR_API_DOMAIN_UNDECLARED",
        `apis[${i}].domain`,
        `« ${api.domain} » n'est pas dans network.allowedDomains : une ` +
          `application ne joint pas un hôte que le document ne déclare pas`,
      );
    }
    const vues = new Set<string>();
    api.operations.forEach((op, j) => {
      if (vues.has(op.id)) {
        push(
          "AIR_API_OPERATION_DUPLICATE",
          `apis[${i}].operations[${j}].id`,
          `l'opération « ${op.id} » est déclarée deux fois`,
        );
      }
      vues.add(op.id);
      const annonces = new Set(op.sends ?? []);
      for (const m of op.path.matchAll(/\{([a-zA-Z0-9_]+)\}/gu)) {
        const nom = m[1] ?? "";
        if (!annonces.has(nom)) {
          push(
            "AIR_API_PATH_PARAM_UNDECLARED",
            `apis[${i}].operations[${j}].path`,
            `le chemin attend « ${nom} », que \`sends\` n'annonce pas`,
          );
        }
      }
    });
  });

  // ── 8ter. L'AGENT (1.37.0) : SIX REFUS.
  //
  // ① Chaque opération qu'il peut appeler doit EXISTER. Un agent autorisé sur
  //    une opération inconnue serait un agent dont on croit connaître les
  //    pouvoirs.
  // ② Le droit exigé pour le réveiller doit exister, sinon personne ne peut
  //    le réveiller et le bouton ment.
  // ③ Deux fois la même opération ne veut rien dire de plus.
  // ④ Un agent sans API déclarée n'a aucune main : le refuser ici vaut mieux
  //    que de livrer un bouton qui ne fait rien.
  if (air.agent !== undefined) {
    // ── COMBIEN D'API PORTENT CET IDENTIFIANT ? (refus ⑥, 2026-10-13)
    //
    // L'unicite d'un identifiant d'operation est garantie PAR API — le refus
    // AIR_API_OPERATION_DUPLICATE compte dans un ensemble cree a l'interieur
    // de la boucle par API, juste au-dessus. Deux API peuvent donc declarer
    // chacune une operation « envoyer ».
    //
    // Les routes du connecteur, elles, portent l'API dans leur adresse
    // (/air/v1/apis/<api>/<operation>) : aucune ambiguite de ce cote. Mais
    // `agent.allowedOperations` ne nomme QUE l'operation. Un agent autorise
    // sur « envoyer » aurait donc un pouvoir que personne ne sait nommer :
    // celui d'une API anodine, ou celui d'une API qui deplace de l'argent.
    const porteuses = new Map<string, number>();
    for (const a2 of air.apis ?? []) {
      for (const o of a2.operations) {
        porteuses.set(o.id, (porteuses.get(o.id) ?? 0) + 1);
      }
    }
    const operations = new Set(porteuses.keys());
    if (operations.size === 0) {
      push(
        "AIR_AGENT_NO_API",
        "agent",
        "un agent est déclaré alors qu'aucune API ne l'est : il n'aurait aucune main",
      );
    }
    const vues = new Set<string>();
    air.agent.allowedOperations.forEach((op, i) => {
      if (!operations.has(op)) {
        push(
          "AIR_AGENT_OPERATION_UNKNOWN",
          `agent.allowedOperations[${i}]`,
          `l'opération « ${op} » n'est déclarée dans aucune API`,
        );
      }
      if (vues.has(op)) {
        push(
          "AIR_AGENT_OPERATION_DUPLICATE",
          `agent.allowedOperations[${i}]`,
          `l'opération « ${op} » est autorisée deux fois`,
        );
      }
      // ⑥ UNE OPÉRATION QU'ON NE SAIT PAS DÉSIGNER N'EST PAS UN POUVOIR
      //    QU'ON PEUT ACCORDER. Plutôt que de choisir la première API venue —
      //    un choix silencieux que personne ne pourrait relire — on refuse, et
      //    on dit quoi faire : renommer l'une des deux opérations.
      if ((porteuses.get(op) ?? 0) > 1) {
        push(
          "AIR_AGENT_OPERATION_AMBIGUOUS",
          `agent.allowedOperations[${i}]`,
          `l'opération « ${op} » est déclarée par ${String(porteuses.get(op))} API : ` +
            `l'agent ne peut pas recevoir un pouvoir qu'on ne sait pas désigner. ` +
            `Renommez l'une des opérations.`,
        );
      }
      vues.add(op);
    });
    // ⑤ LA VOIX EXIGE L'OREILLE. `voiceInput: true` sans la capacité
    //    `audio_capture` donnerait un bouton de micro dans une application
    //    qui n'a pas le droit d'enregistrer — refusé au premier appui, et
    //    personne ne saurait pourquoi.
    if (
      air.agent.voiceInput === true &&
      !air.capabilities.some((c) => c.capability === "audio_capture")
    ) {
      push(
        "AIR_AGENT_VOICE_WITHOUT_AUDIO",
        "agent.voiceInput",
        "la parole est autorisée sans la capacité `audio_capture` : " +
          "l'application n'aurait pas le droit d'enregistrer",
      );
    }
    // ── LA PAROLE EST DÉCLARABLE ET PAS ENCORE SERVABLE (2026-10-13).
    //
    // MESURE, le jour même où j'ai ajouté cette clé. `voiceInput: true` fait
    // DEUX choses : il induit `RECORD_AUDIO` et `NSMicrophoneUsageDescription`,
    // et il inscrit l'audio au manifeste de confidentialité. Il ne fait rien
    // d'autre — AUCUN module du runtime n'enregistre. Mesure : UNE capacité
    // sur vingt-et-une est implémentée côté appareil, et c'est `auth`.
    //
    // Une application demanderait donc le microphone et ne l'utiliserait
    // jamais. C'est une PERMISSION DE TROP — précisément ce qu'un magasin
    // rejette, et précisément la propriété que le registre existe pour tenir :
    // le 2026-10-12, 78 permissions déclarées au corpus et ZÉRO en trop.
    //
    // POURQUOI UN REFUS ET NON UN COMMENTAIRE. Un refus se lit, se répare, et
    // nomme l'alternative : on écrit à l'agent, il comprend, il propose, il
    // agit — tout cela marche sans la parole. Laisser la clé INERTE
    // produirait un bouton muet qui réclame le micro, et personne ne saurait
    // pourquoi le magasin a refusé.
    //
    // LA CLÉ RESTE AU FORMAT. Elle n'est pas retirée : le jour où le moteur
    // sait enregistrer, ce refus tombe et rien d'autre ne change. Ce qui
    // manque est nommé dans le message, pas caché.
    // ── UN AGENT INERTE EST REFUSE A LA RACINE (2026-10-13).
    //
    // MESURE QUI A POSE CES DEUX REFUS, ET ELLE CORRIGE UNE AFFIRMATION A MOI.
    // J'avais dit au proprietaire que le validateur ne laisserait pas
    // declarer un agent sans son serveur. VERIFIE : il l'ACCEPTAIT. Un
    // document pouvait declarer un agent sans aucun backend — le bouton se
    // montait, le port restait INERTE, et chaque appui echouait sur
    // AIR_AGENT_ABSENT. « Emis et inerte », le defaut que ce depot paie en
    // boucle, et que je venais de fermer deux fois ailleurs.
    //
    // ① LE SERVEUR. Les trois routes de l'agent sont EMISES par le moteur :
    //    un backend `externe` ne les porte pas, et rien ne permet de supposer
    //    qu'il les porte. Et sans `domain`, l'application n'a aucune adresse
    //    a joindre — un chemin relatif marcherait sur le web servi par le
    //    meme hote, et NULLE PART sur un telephone.
    const b = air.backend;
    if (b?.kind !== "genere") {
      push(
        "AIR_AGENT_SANS_SERVEUR_GENERE",
        "agent",
        "un agent est déclaré sans serveur `genere` : ses trois routes sont " +
          "ÉMISES par le moteur, donc un serveur externe ne les porte pas. " +
          "Le bouton se monterait et chaque appui échouerait.",
      );
    } else if (b.domain === undefined) {
      push(
        "AIR_AGENT_SERVEUR_SANS_ADRESSE",
        "backend.domain",
        "un agent est déclaré et le serveur n'a pas d'adresse : l'application " +
          "n'aurait rien à joindre. Déclarez `backend.domain`.",
      );
    }
    // ② L'IDENTITE. TOUTES les routes de l'agent exigent un appelant
    //    verifiable. Sans integration d'authentification portant une `url`,
    //    l'application tombe sur la session LOCALE, qui ne produit aucun
    //    jeton : chaque appel serait refuse 403. L'agent compilerait,
    //    s'afficherait, et ne servirait a rien — mesure faite le jour meme sur
    //    la variante du corpus, dont l'integration portait `baseUrl` et non
    //    `url`.
    const authAgent = air.integrations.find((i) => i.capability === "auth");
    const urlAuth = (authAgent?.config ?? []).find((c) => c.key === "url")?.value;
    if (authAgent === undefined || typeof urlAuth !== "string" || urlAuth === "") {
      push(
        "AIR_AGENT_SANS_IDENTITE_VERIFIEE",
        "agent",
        "un agent est déclaré sans identité vérifiable : toutes ses routes " +
          "exigent un appelant, et sans intégration `auth` portant une `url` " +
          "l'application n'aurait aucun jeton à présenter. Chaque appel serait " +
          "refusé.",
      );
    }
    if (air.agent.voiceInput === true) {
      push(
        "AIR_AGENT_VOICE_NOT_SERVABLE",
        "agent.voiceInput",
        "la parole est déclarée mais le moteur ne sait pas encore enregistrer : " +
          "l'application demanderait le microphone sans jamais l'utiliser, et ce " +
          "serait une permission de trop. Retirez `voiceInput` — on écrit à " +
          "l'agent, il comprend et il agit.",
      );
    }
    // ── LE CERVEAU (1.38.0) : SIX REFUS DE PLUS.
    //
    // Le cerveau est une API déclarée qui transforme des mots en choix. Il
    // NOMME ses clés plutôt que de subir une convention inventée par le
    // moteur — donc chaque nom doit être vérifié, sinon le document promet
    // une clé que le service ne porte pas, et l'erreur n'apparaîtrait qu'à la
    // première phrase prononcée par une personne réelle.
    const cerveau = air.agent.brain;
    if (cerveau !== undefined) {
      const porteusesDuCerveau = (air.apis ?? []).flatMap((api2) =>
        api2.operations.filter((o) => o.id === cerveau.operationId),
      );
      if (porteusesDuCerveau.length === 0) {
        // ⑦ Un cerveau introuvable est un agent dont la parole ne mène nulle
        //    part — et un bouton de micro qui ne répondra jamais.
        push(
          "AIR_AGENT_BRAIN_UNKNOWN",
          "agent.brain.operationId",
          `l'opération « ${cerveau.operationId} » n'est déclarée dans aucune API : ` +
            `l'agent n'aurait rien pour interpréter la parole`,
        );
      } else if (porteusesDuCerveau.length > 1) {
        // ⑧ La même raison que pour les pouvoirs : l'unicité d'un identifiant
        //    n'est garantie QUE par API. Choisir la première venue serait un
        //    choix que personne ne pourrait relire.
        push(
          "AIR_AGENT_BRAIN_AMBIGUOUS",
          "agent.brain.operationId",
          `l'opération « ${cerveau.operationId} » est déclarée par ` +
            `${String(porteusesDuCerveau.length)} API : on ne saurait pas qui réfléchit. ` +
            `Renommez l'une des opérations.`,
        );
      } else {
        const op = porteusesDuCerveau[0];
        const envoyees = new Set(op?.sends ?? []);
        for (const [champ, nom] of [
          ["wordsInput", cerveau.wordsInput],
          ...(cerveau.catalogueInput === undefined
            ? []
            : [["catalogueInput", cerveau.catalogueInput] as const]),
        ] as readonly (readonly [string, string])[]) {
          if (!envoyees.has(nom)) {
            // ⑨ Une entrée promise que l'opération n'envoie pas : l'appel se
            //    construirait sans les mots, et le cerveau répondrait à une
            //    question vide.
            push(
              "AIR_AGENT_BRAIN_INPUT_UNKNOWN",
              `agent.brain.${champ}`,
              `« ${nom} » n'est pas dans les \`sends\` de « ${cerveau.operationId} » : ` +
                `cette clé n'arriverait jamais au service`,
            );
          }
        }
        const rendues = new Map((op?.returns ?? []).map((r) => [r.key, r.type]));
        for (const [champ, nom] of [
          ["choiceOutput", cerveau.choiceOutput],
          ["inputsOutput", cerveau.inputsOutput],
        ] as readonly (readonly [string, string])[]) {
          const type = rendues.get(nom);
          if (type === undefined) {
            push(
              "AIR_AGENT_BRAIN_OUTPUT_UNKNOWN",
              `agent.brain.${champ}`,
              `« ${nom} » n'est pas dans les \`returns\` de « ${cerveau.operationId} » : ` +
                `le serveur lirait une clé que le service ne rend pas`,
            );
          } else if (type !== "string") {
            // ⑩ Un identifiant d'opération et un texte JSON sont du TEXTE.
            //    Déclarés en nombre, ils seraient refusés par le connecteur à
            //    l'exécution — mieux vaut le dire ici qu'à la première phrase.
            push(
              "AIR_AGENT_BRAIN_OUTPUT_NOT_TEXT",
              `agent.brain.${champ}`,
              `« ${nom} » est déclarée « ${type} » : ` +
                `un identifiant d'opération et des valeurs en JSON sont du texte`,
            );
          }
        }
      }
      // ⑪ RÉFLÉCHIR N'EST PAS AGIR. Un cerveau qui serait aussi un pouvoir de
      //    l'agent ne veut rien dire : l'agent pourrait « agir » en appelant
      //    son propre interprète, et la liste de ses pouvoirs cesserait de
      //    décrire ce qu'il fait au monde.
      if (air.agent.allowedOperations.includes(cerveau.operationId)) {
        push(
          "AIR_AGENT_BRAIN_IS_A_POWER",
          "agent.brain.operationId",
          `« ${cerveau.operationId} » est à la fois le cerveau et un pouvoir : ` +
            `réfléchir n'est pas agir`,
        );
      }
    }

    const droit = air.agent.requiredRightId;
    // `access` est optionnel au format : un document sans modele d'acces ne
    // declare aucun droit, donc exiger un droit y est forcement une erreur.
    if (droit !== undefined && !(air.access?.rights ?? []).some((r) => r.id === droit)) {
      push(
        "AIR_AGENT_RIGHT_UNKNOWN",
        "agent.requiredRightId",
        `le droit « ${droit} » n'existe pas : personne ne pourrait réveiller l'agent`,
      );
    }
  }

  // 9. Permissions et intégrations : capabilities déclarées uniquement.
  air.permissions.forEach((p, i) => {
    if (!declaredCapabilities.has(p.requiredByCapability)) {
      push(
        "AIR_PERMISSION_CAPABILITY_UNDECLARED",
        `permissions[${i}].requiredByCapability`,
        `capability "${p.requiredByCapability}" non déclarée`,
      );
    }
  });
  air.integrations.forEach((x, i) => {
    if (x.capability !== undefined && !declaredCapabilities.has(x.capability)) {
      push(
        "AIR_INTEGRATION_CAPABILITY_UNDECLARED",
        `integrations[${i}].capability`,
        `capability "${x.capability}" non déclarée`,
      );
    }
    if (x.config !== undefined) {
      x.config.forEach((pair, j) => {
        // FAUX POSITIF MESURÉ (dougplace, 2026-09-10) : « credentialFieldId »
        // est un POINTEUR DE CHAMP — il désigne quel champ du formulaire
        // porte le secret, il n'en contient aucun. Exemption STRICTE : la clé
        // se termine par « FieldId » ET la valeur a la forme d'un identifiant
        // de champ. Une valeur libre sous un nom en « …FieldId » reste
        // refusée — la contrebande ne passe pas par ce trou.
        const pointeurDeChamp =
          pair.key.endsWith("FieldId") &&
          typeof pair.value === "string" &&
          /^fld_[a-z0-9_]+$/.test(pair.value);
        // Un secret est une CHAÎNE : une valeur numérique ou booléenne sous
        // un nom évocateur (« passwordMinLength: 8 », mesuré sur marketa v2)
        // est une RÈGLE, pas une fuite.
        const valeurNonSecrete = typeof pair.value !== "string";
        if (SECRET_LIKE_KEY.test(pair.key) && !pointeurDeChamp && !valeurNonSecrete) {
          push(
            "AIR_INTEGRATION_SECRET_LIKE_KEY",
            `integrations[${i}].config[${j}]`,
            `clé "${pair.key}" à l'allure de secret — les secrets ne vivent JAMAIS dans l'AIR`,
          );
        }
      });
    }
  });

  // 10. Classe commerce (§2) : biens digitaux ⇒ IAP obligatoire — un PSP
  // déclaré dans les intégrations est un refus store garanti (4.2.6/3.1.1).
  if (air.compliance.commerceClass === "digital") {
    air.integrations.forEach((x, i) => {
      if (x.providerClass === "psp") {
        push(
          "AIR_COMMERCE_DIGITAL_PSP_FORBIDDEN",
          `integrations[${i}].providerClass`,
          "classe commerce digital : le paiement passe par IAP, pas par un PSP",
        );
      }
    });
  }

  // 11. Tests attendus : la cible est un NŒUD DÉCLARÉ du document.
  //
  // ÉLARGI le 2026-09-10 (mesuré sur dougplace : 28 refus pour des tests
  // visant des blocs, des règles et des intégrations qui EXISTAIENT toutes).
  // Le but de ce contrôle est « aucune promesse sur une cible morte » —
  // pas « seules trois familles de nœuds méritent des tests ». Un test sur
  // un bloc vivant (« la liste du catalogue montre les produits »), une
  // règle ou une intégration est une promesse parfaitement vérifiable.
  // Élargir n'ACCEPTE que davantage : le corpus gelé reste jugé à
  // l'identique, aucun document accepté hier n'est refusé aujourd'hui.
  // COMPLÉTÉ le 2026-09-11 (mesuré sur marketa v2 : 8 refus visant des
  // CHAMPS, une ROUTE et une CAPABILITY déclarés — tous vivants). Le principe
  // reste « aucune promesse sur une cible morte » ; la liste est désormais
  // TOUS les nœuds déclarés du document.
  const testTargets = new Set<string>([
    ...screenIds,
    ...air.actions.map((a) => a.id),
    ...entityById.keys(),
    ...air.screens.flatMap((sc) => sc.blocks.map((b) => b.id)),
    ...air.rules.map((r) => r.id),
    ...air.integrations.map((x) => x.id),
    ...air.datasets.map((ds) => ds.id),
    ...air.entities.flatMap((e) => e.fields.map((f) => f.id)),
    ...air.navigation.routes.map((r) => r.id),
    ...air.capabilities.map((c) => c.capability),
  ]);
  air.expectedTests.forEach((t, i) => {
    if (!testTargets.has(t.targetId)) {
      push(
        "AIR_TEST_TARGET_UNKNOWN",
        `expectedTests[${i}].targetId`,
        `cible "${t.targetId}" introuvable parmi les nœuds déclarés du document`,
      );
    }
  });

  // ══════════════════════════════════════════════════════════════
  //  ARGENT MOBILE — CHAQUE VALEUR EST CLASSÉE, OU LE DOCUMENT EST REFUSÉ.
  //
  // ── CE QUE CE CONTRÔLE N'EST PAS, ET POURQUOI.
  //
  // J'ai d'abord écrit un catalogue des opérateurs PAR PAYS, pour refuser
  // « Orange Money au Tchad ». Le cliquet EP-201 l'a refusé, et il avait
  // raison : la loi du dépôt interdit une table pays → moyen de paiement
  // MÊME dans la couche d'élicitation. Son raisonnement est meilleur que le
  // mien — une telle table vieillit (un opérateur se lance, fusionne, se
  // retire), et une table périmée REFUSE un document valide. Un contrôle qui
  // bloque une application réelle coûte plus cher que l'absence de contrôle.
  //
  // Ce qui reste est STRUCTUREL, et c'est ce qui manquait vraiment : une
  // énumération de moyens de paiement où personne n'a dit lesquels passent
  // par l'argent mobile. Mesuré sur le premier cahier des charges reçu :
  // `CASH` y voisinait deux opérateurs sans qu'aucun étage ne sache que ce
  // n'en était pas un.
  // ══════════════════════════════════════════════════════════════
  air.integrations.forEach((intg, ii) => {
    const mm = intg.mobileMoney;
    if (mm === undefined) return;
    const chemin = `integrations[${String(ii)}].mobileMoney`;

    // ── LE NŒUD N'A DE SENS QUE SOUS LA CAPACITÉ QUI L'EMPLOIE.
    //
    // Posé sur une intégration d'e-mail, il décrirait des moyens de paiement
    // que rien ne lit. Un contrôle qui ne protège rien est pire qu'absent : il
    // fait croire que quelque chose est vérifié.
    if (intg.capability !== "payments.mobile_money") {
      push(
        "AIR_ARGENT_MOBILE_SANS_CAPACITE",
        chemin,
        `l'intégration "${intg.id}" classe des moyens de paiement sans porter la capacité ` +
          `"payments.mobile_money" : ce classement ne serait lu par personne`,
      );
    }

    // ── LE CHAMP DOIT EXISTER, ET ÊTRE UNE ÉNUMÉRATION.
    let enumValues: readonly string[] | undefined;
    const champ = air.entities.flatMap((e) => e.fields).find((x) => x.id === mm.operatorFieldId);
    if (champ === undefined) {
      push(
        "AIR_ARGENT_MOBILE_CHAMP_INCONNU",
        `${chemin}.operatorFieldId`,
        `le champ "${mm.operatorFieldId}" n'existe pas : rien ne dit alors OÙ le moyen ` +
          `de paiement est enregistré`,
      );
    } else if (champ.type !== "enum" || champ.enumValues === undefined) {
      push(
        "AIR_ARGENT_MOBILE_CHAMP_NON_ENUM",
        `${chemin}.operatorFieldId`,
        `le champ "${mm.operatorFieldId}" n'est pas une énumération : un moyen de paiement ` +
          `en texte libre ne se classe pas, et une faute de frappe y devient un opérateur`,
      );
    } else {
      enumValues = champ.enumValues;
    }

    // ── TOUTE VALEUR CLASSÉE DOIT EXISTER DANS L'ÉNUMÉRATION.
    //
    // Sinon le classement ne protège rien : il croit couvrir une valeur, et la
    // vraie reste non classée — avec un nom voisin, qui se lit juste.
    const verifier = (v: string, ou: string): void => {
      if (enumValues === undefined || enumValues.includes(v)) return;
      push(
        "AIR_ARGENT_MOBILE_VALEUR_INCONNUE",
        ou,
        `"${v}" n'est pas une valeur de "${mm.operatorFieldId}" : le classement porte sur ` +
          `un moyen de paiement que le document n'enregistre jamais`,
      );
    };
    mm.operatorValues.forEach((v, i) => {
      verifier(v, `${chemin}.operatorValues[${String(i)}]`);
    });
    mm.offNetworkValues.forEach((v, i) => {
      verifier(v, `${chemin}.offNetworkValues[${String(i)}]`);
    });

    const operateurs = new Set(mm.operatorValues);
    const horsReseau = new Set(mm.offNetworkValues);

    // ── AUCUNE VALEUR NE PEUT ÊTRE LES DEUX.
    for (const v of operateurs) {
      if (!horsReseau.has(v)) continue;
      push(
        "AIR_ARGENT_MOBILE_VALEUR_AMBIGUE",
        chemin,
        `"${v}" est déclarée à la fois comme argent mobile et hors réseau : ` +
          `le document dit deux choses contraires du même paiement`,
      );
    }

    // ── LA PARTITION DOIT ÊTRE EXHAUSTIVE.
    (enumValues ?? []).forEach((v) => {
      if (operateurs.has(v) || horsReseau.has(v)) return;
      push(
        "AIR_ARGENT_MOBILE_VALEUR_NON_CLASSEE",
        chemin,
        `"${v}" est une valeur de "${mm.operatorFieldId}" qui n'est NI déclarée argent ` +
          `mobile NI déclarée hors réseau : personne ne saura quoi en faire au moment du paiement`,
      );
    });
  });

  // ══════════════════════════════════════════════════════════════
  //  LE SERVEUR DÉCLARÉ DOIT ÊTRE JOIGNABLE (1.34.0)
  //
  // Un backend est inutile si l'application ne peut pas lui parler. Deux
  // façons de se rendre injoignable, et le document peut les écrire toutes
  // les deux sans que rien ne proteste :
  //
  //   · déclarer un domaine que la politique réseau n'autorise pas
  //     (`network.policy` est `deny_by_default`) ;
  //   · déclarer des sources distantes qui pointent AILLEURS que ce serveur.
  //
  // Les deux se voient à l'exécution, sur un appareil, et nulle part avant.
  // ══════════════════════════════════════════════════════════════
  if (air.backend !== undefined) {
    const b = air.backend;
    if (b.domain !== undefined && !air.network.allowedDomains.includes(b.domain)) {
      push(
        "AIR_BACKEND_DOMAINE_INTERDIT",
        "backend.domain",
        `le backend déclare le domaine "${b.domain}", absent de ` +
          `network.allowedDomains : la politique est "deny_by_default", donc ` +
          `l'application ne joindra JAMAIS son propre serveur`,
      );
    }
    // ── UN SERVEUR EN LIGNE QUE PERSONNE N'APPELLE.
    //
    // Première version de ce contrôle : tout backend `genere` exigeait une
    // source distante. Il refusait l'état le plus NORMAL du chantier — le
    // serveur s'écrit AVANT que l'application ne pointe dessus, puisque son
    // adresse n'existe pas encore.
    //
    // C'est l'ADRESSE qui fait la différence. Un backend qui en déclare une
    // est joignable : s'il ne sert aucune donnée, les deux moitiés existent et
    // ne se touchent pas — le défaut « émis et inerte » que ce dépôt paie en
    // boucle. Sans adresse, le serveur est en construction, et c'est légitime.
    //
    // ÉTENDU le 2026-10-13 — L'AGENT EST UN LECTEUR, LUI AUSSI.
    //
    // Ce contrôle a été écrit avant l'agent (1.37.0). Sa raison est écrite
    // juste au-dessus : « appelé par personne ». Or un agent déclaré APPELLE
    // ce serveur — ses trois routes y vivent, et l'application a besoin de
    // l'adresse pour les joindre (un chemin relatif marcherait sur le web
    // servi par le même hôte, et nulle part sur un téléphone).
    //
    // Sans cette extension, une application dont le serveur sert UNIQUEMENT
    // l'agent était impossible à déclarer : refusée si elle donnait l'adresse,
    // injoignable si elle l'omettait. Le contrôle n'est pas affaibli — il
    // compte un lecteur de plus, qui en est vraiment un.
    const distants = air.datasets.filter((d) => d.sourceKind === "remote");
    const agentLitLeServeur = air.agent !== undefined;
    if (
      b.kind === "genere" &&
      b.domain !== undefined &&
      distants.length === 0 &&
      !agentLitLeServeur
    ) {
      push(
        "AIR_BACKEND_SANS_SOURCE",
        "backend",
        `le backend déclare l'adresse "${b.domain}" et AUCUN dataset ne la lit ` +
          `(\`sourceKind: "remote"\`) : le serveur serait déployé, joignable, et ` +
          `appelé par personne`,
      );
    }
    // ── ET LES SOURCES DOIVENT POINTER VERS CE SERVEUR-LÀ.
    if (b.domain !== undefined) {
      air.datasets.forEach((d, i) => {
        if (d.sourceKind !== "remote" || d.sourceDomain === undefined) return;
        if (d.sourceDomain === b.domain) return;
        push(
          "AIR_BACKEND_SOURCE_ETRANGERE",
          `datasets[${String(i)}].sourceDomain`,
          `le dataset "${d.id}" lit "${d.sourceDomain}" alors que le backend du ` +
            `document est "${b.domain}" : une moitié des données viendrait d'un ` +
            `serveur que personne n'a écrit`,
        );
      });
    }
  }

  // Sortie triée (path, code) : même AIR ⇒ même liste, octet pour octet.
  // ══════════════════════════════════════════════════════════════
  //  LES DONNÉES ONT-ELLES UN PROPRIÉTAIRE DÉCLARÉ ? (2026-10-10)
  //
  // Mesure publique (CVE-2025-48757) : 170+ applications générées par un
  // concurrent ont exposé e-mails, téléphones, données de paiement et clefs
  // d'API tierces — 303 points d'entrée, certains EN ÉCRITURE. Le générateur
  // émettait des tables sans politique, et l'application les interrogeait
  // depuis le client avec la clef publique.
  //
  // LA NUANCE OÙ LEUR CORRECTIF S'ARRÊTE : leur scanner vérifie que la
  // sécurité par ligne est ACTIVÉE. Il ne vérifie pas que les politiques
  // FONT quelque chose. Une table protégée par `using (true)` passe son
  // contrôle et fuit exactement pareil.
  //
  // Ces contrôles jugent donc l'EFFECTIVITÉ : toute entité que le client
  // peut atteindre doit pouvoir dire À QUI appartiennent ses lignes — par un
  // chemin déclaré vers l'identité, ou par un jeu de données de vitrine qui
  // ASSUME la lecture publique. Ni l'un ni l'autre : le document est refusé
  // AVANT la compilation, et il nomme la table.
  // ══════════════════════════════════════════════════════════════
  //
  // ── CE JUGE NE S'APPLIQUE QU'AUX DOCUMENTS QUI ONT UN MODÈLE D'IDENTITÉ
  //    (arbitrage du propriétaire, 2026-10-10).
  //
  // MESURE QUI A IMPOSÉ CETTE PORTE : le premier jet refusait QUATORZE
  // documents du corpus gelé v3 — et UNIQUEMENT à cause de ce juge (40
  // diagnostics, aucun d'une autre origine). Ces documents datent d'AVANT
  // `instanceFrom: "session"` (1.13.0) et `access` (1.28.0) : ils mutent des
  // entités de personnes sans aucun moyen de dire à qui appartient une ligne.
  //
  // ⚠️ ILS PORTENT DONC LA FAILLE EN SUBSTANCE — `bus-intercites` laisse
  // modifier ET SUPPRIMER la fiche de n'importe quel voyageur depuis le
  // client. Ils ne sont pas sûrs ; ils ne sont simplement JAMAIS DÉPLOYÉS :
  // ce sont des références de mesure, et les corriger changerait les
  // empreintes d'un corpus délibérément figé, sans bénéfice réel. QUE
  // PERSONNE NE LES PRENNE UN JOUR POUR DES EXEMPLES SÛRS.
  //
  // La protection des documents NEUFS vit donc à l'ÉMISSION (cliquet
  // `juge-propriete.mjs`, appelé par le moteur) : un document qui mute une
  // entité de personnes sans déclarer son modèle d'identité est refusé là.
  {
    const aUnModeleDIdentite = air.access !== undefined || entiteDIdentite(air) !== undefined;
    const plan = aUnModeleDIdentite ? derivePlanAcces(air) : { tables: [] };
    const indexEntite = new Map(air.entities.map((e, i) => [e.id, i]));
    for (const table of plan.tables) {
      if (!table.atteignable) continue; // interne : rien ne l'expose
      const chemin = `entities[${String(indexEntite.get(table.entityId) ?? 0)}]`;

      if (table.portee.kind === "orpheline" && table.portee.demoMutee !== undefined) {
        // La confusion la plus coûteuse, nommée pour elle-même : l'entité
        // porte des lignes de DÉMONSTRATION et le client l'écrit. Mesurée
        // sur `resto-quartier` : fiches clients et commandes auraient reçu
        // une lecture publique si « porte un jeu de données » avait suffi.
        push(
          "AIR_RLS_DEMO_PRISE_POUR_VITRINE",
          chemin,
          `l'entité "${table.entityId}" porte le jeu de données "${table.portee.demoMutee}" ` +
            `(des lignes de DÉMONSTRATION) et le client l'écrit : des données de démonstration ne ` +
            `rendent pas une table publique. Déclarez un propriétaire — un champ qui référence ` +
            `l'entité des personnes — ou un droit sur les surfaces qui y mènent.`,
        );
        continue;
      }

      if (table.portee.kind === "orpheline") {
        push(
          "AIR_RLS_TABLE_ORPHELINE",
          chemin,
          `l'entité "${table.entityId}" est atteignable depuis le client mais rien ne dit à qui ` +
            `appartiennent ses lignes : aucun champ ne référence l'identité` +
            (plan.entiteIdentite === undefined
              ? ` (et ce document ne désigne aucune entité de personnes)`
              : ` "${plan.entiteIdentite}" en ${String(3)} sauts au plus`) +
            `, et aucun jeu de données ne la déclare en vitrine. Sans propriétaire déclaré, ` +
            `une politique d'accès ne peut pas être calculée — et une table atteignable sans ` +
            `politique effective est exactement la faille qui a exposé 170 applications.`,
        );
        continue;
      }

      if (table.politiques.length === 0) {
        // Ceinture ET bretelles : une portée connue qui ne produit AUCUNE
        // politique serait un trou dans la dérivation elle-même.
        push(
          "AIR_RLS_SANS_POLITIQUE",
          chemin,
          `l'entité "${table.entityId}" est atteignable et sa portée est connue ` +
            `(${table.portee.kind}), mais aucune politique n'en découle`,
        );
      }

      // LE PRÉDICAT TAUTOLOGIQUE : « ouvert à tous » n'est légitime QUE sur
      // une vitrine, et QU'EN LECTURE. Ce contrôle garde la dérivation
      // elle-même : si une évolution future produisait un `using (true)` sur
      // une donnée possédée, il refuserait ici plutôt qu'en production.
      for (const politique of table.politiques) {
        if (politique.predicat.kind !== "ouvert") continue;
        if (table.portee.kind !== "vitrine") {
          push(
            "AIR_RLS_PREDICAT_TAUTOLOGIQUE",
            chemin,
            `la politique "${politique.nom}" ouvre "${table.entityId}" à tous alors que ses ` +
              `lignes ont un propriétaire déclaré : un prédicat toujours vrai n'est pas une ` +
              `politique, c'est une table publique qui se croit protégée`,
          );
        } else if (politique.operation !== "select") {
          push(
            "AIR_RLS_VITRINE_ECRITURE_OUVERTE",
            chemin,
            `la politique "${politique.nom}" ouvre l'écriture de la vitrine "${table.entityId}" ` +
              `à tous : une donnée de vitrine se LIT par tous, elle ne s'écrit jamais ainsi`,
          );
        }
      }

    }
  }

  return diagnostics.sort((a, b) =>
    a.path < b.path ? -1 : a.path > b.path ? 1 : a.code < b.code ? -1 : a.code > b.code ? 1 : 0,
  );
}

export class AirSemanticError extends Error {
  readonly diagnostics: AirDiagnostic[];

  constructor(diagnostics: AirDiagnostic[]) {
    super(`AIR sémantiquement invalide : ${String(diagnostics.length)} diagnostic(s)`);
    this.name = "AirSemanticError";
    this.diagnostics = diagnostics;
  }
}

// Point d'entrée fail-closed : schéma PUIS sémantique — un AIR qui ne passe
// pas les deux n'existe pas pour le reste du pipeline.
export function assertValidAir(input: unknown): ProjectAir {
  const air = projectAirSchema.parse(input);
  const diagnostics = validateAir(air);
  if (diagnostics.length > 0) {
    throw new AirSemanticError(diagnostics);
  }
  return air;
}
