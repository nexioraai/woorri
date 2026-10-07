// Une page CLIENTE ne peut pas exporter ses metadonnees : ce segment les porte
// pour elle. Sans ce fichier, `/generateur` servirait la metadata de
// l'ACCUEIL — un cliquet du depot l'a refuse, a juste titre.
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Générateur d’applications — Deribfy',
  description:
    'Décrivez votre application : Deribfy la construit et vous la remet en un fichier, ' +
    'prête à déposer chez l’hébergeur de votre choix.',
};

export default function GenerateurLayout({ children }: { children: React.ReactNode }) {
  return children;
}
