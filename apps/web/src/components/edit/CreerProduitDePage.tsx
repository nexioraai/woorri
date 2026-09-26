'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

// ============================================================
// CRÉER UN PRODUIT DEPUIS LA PAGE.
//
// ── CE QUE J'AVAIS MAL COMPRIS, ET CE QUE LE MARCHAND DEMANDE VRAIMENT.
//
// J'ai d'abord livré un SÉLECTEUR : cocher, parmi les produits existants,
// ceux qui figurent sur la page. Ce n'était pas la demande. « Je ne cherche
// pas à ajouter des produits existants, il faut pouvoir en ajouter
// d'autres. »
//
// Le marchand qui crée une page « Chaussures » veut y METTRE SES CHAUSSURES —
// les saisir là, avec leur nom, leur description, leur prix et leurs photos.
// Le détour par une autre page pour créer l'article, puis le retour pour le
// cocher, c'est exactement le travail qu'on lui demandait d'éviter.
//
// ── LE PRODUIT CRÉÉ EST UN VRAI PRODUIT, PAS UN BLOC DE PAGE.
//
// Il entre dans `shop_products` comme n'importe quel autre : il a sa fiche,
// son adresse, ses boutons WhatsApp / appel / Mobile Money, il apparaît dans
// la boutique et dans la recherche. La page n'en retient que
// l'identifiant — s'il n'était qu'un bloc décoratif, on ne pourrait ni
// l'acheter, ni le retrouver, ni le référencer.
//
// ── LES PHOTOS PASSENT PAR LA CHAÎNE HABITUELLE.
//
// `/api/images/upload` : orientation redressée, métadonnées retirées (un
// téléphone y met des coordonnées GPS), variantes et retouche. La même que
// le gestionnaire de produits — deux chemins d'envoi divergeraient.
// ============================================================

export type CreerProduitDePageProps = {
  slug: string;
  /** Devise par défaut de la boutique, pour ne pas la redemander. */
  deviseParDefaut?: string;
  /** Appelé avec l'identifiant du produit créé. */
  onCree: (id: string) => void;
  labels: Record<string, string>;
};

