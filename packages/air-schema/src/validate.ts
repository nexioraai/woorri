import type { ProjectAir } from "./air.ts";
import { projectAirSchema } from "./air.ts";

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
    });
  });

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

  // Sortie triée (path, code) : même AIR ⇒ même liste, octet pour octet.
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
