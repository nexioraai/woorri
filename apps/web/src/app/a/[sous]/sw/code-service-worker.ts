/**
 * LE CODE DU SERVICE WORKER d'une appli publiée (2026-11-22), servi par la
 * route voisine à `<nom>.deribfy.app/sw.js`. Code ÉMIS pour le navigateur :
 * il vit avec sa route, hors de la couche métier.
 */
import { FOND_PAR_DEFAUT } from '@/lib/apps/pwa'
import { MARQUE_HTML_APRES, MARQUE_HTML_AVANT } from '@/lib/apps/pwa-emis'

/**
 * LE SERVICE WORKER — minimal, et il NE GARDE QUE L'ÉCRAN D'ACCUEIL.
 *
 *   · seule la NAVIGATION vers `/` (même origine, GET) passe par lui : réseau
 *     d'abord, copie gardée à chaque succès ; sans réseau, la dernière copie,
 *     sinon une page « Pas de connexion ». Cette page est publique (elle est
 *     servie à quiconque ouvre l'adresse) : elle ne porte que la clé
 *     PUBLIABLE de l'appli, jamais une donnée ;
 *   · TOUT LE RESTE N'EST PAS TOUCHÉ : appels à la base (autre origine),
 *     requêtes authentifiées, `/compte`, images — le navigateur les fait
 *     comme si le service worker n'existait pas. Rien d'autre n'entre jamais
 *     dans le cache ;
 *   · MISE À JOUR SANS MANIPULATION : réseau d'abord, donc l'appli à jour dès
 *     qu'il y a du réseau ; un nouveau service worker prend la main tout de
 *     suite (`skipWaiting` + `clients.claim`) et efface les anciens caches ;
 *   · DÉPUBLIÉE (l'adresse rend 404) : il efface sa copie et se désinscrit —
 *     une appli retirée ne survit pas hors ligne.
 */
export const VERSION_SERVICE_WORKER = 'deribfy-appli-1'

export function codeServiceWorker(nomAppli: string): string {
  const page = pageHorsLigne(nomAppli)
  return `'use strict';
const CACHE = ${JSON.stringify(VERSION_SERVICE_WORKER)};
const ACCUEIL = '/';
const MARQUE_AVANT = ${JSON.stringify(MARQUE_HTML_AVANT)};
const MARQUE_APRES = ${JSON.stringify(MARQUE_HTML_APRES)};
const HORS_LIGNE = ${JSON.stringify(page)};
const horsLigne = () => new Response(HORS_LIGNE, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add(new Request(ACCUEIL, { cache: 'no-store', credentials: 'omit' }))).catch(() => undefined));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (e) => {
  const r = e.request;
  // Rien d'autre qu'une NAVIGATION en GET : la base, l'authentification, les images passent sans lui.
  if (r.mode !== 'navigate' || r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== self.location.origin) return;
  if (u.pathname !== ACCUEIL) { e.respondWith(fetch(r).catch(horsLigne)); return; }
  e.respondWith((async () => {
    try {
      const rep = await fetch(r);
      if (rep.ok) { const c = await caches.open(CACHE); await c.put(ACCUEIL, rep.clone()); }
      else if (rep.status === 404) { await caches.delete(CACHE); await self.registration.unregister(); }
      return rep;
    } catch (_) {
      // La copie gardée, MARQUÉE « hors ligne » : la page montre son bandeau même
      // quand le téléphone se croit connecté (wifi sans internet ; mesuré :
      // navigator.onLine reste vrai sous l'émulation hors ligne de Chromium).
      const c = await caches.match(ACCUEIL);
      if (!c) return horsLigne();
      const t = await c.text();
      return new Response(t.replace(MARQUE_AVANT, MARQUE_APRES), { status: 200, headers: c.headers });
    }
  })());
});
`
}

/** La page servie hors ligne quand l'écran d'accueil n'a encore jamais été gardé. */
export function pageHorsLigne(nomAppli: string): string {
  const nom = nomAppli.replace(/[<>&"]/gu, '')
  return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    `<title>${nom}</title></head><body style="margin:0;font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;background:${FOND_PAR_DEFAUT};color:#1f2937;text-align:center;padding:24px">` +
    `<div><p style="font-size:20px;font-weight:700;margin:0 0 8px">Pas de connexion</p><p style="margin:0 0 16px">${nom} s’ouvrira dès que le téléphone aura du réseau.</p>` +
    '<button onclick="location.reload()" style="padding:10px 18px;border-radius:10px;border:0;background:#1f2937;color:#fff;font-size:15px">Réessayer</button></div></body></html>'
}

