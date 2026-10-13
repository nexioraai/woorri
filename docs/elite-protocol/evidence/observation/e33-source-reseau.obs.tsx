// E3.3 (D-132) — PREUVE AU RENDU DU FAIT : « source distante déclarée et
// effectivement consommée selon le contrat ». L'écran RÉELLEMENT ÉMIS de la
// fixture remote est monté avec le magasin ET l'adaptateur EMBARQUÉS dans
// l'app émise ; le transport est INJECTÉ (banc déterministe — ceci ne
// prouve NI un fil Internet réel, NI du temps réel poussé : polling/refresh
// consommé selon contrat, la validation appareil reste une réserve).
//
// Prérequis : `node --experimental-strip-types e33-emettre-fixture.mjs`.
import { createElement } from "react";
import { act, create } from "react-test-renderer";
import type { ReactTestRenderer } from "react-test-renderer";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const APP = join(tmpdir(), "deribfy-e33-remote") + "/";
const D = (id: string, dest: string, date: string, statut: string) => ({
  id,
  values: {
    fld_depart_destination: dest,
    fld_depart_date: date,
    fld_depart_prix: "5000",
    fld_depart_statut: statut,
    fld_depart_ville_depart: "Abidjan",
  },
});
const rendu = (r: ReactTestRenderer | undefined): string => JSON.stringify(r?.toJSON() ?? null);