export default function CreerProduitDePage({ slug, deviseParDefaut, onCree, labels }: CreerProduitDePageProps) {
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [prix, setPrix] = useState('');
  const [ancienPrix, setAncienPrix] = useState('');
  const [devise, setDevise] = useState(deviseParDefaut || 'XAF');
  const [photos, setPhotos] = useState<string[]>([]);
  const [envoiPhotos, setEnvoiPhotos] = useState(false);
  const [creation, setCreation] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const reinitialiser = () => {
    setNom(''); setDescription(''); setPrix(''); setAncienPrix('');
    setPhotos([]); setMessage(null);
  };

  const deposerPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichiers = Array.from(e.target.files ?? []);
    if (fichiers.length === 0) return;
    setEnvoiPhotos(true);
    setMessage(null);
    const ajoutees: string[] = [];
    for (const fichier of fichiers) {
      try {
        const corps = new FormData();
        corps.append('slug', slug);
        corps.append('file', fichier);
        // LE JETON : `/api/images/upload` vérifie la propriété du site — la
        // même garde que la route du logo vient de recevoir. Sans en-tête,
        // chaque photo repartirait en 401 et le marchand verrait ses envois
        // échouer sans explication.
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/images/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
          body: corps,
        });
        const data = await res.json();
        // LA VERSION RETOUCHÉE PAR DÉFAUT, comme dans le gestionnaire de
        // produits : c'est ce que le marchand attend, et l'original reste
        // conservé côté serveur.
        if (res.ok) ajoutees.push(data.amelioration?.url ?? data.url);
      } catch {
        // Une photo qui échoue ne doit pas emporter les autres.
      }
    }
    setPhotos((p) => [...p, ...ajoutees]);
    setEnvoiPhotos(false);
    // Sans cela, redéposer le MÊME fichier n'émet aucun événement.
    e.target.value = '';
  };

  const creer = async () => {
    if (nom.trim() === '') { setMessage(labels.needName); return; }
    if (prix.trim() === '') { setMessage(labels.needPrice); return; }
    setCreation(true);
    setMessage(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/shop/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({
          slug,
          name: nom.trim(),
          description: description.trim(),
          price: Number(prix.replace(',', '.')),
          // L'ANCIEN PRIX N'EST ENVOYÉ QUE S'IL EST SUPÉRIEUR : un « ancien
          // prix » inférieur au prix actuel afficherait une remise négative.
          compare_at_price:
            ancienPrix.trim() !== '' && Number(ancienPrix.replace(',', '.')) > Number(prix.replace(',', '.'))
              ? Number(ancienPrix.replace(',', '.'))
              : null,
          currency: devise,
          images: photos,
          // PUBLIÉ D'EMBLÉE : un produit créé depuis une page est créé pour
          // être vu. Un brouillon invisible rejouerait exactement le défaut
          // d'origine — le marchand agit, et rien n'apparaît.
          published: true,
          // `for_sale` N'EST PAS ENVOYÉ, ET C'EST DÉLIBÉRÉ.
          //
          // Son DEFAUT SQL est `true`, et un cliquet du dépôt
          // (`inventoryPolicyRatchets`) restreint les fichiers qui ont le
          // droit de nommer ce champ : il garde l'achetabilité comme une
          // décision rare et localisée. L'exception existante concerne les
          // prix GÉNÉRÉS, qui naissent non achetables tant que le marchand
          // ne les a pas vérifiés. Ici, c'est le marchand LUI-MÊME qui tape
          // le prix : le défaut convient, et le champ n'a rien à faire ici.
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.product?.id) { setMessage(labels.failed); return; }
      onCree(String(data.product.id));
      reinitialiser();
      setOuvert(false);
    } catch {
      setMessage(labels.failed);
    } finally {
      setCreation(false);
    }
  };

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="w-full px-4 py-3 rounded-xl bg-[#FA5D1E]/10 hover:bg-[#FA5D1E]/20 text-[#FA5D1E] font-semibold transition border border-[#FA5D1E]/20 border-dashed text-sm"
      >
        {labels.open}
      </button>
    );
  }

  const champ = 'w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FA5D1E]';

  return (
    <div className="space-y-3 p-3 rounded-xl border border-[#FA5D1E]/20 bg-[#FA5D1E]/[0.04]">
      <div>
        <label className="block text-xs text-white/50 mb-1">{labels.name}</label>
        <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder={labels.namePh} className={champ} />
      </div>

      <div>
        <label className="block text-xs text-white/50 mb-1">{labels.desc}</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={labels.descPh} rows={3} className={`${champ} resize-y`} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-xs text-white/50 mb-1">{labels.price}</label>
          {/* `type="number"`, comme le gestionnaire de produits : un champ de
              prix se saisit de la même façon partout. `inputMode` aurait donné
              le même clavier, mais c'est un HOMONYME de `sites.mode` que le
              détecteur d'architecture signale — et élargir une liste
              d'exemptions pour un attribut de formulaire aurait affaibli une
              garde réelle au profit d'un détail. */}
          <input type="number" step="0.01" value={prix} onChange={(e) => setPrix(e.target.value)} className={champ} />
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1">{labels.compare}</label>
          <input type="number" step="0.01" value={ancienPrix} onChange={(e) => setAncienPrix(e.target.value)} className={champ} />
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1">{labels.currency}</label>
          <input value={devise} onChange={(e) => setDevise(e.target.value)} className={champ} />
        </div>
      </div>

      <div>
        <label className="block text-xs text-white/50 mb-1">{labels.photos}</label>
        {photos.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {photos.map((u) => (
              <span key={u} className="relative w-14 h-14 rounded-md overflow-hidden border border-white/10 bg-white/5">
                {/* `contain` : une vignette qui rogne ne montre pas le produit. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="" className="w-full h-full object-contain" />
                <button
                  type="button"
                  onClick={() => setPhotos((p) => p.filter((x) => x !== u))}
                  aria-label="×"
                  className="absolute top-0 right-0 w-5 h-5 text-xs bg-black/70 text-white/80 hover:text-white"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <label className="block w-full text-center bg-white/5 hover:bg-white/10 text-white/70 py-2.5 rounded-lg cursor-pointer text-sm transition border border-white/10">
          {envoiPhotos ? labels.sending : labels.addPhotos}
          <input type="file" accept="image/*,.heic,.heif" multiple onChange={(e) => { void deposerPhotos(e); }} className="hidden" />
        </label>
      </div>

      {message && <p className="text-sm text-amber-300/90">{message}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { void creer(); }}
          disabled={creation || envoiPhotos}
          className="flex-1 px-4 py-2.5 rounded-lg bg-[#FA5D1E] hover:bg-[#FA5D1E]/90 text-white font-semibold text-sm transition disabled:opacity-40"
        >
          {creation ? labels.creating : labels.create}
        </button>
        <button
          type="button"
          onClick={() => { setOuvert(false); reinitialiser(); }}
          className="px-4 py-2.5 rounded-lg text-sm text-white/40 hover:text-white/70 transition"
        >
          {labels.cancel}
        </button>
      </div>
    </div>
  );
}
