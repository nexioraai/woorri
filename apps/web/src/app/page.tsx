import OnboardingChat from '@/components/onboarding/OnboardingChat';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';

// ============================================================
// LA PAGE D'ACCUEIL NE SERVAIT AUCUN CONTENU AUX MOTEURS.
//
// ── CE QUI A ÉTÉ MESURÉ LE 2026-09-29, EN PRODUCTION.
//
//   deribfy.com/   :  0 <h1>,  0 <p>,  0 <a>,    59 caracteres de texte
//   deribfy.com/about : 1 <h1>,              3 333 caracteres de texte
//
// Le titre et la description partaient bien ; le corps de la page, non. Sur
// la page qui porte le nom de la marque et vers laquelle pointe tout lien
// externe, un robot ne trouvait qu'un titre.
//
// ── LA CAUSE : UNE GARDE QUI N'A JAMAIS RIEN GARDÉ.
//
// Ce fichier etait un composant client qui appelait `supabase.auth.getSession()`
// puis JETAIT le resultat — aucune redirection, aucune decision, la valeur
// n'etait lue nulle part. Son seul effet : rendre `<div />` vide jusqu'a ce
// qu'un aller-retour reseau se termine. C'est donc ce div vide que le serveur
// rendait, et c'est lui que Google recevait.
//
// Le composant d'accueil gere son propre utilisateur (`getUser` pour l'email,
// `getSession` au moment d'envoyer, avec renvoi vers la connexion). Il n'avait
// jamais eu besoin que le parent attende pour lui.
//
// ── CE QUE CELA CHANGE, ET CE QUE CELA NE CHANGE PAS.
//
// Les visiteurs voient la meme page, plus tot — sans l'ecran noir d'attente.
// Les moteurs et les IA recoivent ce que les visiteurs voient : le titre, le
// sous-titre et le premier message. RIEN n'est montre aux robots qui ne soit
// montre aux humains ; l'inverse serait de la dissimulation, et se paie.
//
// Plus de directive client ici : sans etat ni effet, cette page redevient un
// composant serveur, et ses deux enfants restent clients comme avant.
// ============================================================

export default function Home() {
  return (
    <div className="min-h-screen nexiora-bg text-white flex">
      <Sidebar />
      <main className="flex-1 min-w-0 px-6 lg:pl-40 lg:pr-12">
        <div className="pt-24 pb-4" />
        <OnboardingChat />
        {/* ── LE SEUL CHEMIN VERS LES PAGES PUBLIQUES, DEPUIS L'ACCUEIL.
            Cette page rend `Sidebar`, qui ne mène qu'à l'espace privé. Elle
            ne liait donc vers AUCUNE page publique — Search Console le disait
            sur /blog : « Referring page: None detected ». L'accueil est la
            page vers laquelle pointe tout lien externe : c'est d'elle que la
            découverte doit partir. */}
        <Footer />
      </main>
    </div>
  );
}
