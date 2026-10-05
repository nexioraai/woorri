// ════════════════════════════════════════════════════════════════════
//  UN RENDU HTML POUR LES DOCUMENTS DÉRIVÉS — UN SEUL.
// ════════════════════════════════════════════════════════════════════
//
// ── POURQUOI IL EST SORTI DE `specification.mjs`.
//
// Ce renderer y vivait, et il y était bon. Un second document dérivé du même
// AIR est arrivé — le CONTRAT D'API remis au développeur du serveur — et il
// avait besoin du même rendu. Le recopier aurait donné deux pages qui se
// ressemblent le premier jour et divergent au premier correctif : le dépôt
// paie déjà cette leçon ailleurs (une seule feuille de styles pour deux
// cibles, une seule règle d'accès).
//
// La page publiée doit rester IDENTIQUE À L'OCTET après cette extraction :
// c'est la seule preuve que le déplacement n'a rien changé.
//
// ── CE QU'IL AJOUTE À LA VERSION D'ORIGINE.
//
// Les BLOCS DE CODE (```). La spécification n'en portait aucun ; le contrat en
// porte — une réponse JSON attendue du serveur. Sans eux, chaque ligne du bloc
// devenait un paragraphe, accolades comprises, et la forme exacte que le
// serveur doit rendre devenait illisible.

const ech = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ── LE CODE SE MET DE CÔTÉ AVANT QU'ON TOUCHE AU RESTE.
//
// DÉFAUT VU SUR LA PAGE PUBLIÉE : `prj_tontine_cameroun` sortait
// « prj<em>tontine</em>cameroun », et `est_sans_telephone` perdait ses tirets
// bas. L'italique du Markdown — `_ceci_` — s'appliquait À L'INTÉRIEUR du code,
// là où un tiret bas n'est pas une marque de style mais une LETTRE DU NOM.
//
// Le développeur backend aurait lu des noms de champs faux. Dans un document
// dont tout l'intérêt est d'être exact, c'est le pire endroit pour se tromper.
//
// On extrait donc les fragments de code sous un jeton que le Markdown ne peut
// pas contenir, on applique le gras et l'italique au reste, puis on remet les
// fragments. Même remède que pour les formules des cours de mathématiques, où
// le gras se refermait au milieu d'un `\frac`.
const inline = (s) => {
  const codes = [];
  const sansCode = ech(s).replace(/`([^`]+)`/g, (_, c) => {
    codes.push(c);
    return `\u0000${codes.length - 1}\u0000`;
  });
  return sansCode
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/_([^_]+)_/g, "<em>$1</em>")
    .replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[Number(i)]}</code>`);
};

export function versHtml(l) {
  const h = [];
  const cellules = (ligne) => ligne.slice(1, -1).split("|").map((c) => inline(c.trim()));

  for (let i = 0; i < l.length; i++) {
    const ligne = l[i];
    // ── LES BLOCS DE CODE D'ABORD, ET RIEN DEDANS N'EST INTERPRÉTÉ.
    //
    // Un `{` de JSON n'est pas du Markdown. Laisser le reste de la boucle
    // toucher ces lignes transformait la réponse attendue du serveur en une
    // suite de paragraphes — la forme exacte qu'il doit rendre, rendue
    // illisible.
    if (ligne.startsWith("```")) {
      const lignes = [];
      i += 1;
      while (i < l.length && !l[i].startsWith("```")) lignes.push(ech(l[i++]));
      h.push(`<pre><code>${lignes.join("\n")}</code></pre>`);
      continue;
    }
    if (ligne.startsWith("| ") && (l[i + 1] ?? "").startsWith("|---")) {
      const entetes = cellules(ligne);
      let j = i + 2;
      const corps = [];
      while (j < l.length && l[j].startsWith("| ")) corps.push(cellules(l[j++]));
      h.push(
        `<div class="defile"><table><thead><tr>${entetes
          .map((c) => `<th>${c}</th>`)
          .join("")}</tr></thead><tbody>${corps
          .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
          .join("")}</tbody></table></div>`,
      );
      i = j - 1;
    } else if (ligne.startsWith("### ")) h.push(`<h3>${inline(ligne.slice(4))}</h3>`);
    else if (ligne.startsWith("## ")) h.push(`<h2>${inline(ligne.slice(3))}</h2>`);
    else if (ligne.startsWith("# ")) h.push(`<h1>${inline(ligne.slice(2))}</h1>`);
    else if (ligne.startsWith("> ")) h.push(`<blockquote>${inline(ligne.slice(2))}</blockquote>`);
    else if (ligne.startsWith("- ")) {
      const items = [];
      while (i < l.length && l[i].startsWith("- ")) items.push(inline(l[i++].slice(2)));
      i--;
      h.push(`<ul>${items.map((x) => `<li>${x}</li>`).join("")}</ul>`);
    } else if (ligne === "---") h.push("<hr/>");
    else if (ligne.trim() !== "") h.push(`<p>${inline(ligne)}</p>`);
  }
  return h;
}

