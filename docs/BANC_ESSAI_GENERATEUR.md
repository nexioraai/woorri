# Banc d'essai du générateur — 15 demandes types (préparé le 2026-11-23, RIEN N'EST LANCÉ)

> **Statut : en attente d'approbation de Youssouf** — la liste ET la dépense. Aucune génération n'est lancée tant qu'il n'a pas dit oui.
>
> But : trouver **tous les manques d'un coup**, au lieu de les découvrir un par un. Chaque demande est écrite comme un client l'écrirait, en français simple. Chaque génération laissera sa **boîte noire** (`/admin/boite-noire`) : consignes, réponses brutes, contrôles, et l'analyse phrase par phrase.
>
> Pour chaque demande, « **À vérifier** » est écrit À L'AVANCE : c'est ce qu'on regardera à l'écran, phrase par phrase, après la génération. L'analyse automatique de la boîte noire en donnera une première lecture ; la vérification à l'écran fait foi.

## Coût estimé du banc complet

| Base | Calcul | Total |
|---|---|---|
| Mesuré : 11 dernières créations (DeepSeek, 2026-11-16 → 2026-11-23) | moyenne 0,115 $ × 15 | **≈ 1,75 $** |
| Fourchette mesurée | 0,056 $ à 0,186 $ par création | **0,85 $ à 2,80 $** |
| Plafond dur du code (0,50 $ par création, jamais dépassé) | 0,50 $ × 15 | **7,50 $ au maximum** |
| Lecture du cahier (mesurée : 0,0004 $ par demande) | × 15 | ≈ 0,01 $ |

Durée : environ 5 minutes par création (mesuré : 311 s en moyenne), soit **1 h 15 à 1 h 30** si elles passent l'une après l'autre. Chaque création compte comme « gratuite » sur le compte qui la lance : à faire depuis un compte fondateur (non compté).

## Ce que le banc sollicite (chaque besoin est couvert au moins deux fois)

| Besoin d'une appli mobile | Demandes |
|---|---|
| Inscription libre des utilisateurs | 1, 2, 3, 4, 5, 9, 12, 13, 15 |
| Plusieurs rôles | 1, 4, 5, 6, 7, 8, 11, 13, 14 |
| Données propres à chaque utilisateur | 1, 2, 3, 6, 7, 9, 12, 13 |
| Photo prise ou choisie sur le téléphone | 1, 2, 5, 9, 10, 14 |
| Fichiers (PDF, documents) | 6, 7, 11, 15 |
| Position et carte | 4, 9, 13, 14 |
| Notifications / rappels | 3, 4, 7, 8, 12, 15 |
| Messagerie entre utilisateurs | 2, 9, 13 |
| Paiement (mobile money) | 4, 5, 8, 9, 12 |
| Calendrier / créneaux | 3, 6, 9, 11 |
| Code QR | 5, 8, 10 |
| Usage hors ligne | 10, 14 |
| Plusieurs langues (français / arabe) | 6, 7, 11 |
| Listes pré-remplies (villes, catégories…) | 1, 2, 5, 13 |

---

## 1. Place de marché

