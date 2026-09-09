# Changelog

Toutes les évolutions notables de ce projet sont documentées ici.

Le format s'appuie sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
et ce projet suit le [Semantic Versioning](https://semver.org/lang/fr/).

## [Unreleased]

## [1.1.0] - 2026-09-09

Cette version apporte l'exploitation en production (sauvegardes chiffrées,
supervision), une campagne de durcissement des autorisations (planning, carnet
de notes, parent, pages du frontend), la fiabilisation des parcours carnet,
emploi du temps et facturation, et l'outillage CI de sécurité (Dependabot,
CodeQL).

### Added
- Exploitation : stratégie de sauvegarde et de restauration PostgreSQL. Service
  `db-backup` dans `docker-compose.release.yml` (dump `pg_dump -Fc` chiffré
  AES-256, empreinte SHA-256, rétention configurable), scripts
  `scripts/backup/` incluant un mode `--check` qui valide une archive dans une
  base jetable, et `docs/ops/backup-restore.md` (RPO 24 h / RTO 1 h, runbook
  d'incident, journal des tests de restauration) (#194).
- Exploitation : supervision applicative en production. Le backend expose ses
  métriques Prometheus (latence, trafic et taux d'erreur par route, santé du
  processus) sur un port dédié non publié ; `docker-compose.release.yml`
  embarque Prometheus, Grafana et les exporters ; 7 règles d'alerte couvrent
  l'indisponibilité, le taux de 5xx, la latence, l'espace disque et le retard
  des sauvegardes ; tableau de bord applicatif provisionné et
  `docs/ops/supervision.md` (métriques, seuils, conduite à tenir) (#218).
- Comptes : un administrateur peut créer un compte directement en choisissant
  son mot de passe, sans dépendre d'un email d'invitation dont l'échec ne se
  voyait nulle part. Le mot de passe est provisoire : un middleware global
  cantonne la session à l'écran de changement tant qu'il n'a pas été remplacé.
  L'invitation par email est conservée (#279).
- Classes : la répartition des cours entre enseignants peut désormais s'écrire
  et plus seulement se lire. La liste des cours affectables est servie par le
  module qui la valide, et le dialog de séance ne propose plus que les matières
  effectivement enseignées par l'enseignant (#280).
- Planning : déclarer l'absence d'un enseignant depuis l'interface. Le dialogue
  raisonne par journée — les séances du jour sont listées, présélectionnées et
  nommées « classe · matière — salle », celles déjà déclarées sont exclues — et
  l'absence partielle reste possible en décochant ce qui est assuré (#288).
- Planning : un créneau dont l'enseignant est absent reste visible dans l'emploi
  du temps, désaturé, barré et portant la mention « Enseignant absent », côté
  administration, enseignant et élèves de la classe. Les absences sont chargées
  par un appel séparé dont l'échec laisse l'emploi du temps s'afficher (#290).
- Carnet : comparaison de la moyenne entre périodes de l'année scolaire. Les
  bornes des trois périodes sont dérivées des séances planifiées plutôt que
  calées sur des mois — le calendrier de démonstration glisse depuis #239 — et
  l'écart porte sur les deux dernières périodes renseignées. Remplace le libellé
  « Vs. trimestre précédent », qui annonçait une comparaison de trimestres dont
  il n'existait aucune notion, ni en base ni dans l'API (#246, #254).
- CI : Dependabot sur les quatre écosystèmes du dépôt (bun, github-actions,
  docker, docker-compose), épinglage des images et de la toolchain Bun
  (`bun@1.3.14`) pour supprimer la dérive entre CI, images et poste de dev, et
  analyse statique CodeQL (`javascript-typescript`, jeu `security-and-quality`)
  sur chaque push et PR de `main` (#192, #193).
- LICENSE (MIT), que le README promettait depuis toujours sans que le fichier
  existe (#212).

### Changed
- Déploiement : durcissement de la stack de release. Les secrets de production
  perdent leur valeur par défaut — le démarrage échoue avec un message explicite
  au lieu de lancer une prod signant ses jetons avec un secret lisible dans le
  dépôt — `restart: unless-stopped` sur les quatre services, et healthcheck sur
  le frontend, seul service sans surveillance alors qu'il est le point d'entrée
  utilisateur (#215).
- Autorisations : la création de séances et la suppression de notes relèvent de
  l'administration et non de l'enseignement. Deux gardes dédiés plutôt qu'un
  élargissement de `requireStaff` (`requireAdministration` sur
  `DELETE /grades/:id`, `requireAdmin` sur `POST /planning/sessions`), doublés
  d'allowlists de rôle côté interface. Les enseignants conservent la saisie et
  la modification des notes, ainsi que la modification et la suppression de
  leurs séances (#286).
- Données de démonstration : le calendrier du seed glisse avec la date du jour
  au lieu de décrire une année scolaire figée. L'écart grandissait d'une semaine
  par semaine et vidait l'emploi du temps de la semaine courante, les
  statistiques et les bulletins. Le décalage est un nombre entier de semaines,
  ce qui préserve les jours de la semaine dont dépendent les créneaux (#239).
- Dépôt : `package-lock.json` supprimé — le dépôt est 100 % Bun, et sa seule
  présence déclenchait des alertes Dependabot sur un écosystème inexistant ici.
  Les artefacts d'outillage IA sortent du suivi git ; `.claude/skills/` reste
  suivi, ce sont des conventions de code partagées (#183).

### Fixed
- Facturation : un abonnement annulé restait annoncé comme « renouvellement le
  {date} ». Le drapeau `cancel_at_period_end` remontait jusqu'au frontend sans
  y être lu. La page affiche désormais la fin de l'abonnement et un bandeau
  d'avertissement, et le bouton du plan annulé redevient cliquable pour se
  réabonner (#284).
- Facturation : le retour du portail Stripe réutilisait `STRIPE_SUCCESS_URL` et
  ses `?success=1`, si bien qu'un administrateur venant d'annuler son abonnement
  lisait « Paiement confirmé ». Une variable dédiée `STRIPE_PORTAL_RETURN_URL`
  le porte. Les `success_url` / `cancel_url` retombaient par ailleurs
  silencieusement sur `http://localhost:3003` : le service refuse maintenant de
  démarrer si Stripe est actif sans URL configurée, en nommant la variable (#267).
- Carnet : `GET /classes/:classId/gradebook` renvoyait 15 élèves, 7 devoirs et
  zéro note. Le schéma de réponse déclarait `grades: { type: 'object' }` sans
  `additionalProperties` ; s'agissant d'une map dynamique,
  `fast-json-stringify` la supprimait entièrement à la sérialisation, sans la
  moindre erreur. Le carnet matriciel s'affichait vide côté enseignant (#262).
- Carnet : une matière affichait deux moyennes simultanément, la pondérée par
  coefficient sur sa carte KPI et une moyenne simple recalculée côté client dans
  l'accordéon. La valeur de l'API fait désormais foi des deux côtés, le calcul
  local ne servant plus que si les statistiques n'ont pas pu être chargées (#274).
- Planning : le module acceptait n'importe quel créneau — aucune détection de
  chevauchement, aucune vérification que `endAt` suive `startAt`. Les créations
  et modifications refusent désormais ces cas (409 / 400), la modification
  excluant le créneau modifié de sa propre recherche de conflit. Le 409 porte un
  code stable traduit par le dialog, le message n'étant plus affiché en anglais
  dans une interface française (#245).
- Planning : la date saisie dans le dialog de séance était perdue sans message —
  le parseur du DatePicker PrimeVue lève en format 24 h et l'exception était
  avalée — et la séance était créée à l'heure préremplie. La saisie clavier est
  désactivée, le sélecteur reste utilisable. Un élève était par ailleurs
  déconnecté en ouvrant son emploi du temps : la page chargeait `/class/classes`
  sans condition, route en `requireStaff`, et le 403 était interprété comme une
  session invalide (#247).
- Planning : le champ « Récurrence » du dialog de séance est masqué. Rien
  n'exploitait `recurrenceRule` — ni la création, ni la lecture, ni le
  calendrier : l'interface promettait une récurrence inexistante. La valeur est
  réémise telle quelle en modification pour ne pas l'effacer en base (#276).
- Messagerie : six défauts de la logique autour du WebSocket rendaient le temps
  réel peu fiable — conversation créée par un tiers jamais reçue, utilisateur
  affiché hors ligne au premier onglet fermé ou à un F5, sockets à moitié
  ouverts jamais fermés, sessions de l'expéditeur non synchronisées, polling de
  secours jamais armé si la WebSocket ne s'ouvrait pas, et URL dépendant d'une
  variable dédiée plutôt que dérivée du contexte (#243).
- Interface : la barre de navigation latérale remontait avec le contenu sur
  toute page plus haute que la fenêtre. `position: sticky` et `align-self: start`
  la fixent ; la marge de 8 px que les navigateurs appliquent par défaut au
  `body`, jamais retirée, décalait par ailleurs la coquille sur chaque bord et
  faisait déborder son `min-height: 100dvh` de 16 px (#282).
- Interface : le rôle PLATFORM_ADMIN restait indéfiniment sur « Connexion en
  cours… », faute d'être déclaré côté frontend et d'avoir une page à ouvrir. La
  page `/platform` restitue sa seule capacité propre, la liste des
  établissements et l'état de leur abonnement (#258).
- Interface : quatre pages restaient hors du motif de garde par middleware —
  les deux pages parent étaient ouvrables par n'importe quel rôle connecté, et
  deux autres montaient la page pour tout le monde en masquant le contenu par
  `v-if`. Le lien « Accueil », qui menait exactement où mène « Tableau de bord »,
  disparaît de la navigation ; les deux routes subsistent (#256).
- CI : la garde Dependabot de `pr-validation.yml` testait `github.actor`, qui
  désigne qui a déclenché l'événement et non qui a ouvert la PR. La moindre
  action humaine sur une PR Dependabot faisait tomber la garde et échouer les
  trois contrôles (#207).

### Security
- Authentification : correction d'un contournement d'authentification JWT.
  `fast-jwt@6.1.0`, tiré par `@fastify/jwt`, cumulait trois CVE critiques —
  acceptation d'un secret HMAC vide (CVE-2026-44351), collision de
  `cacheKeyBuilder` renvoyant les claims d'un autre jeton (CVE-2026-35039) et
  confusion d'algorithme (CVE-2026-34950). Le plancher de la plage passe à
  `^10.2.2` pour empêcher toute re-résolution vers une version vulnérable (#200).
- Planning : les trois routes d'écriture d'absences n'avaient aucun
  `preHandler`. L'application ne pose pas de hook d'authentification global :
  elles étaient joignables sans jeton, ce qui permettait de marquer, justifier
  ou effacer une absence sur n'importe quel élève et de déclencher les
  notifications aux familles. Les écritures de séances étaient en `requireAuth`
  et non `requireStaff` : un élève connecté pouvait créer, déplacer ou supprimer
  n'importe quel créneau. Périmètre enseignant ajouté sur les écritures (#233).
- Parent : les trois routes de `parentRoutes.ts` étaient déclarées sans
  `preHandler`. `GET /children?parentId=` sautait entièrement le contrôle du
  jeton dès que le paramètre était fourni et renvoyait la fiche complète de
  chaque enfant — données personnelles de mineurs, et reconstitution du lien
  responsable ↔ enfant par balayage d'identifiants. L'identité vient désormais
  du jeton ; le `parentId` du client n'est honoré que pour un ADMIN ou un
  STAFF (#241).
- Carnet : `requireStaff` répond « est-ce un membre du personnel ? », jamais
  « ce personnel-là a-t-il affaire à cette classe ? ». Un enseignant pouvait
  lire, modifier et supprimer les devoirs et les notes de n'importe quelle
  classe, et le `teacherId` comparé venait du corps de la requête. `teacherScope`
  est appliqué aux douze handlers concernés et l'identité vient du jeton. Une
  relecture a fermé cinq chemins restants, dont `getGradesByUserId` sans aucun
  filtre et des devoirs listés en entier à tout utilisateur authentifié (#234).
- Interface : les trois pages du carnet ne déclaraient que le middleware `auth`.
  Un élève ou un parent qui saisissait l'URL atteignait le formulaire de création
  de devoir ou la grille de notation — sans fuite de données, l'API répondant
  403, mais l'écran s'affichait puis cassait. Seul le middleware bloque avant le
  rendu ; les gardes par `v-if` et par redirection en ligne sont remplacés (#235).
- Emploi du temps : `buildEventHtml` interpolait les noms de matière,
  d'enseignant et de salle dans du HTML brut injecté tel quel par FullCalendar —
  une salle contenant des chevrons s'exécutait (#290).

### Tests
- Recette : les deux scénarios de recette, jusque-là rejoués à la main, sont
  figés en specs Playwright — carnet en 9 étapes, emploi du temps en 7. Leur
  premier passage a trouvé #262, que les 87 tests existants ne voyaient pas (#264).
- Recette : le parcours administrateur, le rôle à la surface la plus large, est
  couvert à son tour : les dix écrans qu'il ouvre, puis ce qui doit lui rester
  fermé — vue plateforme, carnet personnel d'un élève, espace famille, liste
  plateforme côté API (#269).
- Suite e2e : elle cessait de polluer la base et le dépôt. Le scénario carnet
  créait un devoir par exécution sans le supprimer (17 devoirs pour 4 seedés,
  moyennes faussées) et le walkthrough réécrivait trois captures versionnées à
  chaque run, laissant des PNG modifiés dans le `git status` de tout le
  monde (#272).
- Planning : le test de conflit d'horaire ne dépend plus de l'heure d'exécution.
  Il passe entièrement par l'interface et soumet deux fois le même formulaire :
  créneau libre ou déjà occupé par le seed, les deux chemins mènent au même
  message (#260).
- Seed : les invariants du calendrier glissant sont verrouillés. La logique est
  extraite dans `shared/demoCalendar.ts` et paramétrée par une date, ce qui
  permet de balayer des dates d'exécution arbitraires. Une relecture a montré
  que deux tests ne mordaient pas — ils comparaient leur propre copie de la date
  plutôt que celle du seed — et que le balayage de 730 dates n'en couvrait que
  7 états distincts (#251).
- Frontend : couverture de la logique métier des composables (#186).

### Docs
- Sécurité : les correctifs de la campagne de durcissement sont mappés sur
  l'OWASP Top 10 (#184).
- Tests : `strategy.md` aligné sur la couverture frontend réelle, le document
  affirmant à tort qu'aucun test unitaire frontend ne tournait en CI (#188).
- Dossier de soutenance : mapping du Bloc 4 aligné sur ses 7 compétences (#220).
- Incohérences documentaires corrigées — `audit.md` donnait encore Dependabot et
  CodeQL en perspective, `soutenance.md` citait un code de compétence
  inexistant, et `SKOLR_VERSION` manquait à `.env.example` (#212).

## [1.0.1] - 2026-07-22

### Fixed
- Déploiement release : la connexion renvoyait 502 (`Bad Gateway`). La variable
  de gateway interne du frontend n'était pas prise en compte au runtime — Nuxt
  n'applique une clé privée de `runtimeConfig` que via le préfixe `NUXT_`. Ajout
  de `NUXT_GATEWAY_INTERNAL_URL` au service `frontend` de
  `docker-compose.release.yml` (#176).

### Changed
- Connexion : le bouton « Continuer avec Google » est masqué côté interface.
  L'OAuth2 Google reste implémenté côté backend (dormant, réactivable) (#181).

### Removed
- Carnet enseignant : retrait du formulaire « Ajouter une note » obsolète, rendu
  inopérant par la refonte des devoirs (une note est désormais rattachée à un
  devoir, `POST /grade/grades` exige `assignmentId`) (#182).

### Docs
- README : procédure d'amorçage des données sur un déploiement neuf (commande de
  seed démo, avertissement « jamais en production ») (#180).

## [1.0.0] - 2026-07-20

Première version publiée de l'application Skolr (backend Fastify + frontend Nuxt),
distribuée sous forme d'images Docker sur GHCR.

### Added
- Backend (Fastify / Prisma / PostgreSQL) : authentification, OAuth Google, email
  transactionnel, billing Stripe, stockage de pièces jointes (S3/MinIO), observabilité Sentry.
- Frontend (Nuxt / PrimeVue) : interface d'administration et espaces utilisateurs.
- Nouveau shell applicatif (rail de navigation + barre du haut), design tokens
  « Modernist » et preset PrimeVue associé.
- Carnet de notes et devoirs (assignments), restylés (KPI + accordéon).
- Emploi du temps : restylage complet, filtrage par rôle (RBAC serveur + UX).
- Dashboard enseignant (vue synthétique classes/activité du jour) et dashboard admin.
- Gestion des présences, restructurée en roster par session.
- Accès parent au bulletin de son propre enfant.
- Authentification par jeton d'accès JWT court (15 min) et jeton de
  rafraîchissement opaque, tracé côté serveur, à rotation à chaque usage et
  révocable (détection de réutilisation → révocation de toute la chaîne en
  cas de vol).
- RGPD : export des données personnelles et droit à l'effacement, opérationnels
  de bout en bout (API + UI).
- Accessibilité : référentiel RGAA 4.1 (sous-ensemble documenté) et actions
  concrètes (navigation clavier, contrastes, lien d'évitement, langue de page,
  état de navigation actif).
- Détection des sessions expirées / tokens invalides avec redirection vers la
  connexion (proactive et réactive, avec rafraîchissement silencieux).
- Pipeline de release : publication des images `skolr-backend` et `skolr-frontend`
  sur GHCR et création automatique de la GitHub Release sur tag `vX.Y.Z`.
- Documentation RNCP 39583 (Bloc 2) : architecture (C4 + diagrammes de
  séquence + ADR), cahier de recettes, plan de correction des bogues, guide
  utilisateur, stratégie et couverture de tests, schéma de base de données.

### Changed
- message/notification : authentification harmonisée via des préhandlers
  partagés (au lieu d'une vérification JWT manuelle dupliquée par contrôleur).
- Emploi du temps : filtres UX simplifiés.

### Security
- Passe de durcissement complète : rate-limiting global et resserré sur
  l'authentification, en-têtes de sécurité HTTP, CORS restreint par
  allowlist, interruption réelle des gardes d'authentification, routes
  d'administration de comptes sécurisées, énumération anonyme des comptes
  bloquée, journalisation structurée des événements de sécurité,
  `trustProxy` explicitement configurable (désactivé par défaut).

### Fixed
- Image Docker backend : dossier `scripts/seed/` manquant du contexte de build.
- Isolation des tests `grade` (fuite globale d'un mock d'événements partagé).
- Variable d'environnement manquante pour le WebSocket dans `.env.example`.

[Unreleased]: https://github.com/saithomas-gbz/SkolrMono/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/saithomas-gbz/SkolrMono/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/saithomas-gbz/SkolrMono/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/saithomas-gbz/SkolrMono/releases/tag/v1.0.0