export const CSS = `
:root{
  --encre:#171a1f; --encre-douce:#4a5159; --papier:#faf9f6; --carte:#ffffff;
  --rule:#e2ded5; --accent:#0f6b58; --accent-doux:#e6f1ed;
  --dette:#8c4a2f; --dette-doux:#f7ece6;
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --encre:#e9e7e1; --encre-douce:#a3a8ad; --papier:#14161a; --carte:#1b1e23;
    --rule:#2d3138; --accent:#4fd1ab; --accent-doux:#132a24;
    --dette:#e0a183; --dette-doux:#2b1d16;
  }
}
:root[data-theme="dark"]{
  --encre:#e9e7e1; --encre-douce:#a3a8ad; --papier:#14161a; --carte:#1b1e23;
  --rule:#2d3138; --accent:#4fd1ab; --accent-doux:#132a24;
  --dette:#e0a183; --dette-doux:#2b1d16;
}
body{background:var(--papier);color:var(--encre);
  font:16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  margin:0;padding:0 1.25rem 5rem;}
main{max-width:52rem;margin:0 auto;display:flex;flex-direction:column;gap:.2rem}
h1{font-family:Georgia,"Times New Roman",serif;font-weight:600;font-size:2.1rem;
  line-height:1.2;text-wrap:balance;margin:3rem 0 .5rem;letter-spacing:-.01em}
h2{font-family:Georgia,serif;font-weight:600;font-size:1.4rem;text-wrap:balance;
  margin:3rem 0 .25rem;padding-bottom:.45rem;border-bottom:2px solid var(--rule)}
h3{font-weight:600;font-size:1.02rem;margin:2rem 0 .25rem;
  letter-spacing:.04em;text-transform:uppercase;color:var(--encre-douce)}
p{margin:.7rem 0;max-width:40rem}
blockquote{margin:.9rem 0;padding:.75rem 1rem;background:var(--dette-doux);
  border-left:3px solid var(--dette);color:var(--encre-douce);font-size:.94rem}
ul{margin:.7rem 0;padding-left:1.1rem;display:flex;flex-direction:column;gap:.3rem;max-width:40rem}
code{font:.88em ui-monospace,SFMono-Regular,Menlo,monospace;
  background:var(--accent-doux);color:var(--accent);padding:.1em .35em;border-radius:3px}
.defile{overflow-x:auto;margin:1rem 0;border:1px solid var(--rule);border-radius:6px;background:var(--carte)}
table{border-collapse:collapse;width:100%;font-size:.9rem;font-variant-numeric:tabular-nums}
th{text-align:left;font-weight:600;padding:.6rem .8rem;background:var(--accent-doux);
  color:var(--accent);white-space:nowrap;font-size:.8rem;letter-spacing:.03em;text-transform:uppercase}
td{padding:.55rem .8rem;border-top:1px solid var(--rule);vertical-align:top}
tr:hover td{background:var(--accent-doux)}
hr{border:0;border-top:1px solid var(--rule);margin:3rem 0 1rem}
/* UN BLOC DE CODE DÉFILE DANS SON PROPRE CADRE. Sans cela, une ligne JSON
   longue fait défiler la PAGE ENTIÈRE de côté — sur un téléphone, le texte
   du document devient inatteignable. */
pre{overflow-x:auto;margin:1rem 0;padding:.9rem 1rem;background:var(--carte);
  border:1px solid var(--rule);border-radius:6px;max-width:40rem}
pre code{background:none;color:var(--encre);padding:0;font-size:.85rem;line-height:1.55}
p:last-of-type em,p em{color:var(--encre-douce)}
`;

/** La page complète — titre, styles, contenu. */
export function page(titre, lignes) {
  return `<title>${ech(titre)}</title>\n<style>${CSS}</style>\n<main>\n${versHtml(lignes).join("\n")}\n</main>\n`;
}
