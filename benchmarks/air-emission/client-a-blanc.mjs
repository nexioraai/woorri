// ============================================================
// LE CLIENT A BLANC — la frontiere payante entiere, simulee. PARTAGE.
//
// Extrait de `continuation.verif.mjs` quand l'etage travailleur en a eu
// besoin : deux copies de la simulation divergeraient, et un harnais qui ne
// simule pas comme l'autre prouverait autre chose sans le dire.
//
// Il distingue ses reponses par la GRAMMAIRE de l'appel et par les marqueurs
// de NOS invites — jamais par un texte d'erreur. Chaque appel est journalise
// avec son instant : ce journal porte les preuves. Le modele P0 passe les
// VRAIS juges (validerModele + plan) — forge par iteration contre eux.
// ============================================================

export const MODELE = {
  version: "modele-metier/1.2.0",
  acteurs: [{ id: "act_client", nom: "Client" }],
  concepts: [{
    id: "ent_commande", nom: "Commande", donnees: true,
    attributs: [
      { id: "att_numero", nature: "texte", requis: true },
      { id: "att_montant", nature: "nombre", requis: false },
    ],
  }],
  relations: [],
  parcours: [{
    id: "par_suivi", besoin: "suivre sa commande", acteur: "act_client",
    etapes: [
      { concept: "ent_commande", geste: "decouvrir" },
      { concept: "ent_commande", geste: "choisir" },
      { concept: "ent_commande", geste: "consulter" },
    ],
  }],
  couverture: {
    couverts: [
      { terme: "commande", noeuds: ["ent_commande"] },
      { terme: "suivre", noeuds: ["par_suivi"] },
    ],
    nonRetenus: [],
  },
};
export const BRIEF = "suivre sa commande dans le quartier";

/**
 * LE CLIENT A BLANC — la frontiere payante entiere, simulee.
 *
 * Il distingue ses reponses par la GRAMMAIRE de l'appel (les proprietes du
 * schema demande) et par les marqueurs de NOS PROPRES invites — jamais par
 * un texte d'erreur. Chaque appel est journalise avec son instant : c'est
 * ce journal qui porte les preuves.
 */
export function creerClientABlanc({ corpus, lent = () => false, delaiMs = 8, delaiLentMs = 2500 }) {
  const journal = [];
  let screensServis = 0;
  return {
    journal,
    messages: {
      create: async (appel) => {
        const props = Object.keys(appel?.output_config?.format?.schema?.properties ?? {});
        const texteUser = String(appel?.messages?.[0]?.content ?? "");
        let type, corps;
        if (appel.max_tokens === 1) { type = "sonde"; corps = "{}"; }
        else if (props.includes("acteurs")) { type = "p0"; corps = JSON.stringify(MODELE); }
        else {
          type = texteUser.includes("SECTIONS À ÉMETTRE MAINTENANT") ? "emission" : "reparation";
          const tranche = {};
          for (const k of props) {
            if (k === "screens" && type === "emission") {
              // Les lots d'ecrans ACCUMULENT : servir le corpus deux fois
              // doublerait chaque ecran.
              tranche.screens = screensServis === 0 ? corpus.screens : [];
              screensServis += 1;
            } else {
              tranche[k] = corpus[k];
            }
          }
          corps = JSON.stringify(tranche);
        }
        const entree = { type, props: [...props].sort().join("+"), t: Date.now() };
        journal.push(entree);
        await new Promise((r) => setTimeout(r, lent(entree) ? delaiLentMs : delaiMs));
        return {
          content: [{ type: "text", text: corps }],
          stop_reason: "end_turn",
          usage: { input_tokens: 100, output_tokens: 50 },
        };
      },
    },
  };
}

