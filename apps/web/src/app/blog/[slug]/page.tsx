import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/seo/metadata";

export const revalidate = 3600;

// Le titre et la description viennent de l'ARTICLE, jamais d'un gabarit : deux
// articles ne doivent pas se présenter à Google sous la même identité — c'est
// le défaut exact qui frappait `/privacy`, `/cookies` et `/terms`.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  // `article` et NON `post` : le corps de cette page fait sa propre requête,
  // nommée `post`, avec `select("*")`. Deux requêtes sous le même nom dans un
  // même fichier, dont une à projection ÉTROITE, est précisément la confusion
  // qui a produit DEBT-068 — une garde lisant une colonne jamais demandée.
  const { data: article } = await supabase
    .from("blog_posts")
    .select("title, excerpt, content, cover_image")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (!article) return { title: "Article introuvable — Deribfy", robots: { index: false, follow: false } };

  // Repli en cascade : extrait, puis début du contenu. Une description absente
  // laisse Google en écrire une lui-même, et il choisit rarement bien.
  const brut: string =
    (article.excerpt as string | null) ?? (article.content as string | null) ?? "";
  const description =
    brut.replace(/\s+/g, " ").trim().slice(0, 157).trimEnd() ||
    "Article du blog Deribfy.";

  return pageMetadata({
    titre: `${article.title as string} — Blog Deribfy`,
    description: description.length === 157 ? description + "…" : description,
    chemin: `/blog/${slug}`,
    image: (article.cover_image as string | null) ?? undefined,
  });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: post } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (!post) notFound();

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
      <p className="text-sm text-gray-400 mb-8">
        {new Date(post.created_at).toLocaleDateString("fr-CA")}
      </p>
      <article className="prose prose-invert max-w-none">{post.content}</article>
    </main>
  );
}
