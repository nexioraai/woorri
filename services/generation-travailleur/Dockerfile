# LE TRAVAILLEUR HEBERGE — image minimale, monorepo entier (le moteur vit
# dans benchmarks/ et les paquets dans packages/). Construit SEULEMENT le
# jour du deploiement decide par le proprietaire — d'ici la : du texte, 0 $.
FROM node:22-slim
WORKDIR /app
COPY . .
RUN npm ci
# tsx : le meme chargeur que les harnais — le mode prouve au feu.
CMD ["npx", "tsx", "services/generation-travailleur/index.mts"]
