// SERVICE WORKER DE DERIBFY — volontairement MINIMAL (2026-11-11).
//
// Il ne fait qu'UNE chose : quand une NAVIGATION échoue faute de réseau, il
// sert la page « hors connexion » au lieu de l'écran d'erreur du navigateur.
// Une app installée ne doit jamais s'ouvrir sur un dinosaure.
//
// CE QU'IL NE FAIT PAS, ET C'EST VOULU : il ne met en cache AUCUNE page, aucun
// script, aucune donnée. Un cache de pages servirait une ancienne version après
// un déploiement — un affichage périmé présenté comme le site. Tout passe par
// le réseau ; seul l'échec du réseau est rattrapé.
//
// Enregistré uniquement sur les pages de Deribfy (voir InstallerDeribfy) :
// jamais sur la boutique d'un marchand, qui vit sur une autre origine.
const CACHE = 'deribfy-hors-ligne-v1'
const PAGE = '/hors-ligne.html'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add(new Request(PAGE, { cache: 'reload' }))))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(cles.filter((k) => k.startsWith('deribfy-hors-ligne-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const r = e.request
  if (r.method !== 'GET' || r.mode !== 'navigate') return
  e.respondWith(fetch(r).catch(() => caches.match(PAGE)))
})
