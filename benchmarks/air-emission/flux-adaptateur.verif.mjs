// ============================================================
// LE FLUX REND LA MEME REPONSE QUE LE NON-STREAMING — A L'OCTET.
//
// POURQUOI : six « Request timed out. » sur deux tirs (2026-10-09), morts a
// ~10 min d'appel avec timeout client 45 min et zero retry — la coupure est
// cote serveur, sur les connexions non-streaming longues. Le correctif est
// le flux ; ce fichier prouve que le reassemblage est INVISIBLE pour tout
// ce qui vit au-dessus de l'adaptateur : meme forme, meme octets.
// ============================================================
import { assemblerDepuisFlux, envelopperEnFlux, lireReponse, lireUsage } from "./adaptateur-anthropic.mjs";

let echecs = 0;
const verifie = (nom, condition, detail = "") => {
  if (condition) { console.log(`  ✅ ${nom}`); return; }
  console.error(`  🔴 ${nom}${detail === "" ? "" : ` — ${detail}`}`);
  echecs += 1;
};

// ── LA REFERENCE : une reponse non-streaming telle que le service la rend,
// cles dans l'ordre du dialecte (id, type, role, model, content,
// stop_reason, stop_sequence, usage).
const REF = {
  id: "msg_01",
  type: "message",
  role: "assistant",
  model: "claude-opus-5",
  content: [{ type: "text", text: '{"app":{"name":"depenses"},"rules":[{"id":"r1"}]}' }],
  stop_reason: "end_turn",
  stop_sequence: null,
  usage: {
    input_tokens: 1200,
    cache_creation_input_tokens: 300,
    cache_read_input_tokens: 4000,
    output_tokens: 84,
  },
};

// Le MEME contenu, en evenements de flux — exactement le protocole du
// dialecte : message_start (usage d'entree + cache), blocs par deltas,
// message_delta (stop + usage de sortie), message_stop.
async function* fluxDeReference() {
  yield {
    type: "message_start",
    message: {
      id: "msg_01", type: "message", role: "assistant", model: "claude-opus-5",
      content: [], stop_reason: null, stop_sequence: null,
      usage: { input_tokens: 1200, cache_creation_input_tokens: 300, cache_read_input_tokens: 4000, output_tokens: 1 },
    },
  };
  yield { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } };
  yield { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: '{"app":{"name":"dep' } };
  yield { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: 'enses"},"rules":[{"' } };
  yield { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: 'id":"r1"}]}' } };
  yield { type: "content_block_stop", index: 0 };
  yield { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 84 } };
  yield { type: "message_stop" };
}

console.log("— ① l'egalite a l'octet, cas texte —");
{
  const assemble = await assemblerDepuisFlux(fluxDeReference());
  verifie("① flux reassemble === reponse non-streaming, OCTET POUR OCTET",
    JSON.stringify(assemble) === JSON.stringify(REF),
    `assemble=${JSON.stringify(assemble).slice(0, 120)}`);
  verifie("① lireReponse voit EXACTEMENT la meme chose (texte, usage, cache)",
    JSON.stringify(lireReponse(assemble)) === JSON.stringify(lireReponse(REF)));
  verifie("① lireUsage conserve les champs de cache — la comptabilite ne bouge pas",
    JSON.stringify(lireUsage(assemble.usage)) === JSON.stringify(lireUsage(REF.usage)) &&
      lireUsage(assemble.usage).ecritureCache === 300 && lireUsage(assemble.usage).lectureCache === 4000);
}

console.log("— ② multi-blocs avec tool_use (input_json_delta) —");
{
  const REF2 = {
    id: "msg_02", type: "message", role: "assistant", model: "claude-opus-5",
    content: [
      { type: "text", text: "voici" },
      { type: "tool_use", id: "tu_1", name: "poser", input: { x: 1, y: [2, 3] } },
    ],
    stop_reason: "tool_use", stop_sequence: null,
    usage: { input_tokens: 10, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 7 },
  };
  async function* flux2() {
    yield { type: "message_start", message: { id: "msg_02", type: "message", role: "assistant", model: "claude-opus-5", content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 1 } } };
    yield { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } };
    yield { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "voici" } };
    yield { type: "content_block_stop", index: 0 };
    yield { type: "content_block_start", index: 1, content_block: { type: "tool_use", id: "tu_1", name: "poser", input: {} } };
    yield { type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: '{"x":1,"y"' } };
    yield { type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: ":[2,3]}" } };
    yield { type: "content_block_stop", index: 1 };
    yield { type: "message_delta", delta: { stop_reason: "tool_use", stop_sequence: null }, usage: { output_tokens: 7 } };
    yield { type: "message_stop" };
  }
  const assemble = await assemblerDepuisFlux(flux2());
  verifie("② deux blocs, JSON d'outil reconstruit — octet pour octet",
    JSON.stringify(assemble) === JSON.stringify(REF2),
    JSON.stringify(assemble).slice(0, 140));
}

console.log("— ③ l'enveloppe : create() passe en flux, et rend la forme d'avant —");
{
  const appels = [];
  const brut = {
    messages: {
      create: async (args) => {
        appels.push(args);
        if (args.stream === true) return fluxDeReference();
        throw new Error("un create non-streaming ne doit JAMAIS partir");
      },
    },
  };
  const client = envelopperEnFlux(brut);
  const reponse = await client.messages.create({ model: "claude-opus-5", max_tokens: 64, messages: [] });
  verifie("③ l'appelant recoit la reponse non-streaming exacte sans rien savoir du flux",
    JSON.stringify(reponse) === JSON.stringify(REF));
  verifie("③ UN SEUL appel est parti, en stream: true — l'appelant n'a pas eu a le dire",
    appels.length === 1 && appels[0].stream === true && appels[0].max_tokens === 64);
  const direct = await client.messages.create({ stream: true, model: "m", messages: [] });
  verifie("③ un appelant qui demande DEJA le flux le recoit brut, sans double emballage",
    typeof direct[Symbol.asyncIterator] === "function" && appels.length === 2);
}

console.log(echecs === 0 ? "\n✅ flux-adaptateur : le reassemblage est invisible — meme forme, memes octets." : `\n🔴 ${String(echecs)} echec(s).`);
process.exit(echecs === 0 ? 0 : 1);