describe("E3.3 — l'écran émis consomme RÉELLEMENT la source distante déclarée", () => {
  it("graine → loading → lignes DISTANTES → refresh → identiques → erreur : tout rend, tout est vrai", async () => {
    expect(existsSync(APP), "lancer d'abord e33-emettre-fixture.mjs").toBe(true);
    const { DataRoot } = await import(APP + "lib/runtime/data-provider.tsx");
    const { FormStateRoot } = await import(APP + "lib/runtime/form-state.tsx");
    const { creerMagasin } = await import(APP + "lib/runtime/magasin-donnees.ts");
    const { creerAdaptateurReseau } = await import(APP + "lib/runtime/source-reseau.ts");
    const Ecran = (await import(APP + "screens/scr_departs.tsx")).default;

    // Cible et politique EXACTEMENT comme dans l'App.tsx émis (copiées du lock).
    const CIBLE = {
      datasetId: "data_departs",
      entityId: "ent_depart",
      integrationId: "intg_cache_billets",
      url: "https://api.bus-intercites.app/air/v1/entities/ent_depart/rows",
    };
    const DOMAINES = ["api.bus-intercites.app"];
    const appels: string[] = [];
    let file: { ok: boolean; status: number; corps: unknown }[] = [];
    const transport = (url: string) => {
      appels.push(url);
      return Promise.resolve(file.shift() ?? { ok: false, status: 599, corps: null });
    };

    const magasin = creerMagasin({ ent_depart: [D("d1", "Bouaké", "2026-09-03", "a_l_heure")] });
    const adaptateur = creerAdaptateurReseau({
      magasin,
      cibles: [CIBLE],
      domainesAutorises: DOMAINES,
      transport,
    });

    let r: ReactTestRenderer | undefined;
    act(() => {
      r = create(
        createElement(
          DataRoot as never,
          { provider: magasin } as never,
          createElement(FormStateRoot as never, null as never, createElement(Ecran as never)),
        ) as never,
      );
    });
    // Amorçage : la graine locale est rendue — rien de distant n'est prétendu.
    expect(rendu(r)).toContain("Bouaké");

    // ── 10 · LOADING — OBSERVÉ AU PREMIER REMPLISSAGE, ET SEULEMENT LA.
    //
    // RÉPARATION DU 2026-10-13, ET LA CAUSE MÉRITE D'ÊTRE DITE. Ce bloc
    // attendait « Chargement… » sur le magasin DÉJÀ ENSEMENCÉ ci-dessus. Il a
    // cessé d'être vrai quand `magasin-donnees` a reçu sa règle `DET-033`,
    // issue d'un jugement du propriétaire sur un appareil réel : « une
    // revalidation en ARRIÈRE-PLAN ne remplace pas des données affichées par
    // un état de chargement — le polling repassait chaque écran par
    // "Chargement…" toutes les 30 s, l'UI clignotait, et le champ de recherche
    // était démonté en pleine frappe. »
    //
    // La règle est JUSTE, et c'est l'ATTENTE qui était devenue fausse : tant
    // que des lignes existent, l'instantané servi reste la vérité. Le
    // chargement VISIBLE est réservé au tout premier remplissage.
    //
    // On l'observe donc là où le moteur le montre : un SECOND montage, sur un
    // magasin VIDE. Rien n'est simulé — c'est le même magasin, le même
    // adaptateur, la même transition `appliquerChargement`, sur le seul état
    // où elle a le droit de mordre.
    //
    // ET CE HARNAIS N'ÉTAIT DANS AUCUNE ÉTAPE DE LA CHAÎNE : il a donc pourri
    // sans que rien ne le dise. Mesuré le 2026-10-13 : zéro occurrence de
    // « e33 » dans `ci.yml`. Une preuve hors chaîne n'est pas une preuve, c'est
    // un souvenir.
    let liberer: ((x: { ok: boolean; status: number; corps: unknown }) => void) | undefined;
    const enVol = new Promise<{ ok: boolean; status: number; corps: unknown }>((res) => {
      liberer = res;
    });
    const transportLent = (url: string) => {
      appels.push(url);
      return enVol;
    };
    const magasinVide = creerMagasin({});
    let rVide: ReactTestRenderer | undefined;
    act(() => {
      rVide = create(
        createElement(
          DataRoot as never,
          { provider: magasinVide } as never,
          createElement(FormStateRoot as never, null as never, createElement(Ecran as never)),
        ) as never,
      );
    });
    // CONTRÔLE NÉGATIF : avant tout chargement, l'écran ne PRÉTEND pas charger.
    expect(rendu(rVide)).not.toContain("Chargement des départs…");
    const adaptateurLent = creerAdaptateurReseau({
      magasin: magasinVide,
      cibles: [CIBLE],
      domainesAutorises: DOMAINES,
      transport: transportLent,
    });
    let demarrage: Promise<void> | undefined;
    act(() => {
      demarrage = adaptateurLent.demarrer();
    });
    // LOADING RÉELLEMENT RENDU, sur l'écran émis, pendant que le transport est
    // en vol. C'est la moitié de la dimension C que rien n'observait.
    expect(rendu(rVide)).toContain("Chargement des départs…");
    // Le chargement se termine : l'écran vide reçoit ses lignes et NE DIT PLUS
    // qu'il charge. Les deux sens, comme partout ici.
    await act(async () => {
      liberer?.({
        ok: true,
        status: 200,
        corps: [D("v1", "Premier-Remplissage", "2026-09-03", "a_l_heure")],
      });
      await demarrage;
    });
    expect(rendu(rVide)).toContain("Premier-Remplissage");
    expect(rendu(rVide)).not.toContain("Chargement des départs…");
    adaptateurLent.arreter?.();

    // ── 3 · CONSOMMATION EFFECTIVE, SUR L'ÉCRAN ENSEMENCÉ.
    //
    // Les deux cycles sont DISTINCTS depuis la réparation : l'écran vide a son
    // adaptateur et sa promesse en vol (pour observer le chargement), celui-ci
    // a le sien et sa file. Les mélanger faisait que les lignes attendues ici
    // partaient dans l'autre écran.
    //
    // Ces lignes n'existent QUE chez le transport : si elles s'affichent,
    // c'est qu'elles ont été consommées pour de vrai.
    file = [
      {
        ok: true,
        status: 200,
        corps: [D("r1", "Korhogo-Distante", "2026-09-04", "a_l_heure"), D("r2", "Man-Distante", "2026-09-05", "a_l_heure")],
      },
    ];
    await act(async () => {
      await adaptateur.demarrer();
    });
    const apresRemote = rendu(r);
    expect(apresRemote).toContain("Korhogo-Distante");
    expect(apresRemote).toContain("Man-Distante");
    expect(apresRemote).not.toContain("Bouaké"); // la graine a été REMPLACÉE, pas maquillée
    expect(apresRemote).not.toContain("Chargement des départs…");

    // 8·9 · REFRESH : identiques ⇒ rendu final BYTE-IDENTIQUE ; changées ⇒ nouveau rendu.
    file = [
      { ok: true, status: 200, corps: [D("r1", "Korhogo-Distante", "2026-09-04", "a_l_heure"), D("r2", "Man-Distante", "2026-09-05", "a_l_heure")] },
    ];
    await act(async () => adaptateur.rafraichir("ent_depart"));
    expect(rendu(r)).toBe(apresRemote);
    expect(adaptateur.journal()).toContain("donnees:ent_depart:2:identiques");
    file = [{ ok: true, status: 200, corps: [D("r3", "San-Pédro-Distante", "2026-09-06", "a_l_heure")] }];
    await act(async () => adaptateur.rafraichir("ent_depart"));
    expect(rendu(r)).toContain("San-Pédro-Distante");
    expect(rendu(r)).not.toContain("Korhogo-Distante");

    // 7 · ERREUR transport : l'écran dit la vérité, l'instantané est conservé.
    file = [{ ok: false, status: 503, corps: null }];
    await act(async () => adaptateur.rafraichir("ent_depart"));
    expect(rendu(r)).toContain("Départs indisponibles");
    expect(magasin.listInstances("ent_depart").length).toBe(1); // snapshot conservé

    // 11 · AUCUN appel hors allowlist sur TOUTE la session (transports enregistreurs).
    expect(appels.every((u) => u.startsWith("https://api.bus-intercites.app/"))).toBe(true);

    // 5 · Une cible hors politique ne REND rien de distant : refus avant transport.
    const appelsInterdits: string[] = [];
    const adaptateurInterdit = creerAdaptateurReseau({
      magasin: creerMagasin({ ent_depart: [D("d1", "Bouaké", "2026-09-03", "a_l_heure")] }),
      cibles: [{ ...CIBLE, url: "https://exfiltration.example.com/air/v1/entities/ent_depart/rows" }],
      domainesAutorises: DOMAINES,
      transport: (url: string) => {
        appelsInterdits.push(url);
        return Promise.resolve({ ok: true, status: 200, corps: [] });
      },
    });
    await adaptateurInterdit.demarrer();
    expect(appelsInterdits).toEqual([]);
    expect(adaptateurInterdit.journal()).toEqual(["refus_domaine:ent_depart:exfiltration.example.com"]);

    // ── 12 · LA TRACE EST EXACTE ET DÉTERMINISTE.
    //
    // CORRIGÉE le 2026-10-13, et dans le sens de PLUS de vérité. L'attente
    // portait SIX entrées et commençait au refresh : l'appel qui avait livré
    // les lignes affichées au point 3 n'y figurait PAS, parce qu'il passait par
    // l'adaptateur de l'écran vide. Le journal de cet adaptateur ne décrivait
    // donc pas la donnée qu'on lui attribuait.
    //
    // Depuis que les deux cycles sont séparés, la trace porte HUIT entrées et
    // les deux premières sont le premier remplissage distant de l'écran
    // ensemencé — `nouvelles`, parce que la graine est REMPLACÉE, ce que le
    // point 3 affirme déjà sur le rendu.
    expect(adaptateur.journal()).toEqual([
      "chargement:ent_depart",
      "donnees:ent_depart:2:nouvelles",
      "chargement:ent_depart",
      "donnees:ent_depart:2:identiques",
      "chargement:ent_depart",
      "donnees:ent_depart:1:nouvelles",
      "chargement:ent_depart",
      "erreur_statut:ent_depart:503",
    ]);

    r?.unmount();
  });
});
