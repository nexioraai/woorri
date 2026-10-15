/**
 * EP-225 · UNE TRANCHE NE FINIT JAMAIS SANS RIEN ÉCRIRE.
 *
 * ── LA MESURE, ET CE QU'ELLE A COÛTÉ EN TEMPS.
 *
 * Génération lancée depuis l'interface le 2026-10-15 à 12:31. À 13:41 :
 * `statut=en_cours`, `tirages=0`, `cout_usd=0`, `sections_acquises={}`,
 * `niveaux_sondes=null`. **1 h 10, et pas un octet écrit** — alors que le
 * battement était frais, donc qu'un travailleur tenait bien la ligne.
 *
 * ── LA CAUSE, LUE DANS LE CODE ET NON DEVINÉE.
 *
 * Le moteur ne vérifie son budget de tranche qu'ENTRE deux appels : « La
 * suspension tombe ENTRE deux tirages, jamais pendant », c'est écrit dans
 * `moteur.mjs`. L'appel, lui, a un délai client de 45 minutes — choisi
 * exprès, parce qu'un flux long est la voie du fournisseur. Et Vercel tue
 * la fonction à 800 secondes.
 *
 * Un appel démarré avec 300 s de budget restant et qui en prend 600 fait
 * donc tuer la fonction EN PLEIN VOL : rien d'écrit, rien de compté. Le
 * chien de garde confie la ligne à un autre travailleur 15 minutes plus
 * tard, qui refait exactement la même chose. Boucle sans fin, à coût nul
 * côté base — et à coût INCONNU côté fournisseur, les jetons d'un flux
 * interrompu étant produits sans que le relevé d'usage n'arrive jamais.
 *
 * ── POURQUOI CE CHEMIN ET PAS L'AUTRE.
 *
 * Trois applications complètes existent sur le disque, produites par la
 * voie CAMPAGNE (terminal) : kaviva-spa, marche-immobilier,
 * marketplace-africain. Le terminal n'a AUCUNE limite de temps. Le moteur
 * a été construit pour lui, et le découpage en tranches n'a jamais été
 * rendu solidaire de l'appel. Ce n'est pas un défaut de l'IA : c'est de
 * la plomberie de serveur.
 */
import { describe, expect, it } from "vitest";
import {
  envelopperEnFlux,
} from "../../../benchmarks/air-emission/adaptateur-anthropic.mjs";

/** Un fournisseur qui met `ms` à répondre, et qui HONORE le signal. */
const fournisseurLent = (ms: number) => ({
  messages: {
    create(_corps: unknown, options?: { signal?: AbortSignal }) {
      return new Promise((resoudre, rejeter) => {
        const t = setTimeout(() => { resoudre({ content: [], usage: {} }); }, ms);
        options?.signal?.addEventListener("abort", () => {
          clearTimeout(t);
          const e = new Error("The operation was aborted due to timeout");
          e.name = "TimeoutError";
          rejeter(e);
        });
      });
    },
  },
});

// Le moteur n'a pas de declaration TypeScript, et lui en ecrire une ne
// prouverait rien de plus. On l'importe par URL — specificateur NON
// litteral, donc non resolu par le typeur : exactement le motif que
// `apps/web/src/lib/apps/moteur.ts` emploie deja sur ce meme fichier.
const CHEMIN_MOTEUR = new URL(
  "../../../benchmarks/air-emission/moteur.mjs",
  import.meta.url,
).href;

const appeler = async (brut: unknown, echeance: (() => number) | null): Promise<unknown> =>
  (envelopperEnFlux as (b: unknown, e: unknown) => {
    messages: { create: (a: unknown) => Promise<unknown> }
  })(brut, echeance).messages.create({ stream: true, model: "x" });

