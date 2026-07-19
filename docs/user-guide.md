# Guide utilisateur (#160)

> Guide par rôle des fonctionnalités principales de Skolr, produit pour la soutenance RNCP 39583 (compétence C2.4.1). Complète `readme.md` (manuel de déploiement/développeur) et `docs/soutenance/soutenance.md` (script de démo orienté jury) par un manuel orienté utilisateur final.

| Champ | Valeur |
|-------|--------|
| Périmètre | Interface Nuxt, 4 rôles applicatifs (Administrateur, Enseignant, Élève, Parent) |
| Version | 1.0.0 |
| Date | 2026-07-19 |
| Méthode | Revue des pages/routes réelles (`packages/frontend/app/pages`), des parcours couverts par les tests e2e (`docs/tests/cahier-de-recettes.md`) |

---

## Administrateur

Accès : connexion sur `/auth/login`, redirection automatique vers `/admin`.

- **Utilisateurs** (`/admin/users`) : consulter la liste des comptes, inviter un utilisateur par email (rôle choisi à l'invitation).
- **Élèves de l'établissement** (`/admin/students`) : vue d'ensemble des élèves inscrits par classe.
- **Matières & programmes** (`/admin/subjects`) : créer/modifier une matière, y rattacher des programmes.
- **Liens parents ↔ enfants** (`/admin/parent-links`) : créer un lien entre un compte parent et un compte élève (type de lien : responsable légal, contact d'urgence, autre).
- **Facturation** (`/admin/billing`) : consulter l'abonnement de l'établissement ; une bannière d'alerte s'affiche si l'abonnement n'est plus actif.
- **Emploi du temps** (`/planning`) : vue d'ensemble filtrable par professeur.
- **Absences** (`/planning/absences`) : suivi des absences tous établissements confondus.
- **Statistiques** (`/statistics`) : moyennes et distribution des notes par classe.
- **Tableau de bord** (`/admin`) : widget d'assiduité (absences par jour), indicateurs clés (élèves, classes, matières, absences 7 jours).

## Enseignant

Accès : connexion, redirection automatique vers `/teacher`.

- **Tableau de bord** (`/teacher`) : sessions du jour, absences non justifiées de ses classes, devoirs récents, moyenne de classe.
- **Mes élèves** (`/teacher/students`) : liste des élèves de ses classes.
- **Carnet de notes** (`/grades/assignments/new` pour créer un devoir, `/grades/assignments/[id]` pour saisir les notes) : création d'un devoir et saisie matricielle des notes par classe.
- **Emploi du temps** (`/planning`) : vue "Mes matières" par défaut, ou sélection d'une classe précise ; les séances du professeur connecté sont mises en évidence.
- **Absences** (`/planning/absences`) : suivi et gestion des justificatifs pour ses classes.
- **Statistiques** (`/statistics`) : moyenne par matière et distribution des notes, par classe.
- **Messagerie** (`/messages`) : échanger avec les élèves/parents.

## Élève

Accès : connexion, redirection automatique vers `/student`.

- **Tableau de bord** (`/student`).
- **Mes notes** (`/grades/my-grades`) : consultation du carnet de notes, moyenne générale ; **téléchargement du bulletin PDF** (bouton visible dès qu'au moins une note existe).
- **Mes absences** (`/planning/my-absences`) : historique de ses propres absences.
- **Devoirs** (`/homework`) : suivi des devoirs à rendre.
- **Messagerie** (`/messages`) : échanger avec ses enseignants.
- **Notifications** : cloche en haut de l'écran (nouveaux messages, nouvelles notes, etc.).
- **Mon profil** (`/profile`) : modifier ses informations, changer son mot de passe, **droits RGPD** (voir ci-dessous).

## Parent

Accès : connexion, redirection automatique vers `/parent`.

- **Espace famille** (`/parent`) : une carte par enfant rattaché au compte (liens créés par un administrateur).
- **Absences de l'enfant** (`/parent/absences`) : consulter les absences, accessible depuis la carte enfant du tableau de bord.
- **Justificatifs** (`/parent/justifications`) : déposer un justificatif d'absence.

## Droits RGPD (tous rôles)

Depuis `/profile`, section "Mes données (RGPD)" :

- **Télécharger mes données** : export JSON de l'ensemble des données personnelles (profil, notes, absences, messages), sans le mot de passe.
- **Supprimer mon compte** : anonymisation définitive après confirmation (saisie du mot "SUPPRIMER"). Les données liées (notes, absences, messages) sont conservées de façon anonyme pour préserver l'intégrité pédagogique/institutionnelle ; le compte ne peut plus se reconnecter après suppression.

---

## Procédure de mise à jour (administrateur système / exploitant)

### Déployer une nouvelle version

```bash
git tag v1.1.0
git push origin v1.1.0
# déclenche .github/workflows/release.yml : build + push des images GHCR taguées

SKOLR_VERSION=1.1.0 docker compose -f docker-compose.release.yml up -d
```

### Appliquer les migrations de base de données

Les migrations Prisma sont appliquées automatiquement en CI (`bunx prisma migrate deploy`, voir `.github/workflows/backend.yml`) avant la publication de l'image. En production, exécuter la même commande avant de basculer le trafic vers la nouvelle version :

```bash
cd packages/backend && bunx prisma migrate deploy
```

`migrate deploy` (contrairement à `migrate dev`) n'applique que les migrations déjà commitées, sans en générer de nouvelles ni redemander de confirmation — adapté à un environnement non interactif.

### Revenir à une version antérieure (rollback)

1. Rebasculer les conteneurs applicatifs sur le tag précédent :
   ```bash
   SKOLR_VERSION=1.0.0 docker compose -f docker-compose.release.yml up -d
   ```
2. **Point d'attention base de données** : les migrations Prisma ne sont pas conçues pour être annulées automatiquement (pas de `migrate down` en production). Un rollback applicatif sans rollback de schéma n'est sûr que si la migration appliquée entre les deux versions est rétrocompatible (ajout de colonne nullable, etc.). Pour une migration non rétrocompatible, prévoir une migration de compensation plutôt qu'un rollback binaire du schéma.
3. Vérifier l'état de santé après rollback : `docker compose -f docker-compose.release.yml ps`, logs backend, et un des parcours de recette de `docs/tests/cahier-de-recettes.md` (ex. F5 — connexion + redirection par rôle) en fumée.

---

## Perspectives (hors scope de cette passe)

- Captures d'écran / vidéo courte par rôle (actuellement uniquement décrit en texte).
- Procédure de rollback de schéma outillée (actuellement manuelle, cas par cas).

---

## Vérification

- Fonctionnalités listées croisées avec les routes réelles de `packages/frontend/app/pages/` et les liens de navigation de `packages/frontend/app/layouts/default.vue`.
- Parcours par rôle couverts par les scénarios F1-F10 de `docs/tests/cahier-de-recettes.md`.
