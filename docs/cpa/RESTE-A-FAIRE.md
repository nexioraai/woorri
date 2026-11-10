# CPA — CE QUI RESTE À FAIRE (pour la reprise)

Établi le 2026-11-10, à la demande du propriétaire, avant la remise à
l'informaticien de la CPA. Rien ici n'est fait. Chaque ligne dit QUI doit
agir. L'historique détaillé et les preuves sont dans `PLAN.md`.

## A. Fonctions non construites — Deribfy

1. **Bandeau « Information importante »** sur la page Actualités (lot 15.9).
2. **Encadré « Accès rapide »** — avis en cours, attributions, assistance (lot 15.10).
3. **Circuit de validation avant publication** (brouillon → relecture →
   validation) : aujourd'hui un clic publie (contrainte ② du PLAN).
4. **Offres scellées jusqu'à l'ouverture des plis** : la CPA peut lire une
   offre avant l'heure. Décision du propriétaire du 2026-11-09 (PLAN §13),
   attaquable en recours.
5. **Envoi d'un document à plusieurs comptes d'un coup** : aujourd'hui
   compte par compte (PLAN §11bis).
6. **Éditeur pas entièrement en français** : « Business Name », « Hero
   Title », etc. (`src/components/Navbar.tsx`).
7. **Texte de contact générique non modifiable** : « Une question, un devis ?
   Nous répondons sous 24h » (accueil et `/contact`, dictionnaire du thème) —
   une promesse que la CPA n'a pas faite.

## B. Décisions à prendre — CPA

8. Compteur de visiteurs (15.8) : oui / non. Si oui, la politique de
   confidentialité change AVANT.
9. Niveau du catalogue public (information seule ?).
10. Cadre juridique du dépôt électronique des offres.
11. Noms publiables (organigramme, page Direction).
12. Qui administre le site, qui valide les publications.

## C. Contenu à fournir — CPA, depuis l'éditeur

13. Remplacer TOUS les textes provisoires — l'assistant les répète tels quels.
14. Le vrai numéro de téléphone (aujourd'hui `+1 235 …`, faux indicatif).
15. Les logos officiels des partenaires (l'OMS actuel est une capture
    filigranée 123RF, en anglais, sur fond gris).
16. Leurs propres mentions légales et politique de confidentialité.

## D. Risques connus, à surveiller

17. **Adresse non vérifiée à l'inscription** (décision du propriétaire,
    PLAN §17) : un compte peut être créé avec l'adresse d'un autre. Parade :
    suspendre le compte depuis le tableau de bord.
18. **Protection minimale contre les robots** à l'inscription (champ piège),
    aucune limite d'envois.
19. **Une adresse = un seul compte pour toute la plateforme Deribfy**
    (décision du 2026-11-10, PLAN §18bis).
20. **Écrans fournisseur ouverts par leur adresse directe** par une structure
    sanitaire : non vérifié (les liens sont masqués, pas les pages).
21. **Non vérifié en conditions réelles** : la question hors sujet refusée par
    l'assistant (chaque question coûte).
22. **Hébergement sur le compte du prestataire** : contraire au §9.1 du cahier
    des charges, opposable à la réception (contrainte ③ du PLAN).

## E. Mise en exploitation — CPA (informaticien)

23. Brancher le **domaine définitif** (ex. cpa.td) : le site est encore sur
    `cpa-tchad.deribfy.app`.
24. Déclarer le **plan du site à Google Search Console**
    (`https://<domaine>/sitemap.xml`, 37 adresses au 2026-11-10).
25. Écrire le **guide d'exploitation** : où gérer avis, offres, comptes,
    demandes, journal ; comment fonctionne l'assistant et ses plafonds
    (10 / conversation, 10 / heure / adresse, 200 / jour).
