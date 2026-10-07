// Une page CLIENTE ne peut pas exporter ses metadonnees : ce segment les porte
// pour elle. Sans ce fichier, la page servirait la metadata de l'ACCUEIL — un
// cliquet du depot l'a deja refuse une fois.
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Générateur d’applications — Deribfy',
  description:
    'Décrivez votre application. Deribfy vous dit ce qu’il a compris, puis la construit.',
};

export default function GenerateurLayout({ children }: { children: React.ReactNode }) {
  return children;
}
