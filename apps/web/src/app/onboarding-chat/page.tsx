'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import OnboardingChat from '@/components/onboarding/OnboardingChat';
import Sidebar from '@/components/Sidebar';

/**
 * LA DEMANDE QUI ARRIVE PAR L'ADRESSE.
 *
 * L'atelier l'y met quand il propose une régénération après un refus de
 * retouche : la demande d'origine, plus ce que la personne venait de
 * décrire. Elle ne doit rien recopier.
 *
 * `useSearchParams` impose une frontière Suspense — elle est ici, autour
 * du seul composant qui en a besoin, plutôt qu'un rendu dynamique forcé
 * sur toute la page.
 */
function ChatAvecDemande() {
  const params = useSearchParams();
  return <OnboardingChat demandeRecue={params.get('demande') ?? ''} />;
}

export default function OnboardingChatPage() {
  return (
    <div className="min-h-screen nexiora-bg text-white flex">
      <Sidebar />
      <main className="flex-1 min-w-0 px-6 lg:pl-40 lg:pr-12">
        <div className="pt-24 pb-4" />
        <Suspense fallback={<OnboardingChat />}>
          <ChatAvecDemande />
        </Suspense>
      </main>
    </div>
  );
}
