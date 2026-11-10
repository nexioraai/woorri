import { redirect } from 'next/navigation'

// LOT 12.4 — L'ESPACE FOURNISSEUR EST L'ESPACE.
// Le plan nommait `/espace-fournisseur` ; l'espace existe déjà sous
// `/espace-client`, avec les pages du fournisseur. Une seconde page d'accueil
// serait une seconde vérité sur « ce que je peux faire ici » — on redirige.
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  redirect(`/sites/${slug}/espace-client`)
}
