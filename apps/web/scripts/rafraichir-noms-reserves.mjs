/**
 * RAFRAICHIT LA LISTE DES NOMS RESERVES depuis sa source publiee.
 *
 * On ADOPTE le vocabulaire que le monde maintient plutot que d'ecrire le
 * notre — meme principe que les variables shadcn contre une bibliotheque
 * maison. Le FRANCAIS, lui, se DERIVE : pour chaque mot de confiance deja
 * reserve en anglais, son equivalent. Personne d'autre ne s'en occupe.
 *
 *   node scripts/rafraichir-noms-reserves.mjs
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const SOURCE =
  'https://raw.githubusercontent.com/marteinn/The-Big-Username-Blacklist/master/list_raw.txt'

const TRADUCTION = {
  login: ['connexion'], signin: ['identifier', 'identifiant'], logout: ['deconnexion'],
  account: ['compte'], accounts: ['comptes'], payment: ['paiement'], payments: ['paiements'],
  pay: ['payer'], billing: ['facturation'], invoice: ['facture'], invoices: ['factures'],
  secure: ['securise', 'securite'], security: ['securite'], verify: ['verifier', 'verification'],
  support: ['assistance'], help: ['aide'], settings: ['reglages', 'parametres'],
  password: ['motdepasse'], admin: ['administration'], order: ['commande'], orders: ['commandes'],
  shop: ['boutique'], store: ['magasin'], delivery: ['livraison'], subscription: ['abonnement'],
  customer: ['clientele'], profile: ['profil'], register: ['inscription'], signup: ['inscrire'],
  contact: ['contactez'], legal: ['mentions'], privacy: ['confidentialite'],
}

const brut = await (await fetch(SOURCE)).text()
const anglais = [
  ...new Set(
    brut
      .split('\n')
      .map((l) => l.trim().toLowerCase())
      .filter((l) => l !== '' && !l.startsWith('#') && /^[a-z0-9-]{2,40}$/u.test(l)),
  ),
].sort()
const francais = [
  ...new Set(
    Object.entries(TRADUCTION)
      .filter(([en]) => anglais.includes(en))
      .flatMap(([, fr]) => fr),
  ),
].sort()

const cible = join(dirname(new URL(import.meta.url).pathname), '..', 'src', 'lib', 'apps', 'noms-reserves.genere.json')
writeFileSync(
  cible,
  JSON.stringify(
    {
      source: 'The Big Username Blacklist — github.com/marteinn/The-Big-Username-Blacklist',
      version: 'v2.0.1',
      licence: 'MIT (Copyright 2015-2021 Martin Sandström)',
      releve_le: new Date().toISOString().slice(0, 10),
      anglais,
      francais,
    },
    null,
    1,
  ) + '\n',
)
console.log(`${anglais.length} mots anglais, ${francais.length} dérivés français → ${cible.split('/').pop()}`)
