import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import { LanguageProvider } from "@/lib/translations";
import { SITE_URL, metadataPublique } from "@/lib/seo/metadata";
import { langueServie } from "@/lib/seo/langueServie";
import CookieConsent from "@/components/CookieConsent";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Referencee par les themes storefront (Editorial/Vif/Noir) via
// var(--font-fraunces) sans jamais avoir ete declaree -- les 3 thèmes
// rendaient donc en serif generique du navigateur. Declaree ici, au meme
// niveau que Geist, pour etre disponible sur toutes les routes (aucun
// layout dedie aux routes storefront n'existe aujourd'hui).
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

// ── LA METADATA DE LA RACINE EST CELLE DE L'ACCUEIL, ET EN FRANÇAIS.
//
// ÉTAT TROUVÉ : `<html lang="fr">` juste en dessous, et un titre ANGLAIS
// au-dessus. Ce n'était pas une incohérence de surface — c'est EXACTEMENT ce
// que Google indexait, puisque la bascule de langue est côté navigateur et
// n'arrive jamais jusqu'au moteur.
//
// CHOIX ASSUMÉ (consigné dans PROGRESS.md) : le français est la langue
// SERVIE. Le marché visé est tchadien, `/about` était déjà en français, et le
// `lang` du document l'annonçait déjà. Le sélecteur de langue reste en place
// pour le visiteur ; il ne décide simplement plus de ce que voit un moteur.
export const metadata: Metadata = {
  ...metadataPublique("/"),
  // `notranslate` : la barre de traduction automatique de Chrome réécrivait le
  // nom de la marque et les libellés de l'interface.
  other: { google: "notranslate" },
  metadataBase: new URL(SITE_URL),
  // ── LES ICÔNES DE LA PLATEFORME, DÉCLARÉES ICI PLUTÔT QUE DÉDUITES. M2-242.
  //
  // Elles vivaient dans `src/app/` (favicon.ico, icon.png, apple-icon.png),
  // où Next les traite comme une CONVENTION et injecte lui-même les balises
  // dans TOUTES les pages de l'application — y compris celles des boutiques
  // marchandes, où `<link rel="icon" href="/favicon.ico?favicon.<hachage>.ico">`
  // arrivait EN PREMIER, avant les icônes du marchand.
  //
  // Le CONTENU servi était juste — `proxy.ts` réécrit `/favicon.ico` vers
  // l'icône du marchand — mais l'URL portait un hachage de build qui change à
  // CHAQUE déploiement. C'est précisément l'adresse instable que les moteurs
  // de recherche demandent d'éviter pour une icône.
  //
  // Depuis `public/`, plus aucune balise n'est injectée : une page marchande
  // ne déclare que SES icônes, et la plateforme déclare les siennes ci-dessous.
  // Les chemins sont fixes — c'est tout l'intérêt.
  //
  // MESURÉ AVANT D'ÊTRE FAIT. Une sonde statique en production a montré que le
  // proxy s'exécute AVANT le service des fichiers de `public/` :
  //     deribfy.com/proxy-sonde.txt    -> 200, le texte
  //     chanorfie.com/proxy-sonde.txt  -> 404, donc réécrit
  // Sans cette mesure, se tromper aurait fait servir l'icône de Deribfy sur
  // TOUTES les boutiques — le défaut que `favicon.ts` décrit comme « un
  // marchand marqué à l'enseigne de son fournisseur ».
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // ── `lang` ET `dir` VIENNENT DE LA REQUÊTE, PLUS D'UNE CONSTANTE.
  //
  // Ce layout enveloppe AUSSI les sites marchands (`proxy.ts` y réécrit chaque
  // domaine personnalisé). Écrire `fr` en dur faisait donc s'annoncer en
  // français des boutiques anglophones — mesuré le 2026-09-23 : 3 des 5 sites
  // publiés, dont `yiaglobalcommodities.com`. `HtmlLang` corrigeait bien
  // l'attribut, mais dans un `useEffect` : après hydratation, donc jamais pour
  // un moteur ni pour un visiteur sur connexion lente.
  //
  // Repli sur le français quand l'en-tête est absent : c'est la langue de la
  // plateforme elle-même.
  const { lang, dir } = await langueServie();

  return (
    <html
      lang={lang}
      dir={dir}
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          {children}
          <CookieConsent />
        </LanguageProvider>
      </body>
    </html>
  );
}