**Demande :** « Place de marché pour tout le Tchad. Des vendeurs créent un compte et publient leurs produits : nom, photo, prix en FCFA, catégorie, ville, quartier, numéro WhatsApp. Les visiteurs voient tous les produits sans compte, peuvent chercher par nom, filtrer par catégorie et par ville (N'Djamena, Moundou, Sarh, Abéché, Doba, Bongor et les autres), et contacter le vendeur sur WhatsApp. Chaque vendeur ne peut modifier ou supprimer que ses propres produits. Un administrateur peut masquer un produit, bloquer un vendeur et ajouter des villes et des catégories. »

**À vérifier :**
1. Un vendeur peut créer son compte lui-même.
2. Un vendeur publie un produit avec une photo prise ou choisie sur le téléphone.
3. Le prix s'affiche en FCFA.
4. Un visiteur sans compte voit les produits, cherche par nom, filtre par catégorie et par ville.
5. Les six villes citées sont déjà dans la liste.
6. Le bouton WhatsApp ouvre la conversation avec le bon numéro.
7. Un vendeur ne peut ni modifier ni supprimer le produit d'un autre.
8. Un produit masqué n'est plus visible, même par l'adresse directe de la base.
9. Un vendeur bloqué ne peut plus publier.
10. L'administrateur ajoute une ville et une catégorie.

## 2. Petites annonces

**Demande :** « Site de petites annonces. Chacun crée un compte avec son numéro de téléphone et publie une annonce : titre, description, prix, jusqu'à 5 photos, catégorie (Véhicules, Immobilier, Téléphones, Emploi, Services). Les visiteurs envoient un message au vendeur dans l'application. Chacun voit ses annonces et ses messages, et peut marquer une annonce comme vendue. Une annonce disparaît seule après 30 jours. »

**À vérifier :**
1. Inscription libre avec le numéro de téléphone.
2. Jusqu'à 5 photos par annonce.
3. Les 5 catégories citées sont déjà là.
4. Un visiteur envoie un message au vendeur, sans quitter l'appli.
5. Chacun ne voit que SES annonces et SES messages.
6. « Vendue » marque l'annonce.
7. Une annonce de plus de 30 jours n'apparaît plus.

## 3. Prise de rendez-vous (salon de coiffure)

**Demande :** « Mon salon de coiffure à N'Djamena. Les clientes créent un compte et réservent un rendez-vous : elles choisissent une prestation (tresses, défrisage, coupe, mèches), une coiffeuse et un créneau libre dans le calendrier. Elles reçoivent un rappel la veille. Chaque cliente voit ses rendez-vous et peut annuler jusqu'à 2 heures avant. Moi, je vois le planning de la journée et je bloque les jours fériés. »

**À vérifier :**
1. Inscription libre des clientes.
2. Les 4 prestations sont déjà là.
3. Le calendrier ne montre que les créneaux libres.
4. Deux clientes ne peuvent pas prendre le même créneau avec la même coiffeuse.
5. Un rappel part la veille.
6. Une cliente ne voit que ses rendez-vous.
7. L'annulation est refusée moins de 2 heures avant.
8. La gérante voit le planning du jour et bloque une date.

## 4. Livraison (coursier)

**Demande :** « Service de livraison de colis dans N'Djamena. Un client crée un compte, demande une course avec l'adresse de départ et d'arrivée sur une carte, et voit le prix calculé selon la distance. Un livreur accepte la course, et le client suit sa position sur la carte. Le client paie par Airtel Money ou Moov Money, ou en espèces à la livraison. Le client et le livreur reçoivent une notification à chaque étape. L'administrateur voit toutes les courses et le gain de chaque livreur. »

**À vérifier :**
1. Inscription libre des clients ; les livreurs ont un compte à eux (deux rôles).
2. Départ et arrivée choisis sur une carte.
3. Le prix dépend de la distance.
4. Un livreur accepte une course, et un seul.
5. Le client voit la position du livreur.
6. Paiement par Airtel Money ou Moov Money, ou en espèces.
7. Une notification à chaque étape.
8. L'administrateur voit tout, et le gain par livreur.

## 5. Restaurant avec commande

**Demande :** « Mon restaurant à Moundou. Les clients voient le menu avec photos et prix, commandent sur place en scannant le code QR de leur table, ou à emporter en créant un compte. Ils paient par mobile money ou à la caisse. La cuisine voit les commandes arriver dans l'ordre et les marque « en préparation » puis « prête ». Le gérant modifie le menu et voit les ventes du jour. Catégories du menu : Entrées, Plats, Grillades, Boissons, Desserts. »

**À vérifier :**
1. Le menu public, avec photos et prix.
2. Chaque table a son code QR, qui ouvre la commande de cette table.
3. Commande à emporter avec un compte client.
4. Paiement mobile money, ou « à la caisse ».
5. La cuisine voit les commandes dans l'ordre et change leur statut.
6. Le gérant modifie le menu et voit les ventes du jour.
7. Les 5 catégories sont déjà là.

## 6. École

**Demande :** « Gestion de mon école privée (primaire et collège). L'administration inscrit les élèves et les classes. Les enseignants saisissent les notes et les absences de leurs classes seulement. Chaque parent a un compte et voit les notes, les absences et le bulletin en PDF de ses enfants seulement. L'emploi du temps de chaque classe est visible. Les parents reçoivent une alerte en cas d'absence. L'application est en français et en arabe. »

**À vérifier :**
1. Trois rôles : administration, enseignants, parents.
2. Un enseignant ne saisit que dans SES classes.
3. Un parent ne voit que SES enfants.
4. Le bulletin se télécharge en PDF.
5. L'emploi du temps de chaque classe.
6. Une alerte part au parent à chaque absence.
7. Toute l'appli existe en français et en arabe.

## 7. Clinique

**Demande :** « Petite clinique à Abéché. Les patients prennent rendez-vous avec un médecin. Le médecin écrit la consultation et l'ordonnance, que le patient peut télécharger. La réception enregistre les patients et encaisse. Les dossiers médicaux sont visibles seulement par les médecins et par le patient lui-même. Rappel du rendez-vous par SMS. Français et arabe. »

**À vérifier :**
1. Trois rôles : patient, médecin, réception.
2. Prise de rendez-vous avec un médecin choisi.
3. Ordonnance téléchargeable.
4. Le dossier médical est fermé à la réception et aux autres patients.
5. Rappel par SMS.
6. La réception encaisse.
7. Français et arabe.

## 8. Association avec cotisations

**Demande :** « Notre association de femmes commerçantes (tontine). Chaque membre a un compte, voit ses cotisations et le solde de la caisse. La trésorière enregistre les cotisations mensuelles et les prêts, et chaque membre peut payer sa cotisation par mobile money. Rappel automatique avant la date limite. Chaque membre a une carte de membre avec un code QR. Le bureau voit qui est en retard. »

**À vérifier :**
1. Les membres ont chacune leur compte et ne voient que leurs cotisations, plus le solde commun.
2. La trésorière enregistre cotisations et prêts.
3. Paiement de la cotisation par mobile money.
4. Rappel avant la date limite.
5. Une carte de membre avec un code QR.
6. La liste des membres en retard.

## 9. Location (logements et véhicules)

**Demande :** « Location de maisons et de voitures entre particuliers à N'Djamena. Les propriétaires créent un compte et publient leurs biens avec photos, prix par jour ou par mois et position sur la carte. Les clients voient les disponibilités sur un calendrier, réservent, paient l'acompte par mobile money et discutent avec le propriétaire dans l'application. Chaque propriétaire gère seulement ses biens et ses réservations. »

**À vérifier :**
1. Inscription libre des propriétaires et des clients.
2. Photos et position sur la carte.
3. Prix par jour ou par mois.
4. Calendrier des disponibilités, sans double réservation.
5. Acompte par mobile money.
6. Messagerie client–propriétaire.
7. Chaque propriétaire ne gère que ses biens.

## 10. Gestion de stock

**Demande :** « Gestion du stock de ma boutique et de mon dépôt. J'enregistre les produits avec une photo et un code-barres que je scanne avec le téléphone. Chaque entrée et chaque sortie est enregistrée, avec la date. Une alerte quand un produit passe sous son seuil. Je peux compter le stock sans connexion internet, et tout se met à jour quand le réseau revient. Rapport des ventes du mois. »

**À vérifier :**
1. Une photo par produit, prise avec le téléphone.
2. Le code-barres se scanne avec la caméra.
3. Entrées et sorties datées ; le stock se calcule seul.
4. Une alerte sous le seuil.
5. Sans connexion : la saisie est gardée, puis envoyée au retour du réseau.
6. Le rapport du mois.

## 11. Mairie / services administratifs

**Demande :** « Pour la mairie de Sarh. Les habitants demandent un acte (naissance, résidence) en remplissant un formulaire et en joignant une pièce scannée. Ils suivent l'état de leur demande. Les agents traitent les demandes, et le chef de service valide. Prise de rendez-vous pour le retrait. Français et arabe. »

**À vérifier :**
1. Trois rôles : habitant, agent, chef de service.
2. Pièce jointe scannée.
3. Chaque habitant ne voit que SES demandes.
4. Suivi de l'état de la demande.
5. Validation par le chef de service.
6. Rendez-vous de retrait.
7. Français et arabe.

## 12. Salle de sport

**Demande :** « Ma salle de sport. Les membres s'inscrivent, paient leur abonnement mensuel par Airtel Money, et réservent les cours collectifs. Chaque membre voit son abonnement et sa date d'expiration. Rappel 3 jours avant l'expiration. »

**À vérifier :**
1. Inscription libre.
2. Paiement de l'abonnement par Airtel Money.
3. Réservation d'un cours, dans la limite des places.
4. Chaque membre voit SON abonnement et sa date.
5. Rappel 3 jours avant l'expiration.

## 13. Transport (covoiturage / bus interurbain)

**Demande :** « Covoiturage entre les villes du Tchad (N'Djamena, Moundou, Sarh, Abéché, Bongor). Un conducteur crée un compte et propose un trajet avec la date, l'heure, les places et le prix. Un passager réserve une place, voit le point de départ sur la carte et discute avec le conducteur. Chacun voit ses trajets et ses réservations. Le conducteur est noté après le trajet. »

**À vérifier :**
1. Inscription libre ; conducteurs et passagers.
2. Les villes citées sont déjà là.
3. Les places diminuent à chaque réservation.
4. Le point de départ sur la carte.
5. Messagerie passager–conducteur.
6. Chacun ne voit que SES trajets et SES réservations.
7. La note du conducteur.

## 14. Agriculture (suivi de parcelles)

**Demande :** « Pour notre groupement agricole. Les agents de terrain enregistrent les parcelles avec la position GPS, la culture, la surface et des photos, même sans réseau dans les villages. Le superviseur voit toutes les parcelles sur une carte et les rapports par village. »

**À vérifier :**
1. Deux rôles : agent de terrain, superviseur.
2. La position GPS prise avec le téléphone.
3. Photos des parcelles.
4. La saisie marche sans réseau, et se synchronise ensuite.
5. Toutes les parcelles sur une carte.
6. Les rapports par village.

## 15. Recrutement / emploi

**Demande :** « Site d'offres d'emploi au Tchad. Les entreprises créent un compte et publient des offres. Les candidats créent un compte, déposent leur CV en PDF et postulent. Chaque entreprise ne voit que les candidatures à ses offres. Le candidat reçoit une notification quand sa candidature change d'état. »

**À vérifier :**
1. Inscription libre des entreprises et des candidats.
2. Le CV déposé en PDF.
3. Une entreprise ne voit que les candidatures à SES offres.
4. Notification au candidat à chaque changement d'état.

---

## Après le banc

Pour chaque demande, on lira la boîte noire (`/admin/boite-noire`, puis « Télécharger ») et on cochera, à l'écran, chaque ligne « À vérifier ». Le résultat attendu est une seule liste : **chaque manque, avec l'étape où il naît** (lecture du cahier, moule, génération, contrôle). Cette liste décidera de l'ordre des chantiers. Elle remplace la découverte d'un défaut par essai.
