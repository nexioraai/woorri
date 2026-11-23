/**
 * CE QUE LA PAGE SERVIE D'UNE APPLI PORTE POUR S'INSTALLER (2026-11-22) —
 * deux morceaux de HTML ÉMIS, jamais exécutés ici : le bandeau « Pas de
 * connexion » et l'inscription du service worker. `pageAutonome` les colle
 * dans le document de `<nom>.deribfy.app`. Ce fichier ne contient que ces
 * deux constantes (dérogation bornée, businessLayerPortability).
 */
import { CHEMIN_SERVICE_WORKER } from './pwa'

/** Le bandeau « Pas de connexion » de la page servie : visible seulement hors ligne. */
export const BANDEAU_HORS_LIGNE =
  '<div id="deribfy-hors-ligne" role="status" hidden style="position:fixed;left:0;right:0;top:0;z-index:2147483647;padding:10px 14px;background:#1f2937;color:#fff;font:600 14px system-ui,sans-serif;text-align:center">' +
  'Pas de connexion — ce que vous voyez peut ne pas être à jour, et rien ne s’enregistre.</div>' +
  '<script>(function(){var b=document.getElementById("deribfy-hors-ligne");if(!b)return;var copie=document.documentElement.getAttribute("data-deribfy-hors-ligne")==="1";function m(){b.hidden=!(copie||navigator.onLine===false)}addEventListener("online",function(){if(copie)location.reload();else m()});addEventListener("offline",m);m()})()</script>'

/**
 * LA MARQUE « COPIE HORS LIGNE » : le service worker la pose sur l'écran
 * d'accueil qu'il sert sans réseau (attribut sur <html>) ; le bandeau la lit.
 */
export const MARQUE_HTML_AVANT = '<html lang="fr">'
export const MARQUE_HTML_APRES = '<html lang="fr" data-deribfy-hors-ligne="1">'

/**
 * L'INSCRIPTION DU SERVICE WORKER — seulement sous `*.deribfy.app`. Jamais
 * ailleurs : la même page servie depuis `www.deribfy.com` (lien par jeton)
 * inscrirait un service worker sur l'origine de DERIBFY.
 */
export const INSCRIPTION_SERVICE_WORKER =
  `<script>(function(){try{if(!("serviceWorker" in navigator))return;if(!/\\.deribfy\\.app$/.test(location.hostname))return;navigator.serviceWorker.register(${JSON.stringify(CHEMIN_SERVICE_WORKER)},{scope:"/"}).catch(function(){})}catch(e){}})()</script>`