describe("EP-225 · l'appel est solidaire de la tranche", () => {
  it("un appel qui dépasse l échéance est INTERROMPU, et l erreur le dit", async () => {
    // échéance 20,5 s → marge de 20 s retirée → le signal tombe à 500 ms,
    // relevé au plancher de 1 s. L'appel en demande 3 : il est coupé.
    const brut = fournisseurLent(3_000);
    await expect(appeler(brut, () => 20_500)).rejects.toMatchObject({ budgetTemps: true });
  });

  it("CONTRÔLE NÉGATIF — sans échéance, le même appel aboutit", async () => {
    // Sans ce contrôle, un code qui interromprait TOUT passerait au vert.
    // C'est le cas de la campagne en terminal : aucune limite, rien ne change.
    const brut = fournisseurLent(50);
    await expect(appeler(brut, null)).resolves.toBeDefined();
  });

  it("CONTRÔLE NÉGATIF — une échéance LARGE laisse l appel aboutir", async () => {
    const brut = fournisseurLent(50);
    await expect(appeler(brut, () => 300_000)).resolves.toBeDefined();
  });

  it("LA MARGE EXISTE : le signal tombe AVANT la fin du budget", async () => {
    // Rendre la main pile à l'échéance ferait tuer la fonction pendant
    // l'écriture en base — le défaut déplacé, pas corrigé. On mesure que
    // l'interruption arrive nettement avant le budget annoncé.
    const brut = fournisseurLent(60_000);
    const debut = Date.now();
    await expect(appeler(brut, () => 25_000)).rejects.toMatchObject({ budgetTemps: true });
    const ecoule = Date.now() - debut;
    expect(ecoule, "l interruption doit tomber bien avant les 25 s annoncées").toBeLessThan(12_000);
  });

  it("une erreur ORDINAIRE n est pas déguisée en budget", async () => {
    // LE CONTRÔLE QUI COMPTE. Marquer tout échec `budgetTemps` ferait
    // suspendre sur une vraie panne, qui serait alors retentée sans fin.
    const brut = {
      messages: {
        create: () => Promise.reject(Object.assign(new Error("overloaded"), { status: 529 })),
      },
    };
    await expect(appeler(brut, () => 300_000)).rejects.toMatchObject({ message: "overloaded" });
    await expect(appeler(brut, () => 300_000)).rejects.not.toMatchObject({ budgetTemps: true });
  });

  it("LE CABLAGE REEL pose le signal — pas seulement l enveloppe isolée", async () => {
    // ── LE CONTRÔLE QUI MANQUAIT, ET QUI A COÛTÉ UN TIR ENTIER.
    //
    // Ma premiere version branchait `echeance: () => echeanceTranche` alors
    // que `echeanceTranche` EST une fonction : l adaptateur recevait donc
    // une fonction au lieu d un nombre, `Number.isFinite` la refusait EN
    // SILENCE, et aucun signal n etait pose. La tranche du 2026-10-15 a
    // 17:26 est morte exactement comme avant la correction.
    //
    // Les controles precedents passaient tous : ils fournissaient
    // `() => 20_500` A LA MAIN. Ils eprouvaient l enveloppe, jamais le
    // CABLAGE. Celui-ci monte un vrai moteur avec un faux SDK, et regarde
    // ce que le SDK recoit — la seule chose qui compte en production.
    const recus: { signal: unknown }[] = [];
    class FauxSdk {
      messages = {
        create: (_corps: unknown, options?: { signal?: unknown }) => {
          recus.push({ signal: options?.signal });
          const e = new Error("BUDGET_TEMPS");
          (e as Error & { budgetTemps?: boolean }).budgetTemps = true;
          return Promise.reject(e);
        },
      };
      // PAS DE CONSTRUCTEUR : une classe sans constructeur accepte deja
      // `new FauxSdk({ apiKey })` et ignore l'argument. En ecrire un vide
      // serait du bruit que le lint refuse, a raison.
    }
    const { creerMoteur } = (await import(CHEMIN_MOTEUR)) as { creerMoteur: (o: unknown) => Promise<{
      poursuivreEmission: (o: unknown) => Promise<unknown>
    }> };
    const m = await creerMoteur({
      cleApi: "ANTHROPIC_API_KEY=sk-faux-pour-le-cablage",
      sdk: FauxSdk,
      lireFichier: () => "ANTHROPIC_API_KEY=sk-faux-pour-le-cablage",
    });
    await m.poursuivreEmission({
      brief: "une application de suivi",
      slug: "ep225-cablage",
      budgetMs: 740_000,
    });
    expect(recus.length, "le faux SDK n a jamais ete appele").toBeGreaterThan(0);
    expect(
      recus[0]?.signal,
      "le SDK n a recu AUCUN signal : l echeance ne l atteint pas, et la tranche mourra comme avant",
    ).toBeDefined();
  });

  it("le moteur SUSPEND au lieu de mourir quand l échéance tombe", async () => {
    // Le comportement de bout en bout : un fournisseur qui n'annonce que
    // l'échéance doit produire une SUSPENSION — un état réutilisable —
    // et non une exception qui laisse la ligne vide.
    const { creerMoteur } = (await import(CHEMIN_MOTEUR)) as { creerMoteur: (o: unknown) => Promise<{
      poursuivreEmission: (o: unknown) => Promise<{ fini: boolean; raison?: string; etape?: string }>
    }> };
    const client = {
      messages: {
        create: () => {
          const e = new Error("BUDGET_TEMPS");
          (e as Error & { budgetTemps?: boolean }).budgetTemps = true;
          return Promise.reject(e);
        },
      },
    };
    const m = await creerMoteur({ cleApi: "client-a-blanc", client });
    const r = await m.poursuivreEmission({ brief: "une application de suivi", slug: "ep225" });
    expect(r.fini, "la tranche doit SUSPENDRE, pas finir").toBe(false);
    expect(r.raison, "la suspension doit être motivée par le temps").toBe("budget_temps");
    expect(r.etape, "elle doit dire OÙ elle s est arrêtée").toBe("p0");
  });

  it("CONTRÔLE NÉGATIF — une panne du fournisseur n est PAS suspendue", async () => {
    // Sinon le moteur retenterait une vraie panne à chaque tranche,
    // indéfiniment, en la prenant pour un manque de temps.
    const { creerMoteur } = (await import(CHEMIN_MOTEUR)) as { creerMoteur: (o: unknown) => Promise<{
      poursuivreEmission: (o: unknown) => Promise<unknown>
    }> };
    const client = {
      messages: { create: () => Promise.reject(new Error("panne du fournisseur")) },
    };
    const m = await creerMoteur({ cleApi: "client-a-blanc", client });
    await expect(
      m.poursuivreEmission({ brief: "une application de suivi", slug: "ep225" }),
    ).rejects.toThrow();
  });
});
