"use client";
// ============================================================
// LE COUT DE CHAQUE APPLICATION GENEREE.
//
// Ce qui remplace le plafond de 6 $ que j'avais pose : on SURVEILLE au lieu
// d'empecher. Les refus sont montres au meme titre que les reussites, et le
// « payé pour rien » a sa propre case — c'est le chiffre qui dit si le moteur
// passe ou s'il tourne a vide.
// ============================================================
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Boxes, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";

interface Ligne {
  id: string;
  created_at: string;
  owner_email: string | null;
  demande: string;
  nom: string | null;
  ok: boolean;
  cout_usd: number;
  duree_ms: number;
  jetons_entree: number;
  jetons_sortie: number;
  diagnostics: string[] | null;
  tirages: number;
}
interface Data {
  tableAbsente: boolean;
  detail?: string;
  lignes: Ligne[];
  total: { generations: number; reussies: number; coutUsd: number; coutPerdu: number };
}

const usd = (n: number): string => `${n.toFixed(4)} $`;
const secondes = (ms: number): string => `${String(Math.round(ms / 1000))} s`;

export default function ApplicationsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [erreur, setErreur] = useState("");
  const [charge, setCharge] = useState(true);

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setErreur("Non connecté."); return; }
        const res = await fetch("/api/admin/applications", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const j = (await res.json()) as Data & { error?: string };
        if (!res.ok) { setErreur(j.error ?? "Lecture impossible."); return; }
        setData(j);
      } catch {
        setErreur("Lecture impossible.");
      } finally {
        setCharge(false);
      }
    }
    void load();
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 px-6 py-8 lg:px-10">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6">
          <ArrowLeft size={16} /> Retour à l’administration
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <Boxes className="text-[#FA5D1E]" size={22} />
          <h1 className="text-2xl font-bold tracking-tight">Applications générées</h1>
        </div>

        {charge && <p className="text-slate-400 text-sm">Lecture…</p>}
        {erreur !== "" && <p className="text-amber-300/80 text-sm">{erreur}</p>}

        {data?.tableAbsente === true && (
          <div className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] px-5 py-4 mb-8">
            <p className="text-sm text-amber-200/90 font-medium mb-1">
              Le journal n’est pas encore posé en base.
            </p>
            <p className="text-sm text-slate-400 leading-relaxed">
              Les générations continuent d’être comptées dans <strong>Consommation IA</strong>.
              Le détail par application apparaîtra ici dès que la table sera créée — le SQL
              vit avec le code, dans <code className="text-slate-300">lib/apps/journal.ts</code>.
            </p>
          </div>
        )}

        {data !== null && !data.tableAbsente && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Case label="Générations" valeur={String(data.total.generations)} />
              <Case label="Réussies" valeur={`${String(data.total.reussies)} / ${String(data.total.generations)}`} />
              <Case label="Coût total" valeur={usd(data.total.coutUsd)} />
              {/* LE CHIFFRE QUI COMPTE LE PLUS : ce qui a été payé sans rien rendre. */}
              <Case label="Payé pour rien" valeur={usd(data.total.coutPerdu)} alerte={data.total.coutPerdu > 0} />
            </div>

            {data.lignes.length === 0 ? (
              <p className="text-slate-400 text-sm">Aucune application générée pour l’instant.</p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-white/[0.04] text-slate-400">
                    <tr>
                      {["Date", "Demandeur", "Application", "Issue", "Coût", "Durée", "Tirages"].map((t) => (
                        <th key={t} className="text-left font-medium px-4 py-3 whitespace-nowrap">{t}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.lignes.map((l) => (
                      <tr key={l.id} className="border-t border-white/[0.06] align-top">
                        <td className="px-4 py-3 whitespace-nowrap text-slate-400">
                          {new Date(l.created_at).toLocaleString("fr-FR")}
                        </td>
                        <td className="px-4 py-3 text-slate-300">{l.owner_email ?? "—"}</td>
                        <td className="px-4 py-3 max-w-md">
                          <span className="block text-slate-100">{l.nom ?? "—"}</span>
                          <span className="block text-xs text-slate-500 line-clamp-2">{l.demande}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {l.ok ? (
                            <span className="text-emerald-400">livrée</span>
                          ) : (
                            <span className="text-amber-300/90">
                              refusée
                              {(l.diagnostics ?? []).length > 0 && (
                                <span className="block text-xs text-slate-500">
                                  {[...new Set(l.diagnostics ?? [])].slice(0, 3).join(", ")}
                                </span>
                              )}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap tabular-nums">{usd(Number(l.cout_usd))}</td>
                        <td className="px-4 py-3 whitespace-nowrap tabular-nums text-slate-400">{secondes(l.duree_ms)}</td>
                        <td className="px-4 py-3 whitespace-nowrap tabular-nums text-slate-400">{String(l.tirages)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Case({ label, valeur, alerte = false }: { label: string; valeur: string; alerte?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-xl font-semibold tabular-nums ${alerte ? "text-amber-300" : "text-slate-100"}`}>
        {valeur}
      </p>
    </div>
  );
}
