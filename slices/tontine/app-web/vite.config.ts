import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// `base` RELATIVE : l'application doit fonctionner servie depuis un
// sous-dossier, ce qui est le cas de la plupart des hébergements simples.
// Une base absolue casse tous les chemins dès que l'URL n'est pas la racine.
export default defineConfig({ base: "./", plugins: [react()] });
